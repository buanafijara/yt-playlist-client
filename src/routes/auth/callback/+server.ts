import { error, redirect } from '@sveltejs/kit';
import { unseal } from '#lib/server/crypto.ts';
import { exchangeCode, SCOPES, userFromIdToken } from '#lib/server/google.ts';
import { writeSession } from '#lib/server/session.ts';
import { OAUTH_COOKIE, type OAuthState } from '../oauth.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const pending = unseal<OAuthState>(cookies.get(OAUTH_COOKIE));
	cookies.delete(OAUTH_COOKIE, { path: '/auth' });

	const googleError = url.searchParams.get('error');
	if (googleError === 'access_denied') redirect(303, '/?error=denied');
	if (googleError) error(400, `Google sign-in failed: ${googleError}`);

	const code = url.searchParams.get('code');
	if (!pending || !code || url.searchParams.get('state') !== pending.state) {
		error(400, 'Sign-in session expired or was tampered with. Please try again.');
	}

	const tokens = await exchangeCode(code, `${url.origin}/auth/callback`, pending.codeVerifier);

	// Users can untick individual scopes on Google's consent screen
	const granted = tokens.scope.split(' ');
	if (!tokens.refresh_token || !tokens.id_token || SCOPES.some((s) => s.includes('/') && !granted.includes(s))) {
		redirect(303, '/?error=scope');
	}

	writeSession(cookies, {
		user: userFromIdToken(tokens.id_token),
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		expiresAt: Date.now() + tokens.expires_in * 1000
	});

	redirect(303, pending.returnTo);
};
