import { friendlyErrors, getPlaylists, requireToken } from '#lib/server/youtube.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const token = requireToken(event);
	// Only the playlist list is loaded here; the videos are fetched in batches by the page.
	// Not awaited, so the page renders a skeleton right away.
	return { playlists: friendlyErrors(getPlaylists(token)) };
};
