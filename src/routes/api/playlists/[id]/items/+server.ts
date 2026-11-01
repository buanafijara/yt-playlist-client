import { error, json } from '@sveltejs/kit';
import { addToPlaylist, friendlyErrors, getPlaylistPage } from '#lib/server/youtube.ts';
import type { RequestHandler } from './$types';

const VIDEO_ID = /^[\w-]{11}$/;

/** One batch of a playlist's videos; the page calls this as the user scrolls. */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.session) error(401, 'You are signed out. Please sign in again.');

	const page = await friendlyErrors(
		getPlaylistPage(locals.session.accessToken, params.id, url.searchParams.get('pageToken') ?? undefined)
	);
	return json(page);
};

/** Saves a video to this playlist. Body: `{ "videoId": "..." }` */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.session) error(401, 'You are signed out. Please sign in again.');

	const { videoId } = await request.json().catch(() => ({}));
	if (typeof videoId !== 'string' || !VIDEO_ID.test(videoId)) error(400, 'Invalid video ID');

	return json(await friendlyErrors(addToPlaylist(locals.session.accessToken, params.id, videoId)));
};
