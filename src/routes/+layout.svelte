<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const nav = [
		{ href: '/playlists', label: 'Playlists' },
		{ href: '/feed', label: 'Subscriptions' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>YT Client</title>
</svelte:head>

<header>
	<a class="brand" href={data.user ? '/playlists' : '/'}>▶ YT Client</a>

	{#if data.user}
		<nav>
			{#each nav as item (item.href)}
				<a href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="user">
			{#if data.user.picture}
				<img src={data.user.picture} alt="" width="32" height="32" referrerpolicy="no-referrer" />
			{/if}
			<span class="name">{data.user.name}</span>
			<form method="POST" action="/auth/logout">
				<button>Sign out</button>
			</form>
		</div>
	{/if}
</header>

<main>
	{@render children()}
</main>

<style>
	:global {
		:root {
			--bg: #fff;
			--surface: #f2f2f2;
			--text: #0f0f0f;
			--muted: #606060;
			--accent: #c00;
			--border: #e5e5e5;
			color-scheme: light dark;
		}

		@media (prefers-color-scheme: dark) {
			:root {
				--bg: #0f0f0f;
				--surface: #272727;
				--text: #f1f1f1;
				--muted: #aaa;
				--accent: #f33;
				--border: #303030;
			}
		}

		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			background: var(--bg);
			color: var(--text);
			font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		}

		a {
			color: inherit;
		}

		button {
			font: inherit;
			cursor: pointer;
		}
	}

	header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.6rem 1.5rem;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
	}

	.brand {
		font-weight: 700;
		font-size: 1.1rem;
		text-decoration: none;
		color: var(--accent);
	}

	nav {
		display: flex;
		gap: 0.25rem;
	}

	nav a {
		padding: 0.4rem 0.8rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 500;
	}

	nav a:hover {
		background: var(--surface);
	}

	nav a[aria-current='page'] {
		background: var(--text);
		color: var(--bg);
	}

	.user {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.user img {
		border-radius: 50%;
	}

	.user button {
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: none;
		color: var(--text);
	}

	main {
		padding: 1.5rem;
		max-width: 1600px;
		margin: 0 auto;
	}

	@media (max-width: 640px) {
		header {
			flex-wrap: wrap;
			gap: 0.75rem;
			padding: 0.6rem 1rem;
		}

		.name {
			display: none;
		}

		main {
			padding: 1rem;
		}
	}
</style>
