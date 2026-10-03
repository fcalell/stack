import { moment as momentOf } from "./moment";

// An ISO moment as its age from now ("2 minutes ago", "yesterday"), in the
// device's language through the platform's own relative-time words, so no
// word of it lives in `words`.
const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
	["second", 60],
	["minute", 60],
	["hour", 24],
	["day", 7],
	["week", 4.35],
	["month", 12],
	["year", Number.POSITIVE_INFINITY],
];

// TODO: Hermes ships no `Intl.RelativeTimeFormat`, so there an age reads as
// the moment a message's time reads as (the time alone today, else the date
// and time); it reads as an age once Hermes ships `RelativeTimeFormat`.
export function age(moment: string, now = Date.now()): string {
	const at = Date.parse(moment);
	if (Number.isNaN(at)) return moment;
	if (typeof Intl.RelativeTimeFormat !== "function")
		return momentOf(moment, new Date(now));
	const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
	let value = (at - now) / 1000;
	for (const [unit, size] of UNITS) {
		if (Math.abs(value) < size) return format.format(Math.round(value), unit);
		value /= size;
	}
	return moment;
}
