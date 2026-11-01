import { error } from '@sveltejs/kit';
import { friendlyErrors, removeFromPlaylist } from '#lib/server/youtube.ts';
import type { RequestHandler } from './$types';

/** Removes one entry (by its playlist item ID, not the video ID) from the playlist. */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.session) error(401, 'You are signed out. Please sign in again.');

	// YouTube owns the item → playlist mapping, so `params.id` is only for a readable URL;
	// it rejects item IDs from playlists the user doesn't own.
	await friendlyErrors(removeFromPlaylist(locals.session.accessToken, params.itemId));
	return new Response(null, { status: 204 });
};
