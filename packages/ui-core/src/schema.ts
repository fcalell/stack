import { z } from "zod";
import {
	INVARIANT_COLORS,
	LABEL,
	MODES,
	PER_MODE_COLORS,
	SCALE_DEFAULTS,
} from "#tokens";

// The accepted subset is the one the derivation itself emits: three unsigned
// decimal components and an optional unsigned decimal alpha. Percentages,
// `none`, and angle units are rejected, so an override stays comparable with a
// derived value. Digits are required, so `oklch(. . .)` is rejected: a
// malformed oklch compiles to black rather than failing the build, which is why
// the check sits here and not at the emit. The README states the subset.
const OKLCH_RE =
	/^oklch\(\s*\d+(\.\d+)?(\s+\d+(\.\d+)?){2}\s*(\/\s*\d+(\.\d+)?\s*)?\)$/;

// A scale value is a raw token stream (`32px`, `1.29`, a shadow list), so only
// the sequences that would break out of the declaration are rejected: the
// statement and block terminators, the line breaks that close a declaration,
// and a comment delimiter, which would swallow the rest of the emitted block.
const SCALE_VALUE_ILLEGAL_RE = /[;{}\n\r\f]|\/\*|\*\//;

const hueSchema = z.number().min(0).lt(360);

const knobsSchema = z.strictObject({
	neutralHue: hueSchema.optional(),
	brandHue: hueSchema.optional(),
	interactiveHue: hueSchema.optional(),
	okHue: hueSchema.optional(),
	warnHue: hueSchema.optional(),
	dangerHue: hueSchema.optional(),
	neutralChroma: z.number().min(0).max(2).optional(),
});

const colorMapSchema = z.record(z.string(), z.string());

const overridesSchema = z.strictObject({
	colors: z
		.strictObject({
			shared: colorMapSchema.optional(),
			light: colorMapSchema.optional(),
			dark: colorMapSchema.optional(),
		})
		.optional(),
	scales: z.record(z.string(), z.string()).optional(),
});

const PER_MODE_SET: ReadonlySet<string> = new Set(PER_MODE_COLORS);
const INVARIANT_SET: ReadonlySet<string> = new Set(INVARIANT_COLORS);

function checkColorGroup(
	ctx: z.RefinementCtx,
	group: Record<string, string> | undefined,
	path: string[],
	allowed: ReadonlySet<string>,
	wrongGroup: ReadonlySet<string>,
	wrongGroupHint: string,
): void {
	for (const [token, value] of Object.entries(group ?? {})) {
		if (!allowed.has(token)) {
			ctx.addIssue({
				code: "custom",
				path: [...path, token],
				message: wrongGroup.has(token)
					? `"${token}" ${wrongGroupHint}`
					: `unknown color token "${token}"`,
			});
			continue;
		}
		if (!OKLCH_RE.test(value)) {
			ctx.addIssue({
				code: "custom",
				path: [...path, token],
				message: `"${token}" must be oklch(L C H) or oklch(L C H / A) with unsigned decimal components, got ${JSON.stringify(value)}`,
			});
		}
	}
}

export const themeSchema = z
	.strictObject({
		// Which mode seeds the `@theme` block, so the color utilities exist.
		defaultMode: z.enum(MODES).default("light"),
		knobs: knobsSchema.optional(),
		overrides: overridesSchema.optional(),
	})
	.superRefine((theme, ctx) => {
		const colors = theme.overrides?.colors;
		checkColorGroup(
			ctx,
			colors?.shared,
			["overrides", "colors", "shared"],
			INVARIANT_SET,
			PER_MODE_SET,
			"is a per-mode token: override it under colors.light / colors.dark",
		);
		for (const mode of MODES) {
			checkColorGroup(
				ctx,
				colors?.[mode],
				["overrides", "colors", mode],
				PER_MODE_SET,
				INVARIANT_SET,
				"is mode-invariant: override it under colors.shared",
			);
		}
		for (const [key, value] of Object.entries(theme.overrides?.scales ?? {})) {
			if (!(key in SCALE_DEFAULTS)) {
				ctx.addIssue({
					code: "custom",
					path: ["overrides", "scales", key],
					message: `unknown scale token "${key}"`,
				});
				continue;
			}
			if (value.trim() === "" || SCALE_VALUE_ILLEGAL_RE.test(value)) {
				ctx.addIssue({
					code: "custom",
					path: ["overrides", "scales", key],
					message: `"${key}" value contains an illegal character or is empty, got ${JSON.stringify(value)}`,
				});
			}
		}
	});

export type Theme = z.input<typeof themeSchema>;
export type ParsedTheme = z.output<typeof themeSchema>;

// Throws an Error whose message names every offending key by its path, so a
// consumer reads which token or knob it got wrong without decoding a ZodError.
export function parseTheme(theme: Theme = {}): ParsedTheme {
	const result = themeSchema.safeParse(theme);
	if (result.success) return result.data;
	const detail = result.error.issues
		.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
		.join("; ");
	throw new Error(`[${LABEL}] invalid theme: ${detail}`);
}
