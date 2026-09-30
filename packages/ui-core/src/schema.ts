import { z } from "zod";
import { LABEL, MODES, WORD_KEYS } from "./tokens.ts";

// The knobs, flat: a theme sets a knob and never a token. Everything else in
// the contract is the approved sheet and moves only with it.
export const themeSchema = z.strictObject({
	accentHue: z.number().min(0).lt(360).optional(),
	// The neutrals' hue. Omitted, it is `accentHue`, so an accent alone tints
	// the chrome toward it.
	castHue: z.number().min(0).lt(360).optional(),
	fonts: z
		.strictObject({
			sans: z.string().min(1).optional(),
			mono: z.string().min(1).optional(),
		})
		.optional(),
	// The mode a viewer with no stored choice starts in, ahead of the system
	// preference. Omitted, the system preference decides.
	defaultMode: z.enum(MODES).optional(),
});

export type Theme = z.input<typeof themeSchema>;
export type ParsedTheme = z.output<typeof themeSchema>;

// Every key required, so a translation that misses a word fails at the type
// and at the schema, never in the interface.
export const wordsSchema = z.strictObject(
	Object.fromEntries(
		WORD_KEYS.map((key) => [key, z.string().min(1)]),
	) as Record<(typeof WORD_KEYS)[number], z.ZodString>,
);

// Throws an Error whose message names every offending key by its path, so a
// consumer reads which knob it got wrong without decoding a ZodError.
export function parseTheme(theme: Theme = {}): ParsedTheme {
	const result = themeSchema.safeParse(theme);
	if (result.success) return result.data;
	const detail = result.error.issues
		.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
		.join("; ");
	throw new Error(`[${LABEL}] invalid theme: ${detail}`);
}
