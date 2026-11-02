// Where a text may not break at a hyphen. A browser breaks after a hyphen and
// never before one, which is the break a name of hyphens wants (a long repo
// name wraps as `a-repository-` / `with-a-name`), so a hyphen inside a word is
// left to it. Only a hyphen that leads a word binds to the word after it: a
// flag (`--bg`) is one piece, since a break between its hyphens and its name
// would read as two words. A piece is wrapped in a nowrap box, and the hyphen
// that ends the piece goes inside it (`--bg-`), so the break after that hyphen
// stands at the piece's end and no line ever starts on a hyphen; a hyphen
// before a digit (`webauthn-3`, `--x-3`) stays with the digit, as the break
// rules keep it.
const BOUND = /((?<!\S)-+[^\s-]+(?:-+\d[^\s-]*)*-*)/;

/** A text split into the pieces that stay whole: the odd entries are a flag and its trailing hyphens, the even ones are text the browser breaks as it does (after a hyphen, never before one). */
export function boundPieces(code: string): string[] {
	return code.split(BOUND);
}
