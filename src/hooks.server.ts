import type { Handle } from '@sveltejs/kit/hooks';
import { ensureFreshSession, readSession } from '#lib/server/session.ts';

export const handle: Handle = async ({ event, resolve }) => {
	const session = readSession(event.cookies);
	event.locals.session = session && (await ensureFreshSession(event.cookies, session));
	return resolve(event);
};
