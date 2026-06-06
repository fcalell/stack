// CSS escaping/validation for the native-ui `global.css` codegen.
//
// The string/ident escape primitives are a shared security boundary — see
// `@fcalell/cli/css`. This file re-exports them with the plugin label, and
// keeps the native-only validators that have NO web counterpart: custom-
// property names and raw (unquoted) token VALUES.
import {
	cssIdent as cssIdentBase,
	cssString,
	isCssIdent,
} from "@fcalell/cli/css";

const LABEL = "plugin-native-ui";

export { cssString, isCssIdent };

export const cssIdent = (value: string): string => cssIdentBase(value, LABEL);

// A custom-property NAME like `--spacing-2` or `--text-base` (the static
// `@theme` base tokens carry their full `--` name).
const VAR_NAME_RE = /^--[A-Za-z_][A-Za-z0-9_-]*$/;

export function cssVarName(value: string): string {
	if (typeof value !== "string" || !VAR_NAME_RE.test(value)) {
		throw new Error(
			`[${LABEL}] invalid CSS custom-property name: ${JSON.stringify(value)}. ` +
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
		throw new Error(`[${LABEL}] cssTokenValue: empty value`);
	}
	if (TOKEN_VALUE_ILLEGAL_RE.test(value)) {
		throw new Error(
			`[${LABEL}] cssTokenValue: value contains illegal characters: ${JSON.stringify(value)}`,
		);
	}
	return value.trim();
}
