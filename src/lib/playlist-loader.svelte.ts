import { SvelteMap } from 'svelte/reactivity';
import type { PlaylistItem, PlaylistPage, PlaylistRef, PlaylistSummary, PlaylistVideo } from '#lib/types.ts';

/** Key of the feed that walks through every playlist */
const ALL = 'all';

/** New videos to add per scroll batch */
const BATCH_SIZE = 24;
/** Upper bound on API calls per batch, so a run of empty playlists can't spin */
const MAX_REQUESTS_PER_BATCH = 5;
/** Following playlists whose first page is fetched in parallel with the current one */
const PREFETCH = 3;
/** Playlists loaded in parallel when shuffling */
const SHUFFLE_CONCURRENCY = 6;

export interface LoadError {
	status?: number;
	message: string;
}

/** Video IDs of one view (all playlists, or a selection of them) in load order, plus where to continue from. */
export class Feed {
	ids = $state<string[]>([]);
	loading = $state(false);
	done = $state(false);
	error = $state<LoadError | null>(null);

	/** position in `playlists` and the YouTube page token within it */
	index = 0;
	pageToken: string | undefined;
	#seen = new Set<string>();

	constructor(public playlists: PlaylistRef[]) {
		this.done = playlists.length === 0;
	}

	/** Appends a video unless this feed already has it; returns whether it was new. */
	add(id: string) {
		if (this.#seen.has(id)) return false;
		this.#seen.add(id);
		this.ids.push(id);
		return true;
	}

	/** Drops a video, e.g. after it was removed from the playlist that brought it in. */
	remove(id: string) {
		if (!this.#seen.delete(id)) return;
		this.ids.splice(this.ids.indexOf(id), 1);
	}

	advance(nextPageToken: string | undefined) {
		if (nextPageToken) {
			this.pageToken = nextPageToken;
		} else {
			this.index++;
			this.pageToken = undefined;
			this.done = this.index >= this.playlists.length;
		}
	}
}

/**
 * A random order of every video in a selection. Shuffling needs the whole selection
 * up front, so it loads every page first and reports progress while it does.
 */
export class Shuffle {
	ids = $state<string[]>([]);
	loading = $state(true);
	error = $state<LoadError | null>(null);
	pagesLoaded = $state(0);
	cancelled = false;

	constructor(
		public totalPages: number,
		/** the playlists being shuffled */
		public playlistIds: Set<string>
	) {}

	get progress() {
		return this.totalPages ? Math.min(1, this.pagesLoaded / this.totalPages) : 1;
	}

	/** stop fetching, e.g. when the selection changes before loading finishes */
	cancel() {
		this.cancelled = true;
	}
}

/** Fisher–Yates: every order is equally likely */
function shuffled<T>(items: T[]) {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function reactive<T>(value: T): T {
	const proxy = $state(value);
	return proxy;
}

/** Calls one of our /api endpoints, throwing a LoadError on failure. */
async function api<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
	const res = await fetch(url, {
		method: init.method ?? 'GET',
		headers: {
			accept: 'application/json',
			...(init.body !== undefined && { 'content-type': 'application/json' })
		},
		body: init.body === undefined ? undefined : JSON.stringify(init.body)
	});
	if (!res.ok) {
		const body = await res.json().catch(() => null);
		throw {
			status: res.status,
			message: body?.message ?? 'Something went wrong talking to YouTube.'
		} satisfies LoadError;
	}
	return res.status === 204 ? (undefined as T) : res.json();
}

function itemsUrl(playlistId: string) {
	return `/api/playlists/${encodeURIComponent(playlistId)}/items`;
}

function fetchPage(playlistId: string, pageToken?: string) {
	const query = pageToken ? `?${new URLSearchParams({ pageToken })}` : '';
	return api<PlaylistPage>(itemsUrl(playlistId) + query);
}

/**
 * Loads the user's playlist videos batch by batch. Videos are de-duplicated across
 * playlists, and each one collects a tag for every playlist it has been seen in.
 */
export class PlaylistLoader {
	/** every video loaded so far, by ID */
	videos = new SvelteMap<string, PlaylistVideo>();

	/** the user's playlists; reactive, so counts update when videos are added or removed */
	playlists: PlaylistSummary[];
	/** one feed per selection that has been viewed, so going back to it keeps its progress */
	#feeds = new Map<string, Feed>();
	#shuffles = new Set<Shuffle>();
	/** YouTube pages already fetched, so switching views never pays for the same page twice */
	#pages = new Map<string, Promise<PlaylistPage>>();
	/**
	 * "playlistId:videoId" pairs removed during this visit. Cached pages still contain
	 * them, so they're skipped when those pages are read again.
	 */
	#removed = new Set<string>();

	constructor(playlists: PlaylistSummary[]) {
		this.playlists = reactive(playlists.map((p) => ({ ...p })));
	}

	/** Saves a video to a playlist on YouTube, then shows it there. */
	async addTo(videoId: string, playlist: PlaylistSummary) {
		const { itemId, added } = await api<{ itemId: string; added: boolean }>(itemsUrl(playlist.id), {
			method: 'POST',
			body: { videoId }
		});
		this.#removed.delete(`${playlist.id}:${videoId}`);
		if (added) playlist.count++;

		const video = this.videos.get(videoId);
		if (video && !video.playlists.some((p) => p.id === playlist.id)) {
			video.playlists.push({ id: playlist.id, title: playlist.title, itemId });
		}
		// YouTube appends it to the end of the playlist, so feeds that already
		// reached the end show it there; the others will reach it as they scroll.
		for (const feed of this.#feeds.values()) {
			if (feed.done && feed.playlists.some((p) => p.id === playlist.id)) feed.add(videoId);
		}
	}

	/** Removes a video from a playlist on YouTube, then from every view that only had it through that playlist. */
	async removeFrom(videoId: string, playlist: PlaylistSummary) {
		const video = this.videos.get(videoId);
		const membership = video?.playlists.find((p) => p.id === playlist.id);
		if (!video || !membership) return;

		await api<void>(`${itemsUrl(playlist.id)}/${encodeURIComponent(membership.itemId)}`, { method: 'DELETE' });
		this.#removed.add(`${playlist.id}:${videoId}`);
		playlist.count = Math.max(0, playlist.count - 1);
		video.playlists.splice(video.playlists.indexOf(membership), 1);

		const stillIn = (ids: { has(id: string): boolean }) => video.playlists.some((p) => ids.has(p.id));
		for (const feed of this.#feeds.values()) {
			if (!stillIn(new Set(feed.playlists.map((p) => p.id)))) feed.remove(videoId);
		}
		for (const shuffle of this.#shuffles) {
			if (shuffle.cancelled) this.#shuffles.delete(shuffle);
			else if (!stillIn(shuffle.playlistIds)) shuffle.ids = shuffle.ids.filter((id) => id !== videoId);
		}
	}

	/**
	 * The feed for a selection of playlist IDs (empty means all playlists). It walks
	 * the selected playlists in the user's playlist order, whatever order they were picked in.
	 */
	feed(ids: string[] = []) {
		const key = ids.length ? [...ids].sort().join(',') : ALL;
		let feed = this.#feeds.get(key);
		if (!feed) {
			feed = new Feed(this.#select(ids));
			this.#feeds.set(key, feed);
		}
		return feed;
	}

	/**
	 * Starts loading every video of a selection (empty means all playlists) and puts
	 * them in a random order. Pages already fetched are reused, so shuffling the same
	 * selection again is instant.
	 */
	shuffle(ids: string[] = []) {
		const playlists = this.#select(ids);
		// YouTube's counts include deleted and private videos, which still take up page slots
		const totalPages = playlists.reduce((sum, p) => sum + Math.max(1, Math.ceil(p.count / 50)), 0);
		const shuffle = new Shuffle(totalPages, new Set(playlists.map((p) => p.id)));
		this.#shuffles.add(shuffle);
		this.#loadShuffle(shuffle, playlists);
		return shuffle;
	}

	async #loadShuffle(shuffle: Shuffle, playlists: PlaylistSummary[]) {
		const all = new Set<string>();
		// Pages within a playlist have to be fetched one after another (each page
		// token comes from the previous page), so the parallelism is across playlists.
		let next = 0;
		const worker = async () => {
			while (next < playlists.length && !shuffle.cancelled) {
				const playlist = playlists[next++];
				let pageToken: string | undefined;
				do {
					const page = await this.#page(playlist.id, pageToken);
					for (const item of this.#tag(playlist, page.items)) all.add(item.id);
					shuffle.pagesLoaded++;
					pageToken = page.nextPageToken;
				} while (pageToken && !shuffle.cancelled);
			}
		};

		try {
			await Promise.all(Array.from({ length: SHUFFLE_CONCURRENCY }, worker));
			if (!shuffle.cancelled) shuffle.ids = shuffled([...all]);
		} catch (e) {
			shuffle.cancel(); // stop the other workers
			shuffle.error = e as LoadError;
		} finally {
			shuffle.loading = false;
		}
	}

	#select(ids: string[]) {
		return ids.length ? this.playlists.filter((p) => ids.includes(p.id)) : this.playlists;
	}

	/** Fetches the next batch of a feed. Safe to call repeatedly; extra calls are ignored. */
	async loadMore(feed: Feed) {
		if (feed.loading || feed.done) return;

		feed.loading = true;
		feed.error = null;
		try {
			let added = 0;
			for (let i = 0; i < MAX_REQUESTS_PER_BATCH && added < BATCH_SIZE && !feed.done; i++) {
				const playlist = feed.playlists[feed.index];
				// Many playlists are small, so start on the next few in parallel; the
				// page cache hands them over when the walk gets there.
				for (const next of feed.playlists.slice(feed.index + 1, feed.index + 1 + PREFETCH)) {
					this.#page(next.id);
				}
				const page = await this.#page(playlist.id, feed.pageToken);
				added += this.#ingest(feed, playlist, page.items);
				feed.advance(page.nextPageToken);
			}
		} catch (e) {
			feed.error = e as LoadError;
		} finally {
			feed.loading = false;
		}
	}

	#page(playlistId: string, pageToken?: string) {
		const key = `${playlistId}:${pageToken ?? ''}`;
		let page = this.#pages.get(key);
		if (!page) {
			page = fetchPage(playlistId, pageToken);
			this.#pages.set(key, page);
			// forget failures so "Try again" really retries
			page.catch(() => this.#pages.delete(key));
		}
		return page;
	}

	#ingest(feed: Feed, playlist: PlaylistRef, items: PlaylistItem[]) {
		return this.#tag(playlist, items).filter((item) => feed.add(item.id)).length;
	}

	/**
	 * Records the videos, tagging each with this playlist. Returns the items that are
	 * still in it (cached pages can include ones removed since).
	 */
	#tag(playlist: PlaylistRef, items: PlaylistItem[]) {
		const live = items.filter((item) => !this.#removed.has(`${playlist.id}:${item.id}`));
		for (const { itemId, ...item } of live) {
			const membership = { id: playlist.id, title: playlist.title, itemId };
			const video = this.videos.get(item.id);
			if (!video) {
				this.videos.set(item.id, reactive({ ...item, playlists: [membership] }));
			} else {
				if (!video.playlists.some((p) => p.id === playlist.id)) video.playlists.push(membership);
				if (item.addedAt > video.addedAt) video.addedAt = item.addedAt;
			}
		}
		return live;
	}
}
