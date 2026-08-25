// Reproduction harness for the ui-core token contract and matrix layer.
//
//   pnpm --filter @fcalell/ui-core verify              # scripts/fixture/reference.css
//   pnpm --filter @fcalell/ui-core verify <global.css> # a live upstream stylesheet
//
// Every acceptance criterion of `.helm/board/epics/001-ui-core/` stories 01 and
// 02 is one check below, so a failing check id traces back to a criterion. The
// script derives with default knobs, diffs against the reference stylesheet,
// drives a Tailwind build over the emitted `@theme` record plus every class the
// matrices can emit, and exits non-zero on any mismatch.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCssIdent } from "@fcalell/cli/css";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ts from "typescript";
import { cn } from "#cn";
import { deriveTheme } from "#derive";
import { modeTokens, shadowUtilities, themeTokens } from "#emit";
import {
	assert,
	blockBody,
	check,
	declarationMap,
	normalize,
	report,
	rule,
	tailwindBuild,
} from "#harness";
import {
	COLORS,
	INVARIANT,
	INVARIANT_COLORS,
	isNeutralBound,
	MODES,
	type Mode,
	PER_MODE_COLORS,
	RADIUS_RUNGS,
	SHADOW_LEVELS,
	SPACING_RUNGS,
	TRACKED_ROLES,
	type TrackedRole,
	TYPE_ROLES,
	type TypeRole,
} from "#tokens";
import * as tables from "#variant-tables";
import {
	type Axes,
	BADGE,
	BADGE_DOT,
	BADGE_LABEL,
	BUTTON,
	BUTTON_LABEL,
	BUTTON_MUTED,
	CARD,
	FIELD,
	type Matrix,
	RHYTHM,
	TEXT,
	TEXT_STRONG,
} from "#variant-tables";
import {
	BUTTON_MUTED_LABEL,
	badge,
	badgeContentTone,
	badgeDot,
	badgeLabel,
	button,
	buttonContentTone,
	buttonLabel,
	buttonMuted,
	card,
	field,
	rhythm,
	text,
	textStrong,
} from "#variants";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");
const referencePath = resolve(
	process.argv[2] ?? resolve(fixtureDir, "reference.css"),
);

// A value may carry no statement or block terminator and no comment delimiter:
// each would let a token break out of the declaration it is rendered into.
const ESCAPES_A_DECLARATION = /[;{}]|\/\*|\*\//;

// ── Reference stylesheet parsing ────────────────────────────────────

// The reference system uses brand words for three tokens the contract renames.
const RENAMES: Record<string, string> = {
	marine: "interactive",
	"marine-soft": "interactive-soft",
	"oncover-navy": "oncover-shade",
};

const reference = readFileSync(referencePath, "utf8").replace(
	/\/\*[\s\S]*?\*\//g,
	"",
);
const themeBlock = declarationMap(blockBody(reference, "@theme"));
const referenceModes = new Map<Mode, Map<string, string>>();
for (const mode of MODES) {
	const tokens = new Map<string, string>();
	for (const [property, value] of declarationMap(
		blockBody(reference, `@variant ${mode}`),
	)) {
		if (!property.startsWith("--color-")) continue;
		const bare = property.slice("--color-".length);
		tokens.set(RENAMES[bare] ?? bare, value);
	}
	referenceModes.set(mode, tokens);
}
const referenceShadows = new Map<string, string>();
for (const level of SHADOW_LEVELS) {
	const body = blockBody(reference, `@utility shadow-${level}`);
	const value = body.match(/box-shadow\s*:\s*([^;}]+)[;}]?/)?.[1];
	assert(value, `no box-shadow in @utility shadow-${level}`);
	referenceShadows.set(`shadow-${level}`, normalize(value));
}

// Reads a key the reference stylesheet must carry, so a typo in a check fails
// loudly instead of comparing two undefineds.
function fromTheme(key: string): string {
	const value = themeBlock.get(key);
	assert(value !== undefined, `reference stylesheet has no ${key}`);
	return value;
}

function fromVariant(mode: Mode): Map<string, string> {
	const tokens = referenceModes.get(mode);
	assert(tokens, `reference stylesheet has no @variant ${mode}`);
	return tokens;
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
	["BUTTON", BUTTON, button],
	["BUTTON_LABEL", BUTTON_LABEL, buttonLabel],
	["BUTTON_MUTED", BUTTON_MUTED, buttonMuted],
	["TEXT", TEXT, text],
	["TEXT_STRONG", TEXT_STRONG, textStrong],
	["BADGE", BADGE, badge],
	["BADGE_LABEL", BADGE_LABEL, badgeLabel],
	["BADGE_DOT", BADGE_DOT, badgeDot],
	["CARD", CARD, card],
	["FIELD", FIELD, field],
	["RHYTHM", RHYTHM, rhythm],
];

// The class-bearing exports that are not matrices. Listed by value, so a rename
// cannot silently drop one.
const CLASS_CONSTANTS: ReadonlyArray<readonly [string, string]> = [
	["BUTTON_MUTED_LABEL", BUTTON_MUTED_LABEL],
];

// Each cva is keyed by its own literal axes; this walk is string-keyed, so the
// renderer widens once, here.
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

// Every cell string a matrix carries, which is what the two cell rules read.
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
		"./cn ./derive ./descriptors ./emit ./harness ./schema ./tokens ./variants",
		"export subpaths",
	);
	assert(pkg.peerDependencies?.zod, "zod is not a peerDependency");
	for (const name of ["tailwindcss", "@tailwindcss/cli"]) {
		assert(pkg.devDependencies?.[name], `${name} is not a devDependency`);
	}
	// Pure functions with no shared identity, so a duplicated copy is harmless
	// and a peer would force every consumer to restate them.
	for (const name of ["class-variance-authority", "clsx", "tailwind-merge"]) {
		assert(pkg.dependencies?.[name], `${name} is not a dependency`);
	}
	// What the criterion protects is that installing ui-core never pulls in the
	// CLI. This script imports the CLI's ident check, so devDependencies is
	// deliberately exempt.
	for (const field of ["dependencies", "peerDependencies"] as const) {
		assert(!pkg[field]?.["@fcalell/cli"], `@fcalell/cli appears in ${field}`);
	}
	return "8 subpaths, no root export, no runtime cli dependency";
});

check("c03", "tokens.ts declares the contract", () => {
	requireEqual(PER_MODE_COLORS.length, 26, "per-mode color count");
	requireEqual(INVARIANT_COLORS.length, 6, "mode-invariant color count");
	requireEqual(TYPE_ROLES.length, 8, "type role count");
	requireEqual(SPACING_RUNGS.length, 7, "spacing rung count");
	requireEqual(RADIUS_RUNGS.length, 5, "radius rung count");
	requireEqual(SHADOW_LEVELS.length, 3, "shadow level count");
	for (const token of PER_MODE_COLORS) {
		const declaration = COLORS[token];
		if ("alias" in declaration) {
			assert(
				PER_MODE_COLORS.includes(declaration.alias),
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
	for (const word of ["marine", "navy"]) {
		assert(!source.includes(word), `tokens.ts contains "${word}"`);
	}
	return "26 per-mode + 6 invariant colors, 8 roles, 7 rungs, 5 radii, 3 shadows";
});

check("c05", "default knobs reproduce both @variant blocks", () => {
	const diff: string[] = [];
	for (const mode of MODES) {
		const expected = fromVariant(mode);
		const actual = modeTokens(base, mode);
		requireEqual(expected.size, 26, `reference ${mode} token count`);
		for (const [token, value] of expected) {
			if (actual[token] === undefined) {
				diff.push(`${mode}.${token}: missing from ui-core`);
			} else if (actual[token] !== value) {
				diff.push(`${mode}.${token}: ${value} -> ${actual[token]}`);
			}
		}
		for (const token of Object.keys(actual)) {
			if (!expected.has(token)) diff.push(`${mode}.${token}: not in reference`);
		}
	}
	assert(diff.length === 0, `token diff is not empty: ${diff.join(", ")}`);
	return "52 per-mode values match, diff empty";
});

check("c06", "every non-color @theme value reproduces", () => {
	for (const rung of SPACING_RUNGS) {
		requireEqual(
			emitted(`--spacing-${rung}`),
			fromTheme(`--spacing-${rung}`),
			`--spacing-${rung}`,
		);
	}
	for (const rung of RADIUS_RUNGS) {
		requireEqual(
			emitted(`--radius-${rung}`),
			fromTheme(`--radius-${rung}`),
			`--radius-${rung}`,
		);
	}
	// Both emitted shapes are checked against the reference's own `--leading-*`
	// and `--tracking-*` values, so the Tailwind v4 modifiers have an external
	// oracle instead of being compared with themselves.
	for (const role of TYPE_ROLES) {
		requireEqual(
			emitted(`--text-${role}`),
			fromTheme(`--text-${role}`),
			`--text-${role}`,
		);
		const leading = fromTheme(`--leading-${role}`);
		requireEqual(emitted(`--leading-${role}`), leading, `--leading-${role}`);
		requireEqual(
			emitted(`--text-${role}--line-height`),
			leading,
			`--text-${role}--line-height`,
		);
	}
	for (const role of TRACKED_ROLES) {
		const tracking = fromTheme(`--tracking-${role}`);
		requireEqual(emitted(`--tracking-${role}`), tracking, `--tracking-${role}`);
		requireEqual(
			emitted(`--text-${role}--letter-spacing`),
			tracking,
			`--text-${role}--letter-spacing`,
		);
	}
	// The reference tracks five roles; the other three carry neither shape.
	for (const role of TYPE_ROLES) {
		if (isTracked(role)) continue;
		assert(
			themeBlock.get(`--tracking-${role}`) === undefined,
			`reference unexpectedly tracks ${role}`,
		);
		assert(
			baseTheme[`--tracking-${role}`] === undefined &&
				baseTheme[`--text-${role}--letter-spacing`] === undefined,
			`${role} emits tracking the reference does not define`,
		);
	}

	for (const token of INVARIANT_COLORS) {
		const referenceName =
			Object.entries(RENAMES).find(([, to]) => to === token)?.[0] ?? token;
		requireEqual(
			emitted(`--color-${token}`),
			fromTheme(`--color-${referenceName}`),
			`--color-${token}`,
		);
	}
	requireEqual(
		emitted("--color-scrim"),
		"oklch(0.22 0.043 261 / 0.8)",
		"--color-scrim",
	);
	requireEqual(
		emitted("--color-oncover-glass"),
		"oklch(1 0 0 / 0.149)",
		"--color-oncover-glass",
	);
	requireEqual(
		emitted("--color-oncover-shade"),
		"oklch(0.2 0.036 261 / 0.549)",
		"--color-oncover-shade",
	);
	return "7 rungs, 5 radii, 8 sizes, 8 leadings and 5 trackings in both shapes, 6 invariant colors";
});

check("c07", "shadowUtilities matches the reference @utility rules", () => {
	const utilities = shadowUtilities(base);
	requireEqual(
		Object.keys(utilities).join(","),
		"shadow-1,shadow-2,shadow-3",
		"shadow keys",
	);
	for (const [name, value] of referenceShadows) {
		requireEqual(utilities[name as "shadow-1"], value, name);
	}
	requireEqual(
		utilities["shadow-1"].split("), ").length,
		2,
		"shadow-1 is not two stacked shadows",
	);
	return utilities["shadow-1"];
});

check("c08", "themeTokens and modeTokens carry the right keys", () => {
	const expected = new Set<string>([
		"--color-*",
		"--radius-*",
		"--text-*",
		"--shadow-*",
	]);
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

	requireEqual(Object.keys(baseLight).length, 26, "modeTokens entry count");
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
	return `${actual.size} theme entries, 26 mode entries`;
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
	return "52 keys pass @fcalell/cli/css";
});

check("c10", "zero chroma drops the hue, non-zero keeps it", () => {
	requireEqual(baseLight.surface, "oklch(1 0 0)", "light surface");
	requireEqual(baseLight.thumb, "oklch(1 0 0)", "light thumb");
	requireEqual(baseDark.surface, "oklch(0.285 0.044 261)", "dark surface");
	const rehued = deriveTheme({ knobs: { neutralHue: 30 } });
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
	return "light surface/thumb hue 0, dark surface tracks neutralHue";
});

check("c11", "brandHue moves only the brand family", () => {
	const moved = deriveTheme({ knobs: { brandHue: 200 } });
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
	requireEqual(
		changed.sort().join(","),
		"dark:brand,dark:brand-deep,dark:brand-soft,light:brand,light:brand-deep,light:brand-soft",
		"tokens changed by brandHue",
	);
	requireEqual(
		modeTokens(moved, "dark").brand,
		"oklch(0.72 0.075 214)",
		"dark brand keeps its +14 offset",
	);
	for (const knobs of [
		{},
		{ brandHue: 200 },
		{ neutralChroma: 0 },
		{ neutralHue: 12 },
		{ interactiveHue: 300, neutralChroma: 1.8 },
	]) {
		const resolved = deriveTheme({ knobs });
		for (const mode of MODES) {
			const tokens = modeTokens(resolved, mode);
			requireEqual(
				tokens.accent,
				tokens["ink-1"],
				`accent aliases ink-1 (${mode}, ${JSON.stringify(knobs)})`,
			);
			requireEqual(
				tokens["accent-ink"],
				tokens.canvas,
				`accent-ink aliases canvas (${mode}, ${JSON.stringify(knobs)})`,
			);
		}
	}
	return "6 brand values move, everything else byte-identical";
});

check("c12", "neutralChroma 0 zeroes only the neutral-bound tokens", () => {
	const flat = deriveTheme({ knobs: { neutralChroma: 0 } });
	const neutralBound = PER_MODE_COLORS.filter((token) => {
		const declaration = COLORS[token];
		return "alias" in declaration
			? false
			: isNeutralBound(declaration.light.hue);
	});
	requireEqual(neutralBound.length, 12, "neutral-bound per-mode token count");
	for (const mode of MODES) {
		const tokens = modeTokens(flat, mode);
		for (const token of neutralBound) {
			requireEqual(chromaOf(tokens[token]), "0", `${mode}.${token}`);
		}
		// Named explicitly, because it reads as belonging to another family.
		requireEqual(chromaOf(tokens["danger-ink"]), "0", `${mode}.danger-ink`);
	}
	for (const token of ["scrim", "oncover-ink", "oncover-shade"] as const) {
		requireEqual(chromaOf(flat.invariantColors[token]), "0", token);
	}
	for (const mode of MODES) {
		const before = modeTokens(base, mode);
		const after = modeTokens(flat, mode);
		for (const token of [
			"ok",
			"ok-soft",
			"warn",
			"warn-soft",
			"warn-mark",
			"danger",
			"danger-soft",
		]) {
			requireEqual(after[token], before[token], `${mode}.${token} untouched`);
		}
	}
	return `${neutralBound.length} per-mode + 3 invariant tokens flattened`;
});

check("c13", "the schema rejects each bad override by key", () => {
	const rejections: Array<[string, unknown, string]> = [
		[
			"unknown token",
			{ overrides: { colors: { light: { nope: "oklch(1 0 0)" } } } },
			"nope",
		],
		["knob out of range", { knobs: { brandHue: 400 } }, "brandHue"],
		[
			"value with ; and }",
			{ overrides: { colors: { light: { canvas: "oklch(1 0 0);}" } } } },
			"canvas",
		],
		[
			"oklch(. . .)",
			{ overrides: { colors: { dark: { "ink-1": "oklch(. . .)" } } } },
			"ink-1",
		],
		[
			"per-mode token under shared",
			{ overrides: { colors: { shared: { canvas: "oklch(1 0 0)" } } } },
			"canvas",
		],
		[
			"scales value with a newline",
			{ overrides: { scales: { "--spacing-room": "40px\nx" } } },
			"--spacing-room",
		],
		[
			"scales value opening a comment",
			{ overrides: { scales: { "--spacing-room": "16px /*" } } },
			"--spacing-room",
		],
		[
			"scales value closing a comment",
			{ overrides: { scales: { "--radius-md": "10px */" } } },
			"--radius-md",
		],
		[
			"a modifier key, which is not its own override",
			{ overrides: { scales: { "--text-h1--line-height": "1.4" } } },
			"--text-h1--line-height",
		],
		// The pair is the silent case: each half is well-formed CSS on its own,
		// and together they swallow every declaration between them.
		[
			"a pair of scales values that open and close one paren",
			{
				overrides: {
					scales: { "--radius-md": "calc(1px", "--radius-sheet": "2px)" },
				},
			},
			"--radius-md",
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
		overrides: {
			colors: { shared: { "oncover-glass": "oklch(1 0 0 / 0.5)" } },
		},
	});
	requireEqual(
		themeTokens(shared)["--color-oncover-glass"],
		"oklch(1 0 0 / 0.5)",
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
	const textH1 = rule(out, "text-h1");
	assert(textH1, "text-h1 emitted no rule");
	assert(textH1.includes("font-size"), "text-h1 carries no font-size");
	assert(textH1.includes("line-height"), "text-h1 carries no line-height");
	for (const selector of [
		"leading-h1",
		"tracking-h1",
		"bg-canvas",
		"bg-accent",
		"gap-stack",
		"rounded-control",
	]) {
		assert(rule(out, selector), `${selector} emitted no rule`);
	}
	for (const selector of ["bg-red-500", "text-sm"]) {
		assert(rule(out, selector) === undefined, `${selector} emitted a rule`);
	}
	const shadow = rule(out, "shadow-1");
	assert(shadow, "shadow-1 emitted no rule");
	requireEqual(
		normalize(shadow.match(/box-shadow\s*:\s*([^;]+);/)?.[1] ?? ""),
		shadowUtilities(base)["shadow-1"],
		"shadow-1 box-shadow",
	);
	return `${out.length} bytes of CSS, off-contract utilities empty`;
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
		"sea",
		"SpecCard",
		"FilterChip",
		"Sheet",
	]) {
		assert(!readme.includes(word), `README contains "${word}"`);
	}
	for (const heading of [
		"## Surfaces",
		"## Color roles",
		"### Tone to meaning",
		"## Spacing rungs",
		"## Type roles",
		"## Contrast contracts",
		"## What the reset does not catch",
	]) {
		assert(readme.includes(heading), `README has no "${heading}" section`);
	}
	for (const token of [...PER_MODE_COLORS, ...INVARIANT_COLORS]) {
		assert(readme.includes(`\`${token}\``), `README never names ${token}`);
	}
	assert(
		readme.includes("--leading-") && readme.includes("--tracking-"),
		"README does not name the namespaces the reset misses",
	);
	return "7 sections, 32 tokens named, no brand words";
});

check("c16", "one scales override moves both emitted type shapes", () => {
	const retyped = themeTokens(
		deriveTheme({
			overrides: {
				scales: { "--leading-h1": "1.6", "--tracking-h1": "0.5em" },
			},
		}),
	);
	requireEqual(retyped["--leading-h1"], "1.6", "--leading-h1");
	requireEqual(
		retyped["--text-h1--line-height"],
		"1.6",
		"--text-h1--line-height",
	);
	requireEqual(retyped["--tracking-h1"], "0.5em", "--tracking-h1");
	requireEqual(
		retyped["--text-h1--letter-spacing"],
		"0.5em",
		"--text-h1--letter-spacing",
	);
	for (const role of TYPE_ROLES) {
		if (role === "h1") continue;
		requireEqual(
			retyped[`--leading-${role}`],
			emitted(`--leading-${role}`),
			`--leading-${role} untouched`,
		);
		requireEqual(
			retyped[`--text-${role}--line-height`],
			emitted(`--text-${role}--line-height`),
			`--text-${role}--line-height untouched`,
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
	MERGE_CASES.push([[`text-${role}`, "text-ink-2"], `text-${role} text-ink-2`]);
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
// The numeric `--spacing` base stays live, so a rung and a numeric are one group.
MERGE_CASES.push([["p-card", "p-4"], "p-4"]);
// A later type role clears the earlier role's leading and its tracking, or a
// stale `tracking-h1` rides body text.
MERGE_CASES.push([["leading-h1", "text-body"], "text-body"]);
MERGE_CASES.push([["tracking-h1", "text-body"], "text-body"]);
MERGE_CASES.push([["text-body", "leading-h1"], "text-body leading-h1"]);
MERGE_CASES.push([["text-h1", "tracking-h1"], "text-h1 tracking-h1"]);
MERGE_CASES.push([["text-body", "tracking-micro"], "text-body tracking-micro"]);
// Three of the eight roles carry no tracking, so `tracking-body` names nothing
// and must not join the group: registering all eight would collapse this pair.
MERGE_CASES.push([
	["tracking-body", "tracking-h1"],
	"tracking-body tracking-h1",
]);

check("c17", "cn dedupes inside each registered scale, never across", () => {
	for (const [inputs, expected] of MERGE_CASES) {
		requireEqual(cn(inputs), expected, inputs.join(" "));
	}
	const members =
		TYPE_ROLES.length +
		TRACKED_ROLES.length +
		RADIUS_RUNGS.length +
		SPACING_RUNGS.length;
	return `${MERGE_CASES.length} cases over ${members} token-list members`;
});

// Contract-specific scale members, which bare tailwind-merge cannot know: each
// one proves the config does work rather than riding an upstream default.
const UNEXTENDED_MISSES: Array<[string[], string]> = [
	// Unextended, a type role reads as a color and eats the real one.
	[["text-h1", "text-ink-2"], "text-h1 text-ink-2"],
	[["leading-h1", "leading-body"], "leading-body"],
	[["tracking-h1", "tracking-micro"], "tracking-micro"],
	[["rounded-t-sheet", "rounded-t-control"], "rounded-t-control"],
	[["p-card", "p-room"], "p-room"],
	[["gap-row", "gap-stack"], "gap-stack"],
	[["tracking-h1", "text-body"], "text-body"],
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
	// The registry must be total: every table `#variant-tables` exports appears
	// here, and nothing here is missing from that module.
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

	// A cva cannot be inspected, so each one is compared with the string its own
	// table derives, over every combination of its own axes.
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
	requireEqual(
		MATRICES.filter(([, config]) => (config.compoundVariants ?? []).length > 0)
			.map(
				([name, config]) => `${name}:${(config.compoundVariants ?? []).length}`,
			)
			.join(" "),
		"BUTTON:6 BUTTON_LABEL:6",
		"compound row counts",
	);
	return `${combos} combinations over ${MATRICES.length} tables, each equal to its config`;
});

check("c20", "every class every matrix can emit resolves", () => {
	const out = buildFixture();
	// The escaping oracle: a class that compiles and carries a `.` must be
	// found, or every dotted cell reports a false miss.
	assert(rule(out, "px-3.5"), "px-3.5 emitted no rule");
	const missing = [...enumerated()].filter((name) => !rule(out, name));
	assert(missing.length === 0, `emitted no rule: ${missing.join(", ")}`);
	return `${enumerated().size} classes from ${MATRICES.length} tables, every one on contract`;
});

const BANNED_CLASSES = ["flex", "inline-flex", "flex-row", "font-sans"];
const BANNED_PREFIXES = ["items-", "justify-"];

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
	return `${enumerated().size} classes: no display, alignment, family, state or arbitrary value`;
});

check("c22", "the content tones are contract colors", () => {
	const colors = new Set<string>([...PER_MODE_COLORS, ...INVARIANT_COLORS]);
	let checked = 0;
	for (const emphasis of keysOf(BUTTON.variants.emphasis)) {
		for (const tone of keysOf(BUTTON.variants.tone)) {
			const token = buttonContentTone(emphasis, tone);
			assert(
				colors.has(token),
				`buttonContentTone(${emphasis}, ${tone}) is not a contract color: ${token}`,
			);
			checked++;
		}
	}
	for (const tone of keysOf(BADGE.variants.tone)) {
		const token = badgeContentTone(tone);
		assert(
			colors.has(token),
			`badgeContentTone(${tone}) is not a contract color: ${token}`,
		);
		checked++;
	}
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
	// `never` is what makes the parameter mandatory at the call site: any other
	// default lets a plugin skip it and a `string` icon slip back in.
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
		"Action",
		"BadgeSpec",
		"FooterSpec",
		"FooterAction",
		"FooterDestructive",
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
	]) {
		assert(readme.includes(heading), `README has no "${heading}" section`);
	}
	// Each law is asserted by its subject, not by its wording, so the prose can
	// be rewritten without the harness objecting.
	const subjects: Array<[string, string[]]> = [
		["one name per concept", ["`label`", "`loading`", "`onChange`", "`icon`"]],
		["a composed region is data", ["`ReactNode`", "registry"]],
		["primitives compose primitives", ["primitives compose primitives"]],
		["a prop that gates other props", ["sibling component"]],
		["no class hatch", ["`class`", "`className`", "`style`"]],
	];
	const prose = readme.toLowerCase();
	for (const [law, terms] of subjects) {
		for (const term of terms) {
			assert(
				prose.includes(term.toLowerCase()),
				`the canon's "${law}" law never names ${term}`,
			);
		}
	}
	// Decision 2's two additions to the sharing line, and what it excludes.
	for (const term of [
		"control minimum height",
		"font weight",
		"platform overlay",
	]) {
		assert(prose.includes(term), `the sharing line never names ${term}`);
	}
	const composing = readme.slice(readme.indexOf("## Composing with cn"));
	for (const term of ["leading-", "tracking-", "before"]) {
		assert(
			composing.includes(term),
			`the compose-order rule never names ${term}`,
		);
	}
	return `${subjects.length} laws by subject, the sharing line's two additions, the compose-order rule`;
});

// Directional padding is a control's interior, which is calibrated to the
// control's type size and therefore always numeric. A whole-box `p-<rung>` is a
// container inset, which is exactly what the rungs govern.
const INTERIOR_PADDING = /^p[xytrbles]-(.+)$/;

check("c26", "every cell keeps the role first and its interior numeric", () => {
	const rungs = new Set<string>(SPACING_RUNGS);
	const roles = new Set<string>(TYPE_ROLES);
	let inspected = 0;
	for (const [name, config] of MATRICES) {
		for (const [where, cell] of cells(config)) {
			const classes = cell.split(/\s+/).filter(Boolean);
			for (const value of classes) {
				const rung = value.match(INTERIOR_PADDING)?.[1];
				assert(
					rung === undefined || !rungs.has(rung),
					`${name}.${where}: ${value} pads a control interior on a rung`,
				);
			}
			// A type role carries its own leading and tracking, and cn() lets a
			// later role clear them, so the role has to come first in the cell.
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
			inspected++;
		}
	}
	return `${inspected} cells: interiors numeric, type role ahead of its leading and tracking`;
});

check("c27", "every rhythm cell is exactly gap-<unit>", () => {
	const units = Object.keys(RHYTHM.variants.unit) as Array<
		keyof (typeof RHYTHM)["variants"]["unit"]
	>;
	requireEqual(units.join(" "), "section stack row pair", "rhythm units");
	requireEqual(RHYTHM.base, "", "RHYTHM.base");
	for (const unit of units) {
		requireEqual(rhythm({ unit }), `gap-${unit}`, `rhythm(${unit})`);
	}
	return `${units.length} units, each cell the bare gap utility`;
});

check("c28", "the README carries the slot registry, closed", () => {
	const readme = readFileSync(resolve(pkgDir, "README.md"), "utf8");
	const canon = readme.indexOf("## The canon");
	const heading = readme.indexOf("### The slot registry");
	assert(heading >= 0, 'README has no "### The slot registry" subsection');
	assert(
		canon >= 0 && canon < heading,
		"the registry does not sit under The canon",
	);
	const registry = readme.slice(heading);
	for (const entry of [
		"`children`",
		"render prop",
		"`content`",
		"`trigger`",
		"`fallback`",
		"`loadingFallback`",
		"`errorFallback`",
		"`emptyFallback`",
		"`icon`",
		"`text`",
		"`logo`",
		"`providers`",
		"`createApp`",
		"`TIcon`",
		"`LucideIcon`",
	]) {
		assert(registry.includes(entry), `the registry never names ${entry}`);
	}
	return "registry subsection under The canon, every entry named, icon-param rule stated";
});

// ── Report ──────────────────────────────────────────────────────────

console.log(`reference: ${referencePath}\n`);
report();
