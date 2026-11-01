/** Short-lived cookie carrying the CSRF state and PKCE verifier between /auth/login and /auth/callback */
export const OAUTH_COOKIE = 'oauth';

export interface OAuthState {
	state: string;
	codeVerifier: string;
	returnTo: string;
}
