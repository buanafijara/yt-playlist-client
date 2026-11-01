<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		title: string;
		message?: string;
		/** buttons or links shown under the message */
		actions?: Snippet;
	}

	let { icon = '▶', title, message, actions }: Props = $props();
</script>

<div class="empty">
	<div class="icon" aria-hidden="true">{icon}</div>
	<h2>{title}</h2>
	{#if message}<p>{message}</p>{/if}
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		max-width: 28rem;
		margin: 10vh auto;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		background: var(--surface);
		color: var(--muted);
		font-size: 1.6rem;
		margin-bottom: 1rem;
	}

	h2 {
		margin: 0 0 0.4rem;
		font-size: 1.15rem;
	}

	p {
		margin: 0;
		color: var(--muted);
		line-height: 1.5;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1.25rem;
	}

	.actions :global(a),
	.actions :global(button) {
		padding: 0.5rem 1.1rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: none;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		text-decoration: none;
	}

	.actions :global(:first-child) {
		border-color: var(--text);
		background: var(--text);
		color: var(--bg);
	}
</style>
