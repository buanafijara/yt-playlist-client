import { error, json } from '@sveltejs/kit';
import { friendlyErrors, getPlaylistPage } from '#lib/server/youtube.ts';
import type { RequestHandler } from './$types';

/** One batch of a playlist's videos; the page calls this as the user scrolls. */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.session) error(401, 'You are signed out. Please sign in again.');

	const page = await friendlyErrors(
		getPlaylistPage(locals.session.accessToken, params.id, url.searchParams.get('pageToken') ?? undefined)
	);
	return json(page);
};
