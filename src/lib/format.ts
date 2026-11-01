/** PT1H2M3S → 1:02:03, PT4M5S → 4:05 */
export function formatDuration(iso: string | undefined) {
	const match = iso?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
	if (!match) return '';
	const [, d = '0', h = '0', m = '0', s = '0'] = match;
	const hours = Number(d) * 24 + Number(h);
	const mmss = `${hours ? m.padStart(2, '0') : m}:${s.padStart(2, '0')}`;
	return hours ? `${hours}:${mmss}` : mmss;
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
