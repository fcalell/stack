// Shared CSS escape/validation primitives for plugin codegen.
//
// Plugins assemble CSS as strings — `@font-face`, `:root`/`@theme` token
// blocks, `@import`/`@source` statements, `@layer` blocks. Every interpolation
// point that crosses the consumer trust boundary (font/family names, URLs,
// layer/token names, supports expressions) MUST flow through these helpers so a
// hostile or careless input cannot break out of its CSS context. This is a
// security boundary — keep it in one place so a future hardening can't be
// applied to one copy and missed in another.
//
// Pure ASCII string functions, no runtime deps. The `label` argument only
// flavours error messages so a thrown error names the offending plugin.

// ── Strings & URLs ──────────────────────────────────────────────────

const STRING_ESCAPE_RE = /[\\"\n\r\f]/g;
const STRING_ESCAPE_MAP: Record<string, string> = {
	"\\": "\\\\",
	'"': '\\"',
	"\n": "\\A ",
	"\r": "\\D ",
	"\f": "\\C ",
};

// Returns a properly-quoted CSS <string> token. Double-quoted so it composes
// safely with single-quoted fragments in tests/snapshots.
//   cssString("Inter Variable")  → `"Inter Variable"`
//   cssString('Foo"Bar')         → `"Foo\"Bar"`
//   cssString("a\nb")            → `"a\\A b"`
export function cssString(value: string): string {
	const escaped = value.replace(
		STRING_ESCAPE_RE,
		(c) => STRING_ESCAPE_MAP[c] ?? c,
	);
	return `"${escaped}"`;
}

// Returns the full quoted `url("...")` token. The URL is validated for gross
// structural problems (control chars) then escaped via the string rules.
export function cssUrl(value: string, label = "@fcalell/cli"): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`[${label}] cssUrl: empty URL`);
	}
	// Disallow raw C0 control characters (0x00–0x1F: newlines, tabs, etc.) —
	// they corrupt the stylesheet and have no legitimate use in a URL. Spaces
	// (0x20) are allowed.
	// biome-ignore lint/suspicious/noControlCharactersInRegex: validating against control chars is the point
	if (/[\u0000-\u001f]/.test(value)) {
		throw new Error(
			`[${label}] cssUrl: URL contains control characters: ${JSON.stringify(value)}`,
		);
	}
	return `url(${cssString(value)})`;
}

// ── Identifiers ─────────────────────────────────────────────────────

// CSS <ident-token> grammar (simplified, ASCII-only). Non-ASCII is rejected to
// keep generated CSS portable across minifiers and tooling.
const IDENT_RE = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;

export function isCssIdent(value: unknown): value is string {
	return typeof value === "string" && IDENT_RE.test(value) && value !== "-";
}

// Validates that `value` is a legal CSS <ident> and returns it unchanged.
// Throws with a precise message — callers shouldn't catch; an invalid ident
// always indicates a bug in the contributing plugin.
export function cssIdent(value: string, label = "@fcalell/cli"): string {
	if (!isCssIdent(value)) {
		throw new Error(
			`[${label}] invalid CSS identifier: ${JSON.stringify(value)}. ` +
				"Expected an ASCII <ident-token>: optional leading '-', start with a letter or '_', " +
				"followed by letters, digits, '_' or '-'.",
		);
	}
	return value;
}

// ── Supports conditions ─────────────────────────────────────────────

// `@supports` / `@import ... supports(...)` arguments are nested feature
// queries (parens, and/or/not, declarations, selector(...), …). A full parser
// is out of scope; this is a cheap boundary that rejects empty input, the
// statement terminators that allow CSS escape (`;`, `{`, `}`), and unbalanced
// parens. Anything that passes is rendered verbatim.
export function isCssSupportsExpression(value: unknown): value is string {
	if (typeof value !== "string") return false;
	const trimmed = value.trim();
	if (trimmed.length === 0) return false;
	if (/[;{}]/.test(trimmed)) return false;
	let depth = 0;
	for (const ch of trimmed) {
		if (ch === "(") depth++;
		else if (ch === ")") {
			depth--;
			if (depth < 0) return false;
		}
	}
	return depth === 0;
}

export function cssSupportsExpression(
	value: string,
	label = "@fcalell/cli",
): string {
	if (!isCssSupportsExpression(value)) {
		throw new Error(
			`[${label}] invalid @supports expression: ${JSON.stringify(value)}. ` +
				"Expected a balanced parenthesized feature query containing no ';' / '{' / '}'.",
		);
	}
	return value.trim();
}
