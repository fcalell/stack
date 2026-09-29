import {
	chromaInGamut,
	contrastRatio,
	type Lab,
	labToOklch,
	luminance,
	mixLab,
	oklchToLab,
	oklchToRgb,
} from "./oklch.ts";
import { type ParsedTheme, parseTheme, type Theme } from "./schema.ts";
import {
	BODY_SIZE,
	BREAKPOINT_PX,
	BREAKPOINTS,
	type Breakpoint,
	COLOR_NAMES,
	COLORS,
	type ColorName,
	type ColorValue,
	DENSITIES,
	type Density,
	DURATION_MS,
	DURATIONS,
	type Duration,
	EASING,
	type Easing,
	FONT_FALLBACKS,
	type FontRole,
	fallbackFace,
	type Holds,
	KNOB_DEFAULTS,
	type Knobs,
	LABEL,
	LOOP_MS,
	MODES,
	type Mode,
	RADIUS_PX,
	RADIUS_ROLES,
	type RadiusRole,
	SHADOW_INK,
	SHADOW_LAYERS,
	SHADOW_LEVELS,
	type ShadowLevel,
	SIZE_PX,
	SIZES,
	type Size,
	SPACE_BASE,
	SPACING_RATIO,
	SPACING_ROLES,
	type SpacingRole,
	TRACKED_ROLES,
	type TrackedRole,
	TYPE_ROLES,
	TYPE_SCALE,
	TYPE_TRACKING,
	type TypeRole,
	WIDTH_VALUE,
	WIDTHS,
	type Width,
} from "./tokens.ts";

// Final value strings, one per token. Emit helpers read this and never the raw
// `Theme`, so knob resolution happens exactly once.
export interface ResolvedTheme {
	// The mode a viewer with no stored choice starts in; absent, the system
	// preference decides.
	defaultMode: Mode | undefined;
	knobs: Knobs;
	colors: Record<Mode, Record<ColorName, string>>;
	// Each level as a `box-shadow` list in sRGB, since React Native's
	// `boxShadow` parses no oklch.
	shadows: Record<Mode, Record<ShadowLevel, string>>;
	// The three scales density moves, each set complete on its own.
	type: Record<Density, Record<TypeRole, { size: string; leading: string }>>;
	tracking: Record<TrackedRole, string>;
	spacing: Record<Density, Record<SpacingRole, string>>;
	sizes: Record<Density, Record<Size, string>>;
	radii: Record<RadiusRole, string>;
	widths: Record<Width, string>;
	breakpoints: Record<Breakpoint, string>;
	// The two family stacks: the knob's family, its metric fallback face, then
	// the platform fallback.
	fonts: Record<FontRole, string>;
	// Numbers, so a platform that animates outside CSS (a native timing
	// call) reads the same record the web renders as custom properties:
	// each duration in milliseconds, each easing as its four cubic-bezier
	// control values.
	motion: {
		durations: Record<Duration, number>;
		loop: number;
		easings: Record<Easing, readonly [number, number, number, number]>;
	};
}

// Three decimals with trailing zeros stripped reproduces every sheet value
// exactly and keeps a regenerate byte-stable.
function round3(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function num(value: number): string {
	return String(round3(value));
}

interface Resolved {
	l: number;
	c: number;
	h: number;
	alpha: number | undefined;
}

function format(color: Resolved): string {
	const c = num(color.c);
	// At zero chroma the hue is unobservable, so it is emitted as 0.
	const h = c === "0" ? "0" : num(color.h);
	const base = `${num(color.l)} ${c} ${h}`;
	return color.alpha === undefined
		? `oklch(${base})`
		: `oklch(${base} / ${num(color.alpha)})`;
}

// A declared value, its chroma held inside sRGB at the same lightness: a
// re-hued accent then keeps its luminance and contrast and loses saturation
// instead of clipping to another color. The sheet's own values are already
// in gamut, so at the default hue nothing moves.
function literal(value: ColorValue, knobs: Knobs): Resolved {
	const h = value.hue === "accent" ? knobs.accentHue : value.hue;
	return {
		l: value.l,
		c: chromaInGamut(value.l, value.c, h),
		h,
		alpha: value.alpha,
	};
}

const HOLD_STEP = 0.005;

// The declared lightness, moved away from each ground in 0.005 steps until
// every contract holds, the chroma re-clamped at each step. At the sheet's
// own hue every contract already holds and nothing moves.
function holding(
	color: Resolved,
	contracts: readonly Holds[],
	grounds: Resolved[],
): Resolved {
	let current = color;
	for (let step = 0; step < 100; step++) {
		const short = contracts.find(
			(contract, index) =>
				contrastRatio(
					luminance(current.l, current.c, current.h),
					luminance(
						grounds[index]?.l ?? 0,
						grounds[index]?.c ?? 0,
						grounds[index]?.h ?? 0,
					),
				) < contract.ratio,
		);
		if (!short) return current;
		const ground = grounds[contracts.indexOf(short)];
		const darker = ground !== undefined && ground.l > current.l;
		const l = round3(current.l + (darker ? -HOLD_STEP : HOLD_STEP));
		current = { ...current, l, c: chromaInGamut(l, color.c, current.h) };
	}
	throw new Error(
		`[${LABEL}] no lightness holds the contract at hue ${color.h}`,
	);
}

function lab(color: Resolved): Lab {
	return oklchToLab(color.l, color.c, color.h);
}

const BLACK: Lab = { l: 0, a: 0, b: 0 };

// One resolver over the whole declaration graph, memoized per mode, so an
// alias may point at a mix and a mix at an alias; a cycle throws by name.
function resolveMode(mode: Mode, knobs: Knobs): Record<ColorName, string> {
	const memo = new Map<ColorName, Resolved>();
	const visiting = new Set<ColorName>();
	const resolve = (name: ColorName): Resolved => {
		const done = memo.get(name);
		if (done) return done;
		if (visiting.has(name)) {
			throw new Error(`[${LABEL}] ${name} resolves through itself`);
		}
		visiting.add(name);
		const declaration = COLORS[name];
		let color: Resolved;
		if ("alias" in declaration) {
			color = resolve(declaration.alias);
		} else if ("veil" in declaration) {
			color = { ...resolve(declaration.veil), alpha: declaration.alpha };
		} else if ("mix" in declaration) {
			const from = lab(resolve(declaration.mix));
			const toward =
				declaration.toward === "black"
					? BLACK
					: lab(resolve(declaration.toward));
			const [l, c, h] = labToOklch(
				mixLab(from, toward, declaration.amount),
			).map(round3);
			// A mix toward black narrows toward the gamut's tip, so a re-hued
			// accent's mix is clamped as its source is, at the lightness and
			// hue it is emitted with.
			color = {
				l: l ?? 0,
				c: chromaInGamut(l ?? 0, c ?? 0, h ?? 0),
				h: h ?? 0,
				alpha: undefined,
			};
		} else {
			const value = declaration[mode];
			color = literal(value, knobs);
			if (value.holds) {
				color = holding(
					color,
					value.holds,
					value.holds.map((contract) => resolve(contract.on)),
				);
			}
		}
		visiting.delete(name);
		memo.set(name, color);
		return color;
	};
	const out = {} as Record<ColorName, string>;
	for (const name of COLOR_NAMES) out[name] = format(resolve(name));
	return out;
}

function shadowsFor(mode: Mode): Record<ShadowLevel, string> {
	const ink = SHADOW_INK[mode];
	const hue = ink.hue === "accent" ? KNOB_DEFAULTS.accentHue : ink.hue;
	const [r, g, b] = oklchToRgb(ink.l, ink.c, hue);
	const out = {} as Record<ShadowLevel, string>;
	for (const level of SHADOW_LEVELS) {
		out[level] = SHADOW_LAYERS[level][mode]
			.map(
				({ y, blur, alpha }) =>
					`0 ${y}px ${blur}px rgba(${r}, ${g}, ${b}, ${alpha})`,
			)
			.join(", ");
	}
	return out;
}

// ── The scales ──────────────────────────────────────────────────────

// The nearest even pixel; a tie rounds up.
function roundEven(value: number): number {
	return 2 * Math.round(value / 2);
}

function typeFor(
	density: Density,
): Record<TypeRole, { size: string; leading: string }> {
	const body = BODY_SIZE[density];
	const out = {} as Record<TypeRole, { size: string; leading: string }>;
	for (const role of TYPE_ROLES) {
		const size = Math.round(body * TYPE_SCALE[role].size);
		out[role] = {
			size: `${size}px`,
			leading: `${roundEven(size * TYPE_SCALE[role].leading)}px`,
		};
	}
	return out;
}

function spacingFor(density: Density): Record<SpacingRole, string> {
	const out = {} as Record<SpacingRole, string>;
	for (const role of SPACING_ROLES) {
		out[role] = `${SPACE_BASE * SPACING_RATIO[density][role]}px`;
	}
	return out;
}

function sizesFor(density: Density): Record<Size, string> {
	const out = {} as Record<Size, string>;
	for (const size of SIZES) out[size] = `${SIZE_PX[density][size]}px`;
	return out;
}

function perDensity<T>(build: (density: Density) => T): Record<Density, T> {
	const out = {} as Record<Density, T>;
	for (const density of DENSITIES) out[density] = build(density);
	return out;
}

function knobsOf(parsed: ParsedTheme): Knobs {
	return {
		accentHue: parsed.accentHue ?? KNOB_DEFAULTS.accentHue,
		density: parsed.density ?? KNOB_DEFAULTS.density,
		fonts: {
			sans: parsed.fonts?.sans ?? KNOB_DEFAULTS.fonts.sans,
			mono: parsed.fonts?.mono ?? KNOB_DEFAULTS.fonts.mono,
		},
	};
}

// A family name crosses into a `font-family` value, so it is quoted and its
// quote and backslash escaped: no other character can end a CSS string.
function quoted(family: string): string {
	return `"${family.replace(/[\\"]/g, (ch) => `\\${ch}`)}"`;
}

// The family, its metric fallback face, then the platform stack.
function fontStack(family: string | undefined, role: FontRole): string {
	const fallback = FONT_FALLBACKS[role];
	if (family === undefined) return fallback;
	return `${quoted(family)}, ${quoted(fallbackFace(family))}, ${fallback}`;
}

function record<K extends string, V>(
	keys: readonly K[],
	value: (key: K) => V,
): Record<K, V> {
	const out = {} as Record<K, V>;
	for (const key of keys) out[key] = value(key);
	return out;
}

export function deriveTheme(theme: Theme = {}): ResolvedTheme {
	const parsed = parseTheme(theme);
	const knobs = knobsOf(parsed);
	const colors = {} as Record<Mode, Record<ColorName, string>>;
	const shadows = {} as Record<Mode, Record<ShadowLevel, string>>;
	for (const mode of MODES) {
		colors[mode] = resolveMode(mode, knobs);
		shadows[mode] = shadowsFor(mode);
	}
	return {
		defaultMode: parsed.defaultMode,
		knobs,
		colors,
		shadows,
		type: perDensity(typeFor),
		tracking: record(TRACKED_ROLES, (role) => TYPE_TRACKING[role]),
		spacing: perDensity(spacingFor),
		sizes: perDensity(sizesFor),
		radii: record(RADIUS_ROLES, (role) => `${RADIUS_PX[role]}px`),
		widths: record(WIDTHS, (width) => WIDTH_VALUE[width]),
		breakpoints: record(BREAKPOINTS, (bp) => `${BREAKPOINT_PX[bp]}px`),
		fonts: {
			sans: fontStack(knobs.fonts.sans, "sans"),
			mono: fontStack(knobs.fonts.mono, "mono"),
		},
		motion: {
			durations: record(DURATIONS, (rung) => DURATION_MS[rung]),
			loop: LOOP_MS,
			easings: { ...EASING },
		},
	};
}
