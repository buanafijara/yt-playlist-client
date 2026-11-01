import { redirect } from '@sveltejs/kit';
import { revokeToken } from '#lib/server/google.ts';
import { clearSession } from '#lib/server/session.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) await revokeToken(locals.session.refreshToken);
	clearSession(cookies);
	redirect(303, '/');
};
