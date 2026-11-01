import { redirect } from '@sveltejs/kit';
import { randomToken, seal, sha256base64url } from '#lib/server/crypto.ts';
import { authorizationUrl } from '#lib/server/google.ts';
import { OAUTH_COOKIE, type OAuthState } from '../oauth.ts';
import type { RequestHandler } from './$types';

/**
 * Where to go after signing in. Only paths on this site are allowed, never an open
 * redirect. Resolving against our origin also catches tricks like `/\evil.com`,
 * which browsers treat as `//evil.com`.
 */
function safeReturnTo(value: string | null, origin: string) {
	if (value) {
		try {
			const target = new URL(value, origin);
			if (target.origin === origin) return target.pathname + target.search + target.hash;
		} catch {
			// not a valid URL
		}
	}
	return '/playlists';
}

export const GET: RequestHandler = ({ url, cookies }) => {
	const state = randomToken();
	const codeVerifier = randomToken(48);

	cookies.set(
		OAUTH_COOKIE,
		seal({
			state,
			codeVerifier,
			returnTo: safeReturnTo(url.searchParams.get('returnTo'), url.origin)
		} satisfies OAuthState),
		{ path: '/auth', sameSite: 'lax', maxAge: 600 }
	);

	redirect(
		303,
		authorizationUrl({
			redirectUri: `${url.origin}/auth/callback`,
			state,
			codeChallenge: sha256base64url(codeVerifier)
		}),
		{ external: ['https://accounts.google.com'] }
	);
};
