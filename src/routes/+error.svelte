<script lang="ts">
	import { page } from '$app/state';
</script>

<section>
	<h1>{page.status}</h1>
	<p>{page.error?.message}</p>
	<a href="/">Back to start</a>
</section>

<style>
	section {
		max-width: 36rem;
		margin: 15vh auto 0;
		text-align: center;
	}

	p {
		color: var(--muted);
	}
</style>
