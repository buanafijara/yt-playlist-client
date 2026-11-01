<script lang="ts">
	import { untrack } from 'svelte';

	interface Props {
		/** called whenever the end of the list comes near and loading isn't paused */
		onload: () => void;
		/** pause loading, e.g. while a batch is in flight, after an error, or when there is no more */
		paused: boolean;
	}

	let { onload, paused }: Props = $props();

	let sentinel: HTMLDivElement;
	let near = $state(false);

	$effect(() => {
		// start fetching well before the user actually hits the bottom
		const observer = new IntersectionObserver(([entry]) => (near = entry.isIntersecting), {
			rootMargin: '0px 0px 1200px 0px'
		});
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	// Re-runs when a batch finishes: if the sentinel is still near the viewport
	// (the batch didn't fill the screen), keep loading.
	$effect(() => {
		if (near && !paused) untrack(onload);
	});
</script>

<div bind:this={sentinel} class="sentinel" aria-hidden="true"></div>

<style>
	.sentinel {
		height: 1px;
	}
</style>
