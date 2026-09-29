// Reproduction harness for the ui-core token contract and matrix layer.
//
//   pnpm --filter @fcalell/ui-core verify
//
// The script derives with default knobs, diffs every emitted value against
// the approved Stage 1 sheet (`plugins/react-ui/design/foundations.css`, the
// calibration the contract carries), sweeps the accent knob for contrast,
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
import { deriveTheme } from "../src/derive.ts";
import {
	densityTokens,
	finePointerTokens,
	modeTokens,
	reducedMotionTokens,
	rootTokens,
	shadowUtilities,
	themeTokens,
} from "../src/emit.ts";
import {
	assert,
	check,
	declarationMap,
	normalize,
	report,
	rule,
	tailwindBuild,
} from "../src/harness.ts";
import { inGamut, oklchToLinear, oklchToRgb } from "../src/oklch.ts";
import {
	CLOSED_PROPS,
	componentDir,
	rosterEntries,
	STATES,
} from "../src/roster.ts";
import { wordsSchema } from "../src/schema.ts";
import {
	AVATAR_STEPS,
	BODY_SIZE,
	BREAKPOINT_PX,
	BREAKPOINTS,
	CHIP_FAMILIES,
	COLOR_NAMES,
	COLORS,
	type ColorName,
	DENSITIES,
	DURATION_MS,
	DURATIONS,
	EASING,
	EASINGS,
	ENGLISH,
	fallbackFace,
	GAP_ROLES,
	LOOP_MS,
	MODES,
	type Mode,
	RADIUS_PX,
	RADIUS_ROLES,
	SHADOW_LEVELS,
	SIZE_PX,
	SIZES,
	SPACE_BASE,
	SPACING_RATIO,
	SPACING_ROLES,
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
	AVATAR,
	type Axes,
	BANNER,
	BUTTON,
	BUTTON_LABEL,
	CHECKBOX,
	CHIP,
	DIFF_LINE,
	FIELD,
	type Matrix,
	MESSAGE,
	OTP_BOX,
	PLACE,
	RHYTHM,
	ROW,
	SEGMENT,
	STATUS,
	SWITCH,
	TABLE_ROW,
	TEXT,
	TEXT_STRONG,
	TOAST_STATE,
} from "../src/variant-tables.ts";
import * as variants from "../src/variants.ts";
import {
	avatar,
	avatarStep,
	banner,
	button,
	buttonContentTone,
	buttonLabel,
	checkbox,
	chip,
	diffLine,
	FAMILIES,
	field,
	message,
	otpBox,
	place,
	rhythm,
	row,
	segment,
	status,
	statusContentTone,
	switchTrack,
	tableRow,
	text,
	textStrong,
	toastState,
} from "../src/variants.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");
// The approved sheet is the oracle. It lives with the boards it was drawn
// on; this script runs in the workspace only, so the path is relative to it.
const sheetPath = resolve(
	pkgDir,
	"../../plugins/react-ui/design/foundations.css",
);

// A value may carry no statement or block terminator and no comment delimiter:
// each would let a token break out of the declaration it is rendered into.
const ESCAPES_A_DECLARATION = /[;{}]|\/\*|\*\//;

// ── The sheet ───────────────────────────────────────────────────────

// Every top-level rule's custom properties by its selector text, the sheet's
// own spellings. The sheet nests nothing but `@media` and `@keyframes`, and
// neither carries a token this script reads.
const sheet = readFileSync(sheetPath, "utf8")
	.replace(/\/\*[\s\S]*?\*\//g, "")
	// The reduced-motion block re-declares the durations at 0 under a nested
	// `:root`; only the top-level rules carry the sheet's values.
	.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
const sheetRules = new Map<string, Map<string, string>>();
for (const match of sheet.matchAll(
	/(?:^|\n)([^{}@\n][^{}]*?)\s*\{([^{}]*)\}/g,
)) {
	const selector = normalize(match[1] ?? "");
	const body = match[2] ?? "";
	const rule = sheetRules.get(selector) ?? new Map<string, string>();
	sheetRules.set(selector, rule);
	for (const [property, value] of declarationMap(body)) {
		if (property.startsWith("--")) rule.set(property, value);
	}
}

const SHEET_SELECTOR = {
	light: ":root",
	dark: ".dark",
	desktop: ':root, :root[data-density="desktop"]',
	touch: ':root[data-density="touch"]',
} as const;

function sheetRule(selector: string): Map<string, string> {
	const rule = sheetRules.get(selector);
	assert(rule, `the sheet has no "${selector}" rule`);
	return rule;
}

// A sheet value with its `var()` references followed, through the density
// block it sits in and then the root.
function sheetValue(selector: string, property: string): string {
	const own = sheetRule(selector).get(property);
	const value =
		own ??
		sheetRule(SHEET_SELECTOR.desktop).get(property) ??
		sheetRule(":root").get(property);
	assert(
		value !== undefined,
		`the sheet has no ${property} under "${selector}"`,
	);
	return value.replace(/var\((--[\w-]+)\)/g, (_, name: string) =>
		sheetValue(selector, name),
	);
}

// The sheet's names for the sizes; every other token keeps its sheet name.
const SHEET_SIZE: Record<(typeof SIZES)[number], string> = {
	control: "--control-height",
	"control-compact": "--control-height-compact",
	field: "--field-height",
	row: "--row-height",
	"row-2": "--row-height-2",
	"row-setting": "--row-height-setting",
	header: "--header-height",
	target: "--target-min",
	dot: "--size-dot",
	chip: "--size-chip",
	avatar: "--size-avatar",
	spinner: "--size-spinner",
	"switch-w": "--switch-width",
	"switch-h": "--switch-height",
	thumb: "--switch-thumb",
	"switch-inset": "--switch-inset",
	skeleton: "--skeleton-height",
};

// The sheet's names for the two places it spells differently.
const SHEET_COLOR: Partial<Record<ColorName, string>> = {
	ring: "--ring-color",
	"switch-thumb": "--switch-thumb-fill",
};

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

// WCAG 2 contrast between two emitted opaque `oklch(L C H)` values.
function contrast(fg: string, bg: string): number {
	const luminance = (value: string) => {
		const [l, c, h, alpha] = oklch(value);
		assert(alpha === undefined, `not an opaque value: ${value}`);
		const [r, g, b] = oklchToLinear(l, c, h);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
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

// ── The matrix registry ─────────────────────────────────────────────

// Every table `#variant-tables` exports, paired with the cva `#variants` builds
// from it. c19 asserts the registry is total in both directions, so a matrix
// cannot reach either module without reaching the enumerator.
type Registration = readonly [string, Matrix<Axes>, (props?: never) => string];

const MATRICES: readonly Registration[] = [
	["TEXT", TEXT, text],
	["TEXT_STRONG", TEXT_STRONG, textStrong],
	["BUTTON", BUTTON, button],
	["BUTTON_LABEL", BUTTON_LABEL, buttonLabel],
	["STATUS", STATUS, status],
	["FIELD", FIELD, field],
	["OTP_BOX", OTP_BOX, otpBox],
	["ROW", ROW, row],
	["SWITCH", SWITCH, switchTrack],
	["TABLE_ROW", TABLE_ROW, tableRow],
	["CHECKBOX", CHECKBOX, checkbox],
	["SEGMENT", SEGMENT, segment],
	["BANNER", BANNER, banner],
	["TOAST_STATE", TOAST_STATE, toastState],
	["DIFF_LINE", DIFF_LINE, diffLine],
	["MESSAGE", MESSAGE, message],
	["AVATAR", AVATAR, avatar],
	["CHIP", CHIP, chip],
	["PLACE", PLACE, place],
	["RHYTHM", RHYTHM, rhythm],
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
		"./cn ./commit ./derive ./descriptors ./emit ./harness ./roster ./schema ./tokens ./variants",
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
	return "10 subpaths, no root export, no runtime cli dependency";
});

check("c03", "tokens.ts declares the contract", () => {
	requireEqual(COLOR_NAMES.length, 83, "color count");
	requireEqual(new Set(COLOR_NAMES).size, COLOR_NAMES.length, "unique colors");
	requireEqual(TYPE_ROLES.length, 7, "type role count");
	requireEqual(SPACING_ROLES.length, 8, "spacing role count");
	requireEqual(GAP_ROLES.length, 5, "gap role count");
	requireEqual(SIZES.length, 17, "size count");
	requireEqual(RADIUS_ROLES.length, 8, "radius role count");
	requireEqual(SHADOW_LEVELS.length, 2, "shadow level count");
	requireEqual(WIDTHS.length, 5, "width count");
	requireEqual(BREAKPOINTS.length, 3, "breakpoint count");
	requireEqual(WORD_KEYS.length, 21, "word count");
	for (const name of COLOR_NAMES) {
		assert(COLORS[name] !== undefined, `no declaration for ${name}`);
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
	return `${COLOR_NAMES.length} colors, 7 roles, 8 spacing roles (5 gaps), 17 sizes, 8 radii, 2 shadows, 5 widths, 3 breakpoints, 21 words`;
});

check("c05", "default knobs reproduce the approved sheet", () => {
	const diff: string[] = [];
	let count = 0;
	// Every literal color, both modes. The sheet's `color-mix` values are the
	// washes, the act states and the switch hover, which c05-mix derives.
	for (const mode of MODES) {
		const rule = sheetRule(SHEET_SELECTOR[mode]);
		for (const name of COLOR_NAMES) {
			const expected = rule.get(SHEET_COLOR[name] ?? `--${name}`);
			if (expected === undefined || !expected.startsWith("oklch(")) continue;
			count++;
			if (color(mode, name) !== expected) {
				diff.push(`${mode}.${name}: ${expected} -> ${color(mode, name)}`);
			}
		}
		for (const [property, value] of rule) {
			const name = property.slice(2);
			if (property === "--shade" || !value.startsWith("oklch(")) continue;
			if (!(COLOR_NAMES as readonly string[]).includes(name)) {
				const renamed = Object.values(SHEET_COLOR).includes(property);
				assert(renamed, `the sheet's ${property} has no contract color`);
			}
		}
	}
	// The three density scales, both sets.
	for (const density of DENSITIES) {
		const selector = SHEET_SELECTOR[density];
		const tokens = densityTokens(base, density);
		const expect = (key: string, property: string) => {
			count++;
			const expected = sheetValue(selector, property);
			if (tokens[key] !== expected) {
				diff.push(`${density} ${property}: ${expected} -> ${tokens[key]}`);
			}
		};
		for (const role of TYPE_ROLES) {
			expect(`--text-${role}`, `--text-${role}`);
			expect(`--leading-${role}`, `--leading-${role}`);
		}
		for (const role of SPACING_ROLES) {
			expect(`--spacing-${role}`, `--space-${role}`);
		}
		for (const size of SIZES) expect(`--spacing-${size}`, SHEET_SIZE[size]);
	}
	// The density-invariant scales, off the root.
	const root = (property: string) => sheetValue(":root", property);
	for (const role of TRACKED_ROLES) {
		count++;
		requireEqual(
			emitted(`--tracking-${role}`),
			root(`--tracking-${role}`),
			role,
		);
	}
	for (const role of TYPE_ROLES) {
		if (!isTracked(role)) requireEqual(root(`--tracking-${role}`), "0em", role);
	}
	for (const role of RADIUS_ROLES) {
		count++;
		requireEqual(emitted(`--radius-${role}`), root(`--radius-${role}`), role);
	}
	for (const width of WIDTHS) {
		count++;
		const property = width === "measure" ? "--measure" : `--width-${width}`;
		requireEqual(emitted(`--container-${width}`), root(property), width);
	}
	for (const rung of DURATIONS) {
		count++;
		requireEqual(
			emitted(`--transition-duration-${rung}`),
			root(`--duration-${rung}`),
			rung,
		);
	}
	count++;
	requireEqual(
		emitted("--transition-duration-loop"),
		root("--duration-loop"),
		"loop",
	);
	for (const easing of EASINGS) {
		count++;
		requireEqual(emitted(`--ease-${easing}`), root(`--ease-${easing}`), easing);
	}
	const rootValues = rootTokens(base);
	requireEqual(rootValues["--hairline"], root("--hairline"), "hairline");
	requireEqual(rootValues["--focus-ring"], root("--ring"), "ring");
	requireEqual(
		rootValues["--focus-ring-offset"],
		root("--ring-offset"),
		"offset",
	);
	// The shadows, the sheet's oklch layers converted to sRGB.
	for (const mode of MODES) {
		for (const level of SHADOW_LEVELS) {
			count++;
			const expected = sheetValue(
				SHEET_SELECTOR[mode],
				`--shadow-${level}`,
			).replace(/oklch\(([^)]*)\)/g, (_, inner: string) => {
				const [l, c, h, alpha] = inner
					.replace(" / ", " ")
					.split(" ")
					.map(Number);
				const [r, g, b] = oklchToRgb(l ?? 0, c ?? 0, h ?? 0);
				return `rgba(${r}, ${g}, ${b}, ${alpha})`;
			});
			if (base.shadows[mode][level] !== expected) {
				diff.push(
					`${mode} shadow-${level}: ${expected} -> ${base.shadows[mode][level]}`,
				);
			}
		}
	}
	assert(
		diff.length === 0,
		`the derivation departs from the sheet: ${diff.join("; ")}`,
	);
	return `${count} values equal to the sheet, none departed`;
});

check(
	"c05-mix",
	"the computed colors follow the sheet's color-mix rules",
	() => {
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
			] as const) {
				const [il, ic, ih] = oklch(color(mode, "ink-body"));
				requireEqual(
					color(mode, name),
					`oklch(${il} ${ic} ${ih} / ${alpha})`,
					`${mode}.${name}`,
				);
			}
			// The accent fill darkens under hover and press, lightens pending.
			const accent = l(color(mode, "accent"));
			assert(
				l(color(mode, "act-accent-hover")) < accent,
				`${mode} hover is not darker`,
			);
			assert(
				l(color(mode, "act-accent-press")) < l(color(mode, "act-accent-hover")),
				`${mode} press is not darker than hover`,
			);
			assert(
				l(color(mode, "act-accent-pending")) > accent,
				`${mode} pending is not lighter`,
			);
			// The ink fill moves toward the page: lighter in light, darker in dark.
			const ink = l(color(mode, "ink-body"));
			const hover = l(color(mode, "act-ink-hover"));
			assert(
				mode === "light" ? hover > ink : hover < ink,
				`${mode} ink hover moves the wrong way`,
			);
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
		return "6 washes at their alpha, act fills move the right way, aliases read their source, one mix checked by hand";
	},
);

check("c06", "every scale is its ratio of the base", () => {
	for (const density of DENSITIES) {
		const body = BODY_SIZE[density];
		const tokens = densityTokens(base, density);
		for (const role of TYPE_ROLES) {
			const size = Math.round(body * TYPE_SCALE[role].size);
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
		for (const role of SPACING_ROLES) {
			requireEqual(
				tokens[`--spacing-${role}`],
				`${SPACE_BASE * SPACING_RATIO[density][role]}px`,
				`${density} ${role}`,
			);
		}
		for (const size of SIZES) {
			requireEqual(
				tokens[`--spacing-${size}`],
				`${SIZE_PX[density][size]}px`,
				`${density} ${size}`,
			);
		}
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
		'"JetBrains Mono Variable", "JetBrains Mono Variable Fallback", ui-monospace, "SFMono-Regular", Menlo, monospace',
		"--font-mono names its fallback face second",
	);
	requireEqual(
		fallbackFace("Inter Variable"),
		"Inter Variable Fallback",
		"the fallback face rule",
	);
	requireEqual(
		emitted("--font-mono--font-feature-settings"),
		'"liga" 0, "calt" 0',
		"mono ligatures off",
	);
	requireEqual(
		emitted("--font-sans"),
		"ui-sans-serif, system-ui, sans-serif",
		"--font-sans",
	);
	const named = themeTokens(deriveTheme({ fonts: { sans: "Inter Variable" } }));
	requireEqual(
		named["--font-sans"],
		'"Inter Variable", "Inter Variable Fallback", ui-sans-serif, system-ui, sans-serif',
		"a named sans",
	);
	for (const rung of DURATIONS) {
		requireEqual(
			emitted(`--transition-duration-${rung}`),
			`${DURATION_MS[rung]}ms`,
			rung,
		);
	}
	return "7 roles × 2 densities with even line boxes, 8 spacing roles, 17 sizes, 4 trackings, 8 radii, 5 widths, 3 breakpoints, 2 families with their fallback faces, 4 durations";
});

check(
	"c06-density",
	"touch seeds the theme, desktop adds the fine-pointer set",
	() => {
		const touch = densityTokens(base, "touch");
		for (const [key, value] of Object.entries(touch)) {
			requireEqual(emitted(key), value, `touch seeds ${key}`);
		}
		requireEqual(
			JSON.stringify(finePointerTokens(deriveTheme({ density: "touch" }))),
			"{}",
			"touch emits no fine-pointer set",
		);
		requireEqual(base.knobs.density, "desktop", "the default density");
		const fine = finePointerTokens(base);
		requireEqual(
			JSON.stringify(fine),
			JSON.stringify(densityTokens(base, "desktop")),
			"the fine-pointer set is the desktop set",
		);
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
		assert(
			rejection({ density: "dense" }).includes("density"),
			"an unknown density is not rejected by key",
		);
		return "touch 44/48/38 seeded, desktop 32/28/38 on a fine pointer, either set on demand, the type scale moves with them";
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
	expected.add("--font-mono--font-feature-settings");
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
		"oklch(0.207 0.006 270)",
		"dark surface",
	);
	return "light surface and dark scrim hue 0, dark surface on the neutral hue";
});

check(
	"c11",
	"accentHue moves only the accent and keeps its contrasts at every hue",
	() => {
		const bound = new Set<ColorName>();
		const walk = (name: ColorName): boolean => {
			const declaration = COLORS[name];
			if ("alias" in declaration) return walk(declaration.alias);
			if ("veil" in declaration) return walk(declaration.veil);
			if ("mix" in declaration) {
				return (
					walk(declaration.mix) ||
					(declaration.toward !== "black" && walk(declaration.toward))
				);
			}
			return (
				declaration.light.hue === "accent" || declaration.dark.hue === "accent"
			);
		};
		for (const name of COLOR_NAMES) if (walk(name)) bound.add(name);
		requireEqual(
			[...bound].join(" "),
			"accent accent-soft accent-ink ring selected-outline act-accent act-accent-hover act-accent-press act-accent-pending switch-on switch-on-hover",
			"the accent-bound roles",
		);
		const moved = deriveTheme({ accentHue: 200 });
		for (const mode of MODES) {
			for (const name of COLOR_NAMES) {
				const changed = moved.colors[mode][name] !== color(mode, name);
				requireEqual(
					changed,
					bound.has(name),
					`${mode}.${name} ${changed ? "moved" : "held"} under accentHue 200`,
				);
			}
		}
		for (const [key, value] of Object.entries(themeTokens(moved))) {
			if (!key.startsWith("--color-"))
				requireEqual(value, baseTheme[key], `${key} under accentHue 200`);
		}
		// The sweep: at every hue the accent-derived pairs keep their ratio, and
		// every accent value stays inside sRGB with no more chroma than declared.
		const pairs: Array<[ColorName, ColorName, number]> = [
			["on-accent", "accent", 4.5],
			["on-act-accent", "act-accent-hover", 4.5],
			["on-act-accent", "act-accent-press", 4.5],
			["accent-ink", "canvas", 4.5],
			["accent-ink", "surface", 4.5],
			["accent-ink", "group", 4.5],
			["accent-ink", "accent-soft", 4.5],
			["ink-body", "accent-soft", 4.5],
			["ink-meta", "accent-soft", 4.5],
		];
		const short: string[] = [];
		let count = 0;
		for (let accentHue = 0; accentHue < 360; accentHue++) {
			const resolved = deriveTheme({ accentHue });
			for (const mode of MODES) {
				const values = resolved.colors[mode];
				for (const name of bound) {
					const [l, c, h] = oklch(values[name]);
					assert(
						inGamut(l, c, h),
						`${mode}.${name} leaves sRGB at hue ${accentHue}`,
					);
				}
				for (const [fg, bg, floor] of pairs) {
					count++;
					const ratio = contrast(values[fg], values[bg]);
					if (ratio < floor)
						short.push(
							`${mode} ${fg} on ${bg} at ${accentHue}: ${ratio.toFixed(2)}`,
						);
				}
			}
		}
		assert(
			short.length === 0,
			`under the floor: ${short.slice(0, 8).join(", ")}${short.length > 8 ? ` and ${short.length - 8} more` : ""}`,
		);
		// The green accent is where the declared lightness falls short on a
		// light group, so there the contract lowers it; at the sheet's hue it
		// is the declared 0.52.
		requireEqual(
			oklch(color("light", "accent-ink"))[0],
			0.52,
			"accent-ink at the sheet's hue",
		);
		assert(
			oklch(deriveTheme({ accentHue: 143 }).colors.light["accent-ink"])[0] <
				0.52,
			"a green accent-ink is not lowered for the group",
		);
		return `${bound.size} roles move, ${count} pairs hold over 360 hues, every value in gamut`;
	},
);

check("c13", "the schema rejects each bad input by key", () => {
	const rejections: Array<[string, unknown, string]> = [
		["knob out of range", { accentHue: 400 }, "accentHue"],
		["a retired knob", { primary: "ink" }, "primary"],
		["a retired scale knob", { space: 8 }, "space"],
		["retired overrides", { overrides: { colors: {} } }, "overrides"],
		["an unknown density", { density: "compact" }, "density"],
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
		"rounded-dialog",
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
		"--ease-out is not the sheet's curve",
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
		requireEqual(
			TEXT.variants.role[role],
			`text-${role} leading-${role}${tracking} ${weights[spec.weight]} text-${spec.ink}${family}`,
			`TEXT.role.${role}`,
		);
		requireEqual(
			TEXT_STRONG.variants.role[role],
			spec.weight === "regular" ? "font-medium" : "",
			`TEXT_STRONG.role.${role}`,
		);
	}
	requireEqual(
		Object.keys(CHIP.variants.family).join(" "),
		CHIP_FAMILIES.join(" "),
		"CHIP families",
	);
	requireEqual(
		Object.keys(AVATAR.variants.step).join(" "),
		AVATAR_STEPS.join(" "),
		"AVATAR steps",
	);
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
		if (name.startsWith("gap-")) {
			assert(gaps.has(name.slice("gap-".length)), `${name} is not a gap role`);
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
	for (const state of keysOf(STATUS.variants.state)) {
		const token = statusContentTone(state);
		assert(colors.has(token), `statusContentTone(${state}): ${token}`);
		checked++;
	}
	requireEqual(buttonContentTone("primary"), "on-act-accent", "primary ink");
	requireEqual(statusContentTone("active"), "accent-ink", "active ink");
	requireEqual(avatarStep("Frankie"), avatarStep("Frankie"), "stable step");
	assert(/^[1-8]$/.test(avatarStep("x")), "avatarStep is off the ladder");
	return `${checked} token names, every one a contract color`;
});

check(
	"c23",
	"descriptors.ts is types only, generic in TIcon or a value",
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
			requireEqual(match[1]?.trim(), "TIcon", `field "${match[0]}"`);
		}
		const headers = [
			...source.matchAll(/^(?:export )?(?:interface|type) \w+(<[^>]*>)?/gm),
		];
		assert(headers.length > 0, "descriptors.ts declares no types");
		for (const header of headers) {
			const params = header[1];
			if (params === undefined) continue;
			// The icon is the one framework type a descriptor may carry; a field
			// binding is generic in the value its field holds, and an option in
			// the string it picks or the empty choice's null, both data.
			assert(
				/^<TIcon = never>$/.test(params) ||
					(/^<V>$/.test(params) && /\bField\w+<V>/.test(header[0])) ||
					(/^<V extends string \| null = string>$/.test(params) &&
						/\bOption\w*</.test(header[0])),
				`type parameters must be exactly <TIcon = never>, <V> on a field binding, or <V extends string | null = string> on an option, got ${params}`,
			);
		}
		for (const name of [
			"Act",
			"IconAct",
			"Quoted",
			"Part",
			"Mark",
			"Option",
			"PlaceSpec",
			"Hunk",
			"ComparisonRow",
			"BarSeries",
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
			"TableRow",
		]) {
			assert(
				new RegExp(`^export (?:interface|type) ${name}\\b`, "m").test(source),
				`${name} is not exported`,
			);
		}
		const generic = headers.filter((header) => header[1]).length;
		return `${headers.length} declarations, ${generic} generic in TIcon or a field's value, no emitted JavaScript`;
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

check("c27", "every rhythm cell is exactly gap-<role>", () => {
	const units = Object.keys(RHYTHM.variants.unit) as Array<
		keyof (typeof RHYTHM)["variants"]["unit"]
	>;
	requireEqual(units.join(" "), GAP_ROLES.join(" "), "rhythm units");
	requireEqual(RHYTHM.base, "", "RHYTHM.base");
	for (const unit of units) {
		requireEqual(rhythm({ unit }), `gap-${unit}`, `rhythm(${unit})`);
	}
	return `${units.length} units, each cell the bare gap utility`;
});

check(
	"c28",
	"the roster is closed, camelCase, and off the style channels",
	() => {
		const entries = rosterEntries();
		requireEqual(entries.length, 54, "component count");
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
	return `${WORD_KEYS.length} words, sentence case, missing and extra keys rejected`;
});

check("c32", "the contrast contracts hold at the default knobs", () => {
	const grounds: ColorName[] = ["canvas", "surface", "group", "raised"];
	const text: Array<[ColorName, ColorName[]]> = [
		[
			"ink-body",
			[...grounds, "accent-soft", "ok-soft", "warn-soft", "danger-soft"],
		],
		["ink-meta", [...grounds, "accent-soft"]],
		["accent-ink", [...grounds, "accent-soft"]],
		["ok", [...grounds, "ok-soft"]],
		["warn", [...grounds, "warn-soft"]],
		["danger", [...grounds, "danger-soft"]],
		["on-accent", ["accent", "act-accent-hover", "act-accent-press"]],
		["on-danger", ["danger"]],
		["on-act-ink", ["act-ink", "act-ink-hover", "act-ink-press"]],
		...CHIP_FAMILIES.map((family): [ColorName, ColorName[]] => [
			`chip-${family}-ink`,
			[`chip-${family}-soft`],
		]),
		...AVATAR_STEPS.map((step): [ColorName, ColorName[]] => [
			`avatar-${step}-ink`,
			[`avatar-${step}`],
		]),
	];
	const graphic: Array<[ColorName, ColorName[]]> = [
		["edge-strong", ["surface", "group"]],
		...CHIP_FAMILIES.map((family): [ColorName, ColorName[]] => [
			`chip-${family}`,
			["surface"],
		]),
	];
	const short: string[] = [];
	let count = 0;
	const measure = (pairs: Array<[ColorName, ColorName[]]>, floor: number) => {
		for (const mode of MODES) {
			for (const [fg, fills] of pairs) {
				for (const bg of fills) {
					const ratio = contrast(color(mode, fg), color(mode, bg));
					count++;
					if (ratio < floor)
						short.push(
							`${mode} ${fg} on ${bg}: ${ratio.toFixed(2)} < ${floor}`,
						);
				}
			}
		}
	};
	measure(text, 4.5);
	measure(graphic, 3);
	assert(short.length === 0, `under the floor: ${short.join(", ")}`);
	// Disabled text is the one exemption, drawn at about 3:1 so it reads as off.
	for (const mode of MODES) {
		const ratio = contrast(color(mode, "ink-faint"), color(mode, "surface"));
		assert(
			ratio >= 2.8 && ratio < 4.5,
			`${mode} ink-faint on surface is ${ratio.toFixed(2)}, not about 3:1`,
		);
	}
	return `${count} pairs at their floor in both modes, ink-faint at about 3:1`;
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

check("c34", "the roster draws every family and names only real states", () => {
	const families = new Set(FAMILIES.map((family) => family.name));
	const drawn = new Set<string>();
	for (const [, name, entry] of rosterEntries()) {
		for (const family of entry.draws) {
			assert(families.has(family), `${name} draws unregistered ${family}`);
			drawn.add(family);
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

// ── Report ──────────────────────────────────────────────────────────

report();
