/** PT1H2M3S → 3723 seconds; null when missing or not an ISO 8601 duration */
export function parseDuration(iso: string | undefined) {
	const match = iso?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
	if (!match) return null;
	const [, d = '0', h = '0', m = '0', s = '0'] = match;
	return ((Number(d) * 24 + Number(h)) * 60 + Number(m)) * 60 + Number(s);
}

/** PT1H2M3S → 1:02:03, PT4M5S → 4:05 */
export function formatDuration(iso: string | undefined) {
	const total = parseDuration(iso);
	// live streams report P0D; no badge beats a misleading 0:00
	if (!total) return '';
	const hours = Math.floor(total / 3600);
	const m = String(Math.floor((total % 3600) / 60));
	const s = String(total % 60).padStart(2, '0');
	return hours ? `${hours}:${m.padStart(2, '0')}:${s}` : `${m}:${s}`;
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['week', 7 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60]
];
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** 2024-01-01T00:00:00Z → "3 days ago" */
export function timeAgo(iso: string, now = Date.now()) {
	const seconds = (Date.parse(iso) - now) / 1000;
	for (const [unit, size] of units) {
		if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
	}
	return 'just now';
}
