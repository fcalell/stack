// The contract as a DESIGN.md (github.com/google-labs-code/design.md, version
// `alpha`): the tokens as YAML front matter, the matrices as its components,
// and the eight body sections as a snapshot of what the contract draws. A pure
// function of a resolved theme, so the committed file is checked against it.
import type { ResolvedTheme } from "./derive.ts";
import { rootTokens } from "./emit.ts";
import { rosterEntries } from "./roster.ts";
import { leadingOf, sizeOf, sizePx, spacingOf } from "./scales.ts";
import {
	BREAKPOINTS,
	CHART_SERIES,
	COLOR_NAMES,
	COUNTED_WORD_KEYS,
	DURATIONS,
	EASINGS,
	type FontWeight,
	ICON_STROKE,
	LABEL,
	METER_NEAR,
	MODES,
	type Mode,
	RADIUS_ROLES,
	ROOM_CANVAS,
	SHADOW_LEVELS,
	SHEET_DOCKED_BODY_SHARE,
	SIZES,
	SLOT_WORD_KEYS,
	SPACING_ROLES,
	STACK_ORDER,
	STRONG_WEIGHT,
	TEXT_MEASURE_CHARACTERS,
	TRACKED_ROLES,
	TYPE_ROLES,
	TYPE_SCALE,
	type TypeRole,
	WIDTHS,
} from "./tokens.ts";
import * as variants from "./variants.ts";
import { classes, FAMILIES, type Family } from "./variants.ts";

const WEIGHT: Record<FontWeight, number> = {
	regular: 400,
	medium: 500,
	semibold: 600,
};

// What each color role is for, by use. A family's three and an avatar's two
// share a line.
const COLOR_USE: Record<string, string> = {
	canvas: "the page",
	surface: "a card, a field, a row",
	group: "a filled tile, a chip ground",
	raised: "a popover, a dialog, a sheet, a toast",
	edge: "the hairline over canvas and surface; inside a group or a lifted layer the container re-points it to `edge-raised`",
	"edge-raised": "the hairline inside a group and on a lifted layer",
	"edge-strong": "a control's boundary, at 3:1",
	grid: "the canvas's dot grid, at 1.5:1 on `canvas`",
	scrim: "the veil behind a dialog or a sheet",
	"ink-body": "the primary line of anything",
	"ink-meta": "a secondary line, a placeholder, a table header",
	"ink-faint": "disabled text only",
	accent: "the filled act",
	"on-accent": "text on `accent`",
	"accent-soft": "a tinted tile",
	"accent-ink": "a link, the focus ring, a selection outline",
	ok: "the `done` mark, an added line's ink",
	"ok-soft": "the ground under an `ok` mark, an added line",
	warn: "a caution's ink: a banner's glyph and act, a change mark",
	"warn-soft": "the ground under a `warn` mark",
	danger:
		"the `failed` mark, a destructive act's label, an error ring, the filled destructive act",
	"danger-soft": "the ground under a `danger` mark, a removed line",
	chip: "a `Chip`'s family: the mark (a dot, an attention status), the soft ground, the ink on the soft",
	chart:
		"a chart series' fill: the chip hue, quieter, at 3:1 on `surface` and `group`",
	avatar: "an `Avatar`'s fill and the initial on it, one step per name",
	"wash-hover": "a transparent part under the pointer",
	"wash-press": "a transparent part pressed",
	"wash-selected": "a selected row or chip",
	"wash-selected-hover": "a selected row under the pointer",
	skeleton: "a loading bar",
	"fill-disabled": "a disabled act's or chip's box",
	"fill-neutral": "a resting neutral ground: a grey chip, a message bubble",
	ring: "the focus ring",
	"selected-outline": "a selected tile's outline",
	"edge-hover": "a field's boundary under the pointer",
	"edge-error": "a field's boundary in error",
	"ink-error": "an error message",
	"ink-disabled": "a disabled part's label",
	"act-accent":
		"the primary act's fill; `-hover`, `-press` and `-pending` its states",
	"on-act-accent": "the primary act's label",
	"act-danger":
		"a confirm's destructive act's fill; `-hover`, `-press` and `-pending` its states",
	"on-act-danger": "the filled destructive act's label",
	"switch-off": "a switch's track off; `-hover` under the pointer",
	"toggle-on":
		"a toggle on: a switch's track, a checked box, a slider's fill; `-hover` under the pointer",
	"switch-thumb": "a switch's knob",
};

const TYPE_USE: Record<TypeRole, string> = {
	display: "a display number, one per screen, in tabular figures",
	figure: "a count's number in a strip of them, in tabular figures",
	title: "a page's or a record's name, once per page or record",
	heading: "a section's or a card's name, never inside a row",
	body: "the primary line of anything: prose, a row, a field, a menu item",
	meta: "a secondary line, a description, a table header at 500",
	caption:
		"text inside a small component (a chip, a key hint), never a sentence",
	code: "what a machine reads",
};

const SPACING_USE: Record<(typeof SPACING_ROLES)[number], string> = {
	inside: "within a control: icon to label, dot to text",
	"control-x": "a control's inline padding",
	pair: "between paired elements: label over input, title over description",
	acts: "between the acts of a bar: a page header, a toolbar, an action bar",
	rows: "between rows in a menu or a nav list",
	card: "a card's inset",
	tile: "a compact card's inset: a board card",
	float:
		"a floating surface's inset: a select's list, a menu, a picker popover",
	fields: "between fields",
	sections: "between sections of a page",
	page: "the page inset",
};

const SIZE_USE: Record<(typeof SIZES)[number], string> = {
	control: "a button, a segmented control",
	"control-compact": "a menu item, a toolbar control",
	field: "a form input",
	row: "a one-line row",
	"row-2": "a two-line row",
	"row-setting": "a setting row: label and description beside a control",
	strip: "a page header bar: a Place's or Screen's title and acts",
	target: "the least hit area of any interactive part",
	indent: "a tree row's step in: one per level, a hairline rail on its end",
	dot: "a status or chip mark",
	port: "a canvas port's drawn size",
	chip: "a chip's height",
	avatar: "an avatar's side",
	spinner: "the spinner inside a pending act",
	"switch-w": "a switch's width",
	"switch-h": "a switch's height",
	thumb: "a switch's knob",
	"switch-inset": "the knob's inset from its track",
	"switch-travel": "the knob's travel: the width less the knob and both insets",
	skeleton: "a skeleton bar's height",
	"icon-meta": "an icon beside meta or caption text",
	icon: "an icon beside body text",
	"icon-control": "an icon inside a control",
	check: "a checkbox's box",
	track: "a slider's track thickness",
	otp: "a one-time-code box's largest side; the box is square and shrinks with its row",
	"text-area": "a text area's least value height: three body line boxes",
	"docked-floor": "a docked sheet's body floor: three rows",
	"docked-log-floor": "the log's floor above a docked foot: two rows",
	meter: "a meter's bar",
	chart: "a chart's plot, its gridlines four bands",
	qr: "a QR code's square, its quiet zone inside it",
	figures:
		"four tabular figures at the code size: a diff's number columns, a file row's count lanes",
	"message-input":
		"a message input's tallest text: eight body line boxes, scrolling past it",
	"image-tile":
		"an image thumbnail's side: four body line boxes, the lines of provenance it stands beside",
	"image-cap":
		"the tallest an image grows at its container's width: twenty body line boxes",
	hairline:
		"a field box's border: an act inside the box reaches across it, so its hit stands at the box's height",
	"chips-inset":
		"the inset above and below the chips of a pick of several: half of what the compact control has over a chip, less the border",
	"line-body":
		"one body line's box: a part on a wrapped title's first line is pinned to it",
	"icon-inset":
		"the gap between an icon act's box and its glyph: half of what the control has over its icon, which a bar of acts reaches across so the glyphs stand at its edges",
	measure: `the width of running text: ${TEXT_MEASURE_CHARACTERS} characters at the sans face's figure advance of the body size, one width for every role of text`,
	"measure-inset":
		"the width of a column that holds the measure inside the page inset on both sides: a Split's open record",
};

const RADIUS_USE: Record<(typeof RADIUS_ROLES)[number], string> = {
	chip: "an outlined chip, a skeleton bar, a checkbox",
	control: "a button, a field, a segmented control",
	row: "a menu item, a highlighted row",
	card: "a card, a toast",
	popover: "a popover, a menu",
	sheet: "a sheet's leading corners, a centred sheet",
	full: "a dot, an avatar, the pill chip or status, a switch",
};

const DURATION_USE: Record<(typeof DURATIONS)[number], string> = {
	instant: "press feedback",
	fast: "the switch thumb",
	base: "a popover, a menu or a toast entering",
	slow: "a sheet or a dialog moving in",
};

const EASING_USE: Record<(typeof EASINGS)[number], string> = {
	out: "what enters or answers a touch",
	in: "what leaves",
	"in-out": "what moves between two places",
};

const COLOR_SET: ReadonlySet<string> = new Set(COLOR_NAMES);
const RADII: ReadonlySet<string> = new Set(RADIUS_ROLES);
const ROLES: ReadonlySet<string> = new Set(TYPE_ROLES);
const SPACES: ReadonlySet<string> = new Set([...SPACING_ROLES, ...SIZES]);

// A color's token name: the light value bare, the dark value suffixed, so a
// component's light entry and its `-dark` twin each name one.
function colorName(token: string, mode: Mode): string {
	return mode === "dark" ? `${token}-dark` : token;
}

function kebab(name: string): string {
	return name.toLowerCase().replace(/_/g, "-");
}

// The component sub-tokens a class list carries. Classes the format has no
// property for (borders, weights, gaps, side paddings) stay in the matrices.
function subTokens(
	list: readonly string[],
	mode: Mode,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const name of list) {
		const [, prefix, rest] =
			/^(bg|text|rounded|p|h|w|min-h|min-w|size)-(.+)$/.exec(name) ?? [
				undefined,
				undefined,
				undefined,
			];
		if (prefix === undefined || rest === undefined) continue;
		if (prefix === "bg" && COLOR_SET.has(rest)) {
			out.backgroundColor = `{colors.${colorName(rest, mode)}}`;
		} else if (prefix === "text" && COLOR_SET.has(rest)) {
			out.textColor = `{colors.${colorName(rest, mode)}}`;
		} else if (prefix === "text" && ROLES.has(rest)) {
			out.typography = `{typography.${rest}}`;
		} else if (prefix === "rounded" && RADII.has(rest)) {
			out.rounded = `{rounded.${rest}}`;
		} else if (prefix === "p" && SPACES.has(rest)) {
			out.padding = `{spacing.${rest}}`;
		} else if (
			(prefix === "h" || prefix === "min-h" || prefix === "size") &&
			SPACES.has(rest)
		) {
			out.height = `{spacing.${rest}}`;
		}
		if (
			(prefix === "w" || prefix === "min-w" || prefix === "size") &&
			SPACES.has(rest)
		) {
			out.width = `{spacing.${rest}}`;
		}
	}
	return out;
}

// A family's label layer over the same axes (`AVATAR_LABEL` under
// `AVATAR`) is one element with it, so the two render as one entry.
function familyGroups(): Family[][] {
	const groups: Family[][] = [];
	for (const family of FAMILIES) {
		const axes = JSON.stringify(family.axes);
		const group = groups.find(
			([head]) =>
				head !== undefined &&
				family.name === `${head.name}_LABEL` &&
				JSON.stringify(head.axes) === axes,
		);
		if (group) group.push(family);
		else groups.push([family]);
	}
	return groups;
}

// Every cell as a class list: each axis value of each family group, then
// each single-cell constant beside the matrices.
function cellLists(): Array<[string, string[]]> {
	const out: Array<[string, string[]]> = [];
	for (const group of familyGroups()) {
		const [head] = group;
		if (!head) continue;
		for (const [axis, values] of Object.entries(head.axes)) {
			for (const value of values) {
				const list = group.flatMap((family) =>
					classes(family.cva({ [axis]: value })),
				);
				out.push([`${kebab(head.name)}-${value}`, list]);
			}
		}
	}
	for (const [name, value] of Object.entries(variants)) {
		if (typeof value === "string" && /^[A-Z_]+$/.test(name)) {
			out.push([kebab(name), classes(value)]);
		}
	}
	return out;
}

function components(): Array<[string, Record<string, string>]> {
	const out: Array<[string, Record<string, string>]> = [];
	const seen = new Set<string>();
	for (const [name, list] of cellLists()) {
		for (const mode of MODES) {
			const tokens = subTokens(list, mode);
			const perMode = Object.values(tokens).some((ref) =>
				ref.endsWith("-dark}"),
			);
			if (Object.keys(tokens).length === 0) continue;
			if (mode === "dark" && !perMode) continue;
			const key = mode === "dark" ? `${name}-dark` : name;
			if (seen.has(key)) throw new Error(`[${LABEL}] ${key} is emitted twice`);
			seen.add(key);
			out.push([key, tokens]);
		}
	}
	return out;
}

// YAML's double-quoted scalar is JSON's string syntax.
const q = JSON.stringify;

// The front matter carries the desktop set, the default on the web; the
// touch set is the body's table.
function frontMatter(resolved: ResolvedTheme): string[] {
	const lines = [
		"---",
		"version: alpha",
		`name: ${q("@fcalell/stack")}`,
		`description: ${q("The design contract both stack UI plugins render: the approved token sheet behind four knobs, the platform-invariant matrices, and the component roster.")}`,
		"colors:",
		`  primary: ${q("{colors.accent}")}`,
	];
	for (const mode of MODES) {
		for (const name of COLOR_NAMES) {
			lines.push(
				`  ${colorName(name, mode)}: ${q(resolved.colors[mode][name])}`,
			);
		}
	}
	lines.push("typography:");
	for (const role of TYPE_ROLES) {
		const spec = TYPE_SCALE[role];
		const { size, leading } = resolved.type.desktop[role];
		lines.push(`  ${role}:`);
		lines.push(`    fontFamily: ${q(resolved.fonts[spec.family])}`);
		lines.push(`    fontSize: ${q(size)}`);
		lines.push(`    fontWeight: ${WEIGHT[spec.weight]}`);
		lines.push(`    lineHeight: ${q(leading)}`);
		const tracked = TRACKED_ROLES.find((name) => name === role);
		if (tracked)
			lines.push(`    letterSpacing: ${q(resolved.tracking[tracked])}`);
	}
	lines.push("rounded:");
	for (const role of RADIUS_ROLES) {
		lines.push(`  ${role}: ${q(resolved.radii[role])}`);
	}
	lines.push("spacing:");
	for (const role of SPACING_ROLES) {
		lines.push(`  ${role}: ${q(resolved.spacing.desktop[role])}`);
	}
	for (const size of SIZES) {
		lines.push(`  ${size}: ${q(resolved.sizes.desktop[size])}`);
	}
	lines.push("components:");
	for (const [name, tokens] of components()) {
		lines.push(`  ${name}:`);
		for (const [property, ref] of Object.entries(tokens)) {
			lines.push(`    ${property}: ${q(ref)}`);
		}
	}
	lines.push("---");
	return lines;
}

function table(head: string[], rows: string[][]): string[] {
	return [
		`| ${head.join(" | ")} |`,
		`| ${head.map(() => "---").join(" | ")} |`,
		...rows.map((row) => `| ${row.join(" | ")} |`),
	];
}

function code(value: string): string {
	return `\`${value}\``;
}

function useOf(name: string): string {
	const base = name
		.replace(/^(chip)-[a-z]+(-soft|-ink)?$/, "$1")
		.replace(/^(chart)-[a-z]+$/, "$1")
		.replace(/^(avatar)-\d(-ink)?$/, "$1")
		.replace(
			/^(act-accent|act-danger|switch-off|toggle-on)-(hover|press|pending)$/,
			"$1",
		);
	return COLOR_USE[base] ?? "";
}

function body(resolved: ResolvedTheme): string[] {
	const { knobs, motion } = resolved;
	return [
		"# @fcalell/stack",
		"",
		"Emitted from `@fcalell/ui-core` by `pnpm --filter @fcalell/ui-core design-md`. Never edit it by hand: change the contract and emit again.",
		"",
		"## Overview",
		"",
		"One closed token contract, the approved foundations sheet, drawn by two UI plugins: `react-ui` on the web and `native-ui` on React Native. A product sets four knobs, never a token; a component renders its matrix cells and takes no class or style. Every color has a light and a dark value: the front matter names the light one bare and the dark one with a `-dark` suffix, and each component entry that names a color has a `-dark` twin. `primary` is `accent`, the primary act's fill.",
		"",
		...table(
			["Knob", "Value"],
			[
				["accentHue", String(knobs.accentHue)],
				["castHue", `${knobs.castHue}, the accent's hue unless set`],
				[
					"fonts",
					`sans ${code(knobs.fonts.sans)}, mono ${code(knobs.fonts.mono)}`,
				],
				["defaultMode", resolved.defaultMode ?? "the system preference"],
			],
		),
		"",
		"## Colors",
		"",
		"Colors are OKLCH, named by the place they draw. Neutrals cast on one hue at a fixed chroma per role (the cast knob moves the hue, never the chroma, so no contrast moves), one accent hue (its chroma is held inside sRGB at any hue), three status hues, six hued chip families and a neutral one (`fill-neutral` under `ink-body`, no mark), six chart fills, eight avatar steps. A wash is the body ink at an alpha, so it sits on any surface as one more step. Inside a group or a lifted layer the container re-points `edge` to `edge-raised`, so a part never picks between them.",
		"",
		...table(
			["Role", "Light", "Dark", "Draws"],
			COLOR_NAMES.map((name) => [
				code(name),
				code(resolved.colors.light[name]),
				code(resolved.colors.dark[name]),
				useOf(name),
			]),
		),
		"",
		"Status colors: `active` is `accent-ink`, `running` is `accent-ink` drawn as a spinner in the dot's place, `waiting` and `idle` are `ink-meta`, `done` is `ok`, `attention` is `chip-amber`, `failed` is `danger`.",
		"",
		`A chart's series take the chart fills in order: ${CHART_SERIES.map((hue) => code(`chart-${hue}`)).join(", ")}; one series takes the first. A meter at or above ${METER_NEAR} of its max is near, and above its max is over.`,
		"",
		"## Typography",
		"",
		`${TYPE_ROLES.length} roles, named by place. Two rules decide the role: size follows structure, never emphasis (the primary line of anything is \`body\`, a secondary line is \`meta\`, emphasis inside a line is weight ${WEIGHT[STRONG_WEIGHT]}, never a size change); and a size role names a place once (\`title\` a page's or a record's name, once per page or record; \`heading\` a section's or a card's name, never inside a row; \`caption\` text inside a small component, never a sentence; \`code\` what a machine reads; \`figure\` a count's number in a strip of them). There is no label role: a field label and a row's leading cell are \`body\` at ${WEIGHT[STRONG_WEIGHT]}, a table header is \`meta\` at ${WEIGHT[STRONG_WEIGHT]}. The scale moves with density (desktop body 13, touch body 16, room body 16 canvas units); nothing else moves it, except that in the room \`display\` stands five times the body (a glanceable figure, not a stat inside a page).`,
		"",
		...table(
			["Role", "Desktop", "Touch", "Room", "Weight", "Ink", "Place"],
			TYPE_ROLES.map((role) => [
				code(role),
				`${resolved.type.desktop[role].size} / ${resolved.type.desktop[role].leading}`,
				`${resolved.type.touch[role].size} / ${resolved.type.touch[role].leading}`,
				`${sizeOf("room", role)} / ${leadingOf("room", role)}`,
				String(WEIGHT[TYPE_SCALE[role].weight]),
				code(TYPE_SCALE[role].ink),
				TYPE_USE[role],
			]),
		),
		"",
		`Tracking: ${TRACKED_ROLES.map((role) => `${code(role)} ${resolved.tracking[role]}`).join(", ")}; the rest 0. \`sans\` is ${code(resolved.fonts.sans)}; \`mono\` is ${code(resolved.fonts.mono)}. Each named family is followed by its metric fallback face. Running text wraps at \`measure\`, ${TEXT_MEASURE_CHARACTERS} characters at the sans face's figure advance of the body size, rounded up: ${resolved.sizes.desktop.measure} on the desktop, ${resolved.sizes.touch.measure} on touch, one width for every role of text (so a consumer face with a wider "0" overflows it).`,
		"",
		"## Layout",
		"",
		"Spacing roles are multiples of a 4 px base, picked per density, named by what they separate:",
		"",
		...table(
			["Role", "Desktop", "Touch", "Room", "Separates"],
			SPACING_ROLES.map((role) => [
				code(role),
				resolved.spacing.desktop[role],
				resolved.spacing.touch[role],
				String(spacingOf("room", role)),
				SPACING_USE[role],
			]),
		),
		"",
		`Sizes are heights and squares in the same namespace. Density is a theme and never a knob: the web draws the desktop set where the primary pointer is fine and the viewport is at least \`tablet\` wide (${resolved.breakpoints.tablet}) and the touch set everywhere else, native draws the touch set, and a \`data-density\` attribute on the web root pins either. A molecule whose structure follows density (an action bar at natural width on the desktop, full width on touch) reads it through the web's \`touch:\` variant, the same rule (a \`data-density="touch"\` pin, or no \`desktop\` pin where the pointer is not fine or the viewport is narrower than \`tablet\`); native is the touch set, so its molecules draw the touch structure with no variant. The room is the one set a screen declares (\`Place\`'s \`distance\`), since no query detects how far a screen is read from: the touch set drawn on a ${ROOM_CANVAS.width} × ${ROOM_CANVAS.height} canvas, so the Room columns are canvas units, each multiplied by the room unit \`u = max(1px, min(100vw / ${ROOM_CANVAS.width}, 100dvh / ${ROOM_CANVAS.height}))\` (native computes it from the window's size), 2 px at 1920 × 1080. The room's \`page\` is ${spacingOf("room", "page")} all round (the ten-foot safe area), its radii, fixed widths, hairline and ring scale by \`u\` too, and its structure is the touch one (\`touch:\` matches inside it). A room page holds one column and never splits, because breakpoints stay px while its widths scale, and it holds no menu, picker or sheet, whose layers open outside it. It keeps the app's mode, and a screen read from across a room runs dark. Two limits: \`vw\` sizes ignore browser zoom, and a scaled size is fractional, outside the even-pixel rule. Every touch target is at least ${resolved.sizes.touch.target}; on the desktop every interactive part keeps a ${resolved.sizes.desktop.target} hit area whatever it draws.`,
		"",
		...table(
			["Size", "Desktop", "Touch", "Room", "Is"],
			SIZES.map((size) => [
				code(size),
				resolved.sizes.desktop[size],
				resolved.sizes.touch[size],
				String(sizePx("room", size)),
				SIZE_USE[size],
			]),
		),
		"",
		`An icon's stroke is a weight on Lucide's 24-unit grid, so it scales with the icon: \`line\` ${ICON_STROKE.line}, an icon's own, and \`mark\` ${ICON_STROKE.mark}, a mark that carries meaning at the meta size (a checkbox's tick and dash, a change mark's glyph), which at ${resolved.sizes.desktop["icon-meta"]} draws ${(ICON_STROKE.mark * sizePx("desktop", "icon-meta")) / 24} px where \`line\` draws 1 px across two pixel rows at half coverage. No component spells a stroke number.`,
		"",
		`Widths of lifted layers, never stretched to their container, and of a frame's fixed regions: ${WIDTHS.map(
			(width) =>
				width === "measure-short"
					? `${code(width)} ${resolved.widths[width]} (native ${resolved.nativeMeasures[width]}, at the body size, so a label's own size is lost there)`
					: `${code(width)} ${resolved.widths[width]}`,
		).join(
			", ",
		)}. Breakpoints: ${BREAKPOINTS.map((bp) => `${code(bp)} ${resolved.breakpoints[bp]}`).join(", ")}; they are the only responsive variants, of the viewport (\`tablet:\`) and, on the web, of a page's width (\`page-tablet:\`, \`page-max-tablet:\`), by which a Split decides its regions.`,
		"",
		"## Elevation & Depth",
		"",
		`A card at rest has a hairline and no shadow. Two levels lift a layer, each per mode: ${SHADOW_LEVELS.map((level) => `${code(`shadow-${level}`)} (light ${code(resolved.shadows.light[level])}, dark ${code(resolved.shadows.dark[level])})`).join("; ")}. \`shadow-float\` lifts a popover, a menu, a picker's list, a toast and an act floating over what scrolls (a touch Place's act, a Thread's Latest); \`shadow-modal\` a dialog, a sheet and a command palette. In dark the lift is carried by the \`raised\` step and the hairline as much as by the shadow. The hairline is 1 px; the focus ring is \`ring\` at 2 px, 2 px outside the box, drawn inward inside a list (in the room 1 and 2 canvas units, 2 and 4 px at 1920 × 1080). The layers over the page stand in one order, each \`--layer-<layer>\` read as \`z-(--layer-<layer>)\` on the web: ${STACK_ORDER.map((layer) => `${code(layer)} ${rootTokens(resolved)[`--layer-${layer}`]}`).join(" < ")}, the page at 0. A sheet's scrim and the sheet stand on \`sheet\`, a popover over a sheet it opens from, and the toasts over both, so a toast raised while a sheet or a confirm is open is seen and its dismiss pressed.`,
		"",
		"## Shapes",
		"",
		...table(
			["Radius", "Value", "Rounds"],
			RADIUS_ROLES.map((role) => [
				code(role),
				resolved.radii[role],
				RADIUS_USE[role],
			]),
		),
		"",
		"## Components",
		"",
		"The front matter's components are the matrix cells: one entry per axis value of each family, a family's label layer folded into it, and one per single cell. Borders, weights, gaps and side paddings stay in the class strings. Every component the roster ships, the families, family cells and single cells it draws and the states it has:",
		"",
		`A docked sheet's body keeps ${code("docked-floor")} (${resolved.sizes.touch["docked-floor"]} on touch, ${resolved.sizes.desktop["docked-floor"]} on the desktop) at least and scrolls past ${SHEET_DOCKED_BODY_SHARE * 100}% of its foot's region. A docked foot leaves the log above it ${code("docked-log-floor")} (${resolved.sizes.touch["docked-log-floor"]} on touch, ${resolved.sizes.desktop["docked-log-floor"]} on the desktop): where the region is short the body gives to that floor first, then to its own floor and below it, then the log goes, and the sheet's head, foot line and submit never give.`,
		"",
		...table(
			["Component", "Layer", "Draws", "States"],
			rosterEntries().map(([layer, name, entry]) => [
				code(name),
				entry.platforms?.length === 1
					? `${layer}, ${entry.platforms[0]} only`
					: layer,
				entry.draws.map(code).join(", ") || "none",
				entry.states.join(", "),
			]),
		),
		"",
		"A component owns the tokens it may draw: a cell it draws that spells a type role, a colour, a radius, a spacing role, a size or a shadow outside its row is a contract error. A colour ending in `-` is a family (`chip-` is every chip role).",
		"",
		...table(
			[
				"Component",
				"Roles",
				"Colours",
				"Radii",
				"Spacing",
				"Sizes",
				"Elevation",
			],
			rosterEntries().flatMap(([, name, { owns }]) =>
				owns
					? [
							[
								code(name),
								...[
									owns.roles,
									owns.colors,
									owns.radii,
									owns.spacing,
									owns.sizes,
									owns.elevation,
								].map((list) => list?.map(code).join(", ") || "none"),
							],
						]
					: [],
			),
		),
		"",
		"### Motion",
		"",
		`Durations are read as \`duration-<rung>\`; every rung is 0 under \`prefers-reduced-motion: reduce\`. Only transform and opacity animate: a state switches its color, fill and boundary at once. A spinner loops at ${motion.loop} ms outside the scale and keeps turning under reduced motion.`,
		"",
		...table(
			["Duration", "Value", "Times"],
			DURATIONS.map((rung) => [
				code(rung),
				`${motion.durations[rung]} ms`,
				DURATION_USE[rung],
			]),
		),
		"",
		...table(
			["Curve", "Value", "Eases"],
			EASINGS.map((easing) => [
				code(easing),
				code(`cubic-bezier(${motion.easings[easing].join(", ")})`),
				EASING_USE[easing],
			]),
		),
		"",
		"## Do's and Don'ts",
		"",
		"- Do pick the component that owns the shape before writing markup.",
		"- Do set a knob to move a scale; don't set a token.",
		"- Don't pass `class`, `className`, `classList` or `style` to a component; a look the matrices lack is a new matrix cell.",
		"- Do use tokens only: no literal color, pixel size or arbitrary value.",
		"- Do draw one `title` per screen, no `heading` inside a row, no `caption` sentence; emphasis is weight, never size.",
		"- Do keep text at 4.5:1 or more on its fill; the contract measures every pair it draws.",
		"- Do time motion with a duration rung and a contract curve; don't write a literal duration.",
		`- Do take every word a component draws from \`words\`; a sentence is a prop. A counted word (${COUNTED_WORD_KEYS.map(code).join(", ")}) is \`{ one, other }\`, each form spelling \`{count}\` where the number stands, drawn through \`counted(word, count)\`. A slot word (${SLOT_WORD_KEYS.map(code).join(", ")}) spells its named slots as \`{name}\` where each value stands, drawn through \`filled(word, values)\`.`,
		"",
	];
}

export function designMd(resolved: ResolvedTheme): string {
	return [...frontMatter(resolved), "", ...body(resolved)].join("\n");
}
