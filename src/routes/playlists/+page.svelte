<script lang="ts">
	import LoadError from '#lib/components/LoadError.svelte';
	import PlaylistBrowser from '#lib/components/PlaylistBrowser.svelte';
	import VideoGridSkeleton from '#lib/components/VideoGridSkeleton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Playlists · YT Client</title>
</svelte:head>

<h1>Playlists</h1>

{#await data.playlists}
	<div class="bone summary"></div>
	<div class="filters" aria-hidden="true">
		{#each [3, 6, 5, 8, 4] as width, i (i)}
			<div class="bone chip" style:width="{width}rem"></div>
		{/each}
	</div>
	<VideoGridSkeleton tags />
{:then playlists}
	<PlaylistBrowser {playlists} />
{:catch error}
	<LoadError {error} />
{/await}

<style>
	h1 {
		margin: 0 0 0.4rem;
		font-size: 1.5rem;
	}

	.filters {
		display: flex;
		gap: 0.5rem;
		overflow: hidden;
		margin-bottom: 2rem;
	}

	.bone {
		border-radius: 8px;
		background: var(--surface);
	}

	.summary {
		height: 1rem;
		width: 14rem;
		margin: 0.2rem 0 1.15rem;
		border-radius: 6px;
	}

	.chip {
		flex: none;
		height: 2rem;
	}
</style>
