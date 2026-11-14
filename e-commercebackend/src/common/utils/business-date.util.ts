export const BUSINESS_TIME_ZONE = 'Africa/Tunis';

const datePartsFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: BUSINESS_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23',
});

function localMidnightAsUtc(year: number, month: number, day: number): Date {
	const wallClock = Date.UTC(year, month - 1, day);
	let instant = wallClock;

	// Compare how the candidate instant renders in the business timezone with
	// the requested wall-clock time, then adjust until they match.
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const parts = Object.fromEntries(
			datePartsFormatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
		);
		const renderedWallClock = Date.UTC(
			Number(parts.year),
			Number(parts.month) - 1,
			Number(parts.day),
			Number(parts.hour),
			Number(parts.minute),
			Number(parts.second),
		);
		const adjustment = wallClock - renderedWallClock;
		instant += adjustment;
		if (adjustment === 0) break;
	}

	return new Date(instant);
}

/** Convert a date-only query to the start or inclusive end of that local business day. */
export function parseBusinessDateBoundary(value: string, boundary: 'start' | 'end'): Date {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);

	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		return new Date(Number.NaN);
	}

	if (boundary === 'start') return localMidnightAsUtc(year, month, day);
	const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
	return new Date(localMidnightAsUtc(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()).getTime() - 1);
}

export function businessDateKey(date: Date): string {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: BUSINESS_TIME_ZONE,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(date).map((part) => [part.type, part.value]),
	);
	return `${parts.year}-${parts.month}-${parts.day}`;
}
