import { ageWords } from "@fcalell/ui-core/clock";
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
