import { momentWords } from "@fcalell/ui-core/format";

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
