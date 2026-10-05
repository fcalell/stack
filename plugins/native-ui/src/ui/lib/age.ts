import { ageWords, ageShort as shortOf } from "@fcalell/ui-core/clock";
import { formatterFor } from "@fcalell/ui-core/format";
import { moment as momentOf } from "./moment";

// An ISO moment as its age from `now` ("2 minutes ago", "yesterday"), in the
// device's language through the platform's own relative-time words, so no
// word of it lives in `words`. A part that draws one reads `now` from the
// shared clock (`useClock`), so the age ticks on its own.
// TODO: Hermes ships no `Intl.RelativeTimeFormat`, so there an age reads as
// the moment a message's time reads as (the time alone today, else the date
// and time); it reads as an age once Hermes ships `RelativeTimeFormat`.
export function age(moment: string, now = Date.now()): string {
	if (Number.isNaN(Date.parse(moment))) return moment;
	if (typeof Intl.RelativeTimeFormat !== "function")
		return momentOf(moment, new Date(now));
	const format = formatterFor("relative", undefined, { numeric: "auto" });
	return ageWords(moment, now, format);
}

// Whether `Intl.NumberFormat` words a unit ("2 min"): an engine without the
// `unit` style ignores it and formats a bare number.
function wordsUnits(): boolean {
	try {
		return (
			formatterFor("number", undefined, {
				style: "unit",
				unit: "minute",
			}).resolvedOptions().style === "unit"
		);
	} catch {
		return false;
	}
}

const UNITS_WORDED = wordsUnits();

// An ISO moment as its short age ("2 min", "16 sec"), the form a row's
// trailing age and an item header's meta read in; a moment after `now` keeps
// the long form.
// TODO: Hermes' `Intl.NumberFormat` `unit` style is unverified on a device;
// without it, or without `RelativeTimeFormat`, a short age reads as `age`
// does. Verify on a device, then drop the fallback.
export function ageShort(moment: string, now = Date.now()): string {
	if (!UNITS_WORDED || typeof Intl.RelativeTimeFormat !== "function")
		return age(moment, now);
	return shortOf(
		moment,
		now,
		(unit) =>
			formatterFor("number", undefined, {
				style: "unit",
				unit,
				unitDisplay: "short",
			}),
		formatterFor("relative", undefined, { numeric: "auto" }),
	);
}
