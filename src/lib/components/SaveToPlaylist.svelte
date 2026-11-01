<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import type { LoadError, PlaylistLoader } from '#lib/playlist-loader.svelte.ts';
	import type { PlaylistSummary, PlaylistVideo } from '#lib/types.ts';

	interface Props {
		loader: PlaylistLoader;
		/** the video being managed; the dialog is open while this is set */
		video: PlaylistVideo | null;
		onclose: () => void;
	}

	let { loader, video, onclose }: Props = $props();

	let dialog: HTMLDialogElement;
	let query = $state('');
	/** playlist order frozen when the dialog opens, saved ones first, so rows don't jump while toggling */
	let order = $state<PlaylistSummary[]>([]);
	const pending = new SvelteSet<string>();
	const errors = new SvelteMap<string, LoadError>();

	// Runs when a different video is opened; untracked so toggling (which changes
	// the video's playlists) doesn't reorder the list or reopen the dialog.
	$effect(() => {
		if (video) untrack(() => open(video!));
	});

	function open(video: PlaylistVideo) {
		const saved = new Set(video.playlists.map((p) => p.id));
		order = [...loader.playlists.filter((p) => saved.has(p.id)), ...loader.playlists.filter((p) => !saved.has(p.id))];
		query = '';
		errors.clear();
		dialog.showModal();
	}

	const matches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return q ? order.filter((p) => p.title.toLowerCase().includes(q)) : order;
	});
	const login = $derived(`/auth/login?returnTo=${encodeURIComponent(page.url.pathname)}`);

	function isSaved(playlist: PlaylistSummary) {
		return video?.playlists.some((p) => p.id === playlist.id) ?? false;
	}

	async function toggle(playlist: PlaylistSummary) {
		if (!video || pending.has(playlist.id)) return;
		pending.add(playlist.id);
		errors.delete(playlist.id);
		try {
			if (isSaved(playlist)) await loader.removeFrom(video.id, playlist);
			else await loader.addTo(video.id, playlist);
		} catch (e) {
			errors.set(playlist.id, e as LoadError);
		} finally {
			pending.delete(playlist.id);
		}
	}
</script>

<!-- clicking the backdrop (the dialog element itself, outside .panel) closes it -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-labelledby="save-title"
	onclose={onclose}
	onclick={(e) => e.target === dialog && dialog.close()}
>
	{#if video}
		<div class="panel">
			<header>
				<div>
					<h2 id="save-title">Save to playlist</h2>
					<p class="video">{video.title}</p>
				</div>
				<button class="icon" aria-label="Close" onclick={() => dialog.close()}>✕</button>
			</header>

			<input
				bind:value={query}
				type="search"
				placeholder="Search {order.length} playlists"
				aria-label="Search playlists"
			/>

			<ul class="list">
				{#each matches as playlist (playlist.id)}
					{@const busy = pending.has(playlist.id)}
					{@const failure = errors.get(playlist.id)}
					<li>
						<label class:busy>
							<input
								type="checkbox"
								checked={isSaved(playlist)}
								disabled={busy}
								onchange={() => toggle(playlist)}
							/>
							<span class="title">{playlist.title}</span>
							{#if busy}
								<span class="spinner" aria-label="Saving"></span>
							{:else}
								<span class="count">{playlist.count}</span>
							{/if}
						</label>
						{#if failure}
							<p class="error" role="alert">
								{failure.message}
								{#if failure.status === 401}
									<a href={login} data-sveltekit-reload>Sign in again</a>
								{/if}
							</p>
						{/if}
					</li>
				{:else}
					<li class="none">No playlists match “{query}”.</li>
				{/each}
			</ul>

			<footer>
				<p class="note">
					Changes are saved to YouTube straight away. A playlist you haven't scrolled to yet may not show this video
					as saved; ticking it won't add a duplicate.
				</p>
				<button class="primary" onclick={() => dialog.close()}>Done</button>
			</footer>
		</div>
	{/if}
</dialog>

<style>
	dialog {
		width: min(28rem, calc(100vw - 2rem));
		max-height: min(40rem, calc(100dvh - 2rem));
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 16px;
		background: var(--bg);
		color: var(--text);
		box-shadow: 0 20px 60px rgb(0 0 0 / 0.35);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.5);
	}

	.panel {
		display: flex;
		flex-direction: column;
		max-height: inherit;
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1rem 0.5rem 1.25rem;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.video {
		margin: 0.2rem 0 0;
		color: var(--muted);
		font-size: 0.85rem;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.icon {
		flex: none;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: 50%;
		background: none;
		color: var(--muted);
	}

	.icon:hover {
		background: var(--surface);
	}

	input[type='search'] {
		margin: 0.25rem 1.25rem 0.75rem;
		padding: 0.55rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
	}

	input[type='search']:focus {
		outline: 2px solid var(--text);
		outline-offset: -1px;
	}

	.list {
		flex: 1;
		overflow-y: auto;
		margin: 0;
		padding: 0.25rem 0.5rem;
		list-style: none;
		border-block: 1px solid var(--border);
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0.75rem;
		border-radius: 8px;
		cursor: pointer;
	}

	label:hover {
		background: var(--surface);
	}

	label.busy {
		cursor: progress;
		opacity: 0.7;
	}

	input[type='checkbox'] {
		flex: none;
		width: 1.05rem;
		height: 1.05rem;
		margin: 0;
		accent-color: var(--accent);
	}

	.title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count {
		color: var(--muted);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.spinner {
		width: 0.9rem;
		height: 0.9rem;
		border: 2px solid var(--border);
		border-top-color: var(--text);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		margin: 0 0.75rem 0.4rem 2.55rem;
		color: var(--accent);
		font-size: 0.8rem;
	}

	.none {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--muted);
	}

	footer {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem 0.75rem 1.25rem;
	}

	.note {
		flex: 1;
		margin: 0;
		color: var(--muted);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.primary {
		flex: none;
		padding: 0.5rem 1.1rem;
		border: 1px solid var(--text);
		border-radius: 999px;
		background: var(--text);
		color: var(--bg);
		font-size: 0.9rem;
		font-weight: 500;
	}

	@media (max-width: 640px) {
		dialog {
			width: 100vw;
			max-width: 100vw;
			max-height: 85dvh;
			margin: auto 0 0;
			border-radius: 16px 16px 0 0;
		}
	}
</style>
