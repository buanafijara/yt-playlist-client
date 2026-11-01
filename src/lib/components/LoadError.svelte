<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from './EmptyState.svelte';

	interface Props {
		error: unknown;
		/** what "Try again" does; reloads the page data by default */
		onretry?: () => void;
	}

	let { error, onretry = () => invalidateAll() }: Props = $props();

	// streamed load errors arrive as App.Error ({ status, message })
	const { status, message } = $derived(error as Partial<App.Error>);
	const login = $derived(`/auth/login?returnTo=${encodeURIComponent(page.url.pathname)}`);
</script>

<EmptyState
	icon="!"
	title={status === 401 ? 'Signed out' : "Couldn't load your videos"}
	message={message ?? 'Something went wrong talking to YouTube.'}
>
	{#snippet actions()}
		{#if status === 401}
			<a href={login} data-sveltekit-reload>Sign in again</a>
		{:else}
			<button onclick={onretry}>Try again</button>
		{/if}
	{/snippet}
</EmptyState>
