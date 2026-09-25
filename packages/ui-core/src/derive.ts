import { oklchToRgb } from "./oklch.ts";
import { type ParsedTheme, parseTheme, type Theme } from "./schema.ts";
import {
	AVATAR_STEP_DEGREES,
	AVATAR_VALUE,
	BREAKPOINTS,
	COLORS,
	type ColorDeclaration,
	type ColorValue,
	FONT_FALLBACKS,
	type FontRole,
	type HueBinding,
	INVARIANT,
	INVARIANT_COLORS,
	type InvariantColor,
	isNeutralBound,
	KNOB_DEFAULTS,
	type Knobs,
	LABEL,
	MODES,
	type Mode,
	PER_MODE_COLORS,
	type PerModeColor,
	PRIMARY_COLORS,
	RADIUS_RATIO,
	SCALE_KEYS,
	type ScaleKey,
	SHADOW_GEOMETRY,
	SHADOW_LEVELS,
	SPACING_RATIO,
	SPACING_RUNGS,
	TRACKED_ROLES,
	TYPE_ROLES,
	TYPE_SCALE,
	TYPE_TRACKING,
	WIDTHS,
} from "./tokens.ts";

// Final value strings, one per token. Emit helpers read this and never the raw
// `Theme`, so knob resolution happens exactly once.
export interface ResolvedTheme {
	defaultMode: Mode;
	knobs: Knobs;
	colors: Record<Mode, Record<PerModeColor, string>>;
	invariantColors: Record<InvariantColor, string>;
	scales: Record<ScaleKey, string>;
	// The two family stacks, the knob's family ahead of the platform fallback.
	fonts: Record<FontRole, string>;
}

// Three decimals with trailing zeros stripped reproduces every reference value
// exactly and keeps a regenerate byte-stable.
function num(value: number): string {
	return String(Math.round(value * 1000) / 1000);
}

function resolveHue(hue: HueBinding, knobs: Knobs): number {
	if (typeof hue === "number") return hue;
	const raw = knobs[hue.knob] + hue.offset;
	return ((raw % 360) + 360) % 360;
}

function resolveColor(value: ColorValue, knobs: Knobs, alpha?: number): string {
	const chroma = isNeutralBound(value.hue)
		? value.c * knobs.neutralChroma
		: value.c;
	const c = num(chroma);
	// At zero chroma the hue is unobservable, so it is emitted as 0.
	const h = c === "0" ? "0" : num(resolveHue(value.hue, knobs));
	const base = `${num(value.l)} ${c} ${h}`;
	return alpha === undefined
		? `oklch(${base})`
		: `oklch(${base} / ${num(alpha)})`;
}

function declarationOf(token: PerModeColor, knobs: Knobs): ColorDeclaration {
	if (token === "accent" || token === "accent-soft") {
		return PRIMARY_COLORS[knobs.primary][token];
	}
	const step = /^avatar-(\d)$/.exec(token)?.[1];
	if (step !== undefined) {
		const offset = (Number(step) - 1) * AVATAR_STEP_DEGREES;
		const hue: HueBinding = { knob: "accentHue", offset };
		return {
			light: { ...AVATAR_VALUE.light, hue },
			dark: { ...AVATAR_VALUE.dark, hue },
		};
	}
	return COLORS[token as keyof typeof COLORS];
}

function resolveMode(
	mode: Mode,
	knobs: Knobs,
	overrides: Record<string, string>,
): Record<PerModeColor, string> {
	const out = {} as Record<PerModeColor, string>;
	const aliases: Array<[PerModeColor, PerModeColor]> = [];
	for (const token of PER_MODE_COLORS) {
		const declaration = declarationOf(token, knobs);
		if ("alias" in declaration) {
			aliases.push([token, declaration.alias]);
			continue;
		}
		out[token] = overrides[token] ?? resolveColor(declaration[mode], knobs);
	}
	// Aliases read the overridden source, so the primary-fill law holds under a
	// re-hued or hand-overridden ink ladder. An explicit override of the alias
	// itself still wins. One hop only: an alias of an alias would resolve
	// against a token this loop has not written yet.
	for (const [token, source] of aliases) {
		if ("alias" in declarationOf(source, knobs)) {
			throw new Error(
				`[${LABEL}] ${token} aliases ${source}, which is itself an alias`,
			);
		}
		out[token] = overrides[token] ?? out[source];
	}
	return out;
}

// ── The scales ──────────────────────────────────────────────────────

function roundEven(value: number): number {
	return 2 * Math.round(value / 2);
}

function scalesFor(knobs: Knobs): Record<ScaleKey, string> {
	const scales = {} as Record<ScaleKey, string>;
	for (const rung of SPACING_RUNGS) {
		scales[`--spacing-${rung}`] = `${knobs.space * SPACING_RATIO[rung]}px`;
	}
	scales["--radius-group"] =
		`${Math.floor(knobs.radius * RADIUS_RATIO.group)}px`;
	scales["--radius-sheet"] =
		`${Math.floor(knobs.radius * RADIUS_RATIO.sheet)}px`;
	scales["--radius-full"] = "9999px";
	for (const role of TYPE_ROLES) {
		const size = Math.round(knobs.text * TYPE_SCALE[role].size);
		scales[`--text-${role}`] = `${size}px`;
		scales[`--leading-${role}`] =
			`${roundEven(size * TYPE_SCALE[role].leading)}px`;
	}
	for (const role of TRACKED_ROLES) {
		scales[`--tracking-${role}`] = TYPE_TRACKING[role];
	}
	const ink = COLORS.ink;
	const shadowInk = "light" in ink ? ink.light : undefined;
	if (shadowInk === undefined) throw new Error(`[${LABEL}] ink is an alias`);
	const [r, g, b] = oklchToRgb(
		shadowInk.l,
		shadowInk.c * knobs.neutralChroma,
		resolveHue(shadowInk.hue, knobs),
	);
	for (const level of SHADOW_LEVELS) {
		const { y, blur, alpha } = SHADOW_GEOMETRY[level];
		scales[`--shadow-${level}`] =
			`0 ${y}px ${blur}px rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	for (const width of WIDTHS) {
		scales[`--container-${width}`] = `${knobs.widths[width]}px`;
	}
	for (const bp of BREAKPOINTS) {
		scales[`--breakpoint-${bp}`] = `${knobs.breakpoints[bp]}px`;
	}
	return scales;
}

function knobsOf(parsed: ParsedTheme): Knobs {
	const knobs: Knobs = {
		accentHue: parsed.accentHue ?? KNOB_DEFAULTS.accentHue,
		neutralHue: parsed.neutralHue ?? KNOB_DEFAULTS.neutralHue,
		neutralChroma: parsed.neutralChroma ?? KNOB_DEFAULTS.neutralChroma,
		okHue: parsed.okHue ?? KNOB_DEFAULTS.okHue,
		warnHue: parsed.warnHue ?? KNOB_DEFAULTS.warnHue,
		dangerHue: parsed.dangerHue ?? KNOB_DEFAULTS.dangerHue,
		primary: parsed.primary ?? KNOB_DEFAULTS.primary,
		space: parsed.space ?? KNOB_DEFAULTS.space,
		radius: parsed.radius ?? KNOB_DEFAULTS.radius,
		text: parsed.text ?? KNOB_DEFAULTS.text,
		fonts: {
			sans: parsed.fonts?.sans ?? KNOB_DEFAULTS.fonts.sans,
			mono: parsed.fonts?.mono ?? KNOB_DEFAULTS.fonts.mono,
		},
		widths: { ...KNOB_DEFAULTS.widths },
		breakpoints: { ...KNOB_DEFAULTS.breakpoints },
	};
	for (const width of WIDTHS) {
		const value = parsed.widths?.[width];
		if (value !== undefined) knobs.widths[width] = value;
	}
	for (const bp of BREAKPOINTS) {
		const value = parsed.breakpoints?.[bp];
		if (value !== undefined) knobs.breakpoints[bp] = value;
	}
	return knobs;
}

// A family name crosses into a `font-family` value, so it is quoted and its
// quote and backslash escaped: no other character can end a CSS string.
function fontStack(family: string | undefined, role: FontRole): string {
	const fallback = FONT_FALLBACKS[role];
	if (family === undefined) return fallback;
	const quoted = `"${family.replace(/[\\"]/g, (ch) => `\\${ch}`)}"`;
	return `${quoted}, ${fallback}`;
}

export function deriveTheme(theme: Theme = {}): ResolvedTheme {
	const parsed = parseTheme(theme);
	const knobs = knobsOf(parsed);

	const colorOverrides = parsed.overrides?.colors;
	const colors = {} as Record<Mode, Record<PerModeColor, string>>;
	for (const mode of MODES) {
		colors[mode] = resolveMode(mode, knobs, colorOverrides?.[mode] ?? {});
	}

	const shared = colorOverrides?.shared ?? {};
	const invariantColors = {} as Record<InvariantColor, string>;
	for (const token of INVARIANT_COLORS) {
		const declaration = INVARIANT[token];
		invariantColors[token] =
			shared[token] ?? resolveColor(declaration, knobs, declaration.alpha);
	}

	// Every override key is checked against `SCALE_KEYS` by the schema, so the
	// cast holds and the map stays total.
	const scales = scalesFor(knobs);
	for (const [key, value] of Object.entries(parsed.overrides?.scales ?? {})) {
		scales[key as ScaleKey] = value;
	}
	for (const key of SCALE_KEYS) {
		if (scales[key] === undefined) throw new Error(`[${LABEL}] no ${key}`);
	}

	return {
		defaultMode: parsed.defaultMode,
		knobs,
		colors,
		invariantColors,
		scales,
		fonts: {
			sans: fontStack(knobs.fonts.sans, "sans"),
			mono: fontStack(knobs.fonts.mono, "mono"),
		},
	};
}
