import { formatterFor } from "@fcalell/ui-core/format";

// An ISO moment as a reader reads it, in the device's language through the
// platform's own date words: the time alone today, else the date and time.
// Hermes implements `Intl.DateTimeFormat` with `dateStyle` and `timeStyle`
// (not on Android before SDK 24).
export function moment(iso: string, now = new Date()): string {
	const at = new Date(iso);
	if (Number.isNaN(at.getTime())) return iso;
	const today = at.toDateString() === now.toDateString();
	return formatterFor(
		"date",
		undefined,
		today
			? { timeStyle: "short" }
			: { dateStyle: "medium", timeStyle: "short" },
	).format(at);
}
