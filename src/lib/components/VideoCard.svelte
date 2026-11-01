<script lang="ts">
	import type { Snippet } from 'svelte';
	import { formatDuration, timeAgo } from '#lib/format.ts';
	import type { Video } from '#lib/types.ts';

	interface Props {
		video: Video;
		/** label for the date line, e.g. "added" for playlist items */
		date?: { label?: string; value: string };
		tags?: Snippet;
		/** buttons shown next to the title */
		actions?: Snippet;
	}

	let { video, date = { value: video.publishedAt }, tags, actions }: Props = $props();

	const duration = $derived(formatDuration(video.duration));
</script>

<article class="card">
	<a class="thumb" href="https://www.youtube.com/watch?v={video.id}" target="_blank" rel="noopener">
		<img src={video.thumbnail} alt="" loading="lazy" width="320" height="180" />
		{#if duration}<span class="duration">{duration}</span>{/if}
	</a>
	<div class="meta">
		<div class="heading">
			<a class="title" href="https://www.youtube.com/watch?v={video.id}" target="_blank" rel="noopener">
				{video.title}
			</a>
			{#if actions}{@render actions()}{/if}
		</div>
		<a class="channel" href="https://www.youtube.com/channel/{video.channelId}" target="_blank" rel="noopener">
			{video.channelTitle}
		</a>
		<time datetime={date.value} title={new Date(date.value).toLocaleString()}>
			{date.label ? `${date.label} ` : ''}{timeAgo(date.value)}
		</time>
		{#if tags}<div class="tags">{@render tags()}</div>{/if}
	</div>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		min-width: 0;
	}

	.thumb {
		position: relative;
		display: block;
		aspect-ratio: 16 / 9;
		border-radius: 12px;
		overflow: hidden;
		background: var(--surface);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 0.2s;
	}

	.thumb:hover img {
		transform: scale(1.03);
	}

	.duration {
		position: absolute;
		right: 6px;
		bottom: 6px;
		padding: 1px 5px;
		border-radius: 4px;
		background: rgb(0 0 0 / 0.8);
		color: #fff;
		font-size: 0.75rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.heading {
		display: flex;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.title {
		flex: 1;
		min-width: 0;
		color: var(--text);
		font-weight: 600;
		line-height: 1.3;
		text-decoration: none;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.channel,
	time {
		color: var(--muted);
		font-size: 0.875rem;
		text-decoration: none;
	}

	.channel:hover {
		color: var(--text);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.3rem;
	}
</style>
