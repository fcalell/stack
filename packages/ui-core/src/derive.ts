import { parseTheme, type Theme } from "#schema";
import {
	COLORS,
	type ColorValue,
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
	SCALE_DEFAULTS,
	type ScaleKey,
} from "#tokens";

// Final value strings, one per token. Emit helpers read this and never the raw
// `Theme`, so knob resolution happens exactly once.
export interface ResolvedTheme {
	defaultMode: Mode;
	colors: Record<Mode, Record<PerModeColor, string>>;
	invariantColors: Record<InvariantColor, string>;
	scales: Record<ScaleKey, string>;
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

function resolveMode(
	mode: Mode,
	knobs: Knobs,
	overrides: Record<string, string>,
): Record<PerModeColor, string> {
	const out = {} as Record<PerModeColor, string>;
	const aliases: Array<[PerModeColor, PerModeColor]> = [];
	for (const token of PER_MODE_COLORS) {
		const declaration = COLORS[token];
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
		if ("alias" in COLORS[source]) {
			throw new Error(
				`[${LABEL}] ${token} aliases ${source}, which is itself an alias`,
			);
		}
		out[token] = overrides[token] ?? out[source];
	}
	return out;
}

export function deriveTheme(theme: Theme = {}): ResolvedTheme {
	const parsed = parseTheme(theme);
	const knobs: Knobs = { ...KNOB_DEFAULTS };
	for (const [key, value] of Object.entries(parsed.knobs ?? {})) {
		if (value !== undefined) knobs[key as keyof Knobs] = value;
	}

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

	// Every override key is checked against `SCALE_DEFAULTS` by the schema, so
	// the cast holds and the map stays total.
	const scales: Record<ScaleKey, string> = { ...SCALE_DEFAULTS };
	for (const [key, value] of Object.entries(parsed.overrides?.scales ?? {})) {
		scales[key as ScaleKey] = value;
	}

	return { defaultMode: parsed.defaultMode, colors, invariantColors, scales };
}
