import { ageWords, ageShort as shortOf } from "@fcalell/ui-core/clock";
import { formatterFor } from "@fcalell/ui-core/format";

// An ISO moment as its age from `now` ("2 minutes ago", "yesterday"), in the
// document's language through the platform's own relative-time words, so
// no word of it lives in `words`. A part that draws one reads `now` from
// the shared clock (`useClock`), so the age ticks on its own.
export function age(moment: string, now = Date.now()): string {
	const format = formatterFor(
		"relative",
		document.documentElement.lang || undefined,
		{ numeric: "auto" },
	);
	return ageWords(moment, now, format);
}

// An ISO moment as its short age ("2 min", "16 sec"), the form a row's
// trailing age and an item header's meta read in; a moment after `now` keeps
// the long form.
export function ageShort(moment: string, now = Date.now()): string {
	const lang = document.documentElement.lang || undefined;
	return shortOf(
		moment,
		now,
		(unit) =>
			formatterFor("number", lang, {
				style: "unit",
				unit,
				unitDisplay: "short",
			}),
		formatterFor("relative", lang, { numeric: "auto" }),
	);
}
