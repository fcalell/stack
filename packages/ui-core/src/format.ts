// The platform's formatters, built once per kind, language and options:
// building one costs far more than formatting with it (Hermes most of all),
// and an age, a moment or a figure is formatted per row and per render. Both
// plugins read every formatter here; `lang` undefined is the platform's own.
const BUILD = {
	number: (lang?: string, options?: Intl.NumberFormatOptions) =>
		new Intl.NumberFormat(lang, options),
	date: (lang?: string, options?: Intl.DateTimeFormatOptions) =>
		new Intl.DateTimeFormat(lang, options),
	relative: (lang?: string, options?: Intl.RelativeTimeFormatOptions) =>
		new Intl.RelativeTimeFormat(lang, options),
};

type Build = typeof BUILD;
export type FormatterKind = keyof Build;

const made = new Map<string, unknown>();

export function formatterFor<K extends FormatterKind>(
	kind: K,
	lang?: string,
	options?: Parameters<Build[K]>[1],
): ReturnType<Build[K]> {
	const key = `${kind}\n${lang ?? ""}\n${JSON.stringify(options ?? {})}`;
	let formatter = made.get(key);
	if (formatter === undefined) {
		const build = BUILD[kind] as (
			lang?: string,
			options?: Parameters<Build[K]>[1],
		) => ReturnType<Build[K]>;
		formatter = build(lang, options);
		made.set(key, formatter);
	}
	// The map holds what `BUILD[kind]` returned under this kind's key.
	return formatter as ReturnType<Build[K]>;
}

const DAY = 24 * 60 * 60 * 1000;

// The calendar days from `now`'s date to `at`'s, in the reader's own time zone.
function daysApart(at: Date, now: Date): number {
	const day = (date: Date) =>
		new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
	return Math.round((day(at) - day(now)) / DAY);
}

// An ISO moment as a reader reads it, in `lang` (undefined the platform's
// own) through the platform's own date words: the clock time alone today
// ("1:22 AM", "14:00"), the day's word and the time the day before or after
// ("tomorrow 1:22 AM"), the date and time within `now`'s year ("Oct 29,
// 1:22 AM"), and the year with them only in another; a platform with no
// relative words reads the day either side as its date. A moment that does
// not parse reads as itself.
export function momentWords(iso: string, now: Date, lang?: string): string {
	const at = new Date(iso);
	if (Number.isNaN(at.getTime())) return iso;
	const time = formatterFor("date", lang, { timeStyle: "short" }).format(at);
	const apart = daysApart(at, now);
	if (apart === 0) return time;
	// Where the platform has no relative words (Hermes), the day reads as its
	// date.
	if (Math.abs(apart) === 1 && typeof Intl.RelativeTimeFormat === "function")
		return `${formatterFor("relative", lang, { numeric: "auto" }).format(apart, "day")} ${time}`;
	return formatterFor("date", lang, {
		...(at.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(at);
}
