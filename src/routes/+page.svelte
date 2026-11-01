<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const errors: Record<string, string> = {
		denied: 'Sign-in was cancelled.',
		scope:
			'YT Client needs read access to your YouTube account. Sign in again and tick “View your YouTube account” on the Google consent screen.'
	};
</script>

<section>
	<h1>Your YouTube, without the noise</h1>
	<p>See the latest uploads from your subscriptions, and every video across your playlists in one place.</p>

	{#if data.error}
		<p class="error">{errors[data.error] ?? 'Something went wrong signing in.'}</p>
	{/if}

	<a class="signin" href="/auth/login" data-sveltekit-reload>Sign in with Google</a>
	<p class="fine">Read-only access. Nothing is stored on our side; your session lives in an encrypted cookie.</p>
</section>

<style>
	section {
		max-width: 36rem;
		margin: 15vh auto 0;
		text-align: center;
	}

	h1 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		margin-bottom: 0.5rem;
	}

	p {
		color: var(--muted);
		line-height: 1.5;
	}

	.signin {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 999px;
		background: var(--accent);
		color: #fff;
		font-weight: 600;
		text-decoration: none;
	}

	.error {
		color: var(--accent);
	}

	.fine {
		font-size: 0.8rem;
		margin-top: 1rem;
	}
</style>
