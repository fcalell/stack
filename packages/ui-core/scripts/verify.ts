// Reproduction harness for the ui-core token contract and matrix layer.
//
//   pnpm --filter @fcalell/ui-core verify
//
// The script derives with default knobs, diffs the renamed roles against the
// reference stylesheet (Marina's calibration, the oracle for every value the
// contract kept), drives a Tailwind build over the emitted `@theme` record plus
// every class the matrices can emit, and exits non-zero on any mismatch.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCssIdent } from "@fcalell/cli/css";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ts from "typescript";
import { cn } from "../src/cn.ts";
import { deriveTheme } from "../src/derive.ts";
import { modeTokens, shadowUtilities, themeTokens } from "../src/emit.ts";
import { GEOMETRY, NATIVE_GEOMETRY_HOSTS, scanGeometry } from "../src/gate.ts";
import {
	assert,
	blockBody,
	check,
	declarationMap,
	normalize,
	report,
	rule,
	tailwindBuild,
} from "../src/harness.ts";
import { oklchToLinear } from "../src/oklch.ts";
import { CLOSED_PROPS, componentDir, rosterEntries } from "../src/roster.ts";
import { wordsSchema } from "../src/schema.ts";
import {
	AVATAR_STEPS,
	BREAKPOINTS,
	COLORS,
	ENGLISH,
	INVARIANT,
	INVARIANT_COLORS,
	isNeutralBound,
	KNOB_DEFAULTS,
	MODES,
	type Mode,
	PER_MODE_COLORS,
	type PerModeColor,
	RADIUS_RUNGS,
	SHADOW_LEVELS,
	SPACING_RUNGS,
	TRACKED_ROLES,
	type TrackedRole,
	TYPE_ROLES,
	TYPE_SCALE,
	type TypeRole,
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
	DIFF_LINE,
	FIELD,
	type Matrix,
	MESSAGE,
	PLACE,
	RHYTHM,
	ROW,
	SEGMENT,
	STATUS,
	SWITCH,
	TEXT,
	TEXT_STRONG,
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
	diffLine,
	field,
	message,
	place,
	rhythm,
	row,
	segment,
	status,
	statusContentTone,
	switchTrack,
	text,
	textStrong,
} from "../src/variants.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");
const referencePath = resolve(fixtureDir, "reference.css");

// A value may carry no statement or block terminator and no comment delimiter:
// each would let a token break out of the declaration it is rendered into.
const ESCAPES_A_DECLARATION = /[;{}]|\/\*|\*\//;

// ── Reference stylesheet parsing ────────────────────────────────────

// Each role names the reference token whose value it kept: `accent` under
// the default `ink` primary is the reference's ink-aliased accent, `tint`
// its interactive hue.
const ROLE_SOURCE: Record<Exclude<PerModeColor, `avatar-${number}`>, string> = {
	canvas: "canvas",
	surface: "surface",
	group: "surface-2",
	edge: "edge",
	ink: "ink-1",
	"ink-meta": "ink-2",
	"ink-faint": "ink-4",
	accent: "accent",
	"accent-soft": "brand-soft",
	"on-accent": "canvas",
	tint: "marine",
	ok: "ok",
	"ok-soft": "ok-soft",
	warn: "warn",
	"warn-soft": "warn-soft",
	danger: "danger",
	"danger-soft": "danger-soft",
};

// The values the contract departs from the calibration on, each for a
// measured reason: the reference's dark marks clear 4.5:1 on `surface` but
// not on `group`, where statuses, acts and destructive labels are drawn.
const DEPARTED: Record<string, string> = {
	"dark.tint": "oklch(0.75 0.155 261)",
	"dark.ok": "oklch(0.75 0.14 160)",
	"dark.warn": "oklch(0.75 0.14 75)",
	"dark.danger": "oklch(0.76 0.17 28)",
};

const reference = readFileSync(referencePath, "utf8").replace(
	/\/\*[\s\S]*?\*\//g,
	"",
);
const referenceModes = new Map<Mode, Map<string, string>>();
for (const mode of MODES) {
	const tokens = new Map<string, string>();
	for (const [property, value] of declarationMap(
		blockBody(reference, `@variant ${mode}`),
	)) {
		if (property.startsWith("--color-")) {
			tokens.set(property.slice("--color-".length), value);
		}
	}
	referenceModes.set(mode, tokens);
}
const referenceTheme = declarationMap(blockBody(reference, "@theme"));

function fromVariant(mode: Mode, token: string): string {
	const value = referenceModes.get(mode)?.get(token);
	assert(value !== undefined, `reference @variant ${mode} has no ${token}`);
	return value;
}

// ── Check helpers ───────────────────────────────────────────────────

function requireEqual(actual: unknown, expected: unknown, what: string): void {
	assert(
		actual === expected,
		`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
	);
}

function chromaOf(value: string | undefined): string {
	const inner = value?.match(/^oklch\(([^)]*)\)$/)?.[1];
	assert(inner, `not an oklch value: ${value}`);
	const chroma = inner.trim().split(/[\s/]+/)[1];
	assert(chroma, `no chroma component in ${value}`);
	return chroma;
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
	["ROW", ROW, row],
	["SWITCH", SWITCH, switchTrack],
	["CHECKBOX", CHECKBOX, checkbox],
	["SEGMENT", SEGMENT, segment],
	["BANNER", BANNER, banner],
	["DIFF_LINE", DIFF_LINE, diffLine],
	["MESSAGE", MESSAGE, message],
	["AVATAR", AVATAR, avatar],
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
	const utilities = Object.entries(shadowUtilities(base))
		.map(([name, value]) => `@utility ${name} {\n\tbox-shadow: ${value};\n}`)
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
		"./cn ./derive ./descriptors ./emit ./gate ./harness ./roster ./schema ./tokens ./variants",
		"export subpaths",
	);
	assert(pkg.peerDependencies?.zod, "zod is not a peerDependency");
	for (const name of ["tailwindcss", "@tailwindcss/cli"]) {
		assert(pkg.devDependencies?.[name], `${name} is not a devDependency`);
	}
	for (const name of [
		"class-variance-authority",
		"clsx",
		"tailwind-merge",
		"ts-morph",
	]) {
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
	requireEqual(PER_MODE_COLORS.length, 25, "per-mode color count");
	requireEqual(INVARIANT_COLORS.length, 2, "mode-invariant color count");
	requireEqual(TYPE_ROLES.length, 7, "type role count");
	requireEqual(SPACING_RUNGS.length, 6, "spacing rung count");
	requireEqual(RADIUS_RUNGS.length, 3, "radius rung count");
	requireEqual(SHADOW_LEVELS.length, 2, "shadow level count");
	requireEqual(WIDTHS.length, 5, "width count");
	requireEqual(BREAKPOINTS.length, 3, "breakpoint count");
	requireEqual(WORD_KEYS.length, 18, "word count");
	for (const [token, declaration] of Object.entries(COLORS)) {
		if ("alias" in declaration) {
			assert(
				(PER_MODE_COLORS as readonly string[]).includes(declaration.alias),
				`${token} aliases an unknown token`,
			);
			continue;
		}
		for (const mode of MODES) {
			const hue = declaration[mode].hue;
			assert(
				typeof hue === "number" ||
					(typeof hue.knob === "string" && typeof hue.offset === "number"),
				`${token}.${mode} carries no hue binding`,
			);
		}
	}
	for (const token of INVARIANT_COLORS) {
		assert(INVARIANT[token] !== undefined, `no declaration for ${token}`);
	}
	const source = readFileSync(resolve(pkgDir, "src/tokens.ts"), "utf8");
	for (const word of ["marine", "navy", "brand", "interactive"]) {
		assert(!/\b${word}\b/.test(source), `tokens.ts names "${word}"`);
	}
	return "25 per-mode + 2 invariant colors, 7 roles, 6 rungs, 3 radii, 2 shadows, 5 widths, 3 breakpoints, 18 words";
});

check("c05", "default knobs reproduce the reference under the roles", () => {
	const diff: string[] = [];
	for (const mode of MODES) {
		const actual = modeTokens(base, mode);
		for (const [role, source] of Object.entries(ROLE_SOURCE)) {
			const expected = DEPARTED[`${mode}.${role}`] ?? fromVariant(mode, source);
			if (actual[role] !== expected) {
				diff.push(`${mode}.${role}: ${expected} -> ${actual[role]}`);
			}
		}
	}
	assert(diff.length === 0, `token diff is not empty: ${diff.join(", ")}`);
	requireEqual(
		emitted("--color-thumb"),
		fromVariant("light", "thumb"),
		"thumb is the light reference value in both modes",
	);
	requireEqual(
		emitted("--color-scrim"),
		referenceTheme.get("--color-scrim"),
		"--color-scrim",
	);
	return `${Object.keys(ROLE_SOURCE).length * 2 - Object.keys(DEPARTED).length} per-mode values match the reference and ${Object.keys(DEPARTED).length} depart as listed, thumb and scrim literal`;
});

check("c06", "every scale is its ratio of the knob", () => {
	const { space, radius, text, widths, breakpoints } = KNOB_DEFAULTS;
	for (const [rung, ratio] of [
		["pair", 1],
		["row", 2],
		["stack", 3],
		["inset", 4],
		["section", 6],
		["room", 8],
	] as const) {
		requireEqual(emitted(`--spacing-${rung}`), `${space * ratio}px`, rung);
	}
	requireEqual(emitted("--radius-group"), `${radius}px`, "--radius-group");
	requireEqual(
		emitted("--radius-sheet"),
		`${Math.floor(radius * 1.75)}px`,
		"--radius-sheet",
	);
	requireEqual(emitted("--radius-full"), "9999px", "--radius-full");
	// Sizes round to the whole pixel, line boxes to the even one; the reference
	// carried the same sizes for the roles it had under their old names.
	const sizes: Record<TypeRole, number> = {
		display: 34,
		title: 28,
		heading: 18,
		body: 16,
		meta: 14,
		label: 13,
		mono: 14,
	};
	for (const role of TYPE_ROLES) {
		requireEqual(emitted(`--text-${role}`), `${sizes[role]}px`, role);
		const box = Number.parseInt(emitted(`--leading-${role}`), 10);
		requireEqual(box % 2, 0, `${role} line box is even`);
		requireEqual(
			box,
			2 * Math.round((sizes[role] * TYPE_SCALE[role].leading) / 2),
			`${role} line box`,
		);
		requireEqual(
			emitted(`--text-${role}--line-height`),
			emitted(`--leading-${role}`),
			`${role} modifier shape`,
		);
		if (!isTracked(role)) {
			assert(
				baseTheme[`--tracking-${role}`] === undefined &&
					baseTheme[`--text-${role}--letter-spacing`] === undefined,
				`${role} emits tracking it does not carry`,
			);
		}
	}
	requireEqual(Math.round(text * 2.125), 34, "display ratio at 16");
	for (const role of TRACKED_ROLES) {
		requireEqual(
			emitted(`--text-${role}--letter-spacing`),
			emitted(`--tracking-${role}`),
			`${role} tracking shape`,
		);
	}
	for (const width of WIDTHS) {
		requireEqual(emitted(`--container-${width}`), `${widths[width]}px`, width);
	}
	for (const bp of BREAKPOINTS) {
		requireEqual(emitted(`--breakpoint-${bp}`), `${breakpoints[bp]}px`, bp);
	}
	requireEqual(
		emitted("--font-mono"),
		'"JetBrains Mono Variable", ui-monospace, SFMono-Regular, monospace',
		"--font-mono",
	);
	requireEqual(
		emitted("--font-sans"),
		"ui-sans-serif, system-ui, sans-serif",
		"--font-sans",
	);
	// A halved text knob halves every size; doubled space doubles every rung.
	const dense = themeTokens(deriveTheme({ text: 14, space: 8, radius: 8 }));
	requireEqual(dense["--text-body"], "14px", "text 14 body");
	requireEqual(dense["--text-title"], "25px", "text 14 title rounds");
	requireEqual(dense["--spacing-inset"], "32px", "space 8 inset");
	requireEqual(dense["--radius-sheet"], "14px", "radius 8 sheet floors");
	return "6 rungs, 3 radii, 7 sizes with even line boxes, 3 trackings, 5 widths, 3 breakpoints, 2 families, all from the knobs";
});

check("c07", "the shadows derive from neutralHue as sRGB", () => {
	const utilities = shadowUtilities(base);
	requireEqual(
		Object.keys(utilities).join(","),
		"shadow-float,shadow-sheet",
		"shadow keys",
	);
	const SHAPE = /^0 (\d+)px (\d+)px rgba\((\d+), (\d+), (\d+), (0\.\d+)\)$/;
	const float = SHAPE.exec(utilities["shadow-float"]);
	const sheet = SHAPE.exec(utilities["shadow-sheet"]);
	assert(float && sheet, `a shadow is off shape: ${JSON.stringify(utilities)}`);
	requireEqual(`${float[1]} ${float[2]} ${float[6]}`, "7 18 0.13", "float");
	requireEqual(`${sheet[1]} ${sheet[2]} ${sheet[6]}`, "12 28 0.16", "sheet");
	// The reference hand-picked rgba(14, 26, 46) for the same ink; the
	// conversion lands within a step of it.
	for (const [index, expected] of [
		[3, 14],
		[4, 26],
		[5, 46],
	] as const) {
		const channel = Number(float[index]);
		assert(
			Math.abs(channel - expected) <= 1,
			`float channel ${index}: ${channel} is not within 1 of ${expected}`,
		);
		requireEqual(sheet[index], float[index], "sheet shares the float color");
	}
	const rehued = shadowUtilities(deriveTheme({ neutralHue: 30 }));
	assert(
		rehued["shadow-float"] !== utilities["shadow-float"],
		"neutralHue does not move the shadow color",
	);
	return `${utilities["shadow-float"]} / ${utilities["shadow-sheet"]}`;
});

check("c08", "themeTokens and modeTokens carry the right keys", () => {
	const expected = new Set<string>(ZEROED_NAMESPACES);
	for (const namespace of expected) {
		requireEqual(baseTheme[namespace], "initial", namespace);
	}
	for (const rung of SPACING_RUNGS) expected.add(`--spacing-${rung}`);
	for (const rung of RADIUS_RUNGS) expected.add(`--radius-${rung}`);
	for (const role of TYPE_ROLES) {
		expected.add(`--text-${role}`);
		expected.add(`--text-${role}--line-height`);
		expected.add(`--leading-${role}`);
	}
	for (const role of TRACKED_ROLES) {
		expected.add(`--text-${role}--letter-spacing`);
		expected.add(`--tracking-${role}`);
	}
	for (const width of WIDTHS) expected.add(`--container-${width}`);
	for (const bp of BREAKPOINTS) expected.add(`--breakpoint-${bp}`);
	expected.add("--font-sans");
	expected.add("--font-mono");
	for (const token of INVARIANT_COLORS) expected.add(`--color-${token}`);
	for (const token of PER_MODE_COLORS) expected.add(`--color-${token}`);
	const actual = new Set(Object.keys(baseTheme));
	for (const key of expected) {
		assert(actual.has(key), `themeTokens is missing ${key}`);
	}
	for (const key of actual) {
		assert(expected.has(key), `themeTokens carries an unexpected key: ${key}`);
	}
	for (const token of PER_MODE_COLORS) {
		requireEqual(
			emitted(`--color-${token}`),
			baseLight[token],
			`default mode seeds --color-${token}`,
		);
	}
	for (const [key, value] of Object.entries(baseTheme)) {
		assert(key.startsWith("--"), `themeTokens key is not a --name: ${key}`);
		assert(
			!ESCAPES_A_DECLARATION.test(value),
			`${key} value can escape its declaration: ${value}`,
		);
	}

	requireEqual(Object.keys(baseLight).length, 25, "modeTokens entry count");
	for (const token of PER_MODE_COLORS) {
		assert(baseLight[token] !== undefined, `modeTokens is missing ${token}`);
	}
	for (const token of INVARIANT_COLORS) {
		assert(
			baseLight[token] === undefined,
			`modeTokens leaked the invariant token ${token}`,
		);
	}
	for (const [key, value] of Object.entries(baseLight)) {
		assert(!key.startsWith("--"), `modeTokens key is not bare: ${key}`);
		assert(
			!ESCAPES_A_DECLARATION.test(value),
			`${key} value can escape its declaration: ${value}`,
		);
	}
	return `${actual.size} theme entries, 25 mode entries`;
});

check("c09", "every modeTokens key passes the cli's isCssIdent", () => {
	for (const mode of MODES) {
		for (const key of Object.keys(modeTokens(base, mode))) {
			assert(isCssIdent(key), `not a CSS ident: ${key}`);
		}
	}
	assert(
		!isCssIdent("--color-canvas"),
		"isCssIdent check is not discriminating",
	);
	return "50 keys pass @fcalell/cli/css";
});

check("c10", "zero chroma drops the hue, non-zero keeps it", () => {
	requireEqual(baseLight.surface, "oklch(1 0 0)", "light surface");
	requireEqual(base.invariantColors.thumb, "oklch(1 0 0)", "thumb");
	requireEqual(baseDark.surface, "oklch(0.285 0.044 261)", "dark surface");
	const rehued = deriveTheme({ neutralHue: 30 });
	requireEqual(
		modeTokens(rehued, "light").surface,
		"oklch(1 0 0)",
		"light surface at neutralHue 30",
	);
	requireEqual(
		modeTokens(rehued, "dark").surface,
		"oklch(0.285 0.044 30)",
		"dark surface at neutralHue 30",
	);
	return "light surface and thumb hue 0, dark surface tracks neutralHue";
});

check("c11", "accentHue and primary move only their roles", () => {
	const moved = deriveTheme({ accentHue: 200 });
	const changed: string[] = [];
	for (const mode of MODES) {
		const before = modeTokens(base, mode);
		const after = modeTokens(moved, mode);
		for (const token of PER_MODE_COLORS) {
			if (before[token] !== after[token]) changed.push(`${mode}:${token}`);
		}
	}
	for (const token of INVARIANT_COLORS) {
		if (base.invariantColors[token] !== moved.invariantColors[token]) {
			changed.push(`shared:${token}`);
		}
	}
	for (const [key, value] of Object.entries(themeTokens(moved))) {
		if (key.startsWith("--color-")) continue;
		if (baseTheme[key] !== value) changed.push(`scale:${key}`);
	}
	const expected = MODES.flatMap((mode) => [
		`${mode}:tint`,
		...AVATAR_STEPS.map((step) => `${mode}:avatar-${step}`),
	]);
	requireEqual(
		changed.sort().join(","),
		expected.sort().join(","),
		"tokens changed by accentHue under primary ink",
	);
	requireEqual(
		modeTokens(moved, "light")["avatar-3"],
		"oklch(0.88 0.06 290)",
		"avatar-3 steps 90° off accentHue 200",
	);
	// Under either primary, `accent` is its source and `on-accent` is canvas.
	for (const theme of [
		{},
		{ accentHue: 200 },
		{ neutralChroma: 0 },
		{ neutralHue: 12 },
		{ primary: "accent" as const, accentHue: 300 },
	]) {
		const resolved = deriveTheme(theme);
		const source = theme.primary === "accent" ? "tint" : "ink";
		for (const mode of MODES) {
			const tokens = modeTokens(resolved, mode);
			requireEqual(
				tokens.accent,
				tokens[source],
				`accent aliases ${source} (${mode}, ${JSON.stringify(theme)})`,
			);
			requireEqual(
				tokens["on-accent"],
				tokens.canvas,
				`on-accent aliases canvas (${mode}, ${JSON.stringify(theme)})`,
			);
		}
	}
	const accented = deriveTheme({ primary: "accent" });
	requireEqual(
		modeTokens(accented, "light")["accent-soft"],
		"oklch(0.915 0.045 261)",
		"accent-soft under primary accent",
	);
	assert(
		modeTokens(deriveTheme({ primary: "accent", accentHue: 90 }), "dark")[
			"accent-soft"
		] !== modeTokens(accented, "dark")["accent-soft"],
		"accent-soft does not follow accentHue under primary accent",
	);
	return "tint and the 8 avatar steps move, accent and on-accent alias under both primaries";
});

check("c12", "neutralChroma 0 zeroes only the neutral-bound tokens", () => {
	const flat = deriveTheme({ neutralChroma: 0 });
	const neutralBound = keysOf(COLORS).filter((token) => {
		const declaration = COLORS[token];
		return "alias" in declaration
			? false
			: isNeutralBound(declaration.light.hue);
	});
	requireEqual(neutralBound.length, 7, "neutral-bound per-mode token count");
	for (const mode of MODES) {
		const tokens = modeTokens(flat, mode);
		for (const token of [...neutralBound, "accent", "accent-soft"]) {
			requireEqual(chromaOf(tokens[token]), "0", `${mode}.${token}`);
		}
	}
	requireEqual(chromaOf(flat.invariantColors.scrim), "0", "scrim");
	for (const mode of MODES) {
		const before = modeTokens(base, mode);
		const after = modeTokens(flat, mode);
		for (const token of [
			"tint",
			"ok",
			"ok-soft",
			"warn",
			"warn-soft",
			"danger",
			"danger-soft",
			"avatar-1",
		]) {
			requireEqual(after[token], before[token], `${mode}.${token} untouched`);
		}
	}
	return `${neutralBound.length} + 2 primary-bound per-mode tokens and scrim flattened`;
});

check("c13", "the schema rejects each bad input by key", () => {
	const rejections: Array<[string, unknown, string]> = [
		[
			"unknown token",
			{ overrides: { colors: { light: { nope: "oklch(1 0 0)" } } } },
			"nope",
		],
		["knob out of range", { accentHue: 400 }, "accentHue"],
		["a retired knob", { brandHue: 20 }, "brandHue"],
		["a fractional base", { space: 4.5 }, "space"],
		["an unknown width", { widths: { modal: 400 } }, "modal"],
		["an unknown primary", { primary: "brand" }, "primary"],
		[
			"value with ; and }",
			{ overrides: { colors: { light: { canvas: "oklch(1 0 0);}" } } } },
			"canvas",
		],
		[
			"oklch(. . .)",
			{ overrides: { colors: { dark: { ink: "oklch(. . .)" } } } },
			"ink",
		],
		[
			"per-mode token under shared",
			{ overrides: { colors: { shared: { canvas: "oklch(1 0 0)" } } } },
			"canvas",
		],
		[
			"a retired scale key",
			{ overrides: { scales: { "--radius-md": "10px" } } },
			"--radius-md",
		],
		[
			"scales value with a newline",
			{ overrides: { scales: { "--spacing-room": "40px\nx" } } },
			"--spacing-room",
		],
		[
			"a modifier key, which is not its own override",
			{ overrides: { scales: { "--text-title--line-height": "1.4" } } },
			"--text-title--line-height",
		],
		// The pair is the silent case: each half is well-formed CSS on its own,
		// and together they swallow every declaration between them.
		[
			"a pair of scales values that open and close one paren",
			{
				overrides: {
					scales: { "--radius-group": "calc(1px", "--radius-sheet": "2px)" },
				},
			},
			"--radius-group",
		],
	];
	for (const [label, input, key] of rejections) {
		const message = rejection(input);
		assert(message !== "", `${label}: accepted, expected a rejection`);
		assert(
			message.includes(key),
			`${label}: error does not name "${key}": ${message}`,
		);
	}

	const shared = deriveTheme({
		overrides: { colors: { shared: { scrim: "oklch(0 0 0 / 0.5)" } } },
	});
	requireEqual(
		themeTokens(shared)["--color-scrim"],
		"oklch(0 0 0 / 0.5)",
		"colors.shared override",
	);
	const dark = deriveTheme({
		overrides: { colors: { dark: { canvas: "oklch(0.1 0.02 300)" } } },
	});
	requireEqual(
		modeTokens(dark, "dark").canvas,
		"oklch(0.1 0.02 300)",
		"colors.dark override",
	);
	requireEqual(
		modeTokens(dark, "light").canvas,
		baseLight.canvas,
		"colors.dark override leaves light alone",
	);
	const scaled = deriveTheme({
		overrides: { scales: { "--spacing-room": "40px" } },
	});
	requireEqual(
		themeTokens(scaled)["--spacing-room"],
		"40px",
		"scales override",
	);
	return `${rejections.length} rejections named their key, 3 valid overrides landed`;
});

check("c14", "the Tailwind fixture builds on contract only", () => {
	const out = buildFixture();
	const title = rule(out, "text-title");
	assert(title, "text-title emitted no rule");
	assert(title.includes("font-size"), "text-title carries no font-size");
	assert(title.includes("line-height"), "text-title carries no line-height");
	for (const selector of [
		"leading-title",
		"tracking-title",
		"bg-canvas",
		"bg-accent",
		"bg-avatar-8",
		"gap-stack",
		"p-inset",
		"rounded-group",
		"rounded-sheet",
		"w-rail",
		"max-w-reading",
		"font-mono",
	]) {
		assert(rule(out, selector), `${selector} emitted no rule`);
	}
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
	const shadow = rule(out, "shadow-float");
	assert(shadow, "shadow-float emitted no rule");
	requireEqual(
		normalize(shadow.match(/box-shadow\s*:\s*([^;]+);/)?.[1] ?? ""),
		shadowUtilities(base)["shadow-float"],
		"shadow-float box-shadow",
	);
	return `${out.length} bytes of CSS, off-contract utilities empty, tablet: is 768`;
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
	]) {
		assert(!readme.includes(word), `README contains "${word}"`);
	}
	for (const heading of [
		"## The knobs",
		"## Words",
		"## Color roles",
		"## Type roles",
		"## Rungs, radii, elevation",
		"## Contrast contracts",
		"## What the reset does not catch",
	]) {
		assert(readme.includes(heading), `README has no "${heading}" section`);
	}
	for (const token of [...PER_MODE_COLORS, ...INVARIANT_COLORS]) {
		const name = token.startsWith("avatar-") ? "avatar-1" : token;
		assert(readme.includes(`\`${name}\``), `README never names ${token}`);
	}
	return "7 sections, every color role named, no brand words";
});

check("c16", "one scales override moves both emitted type shapes", () => {
	const retyped = themeTokens(
		deriveTheme({
			overrides: {
				scales: { "--leading-title": "40px", "--tracking-title": "0.5em" },
			},
		}),
	);
	requireEqual(retyped["--leading-title"], "40px", "--leading-title");
	requireEqual(
		retyped["--text-title--line-height"],
		"40px",
		"--text-title--line-height",
	);
	requireEqual(retyped["--tracking-title"], "0.5em", "--tracking-title");
	requireEqual(
		retyped["--text-title--letter-spacing"],
		"0.5em",
		"--text-title--letter-spacing",
	);
	for (const role of TYPE_ROLES) {
		if (role === "title") continue;
		requireEqual(
			retyped[`--leading-${role}`],
			emitted(`--leading-${role}`),
			`--leading-${role} untouched`,
		);
	}
	return "one override key drives the modifier and the namespace";
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
for (const [rung, next] of pairs(RADIUS_RUNGS)) {
	MERGE_CASES.push([[`rounded-${rung}`, `rounded-${next}`], `rounded-${next}`]);
	MERGE_CASES.push([
		[`rounded-t-${rung}`, `rounded-t-${next}`],
		`rounded-t-${next}`,
	]);
}
for (const [rung, next] of pairs(SPACING_RUNGS)) {
	MERGE_CASES.push([[`p-${rung}`, `p-${next}`], `p-${next}`]);
	MERGE_CASES.push([[`gap-${rung}`, `gap-${next}`], `gap-${next}`]);
}
for (const [width, next] of pairs(WIDTHS)) {
	MERGE_CASES.push([[`w-${width}`, `w-${next}`], `w-${next}`]);
	MERGE_CASES.push([[`max-w-${width}`, `max-w-${next}`], `max-w-${next}`]);
}
// The numeric `--spacing` base stays live, so a rung and a numeric are one group.
MERGE_CASES.push([["p-inset", "p-4"], "p-4"]);
MERGE_CASES.push([["w-rail", "w-full"], "w-full"]);
// A later type role clears the earlier role's leading and its tracking, or a
// stale `tracking-title` rides body text.
MERGE_CASES.push([["leading-title", "text-body"], "text-body"]);
MERGE_CASES.push([["tracking-title", "text-body"], "text-body"]);
MERGE_CASES.push([["text-body", "leading-title"], "text-body leading-title"]);
MERGE_CASES.push([
	["text-title", "tracking-title"],
	"text-title tracking-title",
]);
// Four of the seven roles carry no tracking, so `tracking-body` names nothing
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
		RADIUS_RUNGS.length +
		SPACING_RUNGS.length +
		WIDTHS.length;
	return `${MERGE_CASES.length} cases over ${members} token-list members`;
});

// Contract-specific scale members, which bare tailwind-merge cannot know: each
// one proves the config does work rather than riding an upstream default.
const UNEXTENDED_MISSES: Array<[string[], string]> = [
	[["text-title", "text-ink-meta"], "text-title text-ink-meta"],
	[["leading-title", "leading-body"], "leading-body"],
	[["tracking-title", "tracking-heading"], "tracking-heading"],
	[["rounded-t-sheet", "rounded-t-group"], "rounded-t-group"],
	[["p-inset", "p-room"], "p-room"],
	[["gap-row", "gap-stack"], "gap-stack"],
	[["w-rail", "w-list"], "w-list"],
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
	// The text cells are literals for Tailwind's scanner; each is pinned to
	// TYPE_SCALE so the table and the tokens cannot disagree.
	const weights = {
		regular: "font-normal",
		medium: "font-medium",
		semibold: "font-semibold",
		bold: "font-bold",
	};
	for (const role of TYPE_ROLES) {
		const spec = TYPE_SCALE[role];
		const tracking = isTracked(role) ? ` tracking-${role}` : "";
		const family = spec.family === "mono" ? " font-mono" : "";
		requireEqual(
			TEXT.variants.role[role],
			`text-${role} leading-${role}${tracking} ${weights[spec.weight]} text-${spec.ink}${family}`,
			`TEXT.role.${role}`,
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
	assert(rule(out, "px-5"), "px-5 emitted no rule");
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
	const rungs = new Set<string>(SPACING_RUNGS);
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
			assert(
				rungs.has(name.slice("gap-".length)),
				`${name} is not a spacing rung`,
			);
		}
	}
	return `${enumerated().size} classes: no display, alignment, state or arbitrary value`;
});

check("c22", "the content tones are contract colors", () => {
	const colors = new Set<string>([...PER_MODE_COLORS, ...INVARIANT_COLORS]);
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
	requireEqual(buttonContentTone("primary"), "on-accent", "primary ink");
	requireEqual(statusContentTone("active"), "tint", "active ink");
	requireEqual(avatarStep("Frankie"), avatarStep("Frankie"), "stable step");
	assert(/^[1-8]$/.test(avatarStep("x")), "avatarStep is off the ladder");
	return `${checked} token names, every one a contract color`;
});

check("c23", "descriptors.ts is types only, generic in TIcon", () => {
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
		assert(statement.startsWith("import type "), `value import: ${statement}`);
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
		assert(
			/^<TIcon = never>$/.test(params),
			`type parameters must be exactly <TIcon = never>, got ${params}`,
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
	]) {
		assert(
			new RegExp(`^export (?:interface|type) ${name}\\b`, "m").test(source),
			`${name} is not exported`,
		);
	}
	const generic = headers.filter((header) => header[1]).length;
	return `${headers.length} declarations, ${generic} generic in TIcon, no emitted JavaScript`;
});

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
		"control minimum",
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

check("c27", "every rhythm cell is exactly gap-<unit>", () => {
	const units = Object.keys(RHYTHM.variants.unit) as Array<
		keyof (typeof RHYTHM)["variants"]["unit"]
	>;
	requireEqual(units.join(" "), SPACING_RUNGS.join(" "), "rhythm units");
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
		requireEqual(entries.length, 48, "component count");
		const names = new Set<string>();
		for (const [, name, props] of entries) {
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

// The settled vocabulary, spelled out as a second opinion. The gap cells are
// deliberately absent: they are the spacing rungs, asserted against
// SPACING_RUNGS below so the derivation is what the check pins.
const GEOMETRY_EXACTS = [
	"flex",
	"flex-1",
	"flex-row",
	"flex-col",
	"flex-wrap",
	"grow",
	"shrink-0",
	"absolute",
	"relative",
	"inset-0",
	"inset-x-0",
	"inset-y-0",
	"top-0",
	"bottom-0",
	"left-0",
	"right-0",
	"w-full",
	"min-w-0",
	"min-h-0",
	"min-h-full",
	"min-h-screen",
	"max-w-full",
	"max-w-none",
	"overflow-hidden",
];

const LOOK_PREFIXES = [
	"bg-",
	"text-",
	"border-",
	"p-",
	"px-",
	"py-",
	"rounded-",
	"shadow-",
	"font-",
];

check(
	"c29",
	"the gate vocabulary is the settled list, gap cells derived",
	() => {
		const gaps = GEOMETRY.exact.filter((token) => token.startsWith("gap-"));
		const rest = GEOMETRY.exact.filter((token) => !token.startsWith("gap-"));
		requireEqual(rest.join(" "), GEOMETRY_EXACTS.join(" "), "exact members");
		requireEqual(
			gaps.join(" "),
			SPACING_RUNGS.map((rung) => `gap-${rung}`).join(" "),
			"gap cells",
		);
		requireEqual(
			GEOMETRY.prefixes.join(" "),
			"items- justify- self- z-",
			"prefixes",
		);
		for (const entry of [...GEOMETRY.exact, ...GEOMETRY.prefixes]) {
			const look = LOOK_PREFIXES.find((prefix) => entry.startsWith(prefix));
			assert(look === undefined, `${entry} carries the look prefix ${look}`);
		}
		const gateSource = readFileSync(resolve(pkgDir, "src/gate.ts"), "utf8");
		assert(!gateSource.includes('"gap-'), "gate.ts hand-lists a gap cell");
		for (const name of readdirSync(resolve(pkgDir, "src"))) {
			if (name === "gate.ts") continue;
			const source = readFileSync(resolve(pkgDir, "src", name), "utf8");
			assert(!source.includes("ts-morph"), `src/${name} imports ts-morph`);
			assert(
				!source.includes("#gate") && !source.includes("./gate"),
				`src/${name} imports the gate module`,
			);
		}
		return `${GEOMETRY.exact.length} exacts (${gaps.length} gap rungs derived), 4 prefixes, no look member, ts-morph confined to gate.ts`;
	},
);

// The fixture's every violation, pinned. `kind` rides the serialization so a
// host report can never pass as a membership one.
const WEB_EXPECTED = [
	"hosts.tsx:3 host Card",
	"hosts.tsx:4 host motion.div",
	"violations.tsx:1 class text-ink-3",
	"violations.tsx:3 class bg-canvas",
	"violations.tsx:4 class text-ink-2",
	"violations.tsx:4 class truncate",
	"violations.tsx:4 class p-card",
	"violations.tsx:4 class gap-4",
	"violations.tsx:5 class mx-auto",
	"violations.tsx:5 class font-bold",
	"violations.tsx:5 class sticky",
	"violations.tsx:5 class underline",
	"violations.tsx:6 class w-[104px]",
	"violations.tsx:6 class bg-(--x)",
	"violations.tsx:6 class hover:flex",
	"violations.tsx:7 class shadow-2",
	"violations.tsx:8 class rounded-lg",
	"violations.tsx:9 class text-sm",
	"violations.tsx:9 class hidden",
];

const NATIVE_EXPECTED = [
	"app.tsx:4 host Text",
	"app.tsx:5 class bg-surface",
	"app.tsx:6 host div",
];

check("c30", "the scanner reports exactly the fixture's violations", () => {
	const gateDir = resolve(fixtureDir, "gate");
	for (const file of [
		"web/pass.tsx",
		"web/violations.tsx",
		"web/hosts.tsx",
		"web/ui/hidden.tsx",
		"native/app.tsx",
	]) {
		assert(
			existsSync(resolve(gateDir, file)),
			`fixture ${file} is missing: is the gate tree tracked?`,
		);
	}
	const pass = readFileSync(resolve(gateDir, "web/pass.tsx"), "utf8");
	for (const marker of [
		"{look}",
		"props.class",
		"class={`h-",
		'merge("bg-canvas")',
		'ui.cn("bg-canvas")',
		"<Header",
	]) {
		assert(pass.includes(marker), `pass.tsx lost its ${marker} line`);
	}
	const hosts = readFileSync(resolve(gateDir, "web/hosts.tsx"), "utf8");
	assert(
		hosts.includes('<Card title="ok" />'),
		"hosts.tsx lost its class-free component line",
	);

	const serialize = (violations: ReturnType<typeof scanGeometry>) =>
		violations
			.map(({ file, line, kind, token }) => `${file}:${line} ${kind} ${token}`)
			.join("\n");
	requireEqual(
		serialize(scanGeometry(resolve(gateDir, "web"), "intrinsic")),
		WEB_EXPECTED.join("\n"),
		"web violations",
	);
	requireEqual(
		serialize(scanGeometry(resolve(gateDir, "native"), NATIVE_GEOMETRY_HOSTS)),
		NATIVE_EXPECTED.join("\n"),
		"native violations",
	);
	requireEqual(
		scanGeometry(resolve(gateDir, "missing"), "intrinsic").length,
		0,
		"violations under a missing root",
	);
	return `${WEB_EXPECTED.length} web + ${NATIVE_EXPECTED.length} native violations pinned, pass file clean, ui/ skipped, missing root empty`;
});

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

// WCAG 2 contrast between two emitted `oklch(L C H)` values.
function contrast(fg: string, bg: string): number {
	const luminance = (value: string) => {
		const parts = /^oklch\(([\d.]+) ([\d.]+)(?: ([\d.]+))?\)$/.exec(value);
		assert(parts, `not an opaque oklch value: ${value}`);
		const [r, g, b] = oklchToLinear(
			Number(parts[1]),
			Number(parts[2]),
			Number(parts[3] ?? 0),
		);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
	return ((a ?? 0) + 0.05) / ((b ?? 0) + 0.05);
}

check("c32", "the contrast contracts hold at the default knobs", () => {
	const pairs: Array<[string, string[]]> = [
		["ink", ["canvas", "surface", "group"]],
		["ink-meta", ["canvas", "surface", "group"]],
		["ok", ["surface", "group", "ok-soft"]],
		["warn", ["surface", "group", "warn-soft"]],
		["danger", ["surface", "group", "danger-soft"]],
		["tint", ["surface", "group"]],
		["on-accent", ["accent"]],
		["ink", AVATAR_STEPS.map((step) => `avatar-${step}`)],
	];
	const short: string[] = [];
	let count = 0;
	for (const primary of ["ink", "accent"] as const) {
		const theme = deriveTheme({ primary });
		for (const mode of MODES) {
			const values = modeTokens(theme, mode);
			for (const [fg, grounds] of pairs) {
				for (const bg of grounds) {
					const fgValue = values[fg];
					const bgValue = values[bg];
					assert(fgValue && bgValue, `no ${fg} or ${bg} in ${mode}`);
					const ratio = contrast(fgValue, bgValue);
					count++;
					if (ratio < 4.5)
						short.push(
							`${primary} ${mode} ${fg} on ${bg}: ${ratio.toFixed(2)}`,
						);
				}
			}
		}
	}
	assert(short.length === 0, `under 4.5:1: ${short.join(", ")}`);
	return `${count} pairs at 4.5:1 or more under both primaries in both modes`;
});

// ── Report ──────────────────────────────────────────────────────────

report();
