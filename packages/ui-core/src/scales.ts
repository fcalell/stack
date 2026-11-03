import {
	BODY_SIZE,
	type Density,
	FIXED_WIDTH_PX,
	HAIRLINE_PX,
	ICON_RATIO,
	KNOB_DEFAULTS,
	MEASURE_CHARACTERS,
	type Measure,
	MONO_ADVANCE,
	type PxWidth,
	ROOM_TYPE_SIZE,
	SANS_ADVANCE,
	SIZES,
	type Size,
	SPACE_BASE,
	SPACING_RATIO,
	SPACING_ROLES,
	type SpacingRole,
	TARGET_PX,
	TEXT_MEASURE_CHARACTERS,
	TYPE_ROLES,
	TYPE_SCALE,
	type TypeRole,
	type UnitWidth,
	WIDTH_VALUE,
} from "./tokens.ts";

// The three scales density moves, as numbers: px on the desktop and touch
// sets, canvas units on the room set. Each follows one base, the body size,
// which the `size` knob sets (`bodyOf`); every function takes the knob last and
// defaults to the sheet's. They depend on nothing else, so a platform that
// scales the room set at runtime (native) reads them without the theme.

// The nearest even pixel; a tie rounds up.
function roundEven(value: number): number {
	return 2 * Math.round(value / 2);
}

// The body size at a density for the `size` knob, the desktop's: touch and the
// room keep the sheet's ratio to the desktop, never under their own sheet
// value's floor of 16 (iOS Safari zooms a field under it on focus).
export function bodyOf(density: Density, size = KNOB_DEFAULTS.size): number {
	if (density === "desktop") return size;
	return Math.max(
		BODY_SIZE.touch,
		Math.round((size * BODY_SIZE[density]) / BODY_SIZE.desktop),
	);
}

export function sizeOf(
	density: Density,
	role: TypeRole,
	size = KNOB_DEFAULTS.size,
): number {
	const ratio =
		(density === "room" ? ROOM_TYPE_SIZE[role] : undefined) ??
		TYPE_SCALE[role].size;
	return Math.round(bodyOf(density, size) * ratio);
}

export function leadingOf(
	density: Density,
	role: TypeRole,
	size = KNOB_DEFAULTS.size,
): number {
	return roundEven(sizeOf(density, role, size) * TYPE_SCALE[role].leading);
}

export function typeFor(
	density: Density,
	size = KNOB_DEFAULTS.size,
): Record<TypeRole, { size: string; leading: string }> {
	const out = {} as Record<TypeRole, { size: string; leading: string }>;
	for (const role of TYPE_ROLES) {
		out[role] = {
			size: `${sizeOf(density, role, size)}px`,
			leading: `${leadingOf(density, role, size)}px`,
		};
	}
	return out;
}

// A role is its multiple of the base, the base following the body size from
// the sheet's, to the pixel.
export function spacingOf(
	density: Density,
	role: SpacingRole,
	size = KNOB_DEFAULTS.size,
): number {
	const base = (SPACE_BASE * bodyOf(density, size)) / BODY_SIZE[density];
	return Math.round(base * SPACING_RATIO[density][role]);
}

export function spacingFor(
	density: Density,
	size = KNOB_DEFAULTS.size,
): Record<SpacingRole, string> {
	const out = {} as Record<SpacingRole, string>;
	for (const role of SPACING_ROLES)
		out[role] = `${spacingOf(density, role, size)}px`;
	return out;
}

// A px width: a unit width is its count of the space base, which the `size`
// knob moves with the body size and no density does (a phone keeps the
// desktop's toast); a fixed width is its own px.
export function widthPx(width: PxWidth, size = KNOB_DEFAULTS.size): number {
	if (width in FIXED_WIDTH_PX)
		return FIXED_WIDTH_PX[width as keyof typeof FIXED_WIDTH_PX];
	const base = (SPACE_BASE * bodyOf("desktop", size)) / BODY_SIZE.desktop;
	return Math.round(base * WIDTH_VALUE[width as UnitWidth]);
}

// Running text's width in px: its characters at the sans figure advance of the
// density's body size, rounded up, so every role of text stands at one width.
function measureOf(density: Density, size: number): number {
	return Math.ceil(
		TEXT_MEASURE_CHARACTERS * SANS_ADVANCE * bodyOf(density, size),
	);
}

// Every size is derived from the type, the space and the target; none is a
// set number but the target.
export function sizePx(
	density: Density,
	name: Size,
	size = KNOB_DEFAULTS.size,
): number {
	const line = leadingOf(density, "body", size);
	const gap = spacingOf(density, "gap", size);
	const target = TARGET_PX[density];
	const icon = roundEven(bodyOf(density, size) * ICON_RATIO);
	switch (name) {
		// The body line and the gap above and below it, at least the target. A
		// row is the same measure, as a floor.
		case "control":
		case "row":
			return Math.max(line + 2 * gap, target);
		case "target":
			return target;
		case "line-body":
			return line;
		case "hairline":
			return HAIRLINE_PX;
		case "icon":
			return icon;
		case "icon-meta":
			return icon - 2;
		case "icon-control":
			return icon + 2;
		case "dot":
			return (icon - 2) / 2;
		case "figures":
			return Math.ceil(4 * MONO_ADVANCE * sizeOf(density, "code", size));
		case "measure":
			return measureOf(density, size);
	}
}

export function sizesFor(
	density: Density,
	size = KNOB_DEFAULTS.size,
): Record<Size, string> {
	const out = {} as Record<Size, string>;
	for (const name of SIZES) out[name] = `${sizePx(density, name, size)}px`;
	return out;
}

// Native's short measure in px: its characters at the sans figure advance of
// the touch body size, rounded up, since uniwind reads no `ch`.
export function nativeMeasurePx(
	measure: Measure,
	size = KNOB_DEFAULTS.size,
): number {
	return Math.ceil(
		MEASURE_CHARACTERS[measure] * SANS_ADVANCE * bodyOf("touch", size),
	);
}
