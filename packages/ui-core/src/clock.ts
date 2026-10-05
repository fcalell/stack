// What a clock-read part draws, as functions of its times and now (epoch
// milliseconds), so both platforms' `PendingBar` and ages read one answer.
// Each plugin ticks `now` from one shared coarse clock.

// A pending bar's run toward one `until`: it began at `start` with `from` of
// the track already filled.
export interface PendingRun {
	readonly start: number;
	readonly end: number;
	readonly from: number;
}

// The elapsed share of the track, 0 to 1.
export function pendingShare(run: PendingRun, now: number): number {
	if (now >= run.end || run.end <= run.start) return 1;
	const through = Math.max(0, (now - run.start) / (run.end - run.start));
	return run.from + (1 - run.from) * through;
}

// A run toward `end` beginning at `now`: the first starts empty, and a moved
// `until` carries on from the share the last run reached, so the fill never
// jumps back.
export function pendingRun(
	end: number,
	now: number,
	last?: PendingRun,
): PendingRun {
	return { start: now, end, from: last ? pendingShare(last, now) : 0 };
}

// The time left until `end`, minutes then seconds padded to two; 0:00 once
// past it.
export function timeLeft(end: number, now: number): string {
	const seconds = Math.max(0, Math.ceil((end - now) / 1000));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
	["second", 60],
	["minute", 60],
	["hour", 24],
	["day", 7],
	["week", 4.35],
	["month", 12],
	["year", Number.POSITIVE_INFINITY],
];

// An ISO moment's age from `now`: the nearest whole `value` of the largest
// `unit` it spans, negative before now; null when the moment does not parse.
export function ageOf(
	moment: string,
	now: number,
): { value: number; unit: Intl.RelativeTimeFormatUnit } | null {
	const at = Date.parse(moment);
	if (Number.isNaN(at)) return null;
	let value = (at - now) / 1000;
	for (const [unit, size] of UNITS) {
		if (Math.abs(value) < size) return { value: Math.round(value), unit };
		value /= size;
	}
	return null;
}

// An ISO moment as its age from now ("2 minutes ago", "yesterday") in the
// words `format` speaks; a moment that does not parse reads as itself.
export function ageWords(
	moment: string,
	now: number,
	format: Intl.RelativeTimeFormat,
): string {
	const age = ageOf(moment, now);
	return age ? format.format(age.value, age.unit) : moment;
}

// An ISO moment as its short age ("2 min", "16 sec"), each unit worded by
// the platform's unit formatter `unit` returns. A moment after now keeps the
// long form from `long`, since a short "2 min" cannot say "in"; one that does
// not parse reads as itself.
export function ageShort(
	moment: string,
	now: number,
	unit: (unit: Intl.RelativeTimeFormatUnit) => Intl.NumberFormat,
	long: Intl.RelativeTimeFormat,
): string {
	const age = ageOf(moment, now);
	if (!age) return moment;
	if (age.value > 0) return long.format(age.value, age.unit);
	return unit(age.unit).format(Math.abs(age.value));
}
