import type { Cookies } from '@sveltejs/kit';
import { seal, unseal } from './crypto.ts';
import { refreshAccessToken, type GoogleUser } from './google.ts';

export const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export interface Session {
	user: GoogleUser;
	accessToken: string;
	refreshToken: string;
	/** epoch milliseconds */
	expiresAt: number;
}

export function readSession(cookies: Cookies) {
	return unseal<Session>(cookies.get(SESSION_COOKIE));
}

export function writeSession(cookies: Cookies, session: Session) {
	cookies.set(SESSION_COOKIE, seal(session), {
		path: '/',
		sameSite: 'lax',
		maxAge: SESSION_MAX_AGE
	});
}

export function clearSession(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/**
 * Returns a session whose access token is valid for at least another minute,
 * refreshing (and re-writing the cookie) if needed. Returns null if the refresh
 * token has been revoked or expired.
 */
export async function ensureFreshSession(cookies: Cookies, session: Session): Promise<Session | null> {
	if (session.expiresAt - 60_000 > Date.now()) return session;

	try {
		const tokens = await refreshAccessToken(session.refreshToken);
		const fresh: Session = {
			...session,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token ?? session.refreshToken,
			expiresAt: Date.now() + tokens.expires_in * 1000
		};
		writeSession(cookies, fresh);
		return fresh;
	} catch {
		clearSession(cookies);
		return null;
	}
}
