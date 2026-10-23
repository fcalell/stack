import { formatterFor } from "@fcalell/ui-core/format";

// An ISO moment as a reader reads it, in the document's language through the
// platform's own date words: the time alone today, else the date and time.
export function moment(iso: string, now = new Date()): string {
	const at = new Date(iso);
	if (Number.isNaN(at.getTime())) return iso;
	const today = at.toDateString() === now.toDateString();
	return formatterFor(
		"date",
		document.documentElement.lang || undefined,
		today
			? { timeStyle: "short" }
			: { dateStyle: "medium", timeStyle: "short" },
	).format(at);
}
