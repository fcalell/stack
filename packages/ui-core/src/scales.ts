import {
	BODY_SIZE,
	type Density,
	MEASURE_CHARACTERS,
	type Measure,
	MONO_ADVANCE,
	ROOM_TYPE_SIZE,
	SANS_ADVANCE,
	SIZE_PX,
	SIZES,
	type Size,
	SPACE_BASE,
	SPACING_RATIO,
	SPACING_ROLES,
	type SpacingRole,
	TYPE_ROLES,
	TYPE_SCALE,
	type TypeRole,
} from "./tokens.ts";

// The three scales density moves, as numbers: px on the desktop and touch
// sets, canvas units on the room set. They depend on no knob, so a platform
// that scales the room set at runtime (native) reads them without the theme.

// The nearest even pixel; a tie rounds up.
function roundEven(value: number): number {
	return 2 * Math.round(value / 2);
}

export function sizeOf(density: Density, role: TypeRole): number {
	const ratio =
		(density === "room" ? ROOM_TYPE_SIZE[role] : undefined) ??
		TYPE_SCALE[role].size;
	return Math.round(BODY_SIZE[density] * ratio);
}

export function leadingOf(density: Density, role: TypeRole): number {
	return roundEven(sizeOf(density, role) * TYPE_SCALE[role].leading);
}

export function typeFor(
	density: Density,
): Record<TypeRole, { size: string; leading: string }> {
	const out = {} as Record<TypeRole, { size: string; leading: string }>;
	for (const role of TYPE_ROLES) {
		out[role] = {
			size: `${sizeOf(density, role)}px`,
			leading: `${leadingOf(density, role)}px`,
		};
	}
	return out;
}

export function spacingOf(density: Density, role: SpacingRole): number {
	return SPACE_BASE * SPACING_RATIO[density][role];
}

export function spacingFor(density: Density): Record<SpacingRole, string> {
	const out = {} as Record<SpacingRole, string>;
	for (const role of SPACING_ROLES) out[role] = `${spacingOf(density, role)}px`;
	return out;
}

export function sizePx(density: Density, size: Size): number {
	const px = SIZE_PX[density];
	if (size === "switch-travel") {
		return px["switch-w"] - px.thumb - 2 * px["switch-inset"];
	}
	if (size === "text-area") return 3 * leadingOf(density, "body");
	if (size === "figures") {
		return Math.ceil(4 * MONO_ADVANCE * sizeOf(density, "code"));
	}
	if (size === "message-input") return 8 * leadingOf(density, "body");
	if (size === "image-tile") return 4 * leadingOf(density, "body");
	if (size === "image-cap") return 20 * leadingOf(density, "body");
	if (size === "chips-inset") return (px["control-compact"] - px.chip) / 2;
	return px[size];
}

export function sizesFor(density: Density): Record<Size, string> {
	const out = {} as Record<Size, string>;
	for (const size of SIZES) out[size] = `${sizePx(density, size)}px`;
	return out;
}

// Native's measure in px: its characters at the sans figure advance of the
// touch body size, rounded up, since uniwind reads no `ch`.
export function nativeMeasurePx(measure: Measure): number {
	return Math.ceil(
		MEASURE_CHARACTERS[measure] * SANS_ADVANCE * BODY_SIZE.touch,
	);
}
