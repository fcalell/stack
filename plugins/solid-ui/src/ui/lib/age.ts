import { createSignal } from "solid-js";

// An age as a row's trailing value draws it: "now" under a minute, then
// minutes, hours and days in the locale's narrow units ("4m", "3h", "2d"),
// then the date ("18 Sep", with the year once it is not this one). `Intl`
// speaks the browser's locale, so no word of it is a `words` key. The
// clock is shared and ticks every half minute, so every age on the page
// moves together.

const [clock, setClock] = createSignal(Date.now());
let ticking = false;

export function useClock(): () => number {
	if (!ticking && typeof window !== "undefined") {
		ticking = true;
		setInterval(() => setClock(Date.now()), 30_000);
	}
	return clock;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const unit = (value: number, name: "minute" | "hour" | "day") =>
	new Intl.NumberFormat(undefined, {
		style: "unit",
		unit: name,
		unitDisplay: "narrow",
	}).format(value);

export function ageOf(iso: string, now: number): string {
	const at = Date.parse(iso);
	if (Number.isNaN(at)) return iso;
	const ago = Math.max(0, now - at);
	if (ago < MINUTE)
		return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
			0,
			"second",
		);
	if (ago < HOUR) return unit(Math.floor(ago / MINUTE), "minute");
	if (ago < DAY) return unit(Math.floor(ago / HOUR), "hour");
	if (ago < 7 * DAY) return unit(Math.floor(ago / DAY), "day");
	const date = new Date(at);
	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "short",
		...(date.getFullYear() !== new Date(now).getFullYear() && {
			year: "numeric",
		}),
	}).format(date);
}

// The full moment, for a `<time>`'s title.
export function momentOf(iso: string): string {
	const at = Date.parse(iso);
	if (Number.isNaN(at)) return iso;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(at);
}
