<script lang="ts">
	import { DURATION_FILTERS, type DurationFilter } from '#lib/duration-filter.ts';

	interface Props {
		value: DurationFilter;
		onchange?: (value: DurationFilter) => void;
	}

	let { value = $bindable(), onchange }: Props = $props();
</script>

<label class="chip" class:active={value !== 'any'}>
	<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
		<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none" />
		<path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
	</svg>
	<span class="sr-only">Video length</span>
	<select bind:value onchange={() => onchange?.(value)}>
		{#each DURATION_FILTERS as filter (filter.value)}
			<option value={filter.value}>{filter.label}</option>
		{/each}
	</select>
</label>

<style>
	.chip {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.6rem 0 0.8rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.chip:hover {
		background: var(--surface);
	}

	.chip.active {
		border-color: var(--text);
		background: var(--text);
		color: var(--bg);
	}

	.chip:focus-within {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	select {
		appearance: none;
		padding: 0.4rem 1.1rem 0.4rem 0;
		border: none;
		background: transparent
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='gray' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")
			no-repeat right center / 0.6rem;
		color: inherit;
		font: inherit;
		cursor: pointer;
		outline: none;
	}

	/* the open list uses the OS's colours, so keep option text readable there */
	option {
		color: initial;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
