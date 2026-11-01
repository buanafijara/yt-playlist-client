<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import InfiniteScroll from '#lib/components/InfiniteScroll.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import VideoCard from '#lib/components/VideoCard.svelte';
	import VideoGrid from '#lib/components/VideoGrid.svelte';
	import VideoGridSkeleton from '#lib/components/VideoGridSkeleton.svelte';
	import type { PageProps } from './$types';

	/** cards revealed per scroll batch */
	const BATCH_SIZE = 24;

	let { data }: PageProps = $props();

	// The whole feed arrives at once (it has to be merged by date across every channel),
	// so it's rendered in batches to keep the page light.
	let shown = $state(BATCH_SIZE);
</script>

<svelte:head>
	<title>Subscriptions · YT Client</title>
</svelte:head>

<h1>Subscriptions</h1>

{#await data.result}
	<div class="bone summary"></div>
	<VideoGridSkeleton />
{:then { channelCount, videos }}
	{#if videos.length}
		<p class="summary">Latest uploads from {channelCount} channels</p>
		<VideoGrid>
			{#each videos.slice(0, shown) as video (video.id)}
				<VideoCard {video} />
			{/each}
		</VideoGrid>
		{#if shown >= videos.length}
			<p class="end">You're all caught up.</p>
		{/if}
		<InfiniteScroll onload={() => (shown += BATCH_SIZE)} paused={shown >= videos.length} />
	{:else if channelCount}
		<EmptyState
			icon="◷"
			title="Nothing new"
			message="None of the {channelCount} channels you subscribe to have uploaded anything recently."
		/>
	{:else}
		<EmptyState
			icon="＋"
			title="No subscriptions yet"
			message="Subscribe to channels on YouTube and their latest uploads will show up here."
		>
			{#snippet actions()}
				<a href="https://www.youtube.com" target="_blank" rel="noopener">Find channels</a>
			{/snippet}
		</EmptyState>
	{/if}
{:catch error}
	<LoadError {error} />
{/await}

<style>
	h1 {
		margin: 0 0 0.4rem;
		font-size: 1.5rem;
	}

	.summary {
		margin: 0 0 1.5rem;
		color: var(--muted);
	}

	.bone.summary {
		height: 1rem;
		width: 14rem;
		margin-top: 0.2rem;
		border-radius: 6px;
		background: var(--surface);
	}

	.end {
		margin: 3rem 0 1rem;
		text-align: center;
		color: var(--muted);
		font-size: 0.875rem;
	}
</style>
