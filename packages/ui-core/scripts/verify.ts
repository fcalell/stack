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
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isCssIdent } from "@fcalell/cli/css";
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
		"./derive ./emit ./schema ./tokens",
		"export subpaths",
	);
	assert(pkg.peerDependencies?.zod, "zod is not a peerDependency");
	for (const name of ["tailwindcss", "@tailwindcss/cli"]) {
		assert(pkg.devDependencies?.[name], `${name} is not a devDependency`);
	}
	// What the criterion protects is that installing ui-core never pulls in the
	// CLI. This script imports the CLI's ident check, so devDependencies is
	// deliberately exempt.
	for (const field of ["dependencies", "peerDependencies"] as const) {
		assert(!pkg[field]?.["@fcalell/cli"], `@fcalell/cli appears in ${field}`);
	}
	return "4 subpaths, no root export, no runtime cli dependency";
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
			'@source "./classes.html";',
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
	const out = readFileSync(outputPath, "utf8");

	const rule = (selector: string): string | undefined => {
		const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return out.match(new RegExp(`\\.${escaped}\\s*\\{([^}]*)\\}`))?.[1];
	};

	const textH1 = rule("text-h1");
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
		assert(rule(selector), `${selector} emitted no rule`);
	}
	for (const selector of ["bg-red-500", "text-sm"]) {
		assert(rule(selector) === undefined, `${selector} emitted a rule`);
	}
	const shadow = rule("shadow-1");
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
