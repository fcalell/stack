import { dayWords, momentWords } from "@fcalell/ui-core/format";

// The document's language, or the platform's own where there is no document.
function pageLang(): string | undefined {
	return typeof document === "undefined"
		? undefined
		: document.documentElement.lang || undefined;
}

// An ISO moment as a reader reads it, in the document's language
// (`momentWords`): the time alone today, the day's word and the time a day
// either side, the date and time, its year only when it is not this year's.
export function moment(
	iso: string,
	now = new Date(),
	lang = pageLang(),
): string {
	return momentWords(iso, now, lang);
}

// A `YYYY-MM-DD` day as a reader reads it (`dayWords`), in the document's
// language: "26 Oct 2026" or "Oct 26, 2026" as the language orders it.
export function day(value: string, lang = pageLang()): string {
	return dayWords(value, lang);
}
