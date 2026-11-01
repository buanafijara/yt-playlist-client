import { redirect } from '@sveltejs/kit';
import { randomToken, seal, sha256base64url } from '#lib/server/crypto.ts';
import { authorizationUrl } from '#lib/server/google.ts';
import { OAUTH_COOKIE, type OAuthState } from '../oauth.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, cookies }) => {
	const state = randomToken();
	const codeVerifier = randomToken(48);
	const returnTo = url.searchParams.get('returnTo');

	cookies.set(
		OAUTH_COOKIE,
		seal({
			state,
			codeVerifier,
			// only allow same-site relative paths, never an open redirect
			returnTo: returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/playlists'
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
