import { defineEnvVars } from '@sveltejs/kit/env';

function required(name: string) {
	return (value: string | undefined) => {
		if (!value) throw new Error(`${name} must be set (see .env.example)`);
		return value;
	};
}

export const variables = defineEnvVars({
	GOOGLE_CLIENT_ID: {
		description: 'OAuth 2.0 client ID from Google Cloud Console',
		schema: required('GOOGLE_CLIENT_ID')
	},
	GOOGLE_CLIENT_SECRET: {
		description: 'OAuth 2.0 client secret from Google Cloud Console',
		schema: required('GOOGLE_CLIENT_SECRET')
	},
	SESSION_SECRET: {
		description: 'Random string (32+ chars) used to encrypt the session cookie',
		schema: (value) => {
			if (!value || value.length < 32) {
				throw new Error('SESSION_SECRET must be at least 32 characters (try `openssl rand -base64 32`)');
			}
			return value;
		}
	}
});
