import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { SESSION_SECRET } from '$app/env/private';

// The app has no database, so everything we need to remember between requests
// (tokens, OAuth state) lives in cookies, encrypted and authenticated with AES-256-GCM.
const key = createHash('sha256').update(SESSION_SECRET).digest();

export function seal(data: unknown): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
	return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export function unseal<T>(value: string | undefined): T | null {
	if (!value) return null;
	try {
		const raw = Buffer.from(value, 'base64url');
		const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
		decipher.setAuthTag(raw.subarray(12, 28));
		const body = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
		return JSON.parse(body.toString('utf8')) as T;
	} catch {
		// tampered, truncated, or sealed with an old secret
		return null;
	}
}

export function randomToken(bytes = 32) {
	return randomBytes(bytes).toString('base64url');
}

export function sha256base64url(value: string) {
	return createHash('sha256').update(value).digest('base64url');
}
