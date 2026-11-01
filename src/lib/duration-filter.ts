import { parseDuration } from './format.ts';
import type { Video } from './types.ts';

/** YouTube's own length buckets, as used in its search filters */
export const DURATION_FILTERS = [
	{ value: 'any', label: 'Any length', min: 0, max: Infinity },
	{ value: 'short', label: 'Under 4 min', min: 0, max: 4 * 60 },
	{ value: 'medium', label: '4–20 min', min: 4 * 60, max: 20 * 60 },
	{ value: 'long', label: 'Over 20 min', min: 20 * 60, max: Infinity }
] as const;

export type DurationFilter = (typeof DURATION_FILTERS)[number]['value'];

export function durationLabel(filter: DurationFilter) {
	return DURATION_FILTERS.find((f) => f.value === filter)!.label;
}

/**
 * Whether a video falls in the bucket. Videos without a known length (live streams,
 * premieres that haven't aired) only show when no length filter is set.
 */
export function matchesDuration(video: Video, filter: DurationFilter) {
	if (filter === 'any') return true;
	const seconds = parseDuration(video.duration);
	if (!seconds) return false;
	const { min, max } = DURATION_FILTERS.find((f) => f.value === filter)!;
	return seconds >= min && seconds < max;
}
