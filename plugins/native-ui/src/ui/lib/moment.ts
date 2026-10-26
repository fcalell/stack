import { momentWords } from "@fcalell/ui-core/format";

// An ISO moment as a reader reads it, in the device's language
// (`momentWords`): the time alone today, the day's word and the time a day
// either side, the date and time, its year only when it is not this year's.
// Hermes implements `Intl.DateTimeFormat` with `dateStyle` and `timeStyle`
// (not on Android before SDK 24) but no `Intl.RelativeTimeFormat`, so there
// the day either side reads as its date.
export function moment(iso: string, now = new Date()): string {
	return momentWords(iso, now);
}
