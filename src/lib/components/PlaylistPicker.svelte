<script lang="ts">
	import type { PlaylistSummary } from '#lib/types.ts';

	interface Props {
		playlists: PlaylistSummary[];
		/** currently applied selection; empty means all playlists */
		selected: string[];
		onapply: (ids: string[]) => void;
	}

	let { playlists, selected, onapply }: Props = $props();

	let dialog: HTMLDialogElement;
	let search: HTMLInputElement;
	// Ticks are staged here and only applied on "Show", so picking several
	// playlists doesn't start a new load for every click.
	let draft = $state<string[]>([]);
	let query = $state('');

	const matches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return q ? playlists.filter((p) => p.title.toLowerCase().includes(q)) : playlists;
	});
	const draftCount = $derived(
		playlists.filter((p) => draft.includes(p.id)).reduce((sum, p) => sum + p.count, 0)
	);

	function open() {
		draft = [...selected];
		query = '';
		dialog.showModal();
		search.focus();
	}

	function apply() {
		onapply(draft);
		dialog.close();
	}

	function toggle(id: string) {
		draft = draft.includes(id) ? draft.filter((d) => d !== id) : [...draft, id];
	}

	// Both act on the playlists the search currently shows (all of them when it's empty).
	const allMatchesSelected = $derived(matches.every((p) => draft.includes(p.id)));
	const anyMatchSelected = $derived(matches.some((p) => draft.includes(p.id)));

	function selectAll() {
		draft = [...new Set([...draft, ...matches.map((p) => p.id)])];
	}

	function deselectAll() {
		const ids = new Set(matches.map((p) => p.id));
		draft = draft.filter((id) => !ids.has(id));
	}
</script>

<button class="trigger" onclick={open} aria-haspopup="dialog">
	<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
		<path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
	</svg>
	All playlists
	<span class="count">{playlists.length}</span>
</button>

<!-- clicking the backdrop (the dialog element itself, outside .panel) cancels -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="picker-title" onclick={(e) => e.target === dialog && dialog.close()}>
	<div class="panel">
		<header>
			<h2 id="picker-title">Choose playlists</h2>
			<button class="icon" aria-label="Close" onclick={() => dialog.close()}>✕</button>
		</header>

		<input
			bind:this={search}
			bind:value={query}
			type="search"
			placeholder="Search {playlists.length} playlists"
			aria-label="Search playlists"
			onkeydown={(e) => e.key === 'Enter' && e.preventDefault()}
		/>

		<div class="bar">
			<span>
				{draft.length === playlists.length
					? 'All selected'
					: draft.length
						? `${draft.length} selected`
						: 'None selected · showing all'}
			</span>
			<span class="links">
				<button class="link" disabled={!matches.length || allMatchesSelected} onclick={selectAll}>
					{query ? `Select ${matches.length} matching` : 'Select all'}
				</button>
				<button class="link" disabled={!anyMatchSelected} onclick={deselectAll}>
					{query ? 'Deselect matching' : 'Deselect all'}
				</button>
			</span>
		</div>

		<ul class="list">
			{#each matches as playlist (playlist.id)}
				<li>
					<label class:checked={draft.includes(playlist.id)}>
						<input type="checkbox" checked={draft.includes(playlist.id)} onchange={() => toggle(playlist.id)} />
						<span class="title">{playlist.title}</span>
						<span class="count">{playlist.count}</span>
					</label>
				</li>
			{:else}
				<li class="none">No playlists match “{query}”.</li>
			{/each}
		</ul>

		<footer>
			<button onclick={() => dialog.close()}>Cancel</button>
			<button class="primary" onclick={apply}>
				{draft.length && draft.length < playlists.length ? `Show ${draftCount} videos` : 'Show all playlists'}
			</button>
		</footer>
	</div>
</dialog>

<style>
	.trigger {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: none;
		color: var(--text);
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.trigger:hover {
		background: var(--surface);
	}

	.count {
		opacity: 0.6;
		font-variant-numeric: tabular-nums;
	}

	dialog {
		width: min(32rem, calc(100vw - 2rem));
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
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1rem 0.5rem 1.25rem;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.icon {
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
		margin: 0.25rem 1.25rem 0.5rem;
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

	.bar {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.25rem 1.25rem 0.5rem;
		color: var(--muted);
		font-size: 0.8rem;
	}

	.links {
		display: flex;
		gap: 0.75rem;
	}

	.link {
		padding: 0;
		border: none;
		background: none;
		color: var(--text);
		font-size: inherit;
		font-weight: 600;
	}

	.link:disabled {
		color: var(--muted);
		opacity: 0.5;
		cursor: default;
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

	label.checked .title {
		font-weight: 600;
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

	.none {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--muted);
	}

	footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
	}

	footer button {
		padding: 0.5rem 1.1rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: none;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
	}

	footer .primary {
		border-color: var(--text);
		background: var(--text);
		color: var(--bg);
	}

	/* bottom sheet on phones */
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
