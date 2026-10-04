import { ageWords } from "@fcalell/ui-core/clock";
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
