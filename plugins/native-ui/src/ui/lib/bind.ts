// Where a text may and may not break, as the web draws it (`CodeBound`,
// `CodeWhole`, a Section title's hyphens): the platform breaks a line after a
// hyphen and never before one, and a long path or URL has no place to break but
// anywhere. Pure strings, so a test reads them.

// A word joiner (U+2060) after a hyphen takes the platform's break after it
// away, and before one takes the break before it away; a zero-width space
// (U+200B) gives a break after a path's or URL's separator. Only for a text
// drawn and never selected: a copy act copies the source, so neither character
// leaves the screen.
const JOINER = "\u2060";
const BREAK = "\u200B";

// A hyphen that leads a word binds to the word after it (a flag, `--bg`); a
// hyphen inside a word is the platform's own break, after it.
export function codeBound(code: string): string {
	return code.replace(/(?<!\S)-+(?=[^\s-])/g, (run) =>
		run.replaceAll("-", `-${JOINER}`),
	);
}

// A path's or URL's separators offer a break after each run of them (a slash,
// `?`, `&`, `=`, `#`), never inside a run (`../`, `://`) nor before a space; a
// flag binds to its name. A long path breaks between segments, and inside a
// segment only where that segment alone is wider than the line.
export function codeWhole(code: string): string {
	return codeBound(code).replace(/(?<=[/?&=#])(?=[^/?&=#\s\u2060])/g, BREAK);
}

// A hyphen inside a word of a title breaks after it, as the web's does, and
// never before it (`Pre-` / `release`, never `Pre` / `-release`): a word joiner
// ahead of the hyphen takes the break before it away, so a wrapped title never
// starts a line on a hyphen, whatever fits.
export function titleBound(title: string): string {
	return title.replace(/(?<=\w)(?=-\w)/g, JOINER);
}
