// An ISO moment as its age from now ("2 minutes ago", "yesterday"), in the
// document's language through the platform's own relative-time words, so
// no word of it lives in `words`.
const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
	["second", 60],
	["minute", 60],
	["hour", 24],
	["day", 7],
	["week", 4.35],
	["month", 12],
	["year", Number.POSITIVE_INFINITY],
];

export function age(moment: string, now = Date.now()): string {
	const at = Date.parse(moment);
	if (Number.isNaN(at)) return moment;
	const format = new Intl.RelativeTimeFormat(
		document.documentElement.lang || undefined,
		{ numeric: "auto" },
	);
	let value = (at - now) / 1000;
	for (const [unit, size] of UNITS) {
		if (Math.abs(value) < size) return format.format(Math.round(value), unit);
		value /= size;
	}
	return moment;
}
