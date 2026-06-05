// CSS escaping/validation for the native-ui `global.css` codegen.
//
// Mirrors the policy in plugin-solid-ui's css-escape: every interpolation point
// that crosses the consumer trust boundary (theme names, token names, token
// values) is validated or escaped so a hostile/careless token can't break out
// of its CSS context. Token data flows in from the consumer's `themeTokens`
// option (parsed from `marina.css`), so it is semi-trusted, not inert.

const STRING_ESCAPE_RE = /[\\"\n\r\f]/g;
const STRING_ESCAPE_MAP: Record<string, string> = {
	"\\": "\\\\",
	'"': '\\"',
	"\n": "\\A ",
	"\r": "\\D ",
	"\f": "\\C ",
};

// Returns a properly-quoted CSS <string> token (double-quoted, escaped). Used
// for `@source`/`@import` paths and quoted font-family names.
export function cssString(value: string): string {
	const escaped = value.replace(
		STRING_ESCAPE_RE,
		(c) => STRING_ESCAPE_MAP[c] ?? c,
	);
	return `"${escaped}"`;
}

// CSS <ident-token> (ASCII-only) — theme names and the semantic part of a
// color token key (`canvas`, `ink-1`).
const IDENT_RE = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;

export function isCssIdent(value: unknown): value is string {
	return typeof value === "string" && IDENT_RE.test(value) && value !== "-";
}

export function cssIdent(value: string): string {
	if (!isCssIdent(value)) {
		throw new Error(
			`[plugin-native-ui] invalid CSS identifier: ${JSON.stringify(value)}. ` +
				"Expected an ASCII <ident-token>: start with a letter or '_', then letters, digits, '_' or '-'.",
		);
	}
	return value;
}

// A custom-property NAME like `--spacing-2` or `--text-base` (the static
// `@theme` base tokens carry their full `--` name).
const VAR_NAME_RE = /^--[A-Za-z_][A-Za-z0-9_-]*$/;

export function cssVarName(value: string): string {
	if (typeof value !== "string" || !VAR_NAME_RE.test(value)) {
		throw new Error(
			`[plugin-native-ui] invalid CSS custom-property name: ${JSON.stringify(value)}. ` +
				'Expected a "--"-prefixed <ident> (e.g. "--radius-md").',
		);
	}
	return value;
}

// A custom-property VALUE (color, length, font stack). Unlike a CSS <string>
// these are raw token streams — e.g. `oklch(0.2 0.05 220)` or `4px` — so we
// must NOT quote them (spaces, parens and commas are legal). We reject only the
// characters that would let a value escape its declaration: the statement /
// block terminators `;{}` and the line breaks that close a declaration.
const TOKEN_VALUE_ILLEGAL_RE = /[;{}\n\r\f]/;

export function cssTokenValue(value: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error("[plugin-native-ui] cssTokenValue: empty value");
	}
	if (TOKEN_VALUE_ILLEGAL_RE.test(value)) {
		throw new Error(
			`[plugin-native-ui] cssTokenValue: value contains illegal characters: ${JSON.stringify(value)}`,
		);
	}
	return value.trim();
}
