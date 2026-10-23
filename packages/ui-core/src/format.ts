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
