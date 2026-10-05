// Reproduction harness for the ui-core token contract and matrix layer.
//
//   pnpm --filter @fcalell/ui-core verify
//
// The script derives with default knobs, checks every scale and computed
// color against its rule, sweeps the accent and cast knobs for contrast,
// drives a Tailwind build over the emitted `@theme` record plus every class
// the matrices can emit, and exits non-zero on any mismatch.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCssIdent } from "@fcalell/cli/css";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ts from "typescript";
import { cn } from "../src/cn.ts";
import { deriveTheme, type ResolvedTheme } from "../src/derive.ts";
import {
	densityTokens,
	modeTokens,
	nativeMeasureTokens,
	reducedMotionTokens,
	roomMeasureTokens,
	roomRingTokens,
	roomScope,
	roomTokens,
	roomUnit,
	roomUnitFor,
	rootTokens,
	shadowUtilities,
	themeTokens,
} from "../src/emit.ts";
import {
	assert,
	check,
	normalize,
	report,
	rule,
	tailwindBuild,
} from "../src/harness.ts";
import {
	inGamut,
	oklchToLinear,
	oklchToRgb,
	veiledLuminance,
} from "../src/oklch.ts";
import {
	CLOSED_PROPS,
	componentDir,
	type Owns,
	rosterEntries,
	STATES,
} from "../src/roster.ts";
import { type Theme, wordsSchema } from "../src/schema.ts";
import {
	AVATAR_STEPS,
	BODY_SIZE,
	BREAKPOINT_PX,
	BREAKPOINTS,
	CHART_SERIES,
	CHIP_FAMILIES,
	CHIP_HUES,
	COLOR_NAMES,
	COLORS,
	COUNTED_WORD_KEYS,
	type ColorName,
	counted,
	DENSITIES,
	DURATION_MS,
	DURATIONS,
	EASING,
	EASINGS,
	ENGLISH,
	fallbackFace,
	filled,
	GAP_ROLES,
	KNOB_DEFAULTS,
	LOOP_MS,
	MEASURE_CHARACTERS,
	METER_NEAR,
	MODES,
	MONO_ADVANCE,
	type Mode,
	RADIUS_PX,
	RADIUS_ROLES,
	ROOM_CANVAS,
	ROOM_TYPE_SIZE,
	SANS_ADVANCE,
	SHADOW_LEVELS,
	SIZE_PX,
	SIZES,
	SLOT_WORD_KEYS,
	SLOT_WORDS,
	SPACE_BASE,
	SPACING_RATIO,
	SPACING_ROLES,
	STACK_ORDER,
	STATUS_STATES,
	TRACKED_ROLES,
	type TrackedRole,
	TYPE_ROLES,
	TYPE_SCALE,
	type TypeRole,
	WIDTH_VALUE,
	WIDTHS,
	WORD_KEYS,
	ZEROED_NAMESPACES,
} from "../src/tokens.ts";
import * as tables from "../src/variant-tables.ts";
import {
	ACTION_BAR,
	AVATAR,
	AVATAR_LABEL,
	type Axes,
	BANNER,
	BANNER_GLYPH,
	BUTTON,
	BUTTON_LABEL,
	CHANGE_MARK,
	CHART_BAND,
	CHART_FILL,
	CHECKBOX,
	CHIP,
	CHIP_LABEL,
	CODE_TEXT,
	COLUMNS,
	DIFF_LINE,
	FIELD,
	FIELD_VALUE,
	FILE_COUNT,
	FILE_PATH_PART,
	FORM,
	FORM_FIELD,
	ICON,
	ICON_BUTTON,
	IMAGE,
	IMAGE_PICTURE,
	LINE_BOX,
	LINK,
	type Matrix,
	MENU,
	MENU_GROUP,
	MENU_LABEL,
	MESSAGE,
	METER_FILL,
	OPTION_RADIO,
	OTP_BOX,
	PICKER,
	PLACE_ROW,
	PLACE_ROW_GLYPH,
	PLACE_TAB,
	PLACE_TAB_LABEL,
	PROSE_DIFF_RUN,
	PROSE_MARKER,
	QR_CODE,
	ROW,
	ROW_STEP,
	ROW_TITLE,
	RULE_ARROW,
	SECTION,
	SEGMENT,
	SEGMENT_LABEL,
	SHEET_SIDE,
	SKELETON,
	SKELETON_LANE,
	SKELETON_ROW,
	SPLIT_MAIN,
	STAGE,
	STATUS_DOT,
	STEP_COUNT_SEGMENT,
	SWITCH,
	SWITCH_THUMB,
	TABLE_CHANGE_VALUE,
	TABLE_FROZEN_CELL,
	TABLE_HEAD,
	TABLE_HEAD_LABEL,
	TABLE_ROW,
	TEXT,
	TEXT_AREA,
	TEXT_AREA_BUDGET,
	TEXT_STRONG,
	TOAST_STATE,
} from "../src/variant-tables.ts";
import * as variants from "../src/variants.ts";
import {
	actionBar,
	avatar,
	avatarLabel,
	avatarStep,
	banner,
	bannerContentTone,
	bannerGlyph,
	button,
	buttonContentTone,
	buttonLabel,
	changeMark,
	chartBand,
	chartFill,
	checkbox,
	chip,
	chipLabel,
	codeText,
	columns,
	diffLine,
	FAMILIES,
	field,
	fieldValue,
	fileCount,
	filePathPart,
	form,
	formField,
	icon,
	iconButton,
	image,
	imagePicture,
	lineBox,
	link,
	menu,
	menuGroup,
	menuLabel,
	message,
	meterFill,
	optionRadio,
	otpBox,
	picker,
	placeRow,
	placeRowGlyph,
	placeTab,
	placeTabLabel,
	proseDiffRun,
	proseMarker,
	qrCode,
	row,
	rowStep,
	rowTitle,
	ruleArrow,
	ruleArrowContentTone,
	section,
	segment,
	segmentLabel,
	sheetSide,
	skeleton,
	skeletonLane,
	skeletonRow,
	splitMain,
	stage,
	stageContentTone,
	statusContentTone,
	statusDot,
	stepCountSegment,
	switchThumb,
	switchTrack,
	tableChangeValue,
	tableFrozenCell,
	tableHead,
	tableHeadLabel,
	tableRow,
	text,
	textArea,
	textAreaBudget,
	textStrong,
	toastContentTone,
	toastState,
} from "../src/variants.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");

// A value may carry no statement or block terminator and no comment delimiter:
// each would let a token break out of the declaration it is rendered into.
const ESCAPES_A_DECLARATION = /[;{}]|\/\*|\*\//;

// ── Check helpers ───────────────────────────────────────────────────

function requireEqual(actual: unknown, expected: unknown, what: string): void {
	assert(
		actual === expected,
		`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
	);
}

function oklch(value: string): [number, number, number, number | undefined] {
	const parts = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(
		value,
	);
	assert(parts, `not an oklch value: ${value}`);
	return [
		Number(parts[1]),
		Number(parts[2]),
		Number(parts[3]),
		parts[4] === undefined ? undefined : Number(parts[4]),
	];
}

function rejection(theme: unknown): string {
	try {
		deriveTheme(theme as Parameters<typeof deriveTheme>[0]);
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	return "";
}

function isTracked(role: TypeRole): role is TrackedRole {
	return (TRACKED_ROLES as readonly string[]).includes(role);
}

// WCAG 2 contrast between two emitted opaque `oklch(L C H)` values, the
// ground under a translucent veil when one is given.
function contrast(fg: string, bg: string, veil?: string): number {
	const opaque = (value: string) => {
		const [l, c, h, alpha] = oklch(value);
		assert(alpha === undefined, `not an opaque value: ${value}`);
		return { l, c, h };
	};
	const luminance = (value: string) => {
		const { l, c, h } = opaque(value);
		const [r, g, b] = oklchToLinear(l, c, h);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const ground = () => {
		if (veil === undefined) return luminance(bg);
		const [l, c, h, alpha] = oklch(veil);
		assert(alpha !== undefined, `not a veil: ${veil}`);
		return veiledLuminance({ l, c, h }, alpha, opaque(bg));
	};
	const [a, b] = [luminance(fg), ground()].sort((x, y) => y - x);
	return ((a ?? 0) + 0.05) / ((b ?? 0) + 0.05);
}

// ── The derivations every check reads ───────────────────────────────

const base = deriveTheme();
const baseTheme = themeTokens(base);
const baseLight = modeTokens(base, "light");
const baseDark = modeTokens(base, "dark");

function emitted(key: string): string {
	const value = baseTheme[key];
	assert(value !== undefined, `themeTokens emitted no ${key}`);
	return value;
}

function color(mode: Mode, name: ColorName): string {
	return base.colors[mode][name];
}

type Palette = ResolvedTheme["colors"];

const GROUNDS: ColorName[] = ["canvas", "surface", "group", "raised"];

// Text at 4.5:1 on each ground it is drawn on.
const TEXT_FLOORS: Array<[ColorName, ColorName[]]> = [
	[
		"ink-body",
		[...GROUNDS, "accent-soft", "ok-soft", "warn-soft", "danger-soft"],
	],
	["ink-meta", [...GROUNDS, "accent-soft"]],
	["accent-ink", [...GROUNDS, "accent-soft"]],
	["ok", [...GROUNDS, "ok-soft"]],
	["warn", [...GROUNDS, "warn-soft"]],
	["danger", [...GROUNDS, "danger-soft"]],
	["on-accent", ["accent", "act-accent-hover", "act-accent-press"]],
	["on-danger", ["danger"]],
	["on-act-danger", ["act-danger", "act-danger-hover", "act-danger-press"]],
	...CHIP_HUES.map((family): [ColorName, ColorName[]] => [
		`chip-${family}-ink`,
		[`chip-${family}-soft`],
	]),
	...AVATAR_STEPS.map((step): [ColorName, ColorName[]] => [
		`avatar-${step}-ink`,
		[`avatar-${step}`],
	]),
];

// A boundary or a mark at 3:1 on each ground it is drawn on.
const GRAPHIC_FLOORS: Array<[ColorName, ColorName[]]> = [
	["edge-strong", ["surface", "group"]],
	["accent", ["canvas", "surface", "group"]],
	["on-act-accent", ["act-accent-pending"]],
	["on-act-danger", ["act-danger-pending"]],
	["toggle-on", ["canvas", "surface", "group"]],
	["toggle-on-hover", ["canvas", "surface", "group"]],
	["switch-thumb", ["toggle-on", "toggle-on-hover"]],
	...CHIP_HUES.map((family): [ColorName, ColorName[]] => [
		`chip-${family}`,
		["surface"],
	]),
];

// Every floor a palette keeps, both modes: the text and graphic floors, a
// destructive act's label under its hover and press washes on each ground an
// act sits on, the neutral chip's ink under its soft on the same grounds, and
// every hold the contract declares. c32 reads it at the
// default knobs, c11 at every accent and cast hue.
function floors(colors: Palette): { measured: number; short: string[] } {
	const short: string[] = [];
	let measured = 0;
	for (const mode of MODES) {
		const values = colors[mode];
		const measure = (
			fg: ColorName,
			bg: ColorName,
			floor: number,
			veil?: ColorName,
		) => {
			measured++;
			const under = veil === undefined ? undefined : values[veil];
			const ratio = contrast(values[fg], values[bg], under);
			if (ratio < floor)
				short.push(
					`${mode} ${fg} on ${bg}${veil ? ` under ${veil}` : ""}: ${ratio.toFixed(2)} < ${floor}`,
				);
		};
		for (const [floor, pairs] of [
			[4.5, TEXT_FLOORS],
			[3, GRAPHIC_FLOORS],
		] as const) {
			for (const [fg, grounds] of pairs) {
				for (const bg of grounds) measure(fg, bg, floor);
			}
		}
		for (const bg of ["canvas", "surface", "group"] as const) {
			for (const veil of ["wash-hover", "wash-press"] as const) {
				measure("danger", bg, 4.5, veil);
			}
			measure("chip-neutral-ink", bg, 4.5, "chip-neutral-soft");
		}
		for (const name of COLOR_NAMES) {
			const declaration = COLORS[name];
			const holds =
				"mix" in declaration
					? declaration.holds?.[mode]
					: "light" in declaration
						? declaration[mode].holds
						: undefined;
			for (const hold of holds ?? []) {
				measure(name, hold.on, hold.ratio, hold.under);
			}
		}
	}
	return { measured, short };
}

// The roles a knob's hue reaches in one mode, through aliases, veils and
// mixes: a literal declared on that knob, or anything read from one.
function boundTo(knob: "accent" | "cast", mode: Mode): ColorName[] {
	const walk = (name: ColorName): boolean => {
		const declaration = COLORS[name];
		if ("alias" in declaration) return walk(declaration.alias);
		if ("veil" in declaration) return walk(declaration.veil);
		if ("mix" in declaration) {
			const { toward } = declaration;
			const target = typeof toward === "string" ? toward : toward[mode];
			return walk(declaration.mix) || (target !== "black" && walk(target));
		}
		return declaration[mode].hue === knob;
	};
	return COLOR_NAMES.filter(walk);
}

function summary(short: string[]): string {
	const more = short.length > 8 ? ` and ${short.length - 8} more` : "";
	return `${short.slice(0, 8).join(", ")}${more}`;
}

// ── The matrix registry ─────────────────────────────────────────────

// Every table `#variant-tables` exports, paired with the cva `#variants` builds
// from it. c19 asserts the registry is total in both directions, so a matrix
// cannot reach either module without reaching the enumerator.
type Registration = readonly [string, Matrix<Axes>, (props?: never) => string];

const MATRICES: readonly Registration[] = [
	["TEXT", TEXT, text],
	["TEXT_STRONG", TEXT_STRONG, textStrong],
	["ICON", ICON, icon],
	["BUTTON", BUTTON, button],
	["BUTTON_LABEL", BUTTON_LABEL, buttonLabel],
	["ICON_BUTTON", ICON_BUTTON, iconButton],
	["LINK", LINK, link],
	["AVATAR", AVATAR, avatar],
	["AVATAR_LABEL", AVATAR_LABEL, avatarLabel],
	["STATUS_DOT", STATUS_DOT, statusDot],
	["CHANGE_MARK", CHANGE_MARK, changeMark],
	["CHIP", CHIP, chip],
	["CHIP_LABEL", CHIP_LABEL, chipLabel],
	["FIELD", FIELD, field],
	["FIELD_VALUE", FIELD_VALUE, fieldValue],
	["TEXT_AREA", TEXT_AREA, textArea],
	["TEXT_AREA_BUDGET", TEXT_AREA_BUDGET, textAreaBudget],
	["OTP_BOX", OTP_BOX, otpBox],
	["SWITCH", SWITCH, switchTrack],
	["SWITCH_THUMB", SWITCH_THUMB, switchThumb],
	["CHECKBOX", CHECKBOX, checkbox],
	["OPTION_RADIO", OPTION_RADIO, optionRadio],
	["ROW", ROW, row],
	["ROW_TITLE", ROW_TITLE, rowTitle],
	["ROW_STEP", ROW_STEP, rowStep],
	["LINE_BOX", LINE_BOX, lineBox],
	["TABLE_ROW", TABLE_ROW, tableRow],
	["TABLE_HEAD", TABLE_HEAD, tableHead],
	["TABLE_HEAD_LABEL", TABLE_HEAD_LABEL, tableHeadLabel],
	["TABLE_FROZEN_CELL", TABLE_FROZEN_CELL, tableFrozenCell],
	["TABLE_CHANGE_VALUE", TABLE_CHANGE_VALUE, tableChangeValue],
	["SEGMENT", SEGMENT, segment],
	["SEGMENT_LABEL", SEGMENT_LABEL, segmentLabel],
	["PICKER", PICKER, picker],
	["RULE_ARROW", RULE_ARROW, ruleArrow],
	["FORM_FIELD", FORM_FIELD, formField],
	["BANNER", BANNER, banner],
	["BANNER_GLYPH", BANNER_GLYPH, bannerGlyph],
	["TOAST_STATE", TOAST_STATE, toastState],
	["MENU", MENU, menu],
	["MENU_GROUP", MENU_GROUP, menuGroup],
	["MENU_LABEL", MENU_LABEL, menuLabel],
	["SHEET_SIDE", SHEET_SIDE, sheetSide],
	["PROSE_MARKER", PROSE_MARKER, proseMarker],
	["PROSE_DIFF_RUN", PROSE_DIFF_RUN, proseDiffRun],
	["CODE_TEXT", CODE_TEXT, codeText],
	["DIFF_LINE", DIFF_LINE, diffLine],
	["FILE_PATH_PART", FILE_PATH_PART, filePathPart],
	["FILE_COUNT", FILE_COUNT, fileCount],
	["MESSAGE", MESSAGE, message],
	["METER_FILL", METER_FILL, meterFill],
	["CHART_BAND", CHART_BAND, chartBand],
	["CHART_FILL", CHART_FILL, chartFill],
	["QR_CODE", QR_CODE, qrCode],
	["IMAGE", IMAGE, image],
	["IMAGE_PICTURE", IMAGE_PICTURE, imagePicture],
	["STAGE", STAGE, stage],
	["PLACE_ROW", PLACE_ROW, placeRow],
	["PLACE_ROW_GLYPH", PLACE_ROW_GLYPH, placeRowGlyph],
	["PLACE_TAB", PLACE_TAB, placeTab],
	["PLACE_TAB_LABEL", PLACE_TAB_LABEL, placeTabLabel],
	["SPLIT_MAIN", SPLIT_MAIN, splitMain],
	["STEP_COUNT_SEGMENT", STEP_COUNT_SEGMENT, stepCountSegment],
	["SECTION", SECTION, section],
	["COLUMNS", COLUMNS, columns],
	["FORM", FORM, form],
	["ACTION_BAR", ACTION_BAR, actionBar],
	["SKELETON", SKELETON, skeleton],
	["SKELETON_ROW", SKELETON_ROW, skeletonRow],
	["SKELETON_LANE", SKELETON_LANE, skeletonLane],
];

// The class-bearing exports that are not matrices: every uppercase string
// export of `#variants`, read off the module so a new constant cannot skip
// the build probe.
const CLASS_CONSTANTS: ReadonlyArray<readonly [string, string]> =
	Object.entries(variants as unknown as Record<string, unknown>)
		.filter(
			(entry): entry is [string, string] =>
				typeof entry[1] === "string" && /^[A-Z_]+$/.test(entry[0]),
		)
		.map(([name, value]) => [name, value] as const);

function render(entry: Registration, props: Record<string, string>): string {
	const cva = entry[2] as unknown as (props: Record<string, string>) => string;
	return cva(props);
}

function keysOf<T extends Record<string, unknown>>(record: T): Array<keyof T> {
	return Object.keys(record) as Array<keyof T>;
}

function combinations(config: Matrix<Axes>): Array<Record<string, string>> {
	let rows: Array<Record<string, string>> = [{}];
	for (const axis of Object.keys(config.variants)) {
		const next: Array<Record<string, string>> = [];
		for (const row of rows) {
			for (const key of Object.keys(config.variants[axis] ?? {})) {
				next.push({ ...row, [axis]: key });
			}
		}
		rows = next;
	}
	return rows;
}

// What the config says the cva must return: base, then one cell per axis, then
// every compound row the combination matches, empties dropped.
function derived(config: Matrix<Axes>, props: Record<string, string>): string {
	const parts = [config.base];
	for (const [axis, cells] of Object.entries(config.variants)) {
		const key = props[axis];
		parts.push(key === undefined ? "" : (cells[key] ?? ""));
	}
	for (const row of config.compoundVariants ?? []) {
		const matches = Object.entries(row).every(
			([axis, value]) => axis === "class" || props[axis] === value,
		);
		if (matches) parts.push(row.class);
	}
	return parts.filter(Boolean).join(" ");
}

// Every cell string a matrix carries, which is what the cell rules read.
function cells(config: Matrix<Axes>): Array<[string, string]> {
	const out: Array<[string, string]> = [["base", config.base]];
	for (const [axis, keys] of Object.entries(config.variants)) {
		for (const [key, cell] of Object.entries(keys)) {
			out.push([`${axis}.${key}`, cell]);
		}
	}
	for (const [index, row] of (config.compoundVariants ?? []).entries()) {
		out.push([`compound.${index}`, row.class]);
	}
	return out;
}

// Produced by calling each cva over the cartesian product of its own axes, so
// the class set under test cannot drift from the matrices that emit it.
let enumeratedClasses: Set<string> | undefined;

function enumerated(): Set<string> {
	if (enumeratedClasses) return enumeratedClasses;
	const classes = new Set<string>();
	const add = (value: string): void => {
		for (const name of value.split(/\s+/)) if (name) classes.add(name);
	};
	for (const entry of MATRICES) {
		for (const props of combinations(entry[1])) add(render(entry, props));
	}
	for (const [, value] of CLASS_CONSTANTS) add(value);
	enumeratedClasses = classes;
	return classes;
}

// ── The Tailwind fixture build ──────────────────────────────────────

const fixtureDirFiles = ["classes.html", "enumerated.html"];

let fixtureCss: string | undefined;

function buildFixture(): string {
	if (fixtureCss !== undefined) return fixtureCss;
	writeFileSync(
		resolve(fixtureDir, "enumerated.html"),
		`<div class="${[...enumerated()].join(" ")}"></div>\n`,
	);
	const body = Object.entries(baseTheme)
		.map(([key, value]) => `\t${key}: ${value};`)
		.join("\n");
	const utilities = Object.entries(shadowUtilities())
		.map(
			([name, declarations]) =>
				`@utility ${name} {\n${Object.entries(declarations)
					.map(([property, value]) => `\t${property}: ${value};\n`)
					.join("")}}`,
		)
		.join("\n");
	const inputPath = resolve(fixtureDir, "generated.css");
	const outputPath = resolve(fixtureDir, "generated.out.css");
	writeFileSync(
		inputPath,
		[
			'@import "tailwindcss" source(none);',
			...fixtureDirFiles.map((name) => `@source "./${name}";`),
			"",
			`@theme {\n${body}\n}`,
			"",
			utilities,
			"",
		].join("\n"),
	);

	fixtureCss = tailwindBuild(pkgDir, inputPath, outputPath, fixtureDir);
	return fixtureCss;
}

// ── Criteria ────────────────────────────────────────────────────────

check("c02", "package.json shape", () => {
	const pkg = JSON.parse(
		readFileSync(resolve(pkgDir, "package.json"), "utf8"),
	) as {
		private?: unknown;
		sideEffects?: unknown;
		exports?: Record<string, string>;
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
	};
	assert(pkg.private === undefined, "package.json declares a `private` field");
	requireEqual(pkg.sideEffects, false, "sideEffects");
	requireEqual(
		Object.keys(pkg.exports ?? {})
			.sort()
			.join(" "),
		"./clock ./cn ./commit ./derive ./descriptors ./emit ./file ./format ./harness ./list-state ./manifest ./reason ./roster ./schema ./tokens ./variants",
		"export subpaths",
	);
	assert(pkg.peerDependencies?.zod, "zod is not a peerDependency");
	for (const name of ["tailwindcss", "@tailwindcss/cli"]) {
		assert(pkg.devDependencies?.[name], `${name} is not a devDependency`);
	}
	for (const name of ["class-variance-authority", "clsx", "tailwind-merge"]) {
		assert(pkg.dependencies?.[name], `${name} is not a dependency`);
	}
	// Installing ui-core never pulls in the CLI. This script imports the CLI's
	// ident check, so devDependencies is deliberately exempt.
	for (const field of ["dependencies", "peerDependencies"] as const) {
		assert(!pkg[field]?.["@fcalell/cli"], `@fcalell/cli appears in ${field}`);
	}
	return "12 subpaths, no root export, no runtime cli dependency";
});

check("c03", "tokens.ts declares the contract", () => {
	requireEqual(COLOR_NAMES.length, 86, "color count");
	requireEqual(new Set(COLOR_NAMES).size, COLOR_NAMES.length, "unique colors");
	requireEqual(TYPE_ROLES.length, 8, "type role count");
	requireEqual(SPACING_ROLES.length, 11, "spacing role count");
	requireEqual(GAP_ROLES.length, 6, "gap role count");
	requireEqual(SIZES.length, 32, "size count");
	requireEqual(RADIUS_ROLES.length, 7, "radius role count");
	requireEqual(SHADOW_LEVELS.length, 2, "shadow level count");
	requireEqual(WIDTHS.length, 12, "width count");
	requireEqual(BREAKPOINTS.length, 3, "breakpoint count");
	requireEqual(WORD_KEYS.length, 56, "word count");
	requireEqual(COUNTED_WORD_KEYS.length, 1, "counted word count");
	requireEqual(SLOT_WORD_KEYS.length, 9, "slot word count");
	requireEqual(
		[...CHART_SERIES].sort().join(" "),
		[...CHIP_HUES].sort().join(" "),
		"the chart series are the chip hues",
	);
	assert(METER_NEAR > 0 && METER_NEAR < 1, "METER_NEAR is a share of the max");
	for (const name of COLOR_NAMES) {
		assert(COLORS[name] !== undefined, `no declaration for ${name}`);
	}
	// `w-*` and `max-w-*` read `--spacing-*` (the roles and the sizes) before
	// `--container-*`, so a width that shares either's name is shadowed.
	for (const name of [...SPACING_ROLES, ...SIZES]) {
		assert(
			!(WIDTHS as readonly string[]).includes(name),
			`${name} shadows the width of its name`,
		);
	}
	for (const role of GAP_ROLES) {
		assert(
			(SPACING_ROLES as readonly string[]).includes(role),
			`gap role ${role} is not a spacing role`,
		);
	}
	const source = readFileSync(resolve(pkgDir, "src/tokens.ts"), "utf8");
	for (const word of ["marine", "navy", "brand", "tint", "label", "floor"]) {
		assert(!new RegExp(`"${word}"`).test(source), `tokens.ts names "${word}"`);
	}
	return `${COLOR_NAMES.length} colors, 7 roles, 11 spacing roles (6 gaps), ${SIZES.length} sizes, 7 radii, 2 shadows, 12 widths, 3 breakpoints, ${WORD_KEYS.length} words, ${COUNTED_WORD_KEYS.length} counted and ${SLOT_WORD_KEYS.length} with slots, ${CHART_SERIES.length} chart series`;
});

check("c05", "the computed colors follow their color-mix rules", () => {
	const l = (value: string) => oklch(value)[0];
	for (const mode of MODES) {
		// A wash is the body ink at its alpha.
		for (const [name, alpha] of [
			["wash-hover", 0.05],
			["wash-press", 0.08],
			["wash-selected", 0.11],
			["wash-selected-hover", 0.15],
			["skeleton", 0.09],
			["fill-disabled", 0.06],
			["fill-neutral", 0.08],
		] as const) {
			const [il, ic, ih] = oklch(color(mode, "ink-body"));
			requireEqual(
				color(mode, name),
				`oklch(${il} ${ic} ${ih} / ${alpha})`,
				`${mode}.${name}`,
			);
		}
		// A filled act's hover, press and pending each move its fill toward
		// the color the mix names in this mode, press further than hover.
		for (const fill of ["accent", "danger"] as const) {
			const away = (state: "hover" | "press" | "pending") => {
				const declaration = COLORS[`act-${fill}-${state}`];
				assert("mix" in declaration, `act-${fill}-${state} is not a mix`);
				const { toward } = declaration;
				const target = typeof toward === "string" ? toward : toward[mode];
				const goal = target === "black" ? 0 : l(color(mode, target));
				return [
					Math.abs(l(color(mode, `act-${fill}-${state}`)) - goal),
					Math.abs(l(color(mode, fill)) - goal),
				] as const;
			};
			for (const state of ["hover", "press", "pending"] as const) {
				const [moved, rest] = away(state);
				assert(
					moved < rest,
					`${mode} act-${fill}-${state} moves the wrong way`,
				);
			}
			assert(
				away("press")[0] < away("hover")[0],
				`${mode} act-${fill}-press is not past hover`,
			);
		}
		// Every alias reads its source.
		for (const [name, declaration] of Object.entries(COLORS)) {
			if ("alias" in declaration) {
				requireEqual(
					color(mode, name as ColorName),
					color(mode, declaration.alias),
					`${mode}.${name}`,
				);
			}
		}
	}
	// Black at 12 % in OKLab: L drops by 12 % of itself, chroma with it.
	const [al, ac] = oklch(color("light", "accent"));
	const [hl, hc] = oklch(color("light", "act-accent-hover"));
	requireEqual(
		hl,
		Math.round(al * 0.88 * 1000) / 1000,
		"hover L is 88 % of the accent's",
	);
	requireEqual(
		hc,
		Math.round(ac * 0.88 * 1000) / 1000,
		"hover C is 88 % of the accent's",
	);
	return "7 washes at their alpha, act fills move toward their mode's target, aliases read their source, one mix checked by hand";
});

check("c06", "every scale is its ratio of the base", () => {
	for (const density of DENSITIES) {
		const body = BODY_SIZE[density];
		const tokens = densityTokens(base, density);
		for (const role of TYPE_ROLES) {
			const ratio =
				(density === "room" ? ROOM_TYPE_SIZE[role] : undefined) ??
				TYPE_SCALE[role].size;
			const size = Math.round(body * ratio);
			requireEqual(tokens[`--text-${role}`], `${size}px`, `${density} ${role}`);
			const box = Number.parseInt(tokens[`--leading-${role}`] ?? "", 10);
			requireEqual(box % 2, 0, `${role} line box is even`);
			requireEqual(
				box,
				2 * Math.round((size * TYPE_SCALE[role].leading) / 2),
				`${density} ${role} line box`,
			);
			requireEqual(
				tokens[`--text-${role}--line-height`],
				tokens[`--leading-${role}`],
				`${role} modifier shape`,
			);
		}
		const spacing = SPACING_RATIO[density];
		for (const role of SPACING_ROLES) {
			requireEqual(
				tokens[`--spacing-${role}`],
				`${SPACE_BASE * spacing[role]}px`,
				`${density} ${role}`,
			);
		}
		const px = SIZE_PX[density];
		const expected: Record<(typeof SIZES)[number], number> = {
			...px,
			"switch-travel": px["switch-w"] - px.thumb - 2 * px["switch-inset"],
			"text-area": 3 * Number.parseInt(tokens["--leading-body"] ?? "", 10),
			figures: Math.ceil(
				4 * MONO_ADVANCE * Number.parseInt(tokens["--text-code"] ?? "", 10),
			),
			"message-input": 8 * Number.parseInt(tokens["--leading-body"] ?? "", 10),
			"image-tile": 4 * Number.parseInt(tokens["--leading-body"] ?? "", 10),
			"image-cap": 20 * Number.parseInt(tokens["--leading-body"] ?? "", 10),
		};
		for (const size of SIZES) {
			requireEqual(
				tokens[`--spacing-${size}`],
				`${expected[size]}px`,
				`${density} ${size}`,
			);
		}
	}
	// Native's measures: their characters at the sans figure advance of the
	// touch body, since uniwind reads no `ch`.
	const native = nativeMeasureTokens(base);
	for (const [measure, characters] of Object.entries(MEASURE_CHARACTERS)) {
		requireEqual(
			native[`--container-${measure}`],
			`${Math.ceil(characters * SANS_ADVANCE * BODY_SIZE.touch)}px`,
			`native ${measure}`,
		);
	}
	// A tie rounds up: touch caption 14 × 1.5 = 21 → 22.
	requireEqual(
		densityTokens(base, "touch")["--leading-caption"],
		"22px",
		"tie rounds up",
	);
	requireEqual(
		emitted("--text-code"),
		emitted("--text-meta"),
		"code is meta's size",
	);
	for (const role of TYPE_ROLES) {
		if (isTracked(role)) {
			requireEqual(
				emitted(`--text-${role}--letter-spacing`),
				emitted(`--tracking-${role}`),
				`${role} tracking shape`,
			);
		} else {
			assert(
				baseTheme[`--tracking-${role}`] === undefined &&
					baseTheme[`--text-${role}--letter-spacing`] === undefined,
				`${role} emits tracking it does not carry`,
			);
		}
	}
	for (const role of RADIUS_ROLES) {
		requireEqual(emitted(`--radius-${role}`), `${RADIUS_PX[role]}px`, role);
	}
	for (const width of WIDTHS) {
		requireEqual(emitted(`--container-${width}`), WIDTH_VALUE[width], width);
	}
	for (const bp of BREAKPOINTS) {
		requireEqual(emitted(`--breakpoint-${bp}`), `${BREAKPOINT_PX[bp]}px`, bp);
	}
	requireEqual(
		emitted("--font-mono"),
		'"IBM Plex Mono", "IBM Plex Mono Fallback", ui-monospace, "SFMono-Regular", Menlo, monospace',
		"--font-mono names its fallback face second",
	);
	requireEqual(
		fallbackFace("IBM Plex Sans"),
		"IBM Plex Sans Fallback",
		"the fallback face rule",
	);
	requireEqual(
		emitted("--font-sans"),
		'"IBM Plex Sans", "IBM Plex Sans Fallback", ui-sans-serif, system-ui, sans-serif',
		"--font-sans",
	);
	const named = themeTokens(deriveTheme({ fonts: { sans: "Geist" } }));
	requireEqual(
		named["--font-sans"],
		'"Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif',
		"a named sans",
	);
	requireEqual(named["--font-mono"], emitted("--font-mono"), "an unset mono");
	for (const rung of DURATIONS) {
		requireEqual(
			emitted(`--transition-duration-${rung}`),
			`${DURATION_MS[rung]}ms`,
			rung,
		);
	}
	return "7 roles × 3 densities with even line boxes, 12 spacing roles, 17 sizes, 4 trackings, 8 radii, 11 widths, 3 breakpoints, 2 families with their fallback faces, 4 durations";
});

check(
	"c06-density",
	"touch seeds the theme, the desktop set is the other",
	() => {
		const touch = densityTokens(base, "touch");
		for (const [key, value] of Object.entries(touch)) {
			requireEqual(emitted(key), value, `touch seeds ${key}`);
		}
		const fine = densityTokens(base, "desktop");
		requireEqual(
			JSON.stringify(Object.keys(fine)),
			JSON.stringify(Object.keys(touch)),
			"the two sets carry the same keys",
		);
		for (const role of TYPE_ROLES) {
			assert(
				fine[`--text-${role}`] !== touch[`--text-${role}`],
				`${role} does not move with density`,
			);
		}
		requireEqual(fine["--spacing-control"], "32px", "desktop control");
		requireEqual(touch["--spacing-control"], "44px", "touch control");
		requireEqual(fine["--spacing-target"], "24px", "desktop target");
		requireEqual(touch["--spacing-target"], "44px", "touch target");
		// A one-line body row lands on the row height with its padding: 20 + 2 × 6.
		requireEqual(
			Number.parseInt(fine["--leading-body"] ?? "", 10) +
				2 * Number.parseInt(fine["--spacing-inside"] ?? "", 10),
			32,
			"desktop body line plus inside",
		);
		return "touch 44/48/38 seeded, desktop 32/28/38 beside it, the type scale moves with them";
	},
);

check(
	"c06-room",
	"the room set is the touch set on the canvas, scaled by the unit",
	() => {
		requireEqual(
			roomUnit(),
			`max(1px, min(100vw / ${ROOM_CANVAS.width}, 100dvh / ${ROOM_CANVAS.height}))`,
			"the room unit",
		);
		// The unit of a window: the tighter axis, never under 1 (a portrait
		// screen or a small window).
		for (const [width, height, unit] of [
			[1280, 720, 4 / 3],
			[1920, 1080, 2],
			[3840, 2160, 4],
			[1080, 1920, 1.125],
			[320, 480, 1],
		] as const) {
			requireEqual(
				roomUnitFor(width, height),
				unit,
				`u at ${width} × ${height}`,
			);
		}
		const touch = densityTokens(base, "touch");
		const canvas = densityTokens(base, "room");
		const number = (value: string) => Number.parseFloat(value);
		// What the room moves off the touch set: a figure stands five times its
		// label, and the page inset is the ten-foot safe area.
		const moved = new Set([
			"--text-display",
			"--text-display--line-height",
			"--leading-display",
			"--spacing-page",
		]);
		const unit1 = roomTokens((units) => units);
		for (const [key, value] of Object.entries(canvas)) {
			requireEqual(unit1[key], number(value), `${key} at u = 1`);
			if (!moved.has(key)) requireEqual(value, touch[key], `${key} is touch's`);
		}
		requireEqual(canvas["--text-display"], "80px", "display is 5 body");
		requireEqual(canvas["--leading-display"], "88px", "display line box");
		requireEqual(canvas["--spacing-page"], "48px", "page is the safe inset");
		// The sweep at u = 1 (a window at the canvas) and u = 2 (1920 × 1080):
		// every value is a positive number of pixels, none under the touch set's.
		for (const unit of [1, 2]) {
			const set = roomTokens((units) => units * unit);
			const ring = roomRingTokens((units) => units * unit);
			const measures = roomMeasureTokens((units) => units * unit);
			for (const [key, value] of Object.entries({
				...set,
				...ring,
				...measures,
			})) {
				assert(
					Number.isFinite(value) && value > 0,
					`${key} at u = ${unit} is ${value}`,
				);
			}
			for (const [key, value] of Object.entries(touch)) {
				if (moved.has(key)) continue;
				assert(
					(set[key] ?? 0) >= number(value),
					`${key} at u = ${unit} falls under the touch set`,
				);
			}
			requireEqual(set["--hairline"], unit, `hairline at u = ${unit}`);
			requireEqual(ring["--focus-ring"], 2 * unit, `ring at u = ${unit}`);
			requireEqual(
				ring["--focus-ring-offset"],
				2 * unit,
				`ring offset at u = ${unit}`,
			);
		}
		// 1920 × 1080, u = 2, against the ten-foot range.
		const at2 = roomTokens((units) => units * 2);
		const key = (name: string) => at2[name] ?? Number.NaN;
		requireEqual(key("--text-body"), 32, "body at 1920");
		requireEqual(key("--text-title"), 44, "title at 1920");
		requireEqual(key("--spacing-control"), 88, "control at 1920");
		requireEqual(key("--spacing-row"), 96, "row at 1920");
		requireEqual(key("--spacing-page"), 96, "page at 1920");
		requireEqual(key("--text-display"), 160, "display at 1920");
		requireEqual(key("--radius-control"), 12, "radius at 1920");
		assert(
			key("--text-body") >= 30 && key("--text-body") <= 32,
			"body is in the range of 30 to 32",
		);
		assert(key("--text-caption") >= 24, "supplemental text is at least 24");
		assert(key("--spacing-target") >= 64, "a target is at least 64");
		assert(
			key("--text-display") / key("--text-meta") >= 5,
			"a figure stands at least five times its label",
		);
		// The web declares each as a calc over the unit, the ring included.
		const scope = roomScope();
		requireEqual(scope["--room-unit"], roomUnit(), "the scope holds the unit");
		const ring1 = roomRingTokens((units) => units);
		for (const [name, value] of Object.entries(scope)) {
			if (name === "--room-unit") continue;
			const units = unit1[name] ?? ring1[name];
			requireEqual(value, `calc(${units} * var(--room-unit))`, name);
		}
		for (const name of Object.keys(unit1)) {
			assert(name in scope, `the web scope is missing ${name}`);
		}
		for (const name of Object.keys(canvas)) {
			assert(name in unit1, `the room tokens miss ${name}`);
		}
		for (const name of Object.keys(scope)) {
			assert(
				!name.startsWith("--container-measure"),
				`${name}: a ch measure follows the type, never the unit`,
			);
		}
		return "touch's set at u = 1 but display and page; at 1920 × 1080 body 32, title 44, control 88, row 96, display 160, page 96, hairline 2, ring 4; the web scope is a calc over the unit";
	},
);

check("c07", "the shadows are two sRGB layers per level and mode", () => {
	const SHAPE =
		/^0 (\d+)px (\d+)px rgba\((\d+), (\d+), (\d+), (0\.\d+)\), 0 (\d+)px (\d+)px rgba\((\d+), (\d+), (\d+), (0\.\d+)\)$/;
	for (const mode of MODES) {
		for (const level of SHADOW_LEVELS) {
			const value = base.shadows[mode][level];
			const parts = SHAPE.exec(value);
			assert(parts, `${mode} ${level} is off shape: ${value}`);
			requireEqual(
				baseTheme[`--shadow-${level}`],
				undefined,
				"no shadow in @theme",
			);
			requireEqual(
				modeTokens(base, mode)[`--shadow-${level}`],
				value,
				`${mode} mode carries ${level}`,
			);
		}
		const [, , , r, g, b] = SHAPE.exec(base.shadows[mode].float) ?? [];
		if (mode === "dark")
			requireEqual(`${r} ${g} ${b}`, "0 0 0", "dark shadows are black");
		else
			assert(
				Number(r) < 40 && Number(b) > Number(r),
				"light shadows are the cool ink",
			);
	}
	requireEqual(
		rootTokens(base)["--shadow-float"],
		base.shadows.light.float,
		"the root seeds the light float",
	);
	requireEqual(
		JSON.stringify(shadowUtilities()),
		JSON.stringify({
			"shadow-float": { "box-shadow": "var(--shadow-float)" },
			"shadow-modal": { "box-shadow": "var(--shadow-modal)" },
		}),
		"the utilities read their mode's variable",
	);
	return `${base.shadows.light.float} / ${base.shadows.dark.modal}`;
});

check("c37", "the layers stand over the page in order, toasts on top", () => {
	const root = rootTokens(base);
	STACK_ORDER.forEach((layer, at) => {
		requireEqual(root[`--layer-${layer}`], String(at + 1), `--layer-${layer}`);
	});
	requireEqual(
		STACK_ORDER.at(-1),
		"toasts",
		"the toasts stand over every layer",
	);
	return STACK_ORDER.map(
		(layer) => `${layer} ${root[`--layer-${layer}`]}`,
	).join(" < ");
});

check("c08", "themeTokens and modeTokens carry the right keys", () => {
	const expected = new Set<string>(ZEROED_NAMESPACES);
	for (const namespace of expected) {
		requireEqual(baseTheme[namespace], "initial", namespace);
	}
	for (const key of Object.keys(densityTokens(base, "touch")))
		expected.add(key);
	for (const role of TRACKED_ROLES) {
		expected.add(`--text-${role}--letter-spacing`);
		expected.add(`--tracking-${role}`);
	}
	for (const role of RADIUS_ROLES) expected.add(`--radius-${role}`);
	for (const width of WIDTHS) expected.add(`--container-${width}`);
	for (const bp of BREAKPOINTS) expected.add(`--breakpoint-${bp}`);
	expected.add("--font-sans");
	expected.add("--font-mono");
	expected.add("--default-border-width");
	for (const rung of DURATIONS) expected.add(`--transition-duration-${rung}`);
	expected.add("--transition-duration-loop");
	for (const easing of EASINGS) expected.add(`--ease-${easing}`);
	expected.add("--default-transition-duration");
	expected.add("--default-transition-timing-function");
	for (const name of COLOR_NAMES) expected.add(`--color-${name}`);
	const actual = new Set(Object.keys(baseTheme));
	for (const key of expected) {
		assert(actual.has(key), `themeTokens is missing ${key}`);
	}
	for (const key of actual) {
		assert(expected.has(key), `themeTokens carries an unexpected key: ${key}`);
	}
	for (const name of COLOR_NAMES) {
		requireEqual(
			emitted(`--color-${name}`),
			baseLight[`--color-${name}`],
			`light seeds --color-${name}`,
		);
	}
	for (const record of [baseTheme, baseLight, baseDark, rootTokens(base)]) {
		for (const [key, value] of Object.entries(record)) {
			assert(key.startsWith("--"), `key is not a --name: ${key}`);
			assert(
				!ESCAPES_A_DECLARATION.test(value),
				`${key} value can escape its declaration: ${value}`,
			);
		}
	}
	requireEqual(
		Object.keys(baseLight).length,
		COLOR_NAMES.length + SHADOW_LEVELS.length,
		"modeTokens entry count",
	);
	requireEqual(
		Object.keys(baseLight).join(" "),
		Object.keys(baseDark).join(" "),
		"both modes carry the same keys",
	);
	return `${actual.size} theme entries, ${Object.keys(baseLight).length} mode entries`;
});

check("c09", "every color name passes the cli's isCssIdent", () => {
	for (const name of COLOR_NAMES)
		assert(isCssIdent(name), `not a CSS ident: ${name}`);
	assert(
		!isCssIdent("--color-canvas"),
		"isCssIdent check is not discriminating",
	);
	return `${COLOR_NAMES.length} names pass @fcalell/cli/css`;
});

check("c10", "zero chroma drops the hue, non-zero keeps it", () => {
	requireEqual(color("light", "surface"), "oklch(1 0 0)", "light surface");
	requireEqual(color("dark", "scrim"), "oklch(0 0 0 / 0.5)", "dark scrim");
	requireEqual(
		color("dark", "surface"),
		"oklch(0.207 0.006 264)",
		"dark surface",
	);
	return "light surface and dark scrim hue 0, dark surface on the cast hue";
});

check(
	"c11",
	"accentHue moves only the accent, and every hue of either knob keeps every floor",
	() => {
		const pinned = KNOB_DEFAULTS.accentHue;
		for (const mode of MODES) {
			requireEqual(
				boundTo("accent", mode).join(" "),
				"accent accent-soft accent-ink ring selected-outline act-accent act-accent-hover act-accent-press act-accent-pending toggle-on toggle-on-hover",
				`the ${mode} accent-bound roles`,
			);
		}
		// With the cast pinned, an accent hue moves the accent-bound roles and
		// nothing else.
		const moved = deriveTheme({ accentHue: 200, castHue: pinned });
		for (const mode of MODES) {
			const bound = boundTo("accent", mode);
			for (const name of COLOR_NAMES) {
				const changed = moved.colors[mode][name] !== color(mode, name);
				requireEqual(
					changed,
					bound.includes(name),
					`${mode}.${name} ${changed ? "moved" : "held"} under accentHue 200`,
				);
			}
		}
		for (const [key, value] of Object.entries(themeTokens(moved))) {
			if (!key.startsWith("--color-"))
				requireEqual(value, baseTheme[key], `${key} under accentHue 200`);
		}
		// The sweeps: the accent at the default cast, the cast at the default
		// accent, and the two together (the cast's default). At every hue every
		// value stays inside sRGB and every floor and hold keeps its ratio.
		const sweeps: Array<[string, (hue: number) => Theme]> = [
			["accentHue", (hue) => ({ accentHue: hue, castHue: pinned })],
			["castHue", (hue) => ({ castHue: hue })],
			["accentHue = castHue", (hue) => ({ accentHue: hue })],
		];
		const short: string[] = [];
		let count = 0;
		for (const [label, theme] of sweeps) {
			for (let hue = 0; hue < 360; hue++) {
				const resolved = deriveTheme(theme(hue));
				for (const mode of MODES) {
					for (const name of COLOR_NAMES) {
						const [l, c, h] = oklch(resolved.colors[mode][name]);
						assert(
							inGamut(l, c, h),
							`${mode}.${name} leaves sRGB at ${label} ${hue}`,
						);
					}
				}
				const result = floors(resolved.colors);
				count += result.measured;
				for (const miss of result.short) short.push(`${label} ${hue}: ${miss}`);
			}
		}
		assert(short.length === 0, `under the floor: ${summary(short)}`);
		// The green accent is where the declared lightness falls short on a
		// light group, so there the contract lowers it; at the default hue it
		// is the declared 0.52.
		requireEqual(
			oklch(color("light", "accent-ink"))[0],
			0.52,
			"accent-ink at the default hue",
		);
		assert(
			oklch(
				deriveTheme({ accentHue: 143, castHue: pinned }).colors.light[
					"accent-ink"
				],
			)[0] < 0.52,
			"a green accent-ink is not lowered for the group",
		);
		return `${boundTo("accent", "light").length} roles move with the accent, ${count} pairs hold over 3 × 360 hues, every value in gamut`;
	},
);

check(
	"c11-cast",
	"castHue re-hues the neutrals only, defaults to accentHue, and never browns or vibrates",
	() => {
		requireEqual(
			base.knobs.castHue,
			KNOB_DEFAULTS.accentHue,
			"the default cast",
		);
		requireEqual(
			deriveTheme({ accentHue: 200 }).knobs.castHue,
			200,
			"an accent alone sets the cast",
		);
		requireEqual(
			deriveTheme({ accentHue: 200, castHue: 30 }).knobs.castHue,
			30,
			"a cast of its own",
		);
		const literals = (mode: Mode) =>
			COLOR_NAMES.filter((name) => {
				const declaration = COLORS[name];
				return "light" in declaration && declaration[mode].hue === "cast";
			});
		requireEqual(
			literals("light").join(" "),
			"canvas group edge edge-raised edge-strong scrim ink-body ink-meta ink-faint",
			"the light cast literals",
		);
		requireEqual(
			literals("dark").join(" "),
			"canvas surface group raised edge edge-raised edge-strong ink-body ink-meta ink-faint on-danger",
			"the dark cast literals",
		);
		// A cast re-hues each cast literal at its declared chroma; a role that
		// reads none keeps its hue (the accent, the status trio, the chip
		// families, the avatars), moving only its lightness where a hold
		// measures it on a cast ground.
		const complement = (KNOB_DEFAULTS.accentHue + 180) % 360;
		const moved = deriveTheme({ castHue: complement });
		for (const mode of MODES) {
			const bound = boundTo("cast", mode);
			for (const name of COLOR_NAMES) {
				const before = oklch(color(mode, name));
				const after = oklch(moved.colors[mode][name]);
				if (literals(mode).includes(name)) {
					requireEqual(after[1], before[1], `${mode}.${name} chroma`);
					requireEqual(after[2], complement, `${mode}.${name} hue`);
				} else if (!bound.includes(name)) {
					requireEqual(after[2], before[2], `${mode}.${name} hue`);
				}
			}
		}
		// A cast at the accent's complement keeps every hold and floor.
		const held = floors(moved.colors);
		assert(
			held.short.length === 0,
			`at the complement ${complement}: ${summary(held.short)}`,
		);
		// A warm cast keeps the dark canvas inside #000–#191a1f, channel by
		// channel: a tint, never a brown.
		const ceiling = [0x19, 0x1a, 0x1f];
		const [l, c, h] = oklch(deriveTheme({ castHue: 70 }).colors.dark.canvas);
		const rgb = oklchToRgb(l, c, h);
		assert(
			rgb.every((channel, index) => channel <= (ceiling[index] ?? 0)),
			`the dark canvas at cast 70 is rgb(${rgb.join(", ")}), past #191a1f`,
		);
		return `${boundTo("cast", "dark").length} dark and ${boundTo("cast", "light").length} light roles move with the cast; the complement ${complement} keeps ${held.measured} pairs; the dark canvas at cast 70 is rgb(${rgb.join(", ")})`;
	},
);

check("c13", "the schema rejects each bad input by key", () => {
	const rejections: Array<[string, unknown, string]> = [
		["knob out of range", { accentHue: 400 }, "accentHue"],
		["a retired knob", { primary: "ink" }, "primary"],
		["a retired scale knob", { space: 8 }, "space"],
		["retired overrides", { overrides: { colors: {} } }, "overrides"],
		["cast out of range", { castHue: -1 }, "castHue"],
		["the retired density knob", { density: "touch" }, "density"],
		["an unknown mode", { defaultMode: "auto" }, "defaultMode"],
		["an empty family", { fonts: { mono: "" } }, "mono"],
		["an unknown font role", { fonts: { serif: "Georgia" } }, "serif"],
	];
	for (const [label, input, key] of rejections) {
		const message = rejection(input);
		assert(message !== "", `${label}: accepted, expected a rejection`);
		assert(
			message.includes(key),
			`${label}: error does not name "${key}": ${message}`,
		);
	}
	requireEqual(
		deriveTheme({ defaultMode: "dark" }).defaultMode,
		"dark",
		"defaultMode lands",
	);
	requireEqual(
		deriveTheme().defaultMode,
		undefined,
		"no defaultMode by default",
	);
	return `${rejections.length} rejections named their key`;
});

check("c14", "the Tailwind fixture builds on contract only", () => {
	const out = buildFixture();
	const title = rule(out, "text-title");
	assert(title, "text-title emitted no rule");
	assert(
		title.includes("var(--text-title)"),
		"text-title does not read its variable",
	);
	assert(
		title.includes("var(--text-title--line-height)"),
		"text-title does not read its leading through the variable",
	);
	for (const selector of [
		"leading-title",
		"tracking-title",
		"bg-canvas",
		"bg-accent",
		"bg-avatar-8",
		"bg-chip-pink-soft",
		"gap-fields",
		"p-card",
		"rounded-control",
		"rounded-sheet",
		"w-popover",
		"max-w-measure",
		"min-h-control",
		"size-avatar",
		"font-mono",
	]) {
		assert(rule(out, selector), `${selector} emitted no rule`);
	}
	assert(
		rule(out, "min-h-control")?.includes("var(--spacing-control)"),
		"min-h-control does not read its variable",
	);
	assert(out.includes("tablet\\:flex"), "tablet:flex emitted no rule");
	assert(out.includes("(width >= 768px)"), "tablet: is not the 768 breakpoint");
	for (const selector of [
		"bg-red-500",
		"text-sm",
		"rounded-lg",
		"max-w-md",
		"shadow-md",
		"font-serif",
	]) {
		assert(rule(out, selector) === undefined, `${selector} emitted a rule`);
	}
	assert(!out.includes("sm\\:flex"), "sm:flex survived the breakpoint reset");
	for (const level of SHADOW_LEVELS) {
		const shadow = rule(out, `shadow-${level}`);
		assert(shadow, `shadow-${level} emitted no rule`);
		requireEqual(
			normalize(shadow.match(/box-shadow\s*:\s*([^;]+);/)?.[1] ?? ""),
			`var(--shadow-${level})`,
			`shadow-${level} box-shadow`,
		);
	}
	assert(
		rule(out, "duration-base")?.includes("var(--transition-duration-base)"),
		"duration-base does not read its rung",
	);
	assert(
		rule(out, "ease-out")?.includes("var(--ease-out)"),
		"ease-out does not read its curve",
	);
	assert(
		out.includes("--ease-out: cubic-bezier(0.16, 1, 0.3, 1)"),
		"--ease-out is not the contract's curve",
	);
	return `${out.length} bytes of CSS, every utility on its variable, off-contract utilities empty, tablet: is 768`;
});

check("c15", "the README carries the design laws, off the brand", () => {
	const readme = readFileSync(resolve(pkgDir, "README.md"), "utf8");
	for (const word of [
		"marine",
		"Marina",
		"Notturno",
		"WeNauti",
		"navy",
		"azure",
		"SpecCard",
		"FilterChip",
		"`tint`",
		"text-label",
	]) {
		assert(!readme.includes(word), `README contains "${word}"`);
	}
	for (const heading of [
		"## The knobs",
		"## Words",
		"## Color roles",
		"## Type roles",
		"## Space, sizes, radii, elevation",
		"## Contrast contracts",
		"## What the reset does not catch",
	]) {
		assert(readme.includes(heading), `README has no "${heading}" section`);
	}
	for (const name of COLOR_NAMES) {
		const representative = name
			.replace(/^chip-[a-z]+/, "chip-red")
			.replace(/^avatar-\d/, "avatar-1");
		assert(
			readme.includes(`\`${representative}\``),
			`README never names ${name}`,
		);
	}
	return "7 sections, every color role named, no brand words";
});

// ── The cn merge cases, driven by the token lists ───────────────────

function pairs<T extends string>(list: readonly T[]): Array<[T, T]> {
	const out: Array<[T, T]> = [];
	for (const [index, member] of list.entries()) {
		const next = list[(index + 1) % list.length];
		if (next) out.push([member, next]);
	}
	return out;
}

// One case per member of every driving list, so the check cannot pass by
// covering one lucky pair. Each case is `[inputs, expected]`.
const MERGE_CASES: Array<[string[], string]> = [];
for (const [role, next] of pairs(TYPE_ROLES)) {
	MERGE_CASES.push([[`text-${role}`, `text-${next}`], `text-${next}`]);
	MERGE_CASES.push([[`leading-${role}`, `leading-${next}`], `leading-${next}`]);
	MERGE_CASES.push([
		[`text-${role}`, "text-ink-meta"],
		`text-${role} text-ink-meta`,
	]);
}
for (const [role, next] of pairs(TRACKED_ROLES)) {
	MERGE_CASES.push([
		[`tracking-${role}`, `tracking-${next}`],
		`tracking-${next}`,
	]);
}
for (const [role, next] of pairs(RADIUS_ROLES)) {
	MERGE_CASES.push([[`rounded-${role}`, `rounded-${next}`], `rounded-${next}`]);
	MERGE_CASES.push([
		[`rounded-t-${role}`, `rounded-t-${next}`],
		`rounded-t-${next}`,
	]);
}
for (const [role, next] of pairs(SPACING_ROLES)) {
	MERGE_CASES.push([[`p-${role}`, `p-${next}`], `p-${next}`]);
	MERGE_CASES.push([[`gap-${role}`, `gap-${next}`], `gap-${next}`]);
}
for (const [size, next] of pairs(SIZES)) {
	MERGE_CASES.push([[`min-h-${size}`, `min-h-${next}`], `min-h-${next}`]);
}
for (const [width, next] of pairs(WIDTHS)) {
	MERGE_CASES.push([[`w-${width}`, `w-${next}`], `w-${next}`]);
	MERGE_CASES.push([[`max-w-${width}`, `max-w-${next}`], `max-w-${next}`]);
}
// The numeric `--spacing` base stays live, so a role and a numeric are one group.
MERGE_CASES.push([["p-card", "p-4"], "p-4"]);
MERGE_CASES.push([["w-popover", "w-full"], "w-full"]);
// A later type role clears the earlier role's leading and its tracking, or a
// stale `tracking-title` rides body text.
MERGE_CASES.push([["leading-title", "text-body"], "text-body"]);
MERGE_CASES.push([["tracking-title", "text-body"], "text-body"]);
MERGE_CASES.push([["text-body", "leading-title"], "text-body leading-title"]);
MERGE_CASES.push([
	["text-title", "tracking-title"],
	"text-title tracking-title",
]);
// Three of the seven roles carry no tracking, so `tracking-body` names nothing
// and must not join the group: registering all seven would collapse this pair.
MERGE_CASES.push([
	["tracking-body", "tracking-title"],
	"tracking-body tracking-title",
]);

check("c17", "cn dedupes inside each registered scale, never across", () => {
	for (const [inputs, expected] of MERGE_CASES) {
		requireEqual(cn(inputs), expected, inputs.join(" "));
	}
	const members =
		TYPE_ROLES.length +
		TRACKED_ROLES.length +
		RADIUS_ROLES.length +
		SPACING_ROLES.length +
		SIZES.length +
		WIDTHS.length;
	return `${MERGE_CASES.length} cases over ${members} token-list members`;
});

// Contract-specific scale members, which bare tailwind-merge cannot know: each
// one proves the config does work rather than riding an upstream default.
const UNEXTENDED_MISSES: Array<[string[], string]> = [
	[["text-title", "text-ink-meta"], "text-title text-ink-meta"],
	[["leading-title", "leading-body"], "leading-body"],
	[["tracking-title", "tracking-heading"], "tracking-heading"],
	[["rounded-t-sheet", "rounded-t-control"], "rounded-t-control"],
	[["p-card", "p-page"], "p-page"],
	[["gap-inside", "gap-fields"], "gap-fields"],
	[["min-h-control", "min-h-field"], "min-h-field"],
	[["w-popover", "w-dialog"], "w-dialog"],
	[["tracking-title", "text-body"], "text-body"],
];

check("c18", "the extension is what makes the contract's scales merge", () => {
	for (const [inputs, expected] of UNEXTENDED_MISSES) {
		requireEqual(cn(inputs), expected, `extended: ${inputs.join(" ")}`);
		assert(
			twMerge(clsx(inputs)) !== expected,
			`unextended twMerge already returns ${expected} for ${inputs.join(" ")}`,
		);
	}
	return `${UNEXTENDED_MISSES.length} cases pass extended and fail unextended`;
});

check("c19", "every cva renders exactly its own table", () => {
	const exported = new Set(
		Object.entries(tables as unknown as Record<string, unknown>)
			.filter(
				([, value]) =>
					value !== null && typeof value === "object" && "variants" in value,
			)
			.map(([name]) => name),
	);
	const registered = new Set(MATRICES.map(([name]) => name));
	for (const name of exported) {
		assert(
			registered.has(name),
			`${name} is a table the enumerator never sees`,
		);
	}
	for (const name of registered) {
		assert(exported.has(name), `${name} is registered but not exported`);
	}
	// The public family registry is this one, in order, each family's axes
	// its table's.
	requireEqual(
		FAMILIES.map((family) => family.name).join(" "),
		MATRICES.map(([name]) => name).join(" "),
		"FAMILIES",
	);
	for (const family of FAMILIES) {
		const table = MATRICES.find(([name]) => name === family.name)?.[1];
		assert(table, `${family.name} has no table`);
		requireEqual(
			JSON.stringify(family.axes),
			JSON.stringify(
				Object.fromEntries(
					Object.entries(table.variants).map(([axis, cells]) => [
						axis,
						Object.keys(cells),
					]),
				),
			),
			`${family.name} axes`,
		);
	}
	// The text cells are literals for Tailwind's scanner; each is pinned to
	// TYPE_SCALE so the table and the tokens cannot disagree.
	const weights = {
		regular: "font-normal",
		medium: "font-medium",
		semibold: "font-semibold",
	};
	requireEqual(
		Object.keys(TEXT.variants.role).join(" "),
		TYPE_ROLES.join(" "),
		"TEXT roles",
	);
	for (const role of TYPE_ROLES) {
		const spec = TYPE_SCALE[role];
		const tracking = isTracked(role) ? ` tracking-${role}` : "";
		const family = spec.family === "mono" ? " font-mono" : "";
		const figures = spec.tabular ? " tabular-nums" : "";
		requireEqual(
			TEXT.variants.role[role],
			`text-${role} leading-${role}${tracking} ${weights[spec.weight]} text-${spec.ink}${family}${figures}`,
			`TEXT.role.${role}`,
		);
		requireEqual(
			TEXT_STRONG.variants.role[role],
			spec.weight === "regular" ? "font-medium" : "",
			`TEXT_STRONG.role.${role}`,
		);
	}
	for (const [name, table] of [
		["CHIP", CHIP],
		["CHIP_LABEL", CHIP_LABEL],
	] as const) {
		requireEqual(
			Object.keys(table.variants.family).join(" "),
			CHIP_FAMILIES.join(" "),
			`${name} families`,
		);
	}
	for (const [name, table] of [
		["AVATAR", AVATAR],
		["AVATAR_LABEL", AVATAR_LABEL],
	] as const) {
		requireEqual(
			Object.keys(table.variants.step).join(" "),
			AVATAR_STEPS.join(" "),
			`${name} steps`,
		);
	}
	requireEqual(
		Object.keys(STATUS_DOT.variants.state).join(" "),
		STATUS_STATES.filter((state) => state !== "running").join(" "),
		"STATUS_DOT states, all but the running spinner's",
	);
	requireEqual(
		Object.keys(CHART_FILL.variants.series).join(" "),
		CHART_SERIES.join(" "),
		"CHART_FILL series",
	);
	for (const hue of CHART_SERIES) {
		requireEqual(
			CHART_FILL.variants.series[hue],
			`bg-chip-${hue}`,
			`CHART_FILL.series.${hue}`,
		);
	}
	let combos = 0;
	for (const entry of MATRICES) {
		const [name, config] = entry;
		for (const props of combinations(config)) {
			requireEqual(
				render(entry, props),
				derived(config, props),
				`${name}(${JSON.stringify(props)})`,
			);
			combos++;
		}
	}
	return `${combos} combinations over ${MATRICES.length} tables, each equal to its config`;
});

check("c20", "every class every matrix can emit resolves", () => {
	const out = buildFixture();
	const missing = [...enumerated()].filter((name) => !rule(out, name));
	assert(missing.length === 0, `emitted no rule: ${missing.join(", ")}`);
	return `${enumerated().size} classes from ${MATRICES.length} tables and ${CLASS_CONSTANTS.length} constants, every one on contract`;
});

const BANNED_CLASSES = [
	"flex",
	"inline-flex",
	"flex-row",
	"flex-col",
	"font-sans",
];
const BANNED_PREFIXES = ["items-", "justify-", "self-"];

check("c21", "the enumerated set holds no platform overlay", () => {
	const gaps = new Set<string>(GAP_ROLES);
	for (const name of enumerated()) {
		assert(!BANNED_CLASSES.includes(name), `${name} is a platform overlay`);
		for (const prefix of BANNED_PREFIXES) {
			assert(!name.startsWith(prefix), `${name} is a platform overlay`);
		}
		// `:` covers every interaction state, `dark:`, `group-`, `peer-` and
		// `aria-`; `[` and `(` are the two spellings of an arbitrary value.
		for (const char of [":", "[", "("]) {
			assert(!name.includes(char), `${name} carries "${char}"`);
		}
		// A gap on one axis (`gap-x-`, `gap-y-`) is a gap role all the same.
		const gap = /^gap-(?:[xy]-)?(.+)$/.exec(name)?.[1];
		if (gap !== undefined) {
			assert(gaps.has(gap), `${name} is not a gap role`);
		}
	}
	return `${enumerated().size} classes: no display, alignment, state or arbitrary value`;
});

check("c22", "the content tones are contract colors", () => {
	const colors = new Set<string>(COLOR_NAMES);
	let checked = 0;
	for (const act of keysOf(BUTTON.variants.act)) {
		const token = buttonContentTone(act);
		assert(colors.has(token), `buttonContentTone(${act}): ${token}`);
		checked++;
	}
	for (const state of STATUS_STATES) {
		const token = statusContentTone(state);
		assert(colors.has(token), `statusContentTone(${state}): ${token}`);
		checked++;
	}
	for (const state of keysOf(TOAST_STATE.variants.state)) {
		const token = toastContentTone(state);
		assert(colors.has(token), `toastContentTone(${state}): ${token}`);
		checked++;
	}
	for (const kind of keysOf(BANNER_GLYPH.variants.kind)) {
		const token = bannerContentTone(kind);
		assert(colors.has(token), `bannerContentTone(${kind}): ${token}`);
		checked++;
	}
	for (const state of keysOf(RULE_ARROW.variants.state)) {
		const token = ruleArrowContentTone(state);
		assert(colors.has(token), `ruleArrowContentTone(${state}): ${token}`);
		checked++;
	}
	requireEqual(stageContentTone(), "ink-meta", "done stage's check ink");
	checked++;
	requireEqual(toastContentTone("done"), "ok", "done glyph ink");
	requireEqual(bannerContentTone("note"), "accent-ink", "note glyph ink");
	requireEqual(buttonContentTone("primary"), "on-act-accent", "primary ink");
	requireEqual(statusContentTone("active"), "accent-ink", "active ink");
	requireEqual(statusContentTone("running"), "accent-ink", "running ink");
	requireEqual(avatarStep("Frankie"), avatarStep("Frankie"), "stable step");
	assert(/^[1-8]$/.test(avatarStep("x")), "avatarStep is off the ladder");
	return `${checked} token names, every one a contract color`;
});

check(
	"c23",
	"descriptors.ts is types only, its icon an IconName, generic only in a value",
	() => {
		const source = readFileSync(resolve(pkgDir, "src/descriptors.ts"), "utf8");
		const output = ts.transpileModule(source, {
			compilerOptions: {
				module: ts.ModuleKind.ESNext,
				target: ts.ScriptTarget.ESNext,
			},
		}).outputText;
		requireEqual(
			output.replace(/export\s*\{\s*\}\s*;?/g, "").replace(/\s+/g, ""),
			"",
			"emitted JavaScript",
		);
		for (const statement of source.match(/^import .*/gm) ?? []) {
			assert(
				statement.startsWith("import type "),
				`value import: ${statement}`,
			);
		}
		for (const match of source.matchAll(/\bicon\??\s*:\s*([^;\n]+)/g)) {
			requireEqual(match[1]?.trim(), "IconName", `field "${match[0]}"`);
		}
		const headers = [
			...source.matchAll(/^(?:export )?(?:interface|type) \w+(<[^>]*>)?/gm),
		];
		assert(headers.length > 0, "descriptors.ts declares no types");
		for (const header of headers) {
			const params = header[1];
			if (params === undefined) continue;
			// A field binding is generic in the value its field holds, and an
			// option (or a row's trailing pick of options) in the string it picks
			// or the empty choice's null, all data; a table's column and its row
			// map in the item they read.
			assert(
				(/^<V>$/.test(params) && /\bField\w+<V>/.test(header[0])) ||
					(/^<V extends string \| null = string>$/.test(params) &&
						/\b(?:Option|Row|MultiPick|Either|Rule)\w*</.test(header[0])) ||
					(/^<T = never>$/.test(params) && /\bTableColumn</.test(header[0])) ||
					(/^<T>$/.test(params) &&
						/\bTable(?:RowSlots|Choice)</.test(header[0])),
				`type parameters must be exactly <V> on a field binding, <V extends string | null = string> on an option or a row's pick, <T = never> on a table column or <T> on its row map or its choice, got ${params}`,
			);
		}
		for (const name of [
			"IconName",
			"Act",
			"IconAct",
			"Quoted",
			"Part",
			"StatusMark",
			"ChipMark",
			"Option",
			"PlaceSpec",
			"Hunk",
			"Attachment",
			"Notice",
			"OptionGroup",
			"FieldControl",
			"FieldBinding",
			"Confirmation",
			"MenuItem",
			"ColumnWidth",
			"CellEdit",
			"TableColumn",
			"TableCell",
			"CellValue",
			"TableRowSlots",
			"TableChoice",
			"MultiPick",
			"EitherValue",
			"EitherPick",
			"RuleValue",
			"RuleTerms",
			"Rule",
		]) {
			assert(
				new RegExp(`^export (?:interface|type) ${name}\\b`, "m").test(source),
				`${name} is not exported`,
			);
		}
		const generic = headers.filter((header) => header[1]).length;
		return `${headers.length} declarations, ${generic} generic in a value, every icon an IconName, no emitted JavaScript`;
	},
);

check("c24", "no JSDoc block anywhere under src", () => {
	const files = readdirSync(resolve(pkgDir, "src"), {
		recursive: true,
		encoding: "utf8",
	}).filter((name) => name.endsWith(".ts"));
	for (const name of files) {
		const source = readFileSync(resolve(pkgDir, "src", name), "utf8");
		assert(!source.includes("/**"), `${name} carries a JSDoc block`);
	}
	return `${files.length} modules, no /** in any of them`;
});

check("c25", "the README carries the canon and the sharing line", () => {
	const readme = readFileSync(resolve(pkgDir, "README.md"), "utf8");
	for (const heading of [
		"## The canon",
		"## The sharing line",
		"## Composing with cn",
		"## The roster",
	]) {
		assert(readme.includes(heading), `README has no "${heading}" section`);
	}
	const prose = readme.toLowerCase();
	for (const term of [
		"`act`",
		"`loading`",
		"`onchange`",
		"`class`",
		"`classname`",
		"`style`",
		"platform overlay",
		"font weight",
	]) {
		assert(prose.includes(term), `the README never names ${term}`);
	}
	const composing = readme.slice(readme.indexOf("## Composing with cn"));
	for (const term of ["leading-", "tracking-", "before"]) {
		assert(
			composing.includes(term),
			`the compose-order rule never names ${term}`,
		);
	}
	return "the canon, the sharing line, the compose-order rule, the roster";
});

check("c26", "every cell keeps the type role ahead of its metrics", () => {
	const roles = new Set<string>(TYPE_ROLES);
	let inspected = 0;
	for (const [name, config] of MATRICES) {
		for (const [where, cell] of cells(config)) {
			const classes = cell.split(/\s+/).filter(Boolean);
			const role = classes.findIndex((value) =>
				roles.has(value.replace("text-", "")),
			);
			const rides = classes.findIndex(
				(value) =>
					value.startsWith("leading-") || value.startsWith("tracking-"),
			);
			assert(
				role < 0 || rides < 0 || role < rides,
				`${name}.${where}: ${classes[rides]} precedes the type role`,
			);
			assert(
				rides < 0 || role >= 0,
				`${name}.${where}: ${classes[rides]} rides no type role`,
			);
			inspected++;
		}
	}
	return `${inspected} cells: type role ahead of its leading and tracking`;
});

check(
	"c28",
	"the roster is closed, camelCase, and off the style channels",
	() => {
		const entries = rosterEntries();
		requireEqual(entries.length, 62, "component count");
		const names = new Set<string>();
		for (const [, name, { props }] of entries) {
			assert(/^[A-Z][A-Za-z]+$/.test(name), `${name} is not PascalCase`);
			assert(!names.has(name), `${name} is listed twice`);
			names.add(name);
			for (const prop of props) {
				assert(
					/^[a-z][A-Za-z]*$/.test(prop),
					`${name}.${prop} is not camelCase`,
				);
				assert(
					!(CLOSED_PROPS as readonly string[]).includes(prop),
					`${name}.${prop} is a closed channel`,
				);
			}
			const dir = componentDir(name);
			assert(/^[a-z]+(-[a-z]+)*$/.test(dir), `${name} maps to ${dir}`);
		}
		requireEqual(componentDir("ListRow"), "list-row", "componentDir");
		requireEqual(componentDir("QrCode"), "qr-code", "componentDir acronym");
		requireEqual(
			CLOSED_PROPS.join(" "),
			"class className classList style",
			"closed",
		);
		return `${entries.length} components, every prop camelCase and open`;
	},
);

check("c31", "words: English is total and the schema is closed", () => {
	for (const key of WORD_KEYS) {
		assert(ENGLISH[key].length > 0, `ENGLISH has no ${key}`);
		assert(
			ENGLISH[key][0] === ENGLISH[key][0]?.toUpperCase() &&
				!ENGLISH[key].includes("!"),
			`${key} is not sentence case: ${ENGLISH[key]}`,
		);
	}
	assert(wordsSchema.safeParse(ENGLISH).success, "the schema rejects English");
	const { send: _send, ...missing } = ENGLISH;
	const short = wordsSchema.safeParse(missing);
	assert(!short.success, "a missing word was accepted");
	assert(
		short.error.issues.some((issue) => issue.path.includes("send")),
		"the missing key is not named",
	);
	const extra = wordsSchema.safeParse({ ...ENGLISH, ok: "OK" });
	assert(!extra.success, "an extra word was accepted");
	for (const key of COUNTED_WORD_KEYS) {
		for (const form of [ENGLISH[key].one, ENGLISH[key].other]) {
			assert(form.includes("{count}"), `${key} has a form without {count}`);
			assert(
				form[0] === form[0]?.toUpperCase() && !form.includes("!"),
				`${key} is not sentence case: ${form}`,
			);
		}
	}
	requireEqual(
		counted(ENGLISH.earlierLines, 1),
		"Show 1 earlier line",
		"one earlier line",
	);
	requireEqual(
		counted(ENGLISH.earlierLines, 3),
		"Show 3 earlier lines",
		"three earlier lines",
	);
	const bare = wordsSchema.safeParse({ ...ENGLISH, earlierLines: "Show" });
	assert(!bare.success, "a counted word without its forms was accepted");
	// A slot word spells exactly its slots, each once.
	for (const key of SLOT_WORD_KEYS) {
		const spelled = [...ENGLISH[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
		requireEqual(
			[...spelled].sort().join(" "),
			[...SLOT_WORDS[key]].sort().join(" "),
			`${key} spells its slots`,
		);
		const slotless = wordsSchema.safeParse({ ...ENGLISH, [key]: "Over" });
		assert(!slotless.success, `${key} without its slots was accepted`);
	}
	requireEqual(
		filled(ENGLISH.meterValue, { value: "8.4", max: "10" }),
		"8.4 of 10",
		"a filled meter value",
	);
	requireEqual(
		filled(ENGLISH.meterOver, { amount: "1.8" }),
		"1.8 over",
		"a filled overage",
	);
	requireEqual(
		filled(ENGLISH.wrongType, { name: "a.pdf", types: "text/csv, .har" }),
		"a.pdf isn't one of text/csv, .har",
		"a filled refusal",
	);
	return `${WORD_KEYS.length} words, ${COUNTED_WORD_KEYS.length} counted and ${SLOT_WORD_KEYS.length} with slots, sentence case, missing and extra keys rejected`;
});

check("c32", "the contrast contracts hold at the default knobs", () => {
	const { measured, short } = floors(base.colors);
	assert(short.length === 0, `under the floor: ${short.join(", ")}`);
	// Disabled text is the one exemption, drawn at about 3:1 so it reads as off.
	for (const mode of MODES) {
		const ratio = contrast(color(mode, "ink-faint"), color(mode, "surface"));
		assert(
			ratio >= 2.8 && ratio < 4.5,
			`${mode} ink-faint on surface is ${ratio.toFixed(2)}, not about 3:1`,
		);
	}
	return `${measured} pairs at their floor in both modes, ink-faint at about 3:1`;
});

check(
	"c33",
	"motion: one curve family, a bounded scale, stilled on request",
	() => {
		for (const rung of DURATIONS) {
			const ms = base.motion.durations[rung];
			assert(ms >= 100 && ms <= 300, `${rung} leaves 100–300: ${ms}`);
		}
		requireEqual(base.motion.loop, LOOP_MS, "the loop");
		for (const easing of EASINGS) {
			const points = EASING[easing];
			assert(
				points.every((value) => value >= 0 && value <= 1),
				`${easing} leaves the unit square, so it overshoots`,
			);
			requireEqual(
				baseTheme[`--ease-${easing}`],
				`cubic-bezier(${points.join(", ")})`,
				`--ease-${easing}`,
			);
		}
		const reduced = reducedMotionTokens();
		requireEqual(
			Object.keys(reduced).join(" "),
			DURATIONS.map((rung) => `--transition-duration-${rung}`).join(" "),
			"reduced motion covers every rung and never the loop",
		);
		assert(
			Object.values(reduced).every((value) => value === "0ms"),
			"reduced motion leaves a duration above 0",
		);
		requireEqual(
			baseTheme["--default-transition-duration"],
			"var(--transition-duration-base)",
			"a bare transition reads the base rung",
		);
		const rungs = new Set(DURATIONS.map((rung) => `duration-${rung}`));
		const easings = new Set(EASINGS.map((easing) => `ease-${easing}`));
		for (const name of enumerated()) {
			if (name.startsWith("duration-"))
				assert(rungs.has(name), `${name} is a literal duration`);
			if (name.startsWith("ease-"))
				assert(easings.has(name), `${name} is not a contract curve`);
		}
		return `${DURATIONS.length} durations ${DURATIONS.map((rung) => base.motion.durations[rung]).join("/")} ms plus the ${LOOP_MS} ms loop, ${EASINGS.length} curves, reduced motion zeroes every rung`;
	},
);

// The class strings a roster `draws` name renders: a family at every axis
// product, one family cell (`FAMILY.axis.value`, the table's base and that
// cell alone), or a single cell; undefined for a name that is none of these.
function drawnCells(name: string): string[] | undefined {
	const [family, axis, value, ...rest] = name.split(".");
	const entry = MATRICES.find(([registered]) => registered === family);
	if (entry && axis === undefined) {
		return combinations(entry[1]).map((props) => render(entry, props));
	}
	if (entry && axis !== undefined && value !== undefined && !rest.length) {
		const cell = entry[1].variants[axis]?.[value];
		return cell === undefined ? undefined : [`${entry[1].base} ${cell}`];
	}
	const constant = CLASS_CONSTANTS.find(([registered]) => registered === name);
	return constant && [constant[1]];
}

check("c34", "the roster draws every family and names only real states", () => {
	const families = new Set(FAMILIES.map((family) => family.name));
	const drawn = new Set<string>();
	for (const [, name, entry] of rosterEntries()) {
		for (const draw of entry.draws) {
			assert(
				drawnCells(draw) !== undefined,
				`${name} draws ${draw}, neither a registered family, a family cell nor a single cell`,
			);
			drawn.add(draw.split(".")[0] ?? draw);
		}
		assert(entry.states.includes("rest"), `${name} has no rest state`);
		requireEqual(
			new Set(entry.states).size,
			entry.states.length,
			`${name} lists a state twice`,
		);
		for (const state of entry.states) {
			assert(STATES.includes(state), `${name} names unknown state ${state}`);
		}
		for (const prop of ["loading", "empty"] as const) {
			if (entry.props.includes(prop)) {
				assert(
					entry.states.includes(prop),
					`${name} takes \`${prop}\` but has no ${prop} state`,
				);
			}
		}
	}
	const undrawn = [...families].filter((family) => !drawn.has(family));
	assert(undrawn.length === 0, `no component draws ${undrawn.join(", ")}`);
	return `${families.size} families each drawn, every state one of ${STATES.length}`;
});

check("c36", "every held cell is drawn by its one holder", () => {
	const holders = new Map<string, string>();
	for (const [, name, entry] of rosterEntries()) {
		for (const held of entry.holds ?? []) {
			assert(
				!held.includes(".") && drawnCells(held) !== undefined,
				`${name} holds ${held}, neither a registered family nor a single cell`,
			);
			assert(
				entry.draws.some((draw) => draw.split(".")[0] === held),
				`${name} holds ${held} but does not draw it`,
			);
			const other = holders.get(held);
			assert(other === undefined, `${held} is held by ${other} and ${name}`);
			holders.set(held, name);
		}
	}
	return `${holders.size} cells, each held by one entry that draws it`;
});

// The token a class spells, by the namespace the entry's `owns` declares it
// under; a class that spells no contract token (a weight, `border`,
// `tabular-nums`) is undefined. A role's leading and tracking ride with it.
const TOKEN_NAMESPACES: ReadonlyArray<
	readonly [keyof Owns, RegExp, ReadonlySet<string>]
> = [
	["roles", /^(?:text|leading|tracking)-(.+)$/, new Set<string>(TYPE_ROLES)],
	[
		"colors",
		/^(?:bg|text|border|outline|divide)-(.+)$/,
		new Set<string>(COLOR_NAMES),
	],
	["radii", /^rounded(?:-[tblrse]{1,2})?-(.+)$/, new Set<string>(RADIUS_ROLES)],
	[
		"spacing",
		/^-?(?:gap|gap-[xy]|p[xytblrse]?|m[xytblrse]?)-(.+)$/,
		new Set<string>(SPACING_ROLES),
	],
	[
		"sizes",
		/^(?:(?:min-|max-)?[hw]|size|p[xytblrse]?|translate-[xy])-(.+)$/,
		new Set<string>([...SIZES, ...WIDTHS]),
	],
	["elevation", /^shadow-(.+)$/, new Set<string>(SHADOW_LEVELS)],
];

function spelled(name: string): Array<[keyof Owns, string]> {
	const out: Array<[keyof Owns, string]> = [];
	for (const [space, pattern, tokens] of TOKEN_NAMESPACES) {
		const token = pattern.exec(name)?.[1];
		if (token !== undefined && tokens.has(token)) out.push([space, token]);
	}
	return out;
}

function owned(owns: Owns, space: keyof Owns, token: string): boolean {
	const list: readonly string[] = owns[space] ?? [];
	return list.some(
		(entry) =>
			entry === token || (entry.endsWith("-") && token.startsWith(entry)),
	);
}

// Every class of every cell a declaring entry draws.
function drawnClasses(draws: readonly string[]): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	for (const name of draws) {
		for (const cell of drawnCells(name) ?? []) {
			for (const value of cell.split(/\s+/)) {
				if (value) out.push([name, value]);
			}
		}
	}
	return out;
}

check("c35", "every cell a component draws spells only tokens it owns", () => {
	let entries = 0;
	let inspected = 0;
	for (const [, name, entry] of rosterEntries()) {
		const owns = entry.owns;
		if (!owns) continue;
		entries++;
		for (const [space, , tokens] of TOKEN_NAMESPACES) {
			for (const declared of owns[space] ?? []) {
				const real = declared.endsWith("-")
					? [...tokens].some((token) => token.startsWith(declared))
					: tokens.has(declared);
				assert(real, `${name} owns ${space} ${declared}, which names no token`);
			}
		}
		for (const [cell, value] of drawnClasses(entry.draws)) {
			for (const [space, token] of spelled(value)) {
				assert(
					owned(owns, space, token),
					`${name} draws ${value} in ${cell}, but owns no ${space} ${token}`,
				);
			}
			inspected++;
		}
	}
	assert(entries > 0, "no roster entry declares what it owns");
	return `${entries} components, ${inspected} drawn classes, each token owned`;
});

// ── Report ──────────────────────────────────────────────────────────

report();
