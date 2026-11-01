import type { Handle } from '@sveltejs/kit/hooks';
import { ensureFreshSession, readSession } from '#lib/server/session.ts';

export const handle: Handle = async ({ event, resolve }) => {
	const session = readSession(event.cookies);
	event.locals.session = session && (await ensureFreshSession(event.cookies, session));

	const response = await resolve(event);
	// The app can change the user's playlists, so never let another site frame it
	// and trick clicks onto its buttons (clickjacking).
	response.headers.set('content-security-policy', "frame-ancestors 'none'");
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('x-content-type-options', 'nosniff');
	return response;
};
