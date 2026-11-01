import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$app/env/private';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export const SCOPES = [
	'openid',
	'email',
	'profile',
	// full access rather than youtube.readonly: needed to add videos to and remove them from playlists
	'https://www.googleapis.com/auth/youtube'
];

interface TokenResponse {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	id_token?: string;
	scope: string;
	token_type: string;
}

export interface GoogleUser {
	email: string;
	name: string;
	picture?: string;
}

export function authorizationUrl(opts: { redirectUri: string; state: string; codeChallenge: string }) {
	const url = new URL(AUTH_URL);
	url.search = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: opts.redirectUri,
		response_type: 'code',
		scope: SCOPES.join(' '),
		state: opts.state,
		code_challenge: opts.codeChallenge,
		code_challenge_method: 'S256',
		// offline + consent guarantees a refresh token, so the session survives the 1h access token lifetime
		access_type: 'offline',
		prompt: 'consent'
	}).toString();
	return url;
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			...params
		})
	});
	if (!res.ok) {
		throw new Error(`Google token endpoint returned ${res.status}: ${await res.text()}`);
	}
	return res.json();
}

export function exchangeCode(code: string, redirectUri: string, codeVerifier: string) {
	return tokenRequest({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri,
		code_verifier: codeVerifier
	});
}

export function refreshAccessToken(refreshToken: string) {
	return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

export async function revokeToken(token: string) {
	await fetch(REVOKE_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ token })
	}).catch(() => {});
}

/**
 * Reads the profile claims from an ID token. The token came straight from Google's
 * token endpoint over TLS, so per OIDC we can trust it without verifying the signature.
 */
export function userFromIdToken(idToken: string): GoogleUser {
	const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
	return {
		email: payload.email,
		name: payload.name ?? payload.email,
		picture: payload.picture
	};
}
