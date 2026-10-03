import { z } from "zod";
import {
	COUNTED_WORD_KEYS,
	type CountedWordKey,
	LABEL,
	MODES,
	SLOT_WORD_KEYS,
	SLOT_WORDS,
	type SlotWordKey,
	WORD_KEYS,
	type WordKey,
} from "./tokens.ts";

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
const countedWordSchema = z.strictObject({
	one: z.string().min(1),
	other: z.string().min(1),
});

// A slot word spells every slot it is filled with.
function slotWordSchema(key: SlotWordKey) {
	const slots: readonly string[] = SLOT_WORDS[key];
	return z
		.string()
		.refine((word) => slots.every((slot) => word.includes(`{${slot}}`)), {
			message: `spells ${slots.map((slot) => `{${slot}}`).join(" and ")}`,
		});
}

// `Object.fromEntries` widens its keys to `string`; each record is the keys
// it maps.
export const wordsSchema = z.strictObject({
	...(Object.fromEntries(
		WORD_KEYS.map((key) => [key, z.string().min(1)]),
	) as Record<WordKey, z.ZodString>),
	...(Object.fromEntries(
		COUNTED_WORD_KEYS.map((key) => [key, countedWordSchema]),
	) as Record<CountedWordKey, typeof countedWordSchema>),
	...(Object.fromEntries(
		SLOT_WORD_KEYS.map((key) => [key, slotWordSchema(key)]),
	) as Record<SlotWordKey, ReturnType<typeof slotWordSchema>>),
});

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
