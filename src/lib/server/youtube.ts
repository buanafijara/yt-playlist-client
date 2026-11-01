import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import type { PlaylistPage, PlaylistSummary, Video } from '#lib/types.ts';

const API = 'https://www.googleapis.com/youtube/v3';

export class YouTubeError extends Error {
	constructor(
		public status: number,
		public reason: string,
		message: string
	) {
		super(message);
	}
}

interface Page<T> {
	items: T[];
	nextPageToken?: string;
}

interface Thumbnails {
	[size: string]: { url: string } | undefined;
}

interface SubscriptionItem {
	snippet: { title: string; resourceId: { channelId: string } };
}

interface PlaylistResource {
	id: string;
	snippet: { title: string };
	contentDetails: { itemCount: number };
}

interface PlaylistItemResource {
	/** ID of this entry in the playlist (not the video ID); needed to remove it */
	id: string;
	snippet: {
		title: string;
		publishedAt: string;
		thumbnails: Thumbnails;
		videoOwnerChannelId?: string;
		videoOwnerChannelTitle?: string;
		resourceId: { videoId: string };
	};
	contentDetails: { videoId: string; videoPublishedAt?: string };
}

interface VideoResource {
	id: string;
	contentDetails: { duration: string };
}

async function request<T>(
	token: string,
	path: string,
	params: Record<string, string>,
	{ method = 'GET', body }: { method?: string; body?: unknown } = {}
): Promise<T> {
	const res = await fetch(`${API}/${path}?${new URLSearchParams(params)}`, {
		method,
		headers: {
			authorization: `Bearer ${token}`,
			...(body !== undefined && { 'content-type': 'application/json' })
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (!res.ok) {
		const json = await res.json().catch(() => null);
		const err = json?.error;
		throw new YouTubeError(res.status, err?.errors?.[0]?.reason ?? 'unknown', err?.message ?? res.statusText);
	}
	// deletes answer 204 No Content
	return res.status === 204 ? (undefined as T) : res.json();
}

function get<T>(token: string, path: string, params: Record<string, string>) {
	return request<T>(token, path, params);
}

/** Follows nextPageToken until exhausted or `max` items have been collected. */
async function getAll<T>(token: string, path: string, params: Record<string, string>, max = Infinity) {
	const items: T[] = [];
	let pageToken: string | undefined;
	do {
		const page = await get<Page<T>>(token, path, {
			...params,
			maxResults: '50',
			...(pageToken && { pageToken })
		});
		items.push(...page.items);
		pageToken = page.nextPageToken;
	} while (pageToken && items.length < max);
	return items.slice(0, max);
}

/** Like Promise.all(items.map(fn)) but with at most `limit` requests in flight. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

function bestThumbnail(thumbnails: Thumbnails) {
	return (thumbnails.medium ?? thumbnails.high ?? thumbnails.default)?.url ?? '';
}

/** Deleted and private videos come back without an owner channel; they can't be watched, so drop them. */
function isPlayable(item: PlaylistItemResource) {
	return Boolean(item.snippet.videoOwnerChannelId);
}

function toVideo(item: PlaylistItemResource): Video {
	return {
		id: item.contentDetails.videoId,
		title: item.snippet.title,
		channelId: item.snippet.videoOwnerChannelId!,
		channelTitle: item.snippet.videoOwnerChannelTitle!,
		thumbnail: bestThumbnail(item.snippet.thumbnails),
		publishedAt: item.contentDetails.videoPublishedAt ?? item.snippet.publishedAt
	};
}

/** Fills in `duration` using videos.list (1 quota unit per 50 videos). */
async function attachDurations<V extends Video>(token: string, videos: V[]) {
	const chunks: V[][] = [];
	for (let i = 0; i < videos.length; i += 50) chunks.push(videos.slice(i, i + 50));

	await mapLimit(chunks, 5, async (chunk) => {
		const { items } = await get<Page<VideoResource>>(token, 'videos', {
			part: 'contentDetails',
			id: chunk.map((v) => v.id).join(','),
			maxResults: '50'
		});
		const durations = new Map(items.map((v) => [v.id, v.contentDetails.duration]));
		for (const video of chunk) video.duration = durations.get(video.id);
	});
	return videos;
}

/**
 * YouTube has no "subscription feed" endpoint, so we build one: list the user's
 * subscriptions, read the latest uploads of each channel, and merge them by date.
 * Every channel has to be read before the newest videos are known, so unlike
 * playlists this can't be fetched in batches; the page reveals it in batches instead.
 *
 * Quota cost ≈ 1 per 50 subscriptions + 1 per subscribed channel + 1 per 50 videos for durations.
 */
export async function getSubscriptionFeed(token: string, { perChannel = 5 } = {}) {
	const subscriptions = await getAll<SubscriptionItem>(token, 'subscriptions', {
		part: 'snippet',
		mine: 'true',
		order: 'alphabetical'
	});

	const uploads = await mapLimit(subscriptions, 20, async (sub) => {
		const channelId = sub.snippet.resourceId.channelId;
		// A channel's uploads playlist ID is its channel ID with the "UC" prefix swapped for "UU",
		// which saves a channels.list round trip per subscription.
		if (!channelId.startsWith('UC')) return [];
		try {
			const page = await get<Page<PlaylistItemResource>>(token, 'playlistItems', {
				part: 'snippet,contentDetails',
				playlistId: `UU${channelId.slice(2)}`,
				maxResults: String(perChannel)
			});
			return page.items.filter(isPlayable).map(toVideo);
		} catch (e) {
			// channels with no uploads have no uploads playlist
			if (e instanceof YouTubeError && e.status === 404) return [];
			throw e;
		}
	});

	const videos = uploads.flat().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

	return {
		channelCount: subscriptions.length,
		videos: await attachDurations(token, videos)
	};
}

/** The playlists the user owns, biggest first. Quota cost: 1 per 50 playlists. */
export async function getPlaylists(token: string): Promise<PlaylistSummary[]> {
	try {
		const playlists = await getAll<PlaylistResource>(token, 'playlists', {
			part: 'snippet,contentDetails',
			mine: 'true'
		});
		return playlists
			.map((p) => ({ id: p.id, title: p.snippet.title, count: p.contentDetails.itemCount }))
			.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
	} catch (e) {
		// accounts without a YouTube channel have no playlists
		if (e instanceof YouTubeError && e.status === 404) return [];
		throw e;
	}
}

/**
 * One batch (up to 50 items) of a playlist, in playlist order. The client walks
 * through playlists batch by batch as the user scrolls.
 *
 * Quota cost: 2 (the items, plus their durations).
 */
export async function getPlaylistPage(token: string, playlistId: string, pageToken?: string): Promise<PlaylistPage> {
	const page = await get<Page<PlaylistItemResource>>(token, 'playlistItems', {
		part: 'snippet,contentDetails',
		playlistId,
		maxResults: '50',
		...(pageToken && { pageToken })
	});
	const items = page.items
		.filter(isPlayable)
		.map((item) => ({ ...toVideo(item), addedAt: item.snippet.publishedAt, itemId: item.id }));

	return {
		items: await attachDurations(token, items),
		nextPageToken: page.nextPageToken
	};
}

/**
 * Adds a video to one of the user's playlists, unless it's already there, so
 * that saving twice never creates a duplicate entry.
 *
 * Quota cost: 1 to check, plus 50 if it has to be added.
 */
export async function addToPlaylist(
	token: string,
	playlistId: string,
	videoId: string
): Promise<{ itemId: string; added: boolean }> {
	const existing = await get<Page<PlaylistItemResource>>(token, 'playlistItems', {
		part: 'id',
		playlistId,
		videoId,
		maxResults: '1'
	});
	if (existing.items[0]) return { itemId: existing.items[0].id, added: false };

	const item = await request<PlaylistItemResource>(
		token,
		'playlistItems',
		{ part: 'snippet' },
		{ method: 'POST', body: { snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } } }
	);
	return { itemId: item.id, added: true };
}

/** Removes one entry from a playlist. Quota cost: 50. */
export async function removeFromPlaylist(token: string, itemId: string) {
	try {
		await request<void>(token, 'playlistItems', { id: itemId }, { method: 'DELETE' });
	} catch (e) {
		// already gone (e.g. removed on youtube.com meanwhile), which is what we wanted
		if (e instanceof YouTubeError && e.status === 404) return;
		throw e;
	}
}

/** Returns the signed-in user's access token, or sends them to sign in. */
export function requireToken({ locals, url }: RequestEvent) {
	if (!locals.session) {
		redirect(303, `/auth/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
	}
	return locals.session.accessToken;
}

/**
 * Turns YouTube failures into errors with a user-facing message. Used for data that
 * is streamed to the page or fetched by it, where we can't redirect or touch cookies
 * any more, so the page renders the error instead.
 */
export async function friendlyErrors<T>(request: Promise<T>): Promise<T> {
	try {
		return await request;
	} catch (e) {
		if (!(e instanceof YouTubeError)) throw e;
		if (e.status === 401) {
			error(401, 'Your Google session has expired. Please sign in again.');
		}
		// sessions from before the app asked for write access only hold the read-only scope
		if (e.reason === 'insufficientPermissions' || /insufficient authentication scopes/i.test(e.message)) {
			error(401, 'YT Client needs permission to manage your playlists. Sign in again and allow it.');
		}
		if (e.reason === 'quotaExceeded' || e.reason === 'rateLimitExceeded') {
			error(503, 'The YouTube API quota for this app is used up. Try again later.');
		}
		if (e.status === 403) {
			error(403, `YouTube refused the request: ${e.message}`);
		}
		throw e;
	}
}
