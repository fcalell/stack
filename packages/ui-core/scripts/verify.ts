// Reproduction harness for the ui-core token contract.
//
//   pnpm --filter @fcalell/ui-core verify              # scripts/fixture/reference.css
//   pnpm --filter @fcalell/ui-core verify <global.css> # a live upstream stylesheet
//
// Every acceptance criterion of the ui-core story is one check below. The
// script derives with default knobs, diffs against the reference stylesheet,
// drives a Tailwind build over the emitted `@theme` record, and exits non-zero
// on any mismatch.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
import * as matrices from "#variants";

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

function normalize(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function blockBody(css: string, header: string): string {
	const start = css.indexOf(header);
	assert(start >= 0, `reference stylesheet has no "${header}"`);
	const open = css.indexOf("{", start);
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		if (css[i] === "{") depth++;
		else if (css[i] === "}") {
			depth--;
			if (depth === 0) return css.slice(open + 1, i);
		}
	}
	throw new Error(`unterminated "${header}" block`);
}

function declarations(body: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const match of body.matchAll(/(--[A-Za-z0-9_*-]+)\s*:\s*([^;{}]+);/g)) {
		const [, property, value] = match;
		if (property && value) out.set(property, normalize(value));
	}
	return out;
}

const reference = readFileSync(referencePath, "utf8").replace(
	/\/\*[\s\S]*?\*\//g,
	"",
);
const themeBlock = declarations(blockBody(reference, "@theme"));
const referenceModes = new Map<Mode, Map<string, string>>();
for (const mode of MODES) {
	const tokens = new Map<string, string>();
	for (const [property, value] of declarations(
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

// ── Check harness ───────────────────────────────────────────────────

interface Result {
	id: string;
	name: string;
	ok: boolean;
	detail: string;
}

const results: Result[] = [];

function check(id: string, name: string, run: () => string): void {
	try {
		results.push({ id, name, ok: true, detail: run() });
	} catch (error) {
		results.push({
			id,
			name,
			ok: false,
			detail: error instanceof Error ? error.message : String(error),
		});
	}
}

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

// ── The variant matrices, walked from the module ────────────────────

interface MatrixConfig {
	base: string;
	variants: Record<string, Record<string, string>>;
	compoundVariants?: Array<Record<string, string>>;
	defaultVariants?: Record<string, string>;
}

type Renderer = (props: Record<string, string>) => string;

// The two exports that return color token names for a plugin's own icon or
// spinner component. They carry no classes, so the fixture never sees them.
const TOKEN_TABLES = ["buttonContentTone", "badgeContentTone"];

const configs = new Map<string, MatrixConfig>();
const renderers = new Map<string, Renderer>();
const classConstants = new Map<string, string>();
for (const [name, value] of Object.entries(
	matrices as unknown as Record<string, unknown>,
)) {
	if (typeof value === "function") {
		renderers.set(name, value as Renderer);
	} else if (typeof value === "string") {
		classConstants.set(name, value);
	} else if (
		value !== null &&
		typeof value === "object" &&
		"variants" in value
	) {
		configs.set(name, value as MatrixConfig);
	}
}

// A cva is named after the config it renders, so the pairing below is what
// stops a table from reaching the module without reaching the enumerator.
function cvaName(config: string): string {
	return config
		.toLowerCase()
		.split("_")
		.map((word, index) =>
			index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join("");
}

function combinations(config: MatrixConfig): Array<Record<string, string>> {
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

function renderer(config: string): Renderer {
	const render = renderers.get(cvaName(config));
	assert(render, `${config} has no cva named ${cvaName(config)}`);
	return render;
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
	for (const [name, config] of configs) {
		const render = renderer(name);
		for (const props of combinations(config)) add(render(props));
	}
	for (const value of classConstants.values()) add(value);
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

	const candidates = [
		resolve(pkgDir, "node_modules/.bin/tailwindcss"),
		resolve(pkgDir, "../../node_modules/.bin/tailwindcss"),
	];
	const bin = candidates.find((path) => existsSync(path));
	assert(bin, `no tailwindcss binary at ${candidates.join(" or ")}`);
	execFileSync(bin, ["--input", inputPath, "--output", outputPath], {
		cwd: fixtureDir,
		stdio: "pipe",
	});
	fixtureCss = readFileSync(outputPath, "utf8");
	return fixtureCss;
}

// Tailwind escapes `.`, `[`, `(` and their siblings in the selectors it emits
// (`.px-3\.5 {`), so the raw class name has to be CSS-escaped before it is
// regex-escaped or a class that did compile reads as missing.
function rule(css: string, selector: string): string | undefined {
	const escaped = selector
		.replace(/[.[\]()/%:]/g, (char) => `\\${char}`)
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return css.match(new RegExp(`\\.${escaped}\\s*\\{([^}]*)\\}`))?.[1];
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
		"./cn ./derive ./descriptors ./emit ./schema ./tokens ./variants",
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
	return "7 subpaths, no root export, no runtime cli dependency";
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
	// The escaping fix has an oracle of its own: a class that compiles and
	// carries a `.` must be found, or every dotted cell reports a false miss.
	assert(rule(out, "px-3.5"), "px-3.5 emitted no rule");
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

check(
	"c18",
	"the font-size to leading interaction is the intended semantics",
	() => {
		requireEqual(
			cn("leading-h1", "text-body"),
			"text-body",
			"role after leading",
		);
		requireEqual(
			cn("text-body", "leading-h1"),
			"text-body leading-h1",
			"role before leading",
		);
		// Without the extension the same cases fail, so the config is proven to do
		// work rather than assumed to.
		const missed = MERGE_CASES.filter(
			([inputs, expected]) => twMerge(clsx(inputs)) !== expected,
		);
		assert(
			missed.length > 0,
			"the unextended twMerge already passes every case",
		);
		return `a role after a leading deletes it; ${missed.length}/${MERGE_CASES.length} cases fail unextended`;
	},
);

// ── The pinned matrices ─────────────────────────────────────────────

interface PinnedMatrix {
	base: string;
	variants: Record<string, Record<string, string>>;
	compoundVariants: Array<Record<string, string>>;
}

// No build check can tell a rung from a numeric, so every cell is spelled out
// here as well and compared with the matrix that ships.
const PINNED_MATRICES: Record<string, PinnedMatrix> = {
	BUTTON: {
		base: "gap-row rounded-control",
		variants: {
			emphasis: {
				primary: "",
				secondary: "border bg-transparent",
				tertiary: "bg-transparent",
			},
			tone: { neutral: "", danger: "" },
			size: {
				sm: "min-h-11 px-3.5 py-1.5",
				md: "min-h-11 px-4 py-2",
				lg: "min-h-12 px-6 py-2.5",
			},
		},
		compoundVariants: [
			{ emphasis: "primary", tone: "neutral", class: "bg-accent" },
			{ emphasis: "primary", tone: "danger", class: "bg-danger" },
			{ emphasis: "secondary", tone: "neutral", class: "border-edge-2" },
			{ emphasis: "secondary", tone: "danger", class: "border-danger" },
			{ emphasis: "tertiary", tone: "neutral", class: "" },
			{ emphasis: "tertiary", tone: "danger", class: "" },
		],
	},
	BUTTON_LABEL: {
		base: "font-semibold",
		variants: {
			emphasis: { primary: "", secondary: "", tertiary: "" },
			tone: { neutral: "", danger: "" },
			size: { sm: "text-caption", md: "text-callout", lg: "text-body" },
		},
		compoundVariants: [
			{ emphasis: "primary", tone: "neutral", class: "text-accent-ink" },
			{ emphasis: "primary", tone: "danger", class: "text-danger-ink" },
			{ emphasis: "secondary", tone: "neutral", class: "text-ink-1" },
			{ emphasis: "secondary", tone: "danger", class: "text-danger" },
			{ emphasis: "tertiary", tone: "neutral", class: "text-ink-1" },
			{ emphasis: "tertiary", tone: "danger", class: "text-danger" },
		],
	},
	BUTTON_MUTED: {
		base: "",
		variants: {
			emphasis: {
				primary: "bg-surface-3",
				secondary: "border-edge",
				tertiary: "",
			},
		},
		compoundVariants: [],
	},
	TEXT: {
		base: "",
		variants: {
			variant: {
				display: "text-display font-bold tracking-display leading-display",
				h1: "text-h1 font-bold tracking-h1 leading-h1",
				h2: "text-h2 font-semibold tracking-h2 leading-h2",
				h3: "text-h3 font-semibold tracking-h3 leading-h3",
				body: "text-body font-medium leading-body",
				callout: "text-callout font-bold leading-callout",
				caption: "text-caption font-medium leading-caption",
				micro: "text-micro font-medium leading-micro tracking-micro",
				rowtitle: "text-body font-semibold leading-body",
			},
			tone: {
				"ink-1": "text-ink-1",
				"ink-2": "text-ink-2",
				"ink-3": "text-ink-3",
				"ink-4": "text-ink-4",
				brand: "text-brand",
				interactive: "text-interactive",
				ok: "text-ok",
				warn: "text-warn",
				danger: "text-danger",
				"accent-ink": "text-accent-ink",
				"oncover-fg": "text-oncover-fg",
				"oncover-ink": "text-oncover-ink",
			},
		},
		compoundVariants: [],
	},
	TEXT_STRONG: {
		base: "",
		variants: {
			variant: {
				display: "",
				h1: "",
				h2: "font-bold",
				h3: "font-bold",
				body: "font-semibold",
				callout: "",
				caption: "font-semibold",
				micro: "font-semibold",
				rowtitle: "font-bold",
			},
		},
		compoundVariants: [],
	},
	BADGE: {
		base: "rounded-full px-2.5 py-1",
		variants: {
			tone: {
				neutral: "bg-surface-2",
				brand: "bg-brand-soft",
				interactive: "bg-interactive-soft",
				ok: "bg-ok-soft",
				warn: "bg-warn-soft",
				danger: "bg-danger-soft",
				oncover: "bg-oncover-surface",
			},
		},
		compoundVariants: [],
	},
	BADGE_LABEL: {
		base: "",
		variants: {
			tone: {
				neutral: "text-ink-1",
				brand: "text-brand",
				interactive: "text-interactive",
				ok: "text-ok",
				warn: "text-warn",
				danger: "text-danger",
				oncover: "text-oncover-ink",
			},
		},
		compoundVariants: [],
	},
	BADGE_DOT: {
		base: "",
		variants: {
			tone: {
				neutral: "bg-ink-1",
				brand: "bg-brand",
				interactive: "bg-interactive",
				ok: "bg-ok",
				warn: "bg-warn-mark",
				danger: "bg-danger",
				oncover: "bg-oncover-ink",
			},
		},
		compoundVariants: [],
	},
	CARD: {
		base: "overflow-hidden rounded-xl bg-surface shadow-1",
		variants: {
			padding: { card: "p-card", none: "" },
			ring: { none: "", warn: "border-2 border-warn-mark" },
		},
		compoundVariants: [],
	},
	FIELD: {
		base: "rounded-control border bg-surface px-3.5",
		variants: {
			state: {
				default: "border-edge",
				focused: "border-ink-1",
				error: "border-danger",
			},
			layout: { input: "gap-row min-h-12", row: "gap-stack py-2" },
		},
		compoundVariants: [],
	},
};

const PINNED_CONSTANTS: Record<string, string> = {
	BUTTON_MUTED_LABEL: "text-ink-4",
};

check("c19", "every matrix cell is the pinned string", () => {
	requireEqual(
		[...configs.keys()].sort().join(" "),
		Object.keys(PINNED_MATRICES).sort().join(" "),
		"exported matrix configs",
	);
	requireEqual(
		[...classConstants.keys()].sort().join(" "),
		Object.keys(PINNED_CONSTANTS).sort().join(" "),
		"exported class constants",
	);
	for (const [name, expected] of Object.entries(PINNED_CONSTANTS)) {
		requireEqual(classConstants.get(name), expected, name);
	}
	let cells = 0;
	for (const [name, pinned] of Object.entries(PINNED_MATRICES)) {
		const config = configs.get(name);
		assert(config, `${name} is not exported`);
		requireEqual(config.base, pinned.base, `${name}.base`);
		requireEqual(
			Object.keys(config.variants).join(" "),
			Object.keys(pinned.variants).join(" "),
			`${name} axis names`,
		);
		for (const [axis, keys] of Object.entries(pinned.variants)) {
			const actual = config.variants[axis];
			assert(actual, `${name} has no ${axis} axis`);
			requireEqual(
				Object.keys(actual).join(" "),
				Object.keys(keys).join(" "),
				`${name}.${axis} keys`,
			);
			for (const [key, cell] of Object.entries(keys)) {
				requireEqual(actual[key], cell, `${name}.${axis}.${key}`);
				cells++;
			}
		}
		const compounds = config.compoundVariants ?? [];
		requireEqual(
			compounds.length,
			pinned.compoundVariants.length,
			`${name} compound row count`,
		);
		for (const [index, row] of pinned.compoundVariants.entries()) {
			requireEqual(
				JSON.stringify(compounds[index]),
				JSON.stringify(row),
				`${name} compound row ${index}`,
			);
			cells++;
		}
	}
	return `${cells} pinned cells over ${configs.size} matrices and 1 class constant`;
});

check("c20", "every class every matrix can emit resolves", () => {
	const expected = new Set([...configs.keys()].map(cvaName));
	for (const name of expected) {
		assert(renderers.has(name), `no cva named ${name}`);
	}
	for (const name of renderers.keys()) {
		assert(
			expected.has(name) || TOKEN_TABLES.includes(name),
			`${name} is a cva the enumerator cannot reach`,
		);
	}
	const out = buildFixture();
	const missing = [...enumerated()].filter((name) => !rule(out, name));
	assert(missing.length === 0, `emitted no rule: ${missing.join(", ")}`);
	return `${enumerated().size} classes from ${configs.size} matrices, every one on contract`;
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

const buttonContentTone = matrices.buttonContentTone as (
	emphasis: string,
	tone: string,
) => string;
const badgeContentTone = matrices.badgeContentTone as (tone: string) => string;

check(
	"c22",
	"the token-name tables name contract colors and match their labels",
	() => {
		const colors = new Set<string>([...PER_MODE_COLORS, ...INVARIANT_COLORS]);
		const button = configs.get("BUTTON");
		const buttonLabel = configs.get("BUTTON_LABEL");
		const badgeLabel = configs.get("BADGE_LABEL");
		assert(
			button && buttonLabel && badgeLabel,
			"a label matrix is not exported",
		);
		let checked = 0;
		for (const emphasis of Object.keys(button.variants.emphasis ?? {})) {
			for (const tone of Object.keys(button.variants.tone ?? {})) {
				const token = buttonContentTone(emphasis, tone);
				assert(
					colors.has(token),
					`buttonContentTone(${emphasis}, ${tone}) is not a contract color: ${token}`,
				);
				const row = (buttonLabel.compoundVariants ?? []).find(
					(entry) => entry.emphasis === emphasis && entry.tone === tone,
				);
				assert(row, `BUTTON_LABEL has no compound row for ${emphasis}/${tone}`);
				requireEqual(
					row.class,
					`text-${token}`,
					`BUTTON_LABEL ${emphasis}/${tone}`,
				);
				checked++;
			}
		}
		for (const tone of Object.keys(badgeLabel.variants.tone ?? {})) {
			const token = badgeContentTone(tone);
			assert(
				colors.has(token),
				`badgeContentTone(${tone}) is not a contract color: ${token}`,
			);
			requireEqual(
				badgeLabel.variants.tone?.[tone],
				`text-${token}`,
				`BADGE_LABEL ${tone}`,
			);
			checked++;
		}
		return `${checked} token names, each a contract color and each matching its label cell`;
	},
);

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
	// Every declaration that mentions TIcon introduces it, and TIcon is the only
	// type parameter in the file, so no local alias can stand in for the icon.
	const headers = [
		...source.matchAll(/^(?:export )?(?:interface|type) (\w+)(<[^>]*>)?/gm),
	];
	assert(headers.length > 0, "descriptors.ts declares no types");
	for (const [index, header] of headers.entries()) {
		const name = header[1];
		const params = header[2] ?? "";
		const body = source.slice(
			(header.index ?? 0) + header[0].length,
			headers[index + 1]?.index ?? source.length,
		);
		if (params) {
			assert(
				params.startsWith("<TIcon"),
				`${name} declares a type parameter that is not TIcon: ${params}`,
			);
		}
		requireEqual(
			body.includes("TIcon"),
			params.startsWith("<TIcon"),
			`${name} mentions TIcon without declaring it, or declares it unused`,
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
	const generic = headers.filter((header) => header[2]).length;
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
	const laws = [
		"One name per concept",
		"A composed region is data, not a `ReactNode` prop",
		"closed registry",
		"Primitives compose primitives",
		"presets over one private core",
		"is a sibling component, not a variant",
		"takes no `class`, `className`, or `style` prop",
	];
	const positions = laws.map((law) => {
		const at = readme.indexOf(law);
		assert(at >= 0, `README never states "${law}"`);
		return at;
	});
	requireEqual(
		positions[positions.length - 1],
		Math.max(...positions),
		"the class/className/style law is the last one",
	);
	for (const phrase of [
		"control minimum height",
		"font weight",
		"`min-h` and never `h`",
		"platform overlay",
		"`gap-<rung>` stays inside the matrices",
	]) {
		assert(readme.includes(phrase), `the sharing line never names ${phrase}`);
	}
	assert(
		readme.includes(
			"Compose the type role before any later size class, never after.",
		),
		"README carries no compose-order rule",
	);
	return `${laws.length} law phrases in order, the sharing line's two additions, the compose-order rule`;
});

// ── Report ──────────────────────────────────────────────────────────

console.log(`reference: ${referencePath}\n`);
let failed = 0;
for (const result of results) {
	if (!result.ok) failed++;
	console.log(
		`${result.ok ? "PASS" : "FAIL"}  ${result.id}  ${result.name}\n        ${result.detail}`,
	);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
