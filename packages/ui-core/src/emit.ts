import type { ResolvedTheme } from "./derive.ts";
import {
	leadingOf,
	nativeMeasurePx,
	sizeOf,
	sizePx,
	spacingOf,
} from "./scales.ts";
import {
	BREAKPOINTS,
	COLOR_NAMES,
	DURATIONS,
	EASINGS,
	FONT_ROLES,
	HAIRLINE_PX,
	MEASURES,
	type Mode,
	type PixelDensity,
	RADIUS_PX,
	RADIUS_ROLES,
	RING_OFFSET_PX,
	RING_PX,
	ROOM_CANVAS,
	SHADOW_LEVELS,
	type ShadowLevel,
	SIZES,
	SPACING_ROLES,
	STACK_ORDER,
	TRACKED_ROLES,
	TYPE_ROLES,
	WIDTH_VALUE,
	WIDTHS,
	ZEROED_NAMESPACES,
} from "./tokens.ts";

export type ShadowUtility = `shadow-${ShadowLevel}`;

// The `@theme` record, keyed by full custom-property name. It carries the
// light colors and the touch density set: in Tailwind v4 a property declared
// only inside a variant block generates no utility, so without them
// `bg-canvas` and `min-h-control` would not exist. Which mode and density
// seed it never shows: each platform switches every value through the active
// scope's variables, since a non-inline `@theme` utility reads its variable.
//
// Each type role renders twice, from one resolved value: the Tailwind v4
// modifier so `text-title` carries its own leading on web, and the standalone
// namespace so `leading-title` exists on its own.
export function themeTokens(resolved: ResolvedTheme): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const namespace of ZEROED_NAMESPACES) tokens[namespace] = "initial";
	Object.assign(tokens, densityTokens(resolved, "touch"));
	for (const role of TRACKED_ROLES) {
		tokens[`--text-${role}--letter-spacing`] = resolved.tracking[role];
	}
	for (const role of TRACKED_ROLES) {
		tokens[`--tracking-${role}`] = resolved.tracking[role];
	}
	for (const role of RADIUS_ROLES) {
		tokens[`--radius-${role}`] = resolved.radii[role];
	}
	for (const width of WIDTHS) {
		tokens[`--container-${width}`] = resolved.widths[width];
	}
	for (const bp of BREAKPOINTS) {
		tokens[`--breakpoint-${bp}`] = resolved.breakpoints[bp];
	}
	for (const role of FONT_ROLES) {
		tokens[`--font-${role}`] = resolved.fonts[role];
	}
	for (const rung of DURATIONS) {
		tokens[`--transition-duration-${rung}`] =
			`${resolved.motion.durations[rung]}ms`;
	}
	tokens["--transition-duration-loop"] = `${resolved.motion.loop}ms`;
	for (const easing of EASINGS) {
		tokens[`--ease-${easing}`] =
			`cubic-bezier(${resolved.motion.easings[easing].join(", ")})`;
	}
	// A bare `transition` takes the base rung and `out`, through the variables,
	// so it stills with them under reduced motion.
	tokens["--default-transition-duration"] = "var(--transition-duration-base)";
	tokens["--default-transition-timing-function"] = "var(--ease-out)";
	// A bare `border` and a `divide` read the hairline, so the room scales them.
	tokens["--default-border-width"] = "var(--hairline)";
	for (const name of COLOR_NAMES) {
		tokens[`--color-${name}`] = resolved.colors.light[name];
	}
	return tokens;
}

// The values that are neither utilities nor per mode, rendered on the root
// outside `@theme`: the hairline and the focus ring's width and offset, which
// a platform's base rules read, the layers' stacking order, which a layer
// reads as `z-(--layer-<layer>)` (Tailwind's `z-*` reads no theme
// namespace), and the light shadows, seeded so the root carries them ahead of
// any mode scope.
export function rootTokens(resolved: ResolvedTheme): Record<string, string> {
	const tokens: Record<string, string> = {
		"--hairline": `${HAIRLINE_PX}px`,
		"--focus-ring": `${RING_PX}px`,
		"--focus-ring-offset": `${RING_OFFSET_PX}px`,
	};
	STACK_ORDER.forEach((layer, at) => {
		tokens[`--layer-${layer}`] = String(at + 1);
	});
	for (const level of SHADOW_LEVELS) {
		tokens[`--shadow-${level}`] = resolved.shadows.light[level];
	}
	return tokens;
}

// One density's set, keyed by full custom-property name: the type scale,
// the spacing roles and the sizes. `themeTokens` seeds the touch set on both
// platforms; the web draws the desktop set under a fine pointer at `tablet`
// width and wider, and either set under a `data-density` attribute on the
// root, which is how the showcase and a board pin a density.
export function densityTokens(
	resolved: ResolvedTheme,
	density: PixelDensity,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const role of TYPE_ROLES) {
		const { size, leading } = resolved.type[density][role];
		tokens[`--text-${role}`] = size;
		tokens[`--text-${role}--line-height`] = leading;
	}
	for (const role of TYPE_ROLES) {
		tokens[`--leading-${role}`] = resolved.type[density][role].leading;
	}
	for (const role of SPACING_ROLES) {
		tokens[`--spacing-${role}`] = resolved.spacing[density][role];
	}
	for (const size of SIZES) {
		tokens[`--spacing-${size}`] = resolved.sizes[density][size];
	}
	return tokens;
}

// ── The room set ────────────────────────────────────────────────────

// The custom property that holds the room unit on the web.
export const ROOM_UNIT = "--room-unit";

// The room unit as a CSS length: the screen over `ROOM_CANVAS` on the tighter
// axis, so a portrait or ultrawide screen stays inside the canvas, and never
// under 1 px, so a small window keeps the touch set at least. At 1920 × 1080
// it is 2 px. `vw` ignores browser zoom: the screen is read, never zoomed.
export function roomUnit(): string {
	const { width, height } = ROOM_CANVAS;
	return `max(1px, min(100vw / ${width}, 100dvh / ${height}))`;
}

// The same unit as a number, for a window of this size in px (native, which
// has no `vw`).
export function roomUnitFor(width: number, height: number): number {
	return Math.max(
		1,
		Math.min(width / ROOM_CANVAS.width, height / ROOM_CANVAS.height),
	);
}

// The room set as one record: the type roles, the spacing roles and the
// sizes of `densityTokens`, plus what is a constant at the other densities
// and scales with the room, the radii, the fixed widths and the hairline.
// Each value is the canvas units its token holds, `scale` turning them into
// the platform's value: the web a `calc` over `--room-unit`, native the
// number times the unit it computes from the window. A `full` radius and the
// `ch` measures stay as they are.
export function roomTokens<T>(scale: (units: number) => T): Record<string, T> {
	const tokens: Record<string, T> = {};
	for (const role of TYPE_ROLES) {
		tokens[`--text-${role}`] = scale(sizeOf("room", role));
		tokens[`--text-${role}--line-height`] = scale(leadingOf("room", role));
		tokens[`--leading-${role}`] = scale(leadingOf("room", role));
	}
	for (const role of SPACING_ROLES) {
		tokens[`--spacing-${role}`] = scale(spacingOf("room", role));
	}
	for (const size of SIZES) {
		tokens[`--spacing-${size}`] = scale(sizePx("room", size));
	}
	for (const role of RADIUS_ROLES) {
		if (role !== "full") tokens[`--radius-${role}`] = scale(RADIUS_PX[role]);
	}
	for (const width of WIDTHS) {
		if (!(MEASURES as readonly string[]).includes(width)) {
			tokens[`--container-${width}`] = scale(
				Number.parseInt(WIDTH_VALUE[width], 10),
			);
		}
	}
	tokens["--hairline"] = scale(HAIRLINE_PX);
	return tokens;
}

// Native's short measure in the room: the px `nativeMeasureTokens` declares,
// scaled. Native reads no `ch`, so there they scale with the room instead of
// following the type.
export function roomMeasureTokens<T>(
	scale: (units: number) => T,
): Record<string, T> {
	const tokens: Record<string, T> = {};
	for (const measure of MEASURES) {
		tokens[`--container-${measure}`] = scale(nativeMeasurePx(measure));
	}
	return tokens;
}

// The focus ring's width and offset in the room, which the web's base rule
// reads; native draws no ring.
export function roomRingTokens<T>(
	scale: (units: number) => T,
): Record<string, T> {
	return {
		"--focus-ring": scale(RING_PX),
		"--focus-ring-offset": scale(RING_OFFSET_PX),
	};
}

// What the web declares under a room scope: the unit, then every room value
// as a `calc` over it.
export function roomScope(): Record<string, string> {
	const scale = (units: number) => `calc(${units} * var(${ROOM_UNIT}))`;
	return {
		[ROOM_UNIT]: roomUnit(),
		...roomTokens(scale),
		...roomRingTokens(scale),
	};
}

// Every duration rung at 0, which the web renders under
// `prefers-reduced-motion: reduce`: each transition reads its duration
// through a rung's variable, so none moves. The loop stays: a spinner that
// stops is a wait that looks over.
export function reducedMotionTokens(): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const rung of DURATIONS) tokens[`--transition-duration-${rung}`] = "0ms";
	return tokens;
}

// One mode's values, keyed by full custom-property name: every color and
// the two shadows.
export function modeTokens(
	resolved: ResolvedTheme,
	mode: Mode,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const name of COLOR_NAMES) {
		tokens[`--color-${name}`] = resolved.colors[mode][name];
	}
	for (const level of SHADOW_LEVELS) {
		tokens[`--shadow-${level}`] = resolved.shadows[mode][level];
	}
	return tokens;
}

// What a raised ground (`RAISED_GROUNDS`) declares for everything inside
// it: the hairline read through `edge-raised`. The web scopes it on the
// grounds' fill classes, after the mode scopes, so a ground that is also a
// mode scope still re-points; native scopes it on each raised surface's
// content, resolving each `var()` read in the mode.
export function raisedGroundTokens(): Record<string, string> {
	return { "--color-edge": "var(--color-edge-raised)" };
}

// The declarations of each elevation utility. The `--shadow-*` theme
// namespace does not resolve into React Native's `boxShadow`, so each
// consumer wraps these in `@utility` itself; each reads its mode's variable.
export function shadowUtilities(): Record<
	ShadowUtility,
	Record<string, string>
> {
	const utilities = {} as Record<ShadowUtility, Record<string, string>>;
	for (const level of SHADOW_LEVELS) {
		utilities[`shadow-${level}`] = { "box-shadow": `var(--shadow-${level})` };
	}
	return utilities;
}

// Native's short measure over the web's `ch`: uniwind reads no `ch`, so native
// declares it in px at the sans figure advance of the touch body size, a
// label's own size lost.
export function nativeMeasureTokens(
	resolved: ResolvedTheme,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const measure of MEASURES) {
		tokens[`--container-${measure}`] = resolved.nativeMeasures[measure];
	}
	return tokens;
}
