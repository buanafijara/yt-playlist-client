<script lang="ts">
	import VideoGrid from './VideoGrid.svelte';

	interface Props {
		count?: number;
		/** show placeholder playlist tags under each card */
		tags?: boolean;
	}

	let { count = 12, tags = false }: Props = $props();
</script>

<div role="status" aria-live="polite" aria-busy="true">
	<span class="sr-only">Loading videos…</span>
	<VideoGrid>
		{#each { length: count }, i (i)}
			<div class="card" aria-hidden="true">
				<div class="bone thumb"></div>
				<div class="bone line"></div>
				<div class="bone line short"></div>
				<div class="bone line tiny"></div>
				{#if tags}
					<div class="tags">
						<div class="bone tag"></div>
						{#if i % 3 === 0}<div class="bone tag"></div>{/if}
					</div>
				{/if}
			</div>
		{/each}
	</VideoGrid>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.bone {
		border-radius: 6px;
		background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.4s ease-in-out infinite;
	}

	.thumb {
		aspect-ratio: 16 / 9;
		border-radius: 12px;
		margin-bottom: 0.1rem;
	}

	.line {
		height: 0.9rem;
		width: 90%;
	}

	.line.short {
		width: 55%;
	}

	.line.tiny {
		width: 30%;
	}

	.tags {
		display: flex;
		gap: 0.3rem;
		margin-top: 0.2rem;
	}

	.tag {
		height: 1.3rem;
		width: 4.5rem;
		border-radius: 999px;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	@keyframes shimmer {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: -100% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bone {
			animation: none;
		}
	}
</style>
