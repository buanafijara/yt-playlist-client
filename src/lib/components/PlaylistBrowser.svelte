<script lang="ts">
	import EmptyState from './EmptyState.svelte';
	import InfiniteScroll from './InfiniteScroll.svelte';
	import LoadError from './LoadError.svelte';
	import VideoCard from './VideoCard.svelte';
	import VideoGrid from './VideoGrid.svelte';
	import VideoGridSkeleton from './VideoGridSkeleton.svelte';
	import PlaylistPicker from './PlaylistPicker.svelte';
	import { onDestroy } from 'svelte';
	import { PlaylistLoader, type Shuffle } from '#lib/playlist-loader.svelte.ts';
	import type { PlaylistSummary } from '#lib/types.ts';

	/** shuffled cards revealed per scroll batch */
	const SHUFFLE_BATCH = 24;

	let { playlists }: { playlists: PlaylistSummary[] } = $props();

	// svelte-ignore state_referenced_locally (the playlist list is fixed for the life of the page)
	const loader = new PlaylistLoader(playlists);

	/** selected playlist IDs, in the user's playlist order; empty means all */
	let selected = $state<string[]>([]);
	// Set alongside `selected` rather than derived, because looking up a selection
	// for the first time creates its feed.
	let feed = $state.raw(loader.feed());
	/** when set, the list shows this random order instead of the feed */
	let shuffle = $state.raw<Shuffle | null>(null);
	let shown = $state(SHUFFLE_BATCH);

	const videos = $derived(
		(shuffle ? shuffle.ids.slice(0, shown) : feed.ids).map((id) => loader.videos.get(id)!)
	);
	const error = $derived(shuffle ? shuffle.error : feed.error);
	const chosen = $derived(playlists.filter((p) => selected.includes(p.id)));
	const total = $derived((chosen.length ? chosen : playlists).reduce((sum, p) => sum + p.count, 0));
	const only = $derived(chosen.length === 1 ? chosen[0] : undefined);

	function select(ids: string[]) {
		selected = playlists.filter((p) => ids.includes(p.id)).map((p) => p.id);
		// every playlist ticked is the same as "All", without a chip for each one
		if (selected.length === playlists.length) selected = [];
		feed = loader.feed(selected);
		if (shuffle) startShuffle();
		scrollTo({ top: 0 });
	}

	function startShuffle() {
		shuffle?.cancel();
		shuffle = loader.shuffle(selected);
		shown = SHUFFLE_BATCH;
		scrollTo({ top: 0 });
	}

	function stopShuffle() {
		shuffle?.cancel();
		shuffle = null;
		scrollTo({ top: 0 });
	}

	onDestroy(() => shuffle?.cancel());

	function toggle(id: string) {
		select(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
	}
</script>

{#if !playlists.length}
	<EmptyState
		icon="☰"
		title="No playlists yet"
		message="Playlists you create on YouTube will show up here, with every video tagged by the playlists it's in."
	>
		{#snippet actions()}
			<a href="https://www.youtube.com/feed/playlists" target="_blank" rel="noopener">Open YouTube</a>
		{/snippet}
	</EmptyState>
{:else}
	<p class="summary">
		{#if only}
			{total} videos in “{only.title}”
		{:else if chosen.length}
			{total} videos in {chosen.length} playlists
		{:else}
			{playlists.length} playlists · {total} videos
		{/if}
		{#if shuffle}· shuffled{/if}
	</p>

	<!-- only the selection is shown as chips; the full list lives in the picker -->
	<div class="filters" role="toolbar" aria-label="Filter by playlist">
		<button class="chip" aria-pressed={!chosen.length} onclick={() => select([])}>All</button>
		{#each chosen as playlist (playlist.id)}
			<button
				class="chip"
				aria-pressed="true"
				aria-label="Remove {playlist.title} from the filter"
				onclick={() => toggle(playlist.id)}
			>
				{playlist.title}
				<span class="count">{playlist.count}</span>
				<span class="remove" aria-hidden="true">✕</span>
			</button>
		{/each}
		<PlaylistPicker {playlists} {selected} onapply={select} />

		<span class="order">
			<button
				class="chip"
				aria-pressed={!!shuffle}
				title={shuffle ? 'Back to playlist order' : 'Show these videos in a random order'}
				onclick={shuffle ? stopShuffle : startShuffle}
			>
				<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
					<path
						d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						fill="none"
					/>
				</svg>
				Shuffle
			</button>
			{#if shuffle && !shuffle.loading && !shuffle.error}
				<button class="chip" title="Pick a new random order" onclick={startShuffle}>
					<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
						<path
							d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							fill="none"
						/>
					</svg>
					Reshuffle
				</button>
			{/if}
		</span>
	</div>

	{#if videos.length}
		<VideoGrid>
			{#each videos as video (video.id)}
				<VideoCard {video} date={{ label: 'Added', value: video.addedAt }}>
					{#snippet tags()}
						{#each video.playlists as playlist (playlist.id)}
							<button
								class="tag"
								class:active={selected.includes(playlist.id)}
								title={selected.includes(playlist.id)
									? `Remove “${playlist.title}” from the filter`
									: `Filter by “${playlist.title}”`}
								onclick={() => toggle(playlist.id)}
							>
								{playlist.title}
							</button>
						{/each}
					{/snippet}
				</VideoCard>
			{/each}
		</VideoGrid>
	{/if}

	<!-- above the skeleton, so it's in view (and loading starts) even while the list is empty -->
	{#if shuffle}
		<!-- the shuffled order is already fully loaded; scrolling just reveals more of it -->
		<InfiniteScroll
			onload={() => (shown += SHUFFLE_BATCH)}
			paused={shuffle.loading || !!shuffle.error || shown >= shuffle.ids.length}
		/>
	{:else}
		<InfiniteScroll onload={() => loader.loadMore(feed)} paused={feed.loading || feed.done || !!feed.error} />
	{/if}

	{#if error}
		<LoadError {error} onretry={() => (shuffle ? startShuffle() : loader.loadMore(feed))} />
	{:else if shuffle?.loading}
		<div class="shuffling" role="status">
			<p>Loading all {total} videos to shuffle them… {Math.round(shuffle.progress * 100)}%</p>
			<div class="progress"><div style:width="{shuffle.progress * 100}%"></div></div>
		</div>
		<VideoGridSkeleton count={8} tags />
	{:else if !shuffle && (feed.loading || !feed.done)}
		<div class:more={videos.length}>
			<VideoGridSkeleton count={videos.length ? 4 : 12} tags />
		</div>
	{:else if shuffle && shown < shuffle.ids.length}
		<!-- more shuffled cards are revealed as the user scrolls -->
	{:else if !videos.length}
		<EmptyState
			icon="∅"
			title={only
				? `“${only.title}” is empty`
				: chosen.length
					? 'These playlists are empty'
					: 'Your playlists are empty'}
			message="Only videos you can still watch are listed; deleted and private videos are hidden."
		>
			{#snippet actions()}
				{#if chosen.length}
					<button onclick={() => select([])}>Show all playlists</button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<p class="end">
			That's everything{only ? ` in “${only.title}”` : chosen.length ? ' in these playlists' : ''}.
		</p>
	{/if}
{/if}

<style>
	.summary {
		margin: 0 0 1rem;
		color: var(--muted);
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.chip {
		display: inline-flex;
		max-width: 100%;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		border: none;
		border-radius: 8px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.chip[aria-pressed='true'] {
		background: var(--text);
		color: var(--bg);
	}

	.remove {
		font-size: 0.7rem;
		opacity: 0.7;
	}

	.order {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}

	.shuffling {
		margin-bottom: 1.5rem;
		color: var(--muted);
		font-size: 0.875rem;
	}

	.shuffling p {
		margin: 0 0 0.5rem;
	}

	.progress {
		height: 4px;
		border-radius: 2px;
		background: var(--surface);
		overflow: hidden;
	}

	.progress div {
		height: 100%;
		background: var(--accent);
		transition: width 0.2s;
	}

	.count {
		opacity: 0.6;
		font-variant-numeric: tabular-nums;
	}

	.tag {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0.15rem 0.55rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: none;
		color: var(--muted);
		font-size: 0.75rem;
	}

	.tag:hover,
	.tag.active {
		border-color: var(--accent);
		color: var(--accent);
	}

	.more {
		margin-top: 2rem;
	}

	.end {
		margin: 3rem 0 1rem;
		text-align: center;
		color: var(--muted);
		font-size: 0.875rem;
	}
</style>
