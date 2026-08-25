// Reproduction harness for the `.stack/app.css` emission spine and for the
// component vocabulary that reads it.
//
//   pnpm --filter @fcalell/plugin-solid-ui verify
//
// Every acceptance criterion in `.helm/board/epics/001-ui-core/` story 03 is
// one check below, so a failing check id traces back to a criterion. The `a`
// checks resolve the sheet through the real plugin graph (`defineConfig`, then
// `buildGraphFromConfig`, then `solidUi.slots.appCssSource`), so the
// contribution wiring is exercised and not just the renderer. A Tailwind build
// over the emitted sheet then decides what the vocabulary resolves to.
// The `b` checks read the plugin's own source, and every matrix cell they
// compare against is produced by calling the ui-core cva rather than written
// out here, so no check can drift from the matrix it describes.
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@fcalell/cli";
import { buildGraphFromConfig } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { cssTokenValue, cssVarName } from "@fcalell/cli/css";
import { StackError } from "@fcalell/cli/errors";
import { solid } from "@fcalell/plugin-solid";
import { vite } from "@fcalell/plugin-vite";
import { deriveTheme, type ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	modeTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import {
	type AnyCva,
	assert,
	binPath,
	blockBody,
	check,
	classes,
	declarationMap,
	declarations,
	type Family,
	matrixCells,
	normalize,
	report,
	rule,
	tailwindBuild,
} from "@fcalell/ui-core/harness";
import type { Theme } from "@fcalell/ui-core/schema";
import {
	INVARIANT_COLORS,
	PER_MODE_COLORS,
	SHADOW_LEVELS,
	TYPE_ROLES,
} from "@fcalell/ui-core/tokens";
import {
	badge,
	badgeContentTone,
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
} from "@fcalell/ui-core/variants";
import { solidUi } from "../src/index.ts";
import { aggregateAppCss } from "../src/node/codegen.ts";
import * as solidUiCss from "../src/node/css-escape.ts";
import { runGeometryGate } from "../src/node/gate.ts";
import { darkLayer } from "../src/node/theme.ts";
import type { SolidUiOptions } from "../src/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");
const globalsPath = resolve(pkgDir, "src/ui/globals.css");

// The nine tokens the web owns on top of the contract, spelled out here rather
// than imported so the check is a second opinion and not a mirror of the
// emitter.
const WEB_ONLY_NAMES = [
	"--ease-ui",
	"--duration-fast",
	"--duration-base",
	"--animate-content-show",
	"--animate-content-hide",
	"--animate-caret-blink",
	"--font-sans",
	"--font-mono",
	"--font-serif",
];

// A Tailwind build must emit nothing for these and a declaration for those.
// Both are fixed lists: no build can tell contract from off-contract until the
// geometry gate lands.
const OFF_CONTRACT = [
	"bg-primary",
	"text-muted-foreground",
	"text-accent-foreground",
	"border-border",
	"bg-popover",
	"text-sm",
	"text-4xl",
	"rounded-lg",
	"rounded-sm",
	"shadow-md",
	"bg-red-500",
];

const ON_CONTRACT = [
	"bg-canvas",
	"bg-surface-2",
	"bg-accent",
	"text-accent-ink",
	"text-ink-3",
	"border-edge",
	"bg-scrim",
	"text-h1",
	"leading-h1",
	"tracking-h1",
	"text-micro",
	"gap-row",
	"gap-stack",
	"p-card",
	"min-h-11",
	"rounded-control",
	"rounded-full",
	"rounded-none",
	"shadow-1",
	"font-mono",
	"p-4",
];

// ── Helpers ─────────────────────────────────────────────────────────

function rejection(run: () => unknown): string {
	try {
		run();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("expected a throw, got none");
}

async function asyncRejection(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("expected a rejection, got none");
}

// ── The sheet, through the real plugin graph ────────────────────────

async function emit(options: SolidUiOptions): Promise<string> {
	const config = defineConfig({
		app: { name: "verify", domain: "example.com" },
		plugins: [vite(), solid(), solidUi(options)],
	});
	const { graph } = await buildGraphFromConfig({ config, cwd: fixtureDir });
	const css = await graph.resolve(solidUi.slots.appCssSource);
	assert(css !== null, "appCssSource resolved to null");
	return css;
}

// ── The Tailwind build over that sheet ──────────────────────────────

// A consumer's `.stack/app.css` sits one level under the project root and
// declares `@source "../src"`, so the fixture reproduces that shape. The
// package resolves itself through a node_modules link, exactly as a consumer's
// `@import "@fcalell/plugin-solid-ui/globals.css"` does.
let stackDir: string | undefined;

function prepareFixture(): string {
	if (stackDir !== undefined) return stackDir;
	stackDir = resolve(fixtureDir, ".stack");
	const srcDir = resolve(fixtureDir, "src");
	const linkDir = resolve(fixtureDir, "node_modules/@fcalell");
	for (const dir of [stackDir, srcDir, linkDir])
		mkdirSync(dir, { recursive: true });
	const link = resolve(linkDir, "plugin-solid-ui");
	if (!existsSync(link)) symlinkSync(relative(linkDir, pkgDir), link, "dir");
	const probes = [
		...OFF_CONTRACT,
		...ON_CONTRACT,
		// The other two rungs of the shadow ladder, and the two other font roles.
		// Criteria a5 and a9 build these; the enumerated a6 set does not name
		// them, and Tailwind emits a theme variable only where a utility reads it.
		...SHADOW_LEVELS.map((level) => `shadow-${level}`),
		"font-sans",
		"font-serif",
	];
	writeFileSync(
		resolve(srcDir, "probe.html"),
		`<div class="${probes.join(" ")}"></div>\n`,
	);
	return stackDir;
}

function build(sheet: string, name: string): string {
	const dir = prepareFixture();
	const inputPath = resolve(dir, `${name}.css`);
	const outputPath = resolve(dir, `${name}.out.css`);
	writeFileSync(inputPath, sheet);
	return tailwindBuild(pkgDir, inputPath, outputPath, dir);
}

// ── Fixtures ────────────────────────────────────────────────────────

const THEME: Theme = { knobs: { brandHue: 120 } };
const resolved = deriveTheme(THEME);

const sheet = await emit({ theme: THEME });
const darkSeeded = await emit({ theme: { ...THEME, defaultMode: "dark" } });
const noFonts = await emit({ theme: THEME, fonts: [] });

const themeDecls = declarations(blockBody(sheet, "@theme"));
const themeMap = new Map(themeDecls);
const globals = readFileSync(globalsPath, "utf8");

const built = build(sheet, "app");
const builtNoFonts = build(noFonts, "app-no-fonts");

// The pair reaches the graph from documented consumer config, so the rejection
// is measured end to end rather than against the schema in isolation.
const unbalancedPair = await asyncRejection(() =>
	emit({
		theme: {
			overrides: {
				scales: { "--radius-md": "calc(1px", "--radius-sheet": "2px)" },
			},
		},
	}),
);

// ── The geometry gate, resolved through the graph and executed ──────

const gateFixtureDir = resolve(fixtureDir, "gate");

// The graph's cwd is the failing consumer tree, so the resolved step's own
// `run` is what throws below: the contribution wiring is exercised end to
// end, not just the exported function.
const gateSteps = await (async () => {
	const config = defineConfig({
		app: { name: "verify", domain: "example.com" },
		plugins: [vite(), solid(), solidUi({})],
	});
	const { graph } = await buildGraphFromConfig({
		config,
		cwd: resolve(gateFixtureDir, "fail"),
	});
	return graph.resolve(cliSlots.buildSteps);
})();

const gateStep = gateSteps.find(
	(step) => step.name === "solid-ui-geometry-gate",
);
const gateFailure =
	gateStep && "run" in gateStep
		? await gateStep.run().then(
				() => undefined,
				(error: unknown) => error,
			)
		: undefined;

const gateOutcomes = new Map<string, string>();
for (const tree of ["pass", "empty"]) {
	gateOutcomes.set(
		tree,
		await runGeometryGate(resolve(gateFixtureDir, tree)).then(
			() => "clean",
			(error: unknown) =>
				error instanceof Error ? error.message : String(error),
		),
	);
}

// ── Criteria ────────────────────────────────────────────────────────

check("a2", "render order and the declaration boundary", () => {
	const source = sheet.indexOf('@source "../src";');
	const firstImport = sheet.indexOf("@import ");
	const firstBlock = sheet.indexOf("@theme {");
	const firstLayer = sheet.indexOf("@layer ");
	assert(firstImport >= 0 && firstImport < source, "@import after @source");
	assert(source < firstBlock, "@source after the first block");
	assert(firstBlock < firstLayer, "a block after the first @layer");
	assert(sheet.includes("@utility shadow-1 {"), "no @utility block emitted");

	// Every declaration the sheet carries — the `@theme` block, the three
	// utilities, and the dark `@layer base` block — round-trips the boundary.
	let inspected = 0;
	const bodies = [
		blockBody(sheet, "@theme"),
		...SHADOW_LEVELS.map((level) =>
			blockBody(sheet, `@utility shadow-${level}`),
		),
		blockBody(sheet, ".dark"),
	];
	for (const body of bodies) {
		for (const [property, value] of declarations(body)) {
			if (property.startsWith("--")) cssVarName(property);
			cssTokenValue(value);
			inspected++;
		}
	}

	// A resolved theme carrying one poisoned dark color. Nothing reachable from
	// the `theme` option produces this, since `OKLCH_RE` rejects it first, so
	// the payload is built here to reach the render boundary directly.
	const poisoned: ResolvedTheme = {
		...resolved,
		colors: {
			...resolved.colors,
			dark: { ...resolved.colors.dark, canvas: "red; }" },
		},
	};

	const base = { imports: [], blocks: [], layers: [] };
	const messages = [
		// Through appCssBlocks: a malformed custom-property name, a malformed
		// value, a malformed utility name, then a malformed plain property name.
		// The last one is what keeps `cssProperty` from waving plain properties
		// through unvalidated.
		rejection(() =>
			aggregateAppCss({
				...base,
				blocks: [{ kind: "theme", declarations: { "--bad name": "1px" } }],
			}),
		),
		rejection(() =>
			aggregateAppCss({
				...base,
				blocks: [{ kind: "theme", declarations: { "--ok": "red; }" } }],
			}),
		),
		rejection(() =>
			aggregateAppCss({
				...base,
				blocks: [
					{ kind: "utility", name: "3bad", declarations: { color: "red" } },
				],
			}),
		),
		rejection(() =>
			aggregateAppCss({
				...base,
				blocks: [
					{
						kind: "utility",
						name: "shadow-1",
						declarations: { "box shadow": "0 0 0" },
					},
				],
			}),
		),
		// Through appCssLayers, whose content the aggregator passes through
		// untouched. The dark block's own builder is therefore the boundary, and
		// a hand-built rule string would let this poisoned value reach the sheet.
		rejection(() =>
			aggregateAppCss({ ...base, layers: [darkLayer(poisoned)] }),
		),
	];
	for (const message of messages) {
		assert(
			message.includes("solid-ui"),
			`error does not name solid-ui: ${message}`,
		);
	}
	return `${inspected} declarations through cssVarName / cssTokenValue, ${messages.length} malformed payloads rejected by name`;
});

check("a3", "the @theme block is the contract, light-seeded", () => {
	const expected = new Map(Object.entries(themeTokens(resolved)));
	for (const [token, value] of Object.entries(modeTokens(resolved, "light"))) {
		expected.set(`--color-${token}`, value);
	}
	for (const [key, value] of expected) {
		assert(
			themeMap.get(key) === value,
			`${key}: expected ${value}, got ${themeMap.get(key)}`,
		);
	}
	for (const name of WEB_ONLY_NAMES) {
		assert(themeMap.has(name), `@theme is missing ${name}`);
	}
	const extra = [...themeMap.keys()].filter(
		(key) => !expected.has(key) && !WEB_ONLY_NAMES.includes(key),
	);
	assert(extra.length === 0, `@theme carries unexpected keys: ${extra}`);

	const reset = themeDecls.findIndex(([key]) => key === "--color-*");
	assert(reset >= 0, "@theme carries no --color-* reset");
	const firstColor = themeDecls.findIndex(
		([key]) => key.startsWith("--color-") && key !== "--color-*",
	);
	assert(reset < firstColor, "--color-* does not precede the color entries");

	const seeded = blockBody(darkSeeded, "@theme");
	assert(
		seeded === blockBody(sheet, "@theme"),
		"the @theme block moves under defaultMode: dark",
	);
	return `${expected.size} contract tokens + ${WEB_ONLY_NAMES.length} web-only, reset first, mode-stable`;
});

check(
	"a4",
	"the dark block rides @layer base, and :root keeps its scheme",
	() => {
		assert(
			/@layer base \{\s*\.dark \{/.test(sheet),
			"the dark rule is not inside @layer base",
		);
		const dark = declarationMap(blockBody(sheet, ".dark"));
		for (const [token, value] of Object.entries(modeTokens(resolved, "dark"))) {
			assert(
				dark.get(`--color-${token}`) === value,
				`.dark ${token}: expected ${value}, got ${dark.get(`--color-${token}`)}`,
			);
		}
		assert(
			dark.get("color-scheme") === "dark",
			".dark carries no color-scheme",
		);
		const root = declarationMap(blockBody(globals, ":root"));
		assert(
			root.get("color-scheme") === "light",
			"globals.css :root carries no color-scheme: light",
		);
		assert(
			/:root\s*\{[^}]*color-scheme:\s*light/.test(built),
			"the built sheet has no :root with color-scheme: light",
		);
		return `${PER_MODE_COLORS.length} dark colors + color-scheme, :root stays light`;
	},
);

check("a5", "the shadow ladder ships as three utilities", () => {
	const values = shadowUtilities(resolved);
	for (const level of SHADOW_LEVELS) {
		const body = declarationMap(blockBody(sheet, `@utility shadow-${level}`));
		assert(
			body.get("box-shadow") === normalize(values[`shadow-${level}`]),
			`@utility shadow-${level} does not carry its contract value`,
		);
		const emitted = rule(built, `shadow-${level}`);
		assert(
			emitted?.includes("box-shadow"),
			`shadow-${level} resolves to no box-shadow`,
		);
	}
	return "shadow-1, shadow-2, shadow-3 emit a box-shadow";
});

check("a6", "the build resolves the contract and nothing else", () => {
	const alive = OFF_CONTRACT.filter((name) => rule(built, name) !== undefined);
	assert(alive.length === 0, `off-contract classes still compile: ${alive}`);
	const dead = ON_CONTRACT.filter((name) => rule(built, name) === undefined);
	assert(dead.length === 0, `contract classes compile to nothing: ${dead}`);
	return `${OFF_CONTRACT.length} probes emit nothing, ${ON_CONTRACT.length} emit a declaration`;
});

check("a7", "the sheet carries exactly one preflight", () => {
	const matches = built.match(/box-sizing:\s*border-box/g) ?? [];
	assert(
		matches.length === 1,
		`expected 1 preflight box-sizing reset, found ${matches.length}`,
	);
	return "one preflight";
});

check("a8", "globals.css keeps only what the web owns", () => {
	for (const [what, pattern] of [
		["a --ui-* knob", /--ui-[a-z-]+\s*:/],
		[
			"a shadcn color token",
			/--color-(primary|secondary|muted|destructive|background|foreground|card|popover|border|input|ring|accent|success|warning|white|black)\s*:/,
		],
		[
			"a hand-derived semantic token",
			/^\s*--(background|foreground|card|popover|primary|secondary|muted|accent|destructive|success|warning|border|input|ring)[a-z-]*\s*:/m,
		],
		["a tailwindcss import", /@import\s+"tailwindcss"/],
		["a @theme block", /@theme\s*\{/],
	] as const) {
		assert(!pattern.test(globals), `globals.css still declares ${what}`);
	}
	for (const [what, pattern] of [
		["@source", /@source\s+"\.\/"/],
		["the dark variant", /@custom-variant\s+dark/],
		["the base layer", /@layer\s+base\s*\{/],
	] as const) {
		assert(pattern.test(globals), `globals.css lost ${what}`);
	}
	const keyframes = globals.match(/@keyframes\s+[a-z-]+/g) ?? [];
	assert(
		keyframes.length === 3,
		`expected 3 keyframe blocks, got ${keyframes.length}`,
	);
	for (const token of ["--color-edge", "--color-canvas", "--color-ink-1"]) {
		assert(
			globals.includes(`var(${token})`),
			`the base layer never reads ${token}`,
		);
	}
	for (const token of ["--border", "--background", "--foreground"]) {
		assert(
			!globals.includes(`var(${token})`),
			`the base layer still reads ${token}`,
		);
	}
	return "3 keyframes, the dark variant, a contract-bound base layer, no token map";
});

check("a9", "the font families survive fonts: []", () => {
	assert(
		!/--ui-font-[a-z]+\s*:/.test(noFonts),
		"fonts: [] still declares a --ui-font-* token",
	);
	for (const [role, expected] of [
		["sans", "ui-sans-serif"],
		["mono", "ui-monospace"],
		["serif", "ui-serif"],
	] as const) {
		const declaration = declarationMap(blockBody(noFonts, "@theme")).get(
			`--font-${role}`,
		);
		assert(
			declaration?.includes(expected),
			`--font-${role} carries no fallback stack: ${declaration}`,
		);
		assert(
			builtNoFonts.includes(expected),
			`the built sheet never resolves --font-${role} to a real stack`,
		);
	}
	assert(rule(builtNoFonts, "p-4") !== undefined, "p-4 resolves to nothing");
	return "sans, mono and serif fall back to a real stack; p-4 resolves";
});

check("a10", "the validators are one shared boundary", () => {
	assert(cssVarName("--color-*") === "--color-*", "--color-* is rejected");
	assert(
		cssVarName("--text-h1--line-height") === "--text-h1--line-height",
		"the Tailwind modifier form is rejected",
	);
	rejection(() => cssTokenValue("red /* x"));
	rejection(() => cssVarName("--bad name"));

	// This plugin's wrapper must behave like the shared implementation, not
	// merely import it: a stale copy would reject the widened name grammar and
	// accept the value shapes the shared one has learned to refuse. native-ui's
	// wrapper is checked by source below instead, since importing it across the
	// package boundary puts a file outside this package's `rootDir`.
	assert(
		solidUiCss.cssVarName("--color-*") === "--color-*",
		"plugin-solid-ui rejects --color-*",
	);
	for (const bad of ["red /* x", "calc(1px", "2px)"]) {
		const message = rejection(() => solidUiCss.cssTokenValue(bad));
		assert(
			message.includes("plugin-solid-ui"),
			`plugin-solid-ui does not name itself in ${JSON.stringify(bad)}: ${message}`,
		);
	}

	// A copy has to carry its own pattern and its own throw whatever syntax
	// declares it, so these three catch one in any form. Matching on
	// `function cssVarName` would miss the arrow the wrappers themselves use.
	for (const path of [
		"src/node/css-escape.ts",
		"../native-ui/src/node/css.ts",
	]) {
		const source = readFileSync(resolve(pkgDir, path), "utf8");
		assert(
			source.includes("@fcalell/cli/css"),
			`${path} does not read the shared boundary`,
		);
		assert(
			!/\bthrow\b/.test(source),
			`${path} throws its own validation error`,
		);
		assert(
			!/=\s*\/\^/.test(source),
			`${path} declares its own validation pattern`,
		);
		for (const name of ["cssVarName", "cssTokenValue"]) {
			assert(
				new RegExp(`${name}\\s*=[^;]*${name}Base\\(`).test(source),
				`${path} does not delegate ${name} to the shared implementation`,
			);
		}
	}
	return "widened name grammar, comment delimiters and unbalanced parens rejected, both wrappers delegate";
});

check(
	"a10-parens",
	"an unbalanced-paren pair is rejected before it builds",
	() => {
		// Each half is well-formed CSS on its own and both clear every other value
		// rule. Together they fuse every declaration between them into one and the
		// stylesheet builds clean with the whole block gone, so the pair is the case
		// that has to fail, not just a single bad value.
		for (const value of ["calc(1px", "2px)"]) {
			rejection(() => cssTokenValue(value));
		}
		assert(
			unbalancedPair.includes("--radius-md"),
			`the theme schema does not name the offending key: ${unbalancedPair}`,
		);
		return "both halves rejected at the render boundary, and the pair by the theme schema";
	},
);

// ── The component surface ───────────────────────────────────────────

// The seven families rebuilt on the shared matrices.
const REBUILT = [
	"button",
	"text",
	"badge",
	"card",
	"input",
	"textarea",
	"select",
];

function walk(dir: string, extensions: string[]): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = resolve(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(path, extensions));
		else if (extensions.some((ext) => entry.name.endsWith(ext))) out.push(path);
	}
	return out;
}

function read(path: string): string {
	return readFileSync(resolve(pkgDir, path), "utf8");
}

const SWEPT = ["src", "templates"].flatMap((dir) =>
	walk(resolve(pkgDir, dir), [".ts", ".tsx", ".css"]),
);

const DOCS = walk(resolve(pkgDir, "docs"), [".md"]);

const rebuiltSources = new Map(
	REBUILT.map((name) => [name, read(`src/ui/components/${name}/index.tsx`)]),
);

// The three field surfaces share one overlay, so the class strings the seven
// compose live partly in `lib/field.ts`. Every check that reads their class
// strings reads that module with them.
const styledSources = new Map([
	...rebuiltSources,
	["lib/field", read("src/ui/lib/field.ts")],
]);

// The retired vocabulary, as the enumerated patterns criterion b1 names. Bare
// `accent` is absent on purpose: it is a contract token, not shadcn's.
const RETIRED: Array<[string, RegExp]> = [
	[
		"a shadcn colour class",
		/\b(bg|text|border|border-[lrtbxy]|ring|fill|stroke|from|to|via|outline|divide|placeholder|caret|shadow|decoration)-(primary|secondary|muted|destructive|success|warning|border|input|ring|background|foreground|card|popover)(-foreground)?\b/,
	],
	["accent-foreground", /\baccent-foreground\b/],
	["a t-shirt type size", /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/],
	["an off-scale radius", /\brounded-(xs|sm|lg)\b/],
	["a t-shirt shadow", /\bshadow-(xs|sm|md|lg|xl)\b/],
	["bg-black", /\bbg-black\b/],
];

const RETIRED_EXPORTS = [
	"buttonVariants",
	"badgeVariants",
	"inputClasses",
	"textareaClasses",
	"selectTriggerVariants",
];

// ── The matrices, read back off the cvas ────────────────────────────

const TEXT_VARIANTS = [...TYPE_ROLES, "rowtitle"];
const TEXT_TONES = [
	"ink-1",
	"ink-2",
	"ink-3",
	"ink-4",
	"brand",
	"interactive",
	"ok",
	"warn",
	"danger",
	"accent-ink",
	"oncover-fg",
	"oncover-ink",
];
const BADGE_TONES = [
	"neutral",
	"brand",
	"interactive",
	"ok",
	"warn",
	"danger",
	"oncover",
];
const BUTTON_AXES = {
	emphasis: ["primary", "secondary", "tertiary"],
	tone: ["neutral", "danger"],
	size: ["sm", "md", "lg"],
};

// The axis values are spelled here as a second opinion; every cell string is
// produced by calling the cva, never written out. The label tables are tied
// back to the real matrix by `buttonContentTone` / `badgeContentTone`, which
// read the table objects directly.
const FAMILIES: Family[] = [
	{ name: "BUTTON", cva: button as AnyCva, axes: BUTTON_AXES },
	{ name: "BUTTON_LABEL", cva: buttonLabel as AnyCva, axes: BUTTON_AXES },
	{
		name: "BUTTON_MUTED",
		cva: buttonMuted as AnyCva,
		axes: { emphasis: BUTTON_AXES.emphasis },
	},
	{
		name: "TEXT",
		cva: text as AnyCva,
		axes: { variant: TEXT_VARIANTS, tone: TEXT_TONES },
	},
	{
		name: "TEXT_STRONG",
		cva: textStrong as AnyCva,
		axes: { variant: TEXT_VARIANTS },
	},
	{ name: "BADGE", cva: badge as AnyCva, axes: { tone: BADGE_TONES } },
	{
		name: "BADGE_LABEL",
		cva: badgeLabel as AnyCva,
		axes: { tone: BADGE_TONES },
	},
	{
		name: "CARD",
		cva: card as AnyCva,
		axes: { padding: ["card", "none"], ring: ["none", "warn"] },
	},
	{
		name: "FIELD",
		cva: field as AnyCva,
		axes: {
			state: ["default", "focused", "error"],
			layout: ["input", "row"],
		},
	},
	{
		name: "RHYTHM",
		cva: rhythm as AnyCva,
		axes: { unit: ["section", "stack", "row", "pair"] },
	},
];

const CELLS = matrixCells(FAMILIES);
const CELL_CLASSES = new Map<string, string>();
for (const [path, cell] of CELLS) {
	for (const name of cell)
		if (!CELL_CLASSES.has(name)) CELL_CLASSES.set(name, path);
}
const CELL_ROOTS = new Set(
	[...CELL_CLASSES.keys()].map((name) => name.split("-")[0]),
);
const CONTRACT_COLORS: string[] = [...PER_MODE_COLORS, ...INVARIANT_COLORS];

// ── Source shredding ────────────────────────────────────────────────

// Prose is dropped first: a comment quoting `font-family` otherwise reads as a
// `font-` utility. Only whole comment lines are dropped, since a `//` inside a
// string is a URL. A quoted object key goes too, for the same reason: the
// formatter puts no space before a key's colon and always puts one in a
// ternary, which separates the two.
function literals(source: string): string[] {
	const code = source
		.split("\n")
		.filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
		.join("\n");
	return [
		...[...code.matchAll(/"([^"\n]*)"(:?)/g)]
			.filter((match) => match[2] !== ":")
			.map((match) => match[1] ?? ""),
		...[...code.matchAll(/`([^`]*)`/g)].map((match) => match[1] ?? ""),
	];
}

// The balanced argument text of every `name(` call, so a check can ask what
// one `cn()` composes rather than whether two names appear in one file.
function callArguments(source: string, callee: string): string[] {
	const out: string[] = [];
	const needle = `${callee}(`;
	let index = source.indexOf(needle);
	while (index >= 0) {
		const before = source[index - 1] ?? " ";
		if (!/[A-Za-z0-9_$]/.test(before)) {
			let depth = 0;
			for (let i = index + needle.length - 1; i < source.length; i++) {
				if (source[i] === "(") depth++;
				else if (source[i] === ")") {
					depth--;
					if (depth === 0) {
						out.push(source.slice(index + needle.length, i));
						break;
					}
				}
			}
		}
		index = source.indexOf(needle, index + 1);
	}
	return out;
}

// The suffix after the last variant separator, with `[...]` spans skipped so
// `data-[expanded]:` and `[&_svg]:` read as prefixes rather than as content.
function variantSuffix(name: string): string | undefined {
	let depth = 0;
	let last = -1;
	for (let i = 0; i < name.length; i++) {
		const char = name[i];
		if (char === "[") depth++;
		else if (char === "]") depth--;
		else if (char === ":" && depth === 0) last = i;
	}
	return last >= 0 ? name.slice(last + 1) : undefined;
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
	return left.size === right.size && [...left].every((name) => right.has(name));
}

// ── Criteria ────────────────────────────────────────────────────────

check("b0", "the matrices read back off the cvas are the real ones", () => {
	assert(CELLS.size > 0, "no matrix cell was recovered from any cva");
	for (const emphasis of BUTTON_AXES.emphasis) {
		for (const tone of BUTTON_AXES.tone) {
			const ink = `text-${buttonContentTone(emphasis as never, tone as never)}`;
			const cell = CELLS.get(`BUTTON_LABEL.emphasis.${emphasis}`);
			const alternate = CELLS.get(`BUTTON_LABEL.tone.${tone}`);
			assert(
				cell?.has(ink) || alternate?.has(ink) || CELL_CLASSES.has(ink),
				`BUTTON_LABEL ${emphasis}/${tone}: ${ink} is in no recovered cell`,
			);
		}
	}
	for (const tone of BADGE_TONES) {
		const ink = `text-${badgeContentTone(tone as never)}`;
		assert(
			CELLS.get(`BADGE_LABEL.tone.${tone}`)?.has(ink),
			`BADGE_LABEL ${tone}: expected ${ink}`,
		);
	}
	return `${CELLS.size} cells over ${FAMILIES.length} matrices, ${CELL_CLASSES.size} distinct classes`;
});

check("b1", "the retired vocabulary is gone from src and templates", () => {
	for (const [name, positive] of [
		["bg-primary", RETIRED[0]],
		["text-muted-foreground", RETIRED[0]],
		["border-border", RETIRED[0]],
	] as const) {
		assert(positive?.[1].test(name), `the pattern misses ${name}`);
	}
	for (const name of ["bg-accent", "ring-accent", "text-accent-ink"]) {
		assert(
			!RETIRED[0]?.[1].test(name),
			`the pattern matches the contract's ${name}`,
		);
	}

	const hits: string[] = [];
	for (const path of SWEPT) {
		const source = readFileSync(path, "utf8");
		for (const [what, pattern] of RETIRED) {
			const found = source.match(new RegExp(pattern, "g"));
			if (found) {
				hits.push(`${relative(pkgDir, path)}: ${what} (${found.join(", ")})`);
			}
		}
	}
	assert(
		hits.length === 0,
		`retired vocabulary survives:\n  ${hits.join("\n  ")}`,
	);
	return `${SWEPT.length} files clear of ${RETIRED.length} retired patterns; the pattern spares bare accent`;
});

check("b2", "the rebuilt seven name a role, never a raw metric", () => {
	const roles = new Set<string>(TYPE_ROLES);
	const hits: string[] = [];
	for (const [name, source] of styledSources) {
		for (const match of source.matchAll(/\b(leading|tracking)-([a-z0-9-]+)/g)) {
			const [whole, , value] = match;
			if (!value || !roles.has(value)) hits.push(`${name}: ${whole}`);
		}
	}
	assert(hits.length === 0, `off-role metrics survive: ${hits.join(", ")}`);
	return `${styledSources.size} files carry leading/tracking only as a role name`;
});

check("b3", "the rebuilt seven render through the matrices", () => {
	const required: Record<string, string[]> = {
		button: ["button", "buttonLabel", "buttonMuted"],
		text: ["text", "textStrong"],
		badge: ["badge", "badgeLabel"],
		card: ["card", "text"],
		input: ["field"],
		textarea: ["field"],
		select: ["field", "text"],
	};
	for (const [name, source] of rebuiltSources) {
		assert(
			source.includes("@fcalell/ui-core/variants"),
			`${name} does not import the matrices`,
		);
		for (const callee of required[name] ?? []) {
			assert(
				callArguments(source, callee).length > 0,
				`${name} never calls ${callee}()`,
			);
		}
	}

	// The fill table carries no ink, so the two tables have to land on one node.
	for (const [name, fill, label] of [
		["button", "button", "buttonLabel"],
		["badge", "badge", "badgeLabel"],
	] as const) {
		const source = rebuiltSources.get(name) ?? "";
		const composed = callArguments(source, "cn").some(
			(args) => args.includes(`${fill}(`) && args.includes(`${label}(`),
		);
		assert(
			composed,
			`${name} does not compose ${fill} and ${label} in one cn()`,
		);
	}

	// A hand-copied cell would pass every other check, so each literal is
	// compared against the cells as a set rather than as a string. Only cells of
	// two classes or more are compared: a one-class cell such as TEXT's
	// `text-ink-3` is a plain contract class, and forbidding it would forbid the
	// vocabulary this milestone exists to adopt rather than a copied cell.
	const copies: string[] = [];
	for (const [name, source] of styledSources) {
		for (const literal of literals(source)) {
			const tokens = new Set(classes(literal));
			if (tokens.size < 2) continue;
			for (const [path, cell] of CELLS) {
				if (cell.size > 1 && sameSet(tokens, cell))
					copies.push(`${name}: "${literal}" is ${path}`);
			}
		}
	}
	assert(
		copies.length === 0,
		`a matrix cell is written out by hand:\n  ${copies.join("\n  ")}`,
	);
	return "seven files call their family's cvas, button and badge compose two tables on one node, no cell copied";
});

// The grounds a button moves to on hover and press. No matrix models a button's
// interaction ground, and the ink ladder is the only in-contract step under a
// filled neutral control, so these two are named here instead of silently
// widening b4's rule. Each is asserted to be a contract class that no cell
// holds and that the plugin actually reaches, so the list cannot grow by
// accident or rot once a matrix covers it.
const OVERLAY_GROUNDS = ["bg-ink-2", "bg-ink-3"];

check("b4", "a prefixed class mirrors the cell it stands in for", () => {
	const checked: string[] = [];
	const reached = new Set<string>();
	for (const [name, source] of styledSources) {
		for (const literal of literals(source)) {
			for (const token of classes(literal)) {
				const suffix = variantSuffix(token);
				if (!suffix) continue;
				const root = suffix.split("-")[0];
				if (!root || !CELL_ROOTS.has(root)) continue;
				const rest = suffix.slice(root.length + 1);
				if (!CONTRACT_COLORS.includes(rest)) continue;
				if (OVERLAY_GROUNDS.includes(suffix)) {
					reached.add(suffix);
					continue;
				}
				const cell = CELL_CLASSES.get(suffix);
				assert(
					cell !== undefined,
					`${name}: ${token} paints ${suffix}, which no matrix cell holds`,
				);
				checked.push(`${token} → ${cell}`);
			}
		}
	}

	for (const ground of OVERLAY_GROUNDS) {
		const rest = ground.slice(ground.indexOf("-") + 1);
		assert(CONTRACT_COLORS.includes(rest), `${ground} is not a contract token`);
		assert(
			!CELL_CLASSES.has(ground),
			`${ground} is a matrix cell now, so it does not belong on this list`,
		);
		assert(reached.has(ground), `${ground} is listed but never used`);
	}

	// The two the field surfaces cannot reach through a prop, named so the
	// check fails loudly if either cell moves.
	for (const [token, path] of [
		["border-ink-1", "FIELD.state.focused"],
		["border-danger", "FIELD.state.error"],
	] as const) {
		assert(CELLS.get(path)?.has(token), `${path} no longer holds ${token}`);
	}
	assert(
		checked.some((entry) => entry.startsWith("focus-visible:border-ink-1")),
		"no component reaches FIELD's focused cell by prefix",
	);
	assert(
		checked.some((entry) => entry.startsWith("aria-invalid:border-danger")),
		"no component reaches FIELD's error cell by prefix",
	);
	return `${checked.length} prefixed classes resolved against a matrix cell, ${OVERLAY_GROUNDS.length} named overlay grounds`;
});

// Not an acceptance criterion. Tailwind drops a candidate it cannot resolve in
// silence, so a class the namespace resets killed ships as a missing look with
// no error: `duration-base` reads like a token and needs a `--duration-*`
// namespace Tailwind has none of. The geometry gate is the real answer. Until
// it lands every swept file is held to this. The class is looked up exactly as
// written, prefixes included, because Tailwind emits only the candidates it
// actually saw.
const LOOK_ROOTS = [
	"bg",
	"text",
	"border",
	"ring",
	"outline",
	"rounded",
	"gap",
	"p",
	"px",
	"py",
	"min-h",
	"max-h",
	"h",
	"overflow",
	"shadow",
	"font",
	"leading",
	"tracking",
	"duration",
	"ease",
	"animate",
	"aspect",
];

// A variant class emits as `.aria-invalid\:border-danger[aria-invalid="true"]`,
// so the selector is matched by what may *not* follow it rather than by a fixed
// delimiter. Blocking `\` is what keeps `bg-surface-2` from matching
// `bg-surface-2\/50`.
function emitted(css: string, name: string): boolean {
	const escaped = name
		.replace(/[.[\]()/%:!]/g, (char) => `\\${char}`)
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`\\.${escaped}(?![\\w\\\\-])`).test(css);
}

check("b-resolves", "every class the plugin names compiles", () => {
	const named = new Set<string>();
	for (const path of SWEPT) {
		const source = readFileSync(path, "utf8");
		for (const literal of literals(source)) {
			for (const token of classes(literal)) {
				if (token.includes("[") || token.includes("]")) continue;
				const bare = token.slice(token.lastIndexOf(":") + 1);
				if (LOOK_ROOTS.some((root) => bare.startsWith(`${root}-`))) {
					named.add(token);
				}
			}
		}
	}
	const dead = [...named].filter((name) => !emitted(built, name));
	assert(
		dead.length === 0,
		`classes that compile to nothing: ${dead.sort().join(", ")}`,
	);

	// The other half of the same hole. A cell is a class string inside ui-core
	// that a cva composes at runtime, so nothing a component author writes puts
	// it in front of Tailwind's scanner: globals.css has to source the package.
	const unscanned = [...CELL_CLASSES.keys()].filter(
		(name) => !emitted(built, name),
	);
	assert(
		unscanned.length === 0,
		`matrix cells the build never sees: ${unscanned.sort().join(", ")}`,
	);

	// A custom property reaches the sheet through a JS style object or an
	// arbitrary property as easily as through a class, and no class-name pattern
	// sees either. Run A's `@theme` rewrite deleted the shadcn token names, so
	// every `var(--color-*)` the plugin still spells has to be a key the block
	// actually emits or it resolves to nothing.
	const orphans = new Set<string>();
	for (const path of SWEPT) {
		const source = readFileSync(path, "utf8");
		for (const match of source.matchAll(/var\(\s*(--color-[a-z0-9-]+)/g)) {
			const name = match[1];
			if (name && !themeMap.has(name)) orphans.add(name);
		}
	}
	assert(
		orphans.size === 0,
		`named tokens the @theme block does not emit: ${[...orphans].sort().join(", ")}`,
	);
	return `${named.size} classes across ${SWEPT.length} files, ${CELL_CLASSES.size} matrix cells, and every named --color-* resolve`;
});

check("b5", "the class functions are gone", () => {
	const hits: string[] = [];
	for (const path of [...SWEPT, ...DOCS, resolve(pkgDir, "README.md")]) {
		const source = readFileSync(path, "utf8");
		for (const name of RETIRED_EXPORTS) {
			if (new RegExp(`\\b${name}\\b`).test(source)) {
				hits.push(`${relative(pkgDir, path)}: ${name}`);
			}
		}
	}
	assert(
		hits.length === 0,
		`a retired class function survives: ${hits.join(", ")}`,
	);
	return `${RETIRED_EXPORTS.length} class functions absent from source, templates and docs`;
});

check("b6", "the docs match the APIs they document", () => {
	const forbidden: Array<[string, RegExp]> = [
		...RETIRED,
		["a Text namespace member", /\bText\.[A-Z]/],
		["a retired size", /size="(icon|default)"/],
		["a Button variant axis", /<Button[^>]*variant=/],
		["a Badge variant axis", /<Badge[^>]*variant=/],
		["the Badge round prop", /<Badge[^>]*\bround\b/],
	];
	const hits: string[] = [];
	for (const path of DOCS) {
		const source = readFileSync(path, "utf8");
		for (const [what, pattern] of forbidden) {
			if (pattern.test(source)) hits.push(`${relative(pkgDir, path)}: ${what}`);
		}
	}
	assert(
		hits.length === 0,
		`a docs page shows a retired API:\n  ${hits.join("\n  ")}`,
	);

	// Every page whose component changed shape says what the new shape is.
	const updated: Array<[string, string[]]> = [
		["button.md", ["emphasis", "tone", '`"md"`']],
		["badge.md", ["tone", "rounded-full"]],
		["text.md", ["variant", "strong", "mono"]],
		["card.md", ["padding", "ring"]],
		["input.md", ["FIELD", "no size axis"]],
		["textarea.md", ["FIELD", "no size axis"]],
		["select.md", ["FIELD", "no size axis"]],
		["inset.md", ["tone"]],
		["input-group.md", ["emphasis"]],
	];
	for (const [page, markers] of updated) {
		const source = read(`docs/${page}`);
		for (const marker of markers) {
			assert(source.includes(marker), `docs/${page} never mentions ${marker}`);
		}
	}
	return `${DOCS.length} pages clear of ${forbidden.length} retired patterns, ${updated.length} rewritten pages carry their new axes`;
});

// ── The closure ─────────────────────────────────────────────────────

const COMPONENT_FILES = walk(resolve(pkgDir, "src/ui/components"), [
	".ts",
	".tsx",
]);

// Every transformation below preserves the line structure (a comment line
// blanks to "", in-line spans blank to spaces), so a match offset in any
// transformed string still maps to the real source line and a hit can quote
// it verbatim instead of reconstructing text.
function blank(span: string): string {
	return span.replace(/[^\n]/g, " ");
}

// Comment lines drop (the toast component names the closed channels in
// prose); string literals empty out for the identifier scans, since a quoted
// value is data rather than a reachable prop channel. The quoted spelling
// itself is banned separately below.
function codeOf(source: string): string {
	return source
		.split("\n")
		.map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? "" : line))
		.join("\n")
		.replace(/"[^"\n]*"/g, blank);
}

// toast's Omit denylist spells the closed channels as quoted keys; it is the
// closure itself, and the one permitted home of the quoted spelling.
const TOAST_OMIT_UNION =
	'"class" | "className" | "style" | "toastOptions" | "icons"';

check("b7", "every closed prop is ?: never and no channel survives", () => {
	const hits: string[] = [];
	for (const path of COMPONENT_FILES) {
		const raw = readFileSync(path, "utf8");
		const rawLines = raw.split("\n");
		const name = relative(pkgDir, path);
		// `haystack` is whichever transformed string the match came from; its
		// newlines are the source's, so the offset gives the real line number
		// and the hit quotes the actual source line.
		const flag = (haystack: string, offset: number, why: string): void => {
			const line = haystack.slice(0, offset).split("\n").length;
			const text = (rawLines[line - 1] ?? "").trim();
			hits.push(`${name}:${line}: ${why}: ${text}`);
		};
		// Decision 1 closes uniformly, components with no surface included, so
		// the declaration is demanded in every component module instead of
		// allow-listing exceptions.
		if (path.endsWith("index.tsx")) {
			for (const declaration of [
				"class?: never",
				"style?: never",
				"classList?: never",
			]) {
				if (!raw.includes(declaration)) {
					hits.push(`${name}: no ${declaration} declaration`);
				}
			}
		}
		const code = codeOf(raw);
		// Every optional declaration of a closed prop, or of any /[a-z]Class/
		// renamed hatch, must be `?: never`.
		for (const match of code.matchAll(
			/\b(?:[a-zA-Z]*[a-z]Class|class|style|classList)\?:\s*(?!never\b)\S+/g,
		)) {
			flag(code, match.index ?? 0, "an open declaration");
		}
		// The `classList?: never` declaration is the one permitted classList
		// form; blank it, then no closed-channel token may remain at all.
		const permitted = code.replace(/\bclassList\?:\s*never\b/g, blank);
		for (const match of permitted.matchAll(
			/\b(?:className|classList|contentClass|listClass|containerClass)\b/g,
		)) {
			flag(permitted, match.index ?? 0, "a surviving channel token");
		}
		// No cn() call or class attribute may read a props-sourced class. The
		// alias list mirrors the names the components destructure props into
		// (splitProps / mergeProps results); a component adopting a new alias
		// must add it here, or its reads evade this scan.
		for (const match of code.matchAll(
			/\b(?:local|props|rest|others|merged|rawProps)\.(?:class|className|classList)\b/g,
		)) {
			flag(code, match.index ?? 0, "a props-sourced class value");
		}
		// A quoted-key declaration (`"className"?: string`) plus bracket access
		// slips past every identifier scan above, so the quoted spelling is
		// banned outright, toast's Omit union excepted. Comments drop; quotes
		// have to survive, so this scan runs on its own transform.
		const quoted = raw
			.split("\n")
			.map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? "" : line))
			.join("\n")
			.replace(TOAST_OMIT_UNION, blank);
		for (const match of quoted.matchAll(
			/"(?:className|contentClass|listClass|containerClass)"/g,
		)) {
			flag(quoted, match.index ?? 0, "a quoted closed-channel token");
		}
	}
	assert(hits.length === 0, `the closure leaks:\n  ${hits.join("\n  ")}`);
	return `${COMPONENT_FILES.length} component files: every declaration ?: never, no surviving channel token (quoted forms included), no props-sourced class`;
});

check("b8", "the closure fixture proves every prop at the type layer", () => {
	const fixturePath = resolve(fixtureDir, "closure.tsx");
	const source = readFileSync(fixturePath, "utf8");
	const directives = source.match(/@ts-expect-error/g) ?? [];
	assert(
		directives.length >= 300,
		`only ${directives.length} @ts-expect-error sites`,
	);
	for (const token of ['class="x"', "style={{", "classList={{"]) {
		assert(source.includes(token), `the fixture never passes ${token}`);
	}
	for (const hatch of [
		'containerClass="x"',
		'listClass="x"',
		'contentClass="x"',
		"toastOptions={{}}",
		"icons={{}}",
	]) {
		assert(
			source.includes(hatch),
			`the fixture never passes the dead ${hatch}`,
		);
	}
	// Every component dir is reached through its public subpath, so the
	// closure is proven the way a consumer imports it.
	for (const dir of readdirSync(resolve(pkgDir, "src/ui/components"))) {
		assert(
			source.includes(`/components/${dir}"`),
			`the fixture never imports components/${dir}`,
		);
	}
	// tsc over the package (scripts/ is inside the include) proves every
	// directive fires and every un-annotated legal usage still compiles: a
	// reopened prop turns a directive unused and fails the run.
	execFileSync(binPath(pkgDir, "tsc"), ["--noEmit"], {
		cwd: pkgDir,
		stdio: "pipe",
	});
	return `${directives.length} closures under @ts-expect-error, tsc --noEmit exits 0`;
});

check("b9", "the geometry gate is the pre step ahead of vite-build", () => {
	assert(gateStep, "no solid-ui-geometry-gate step resolved");
	assert(gateStep.phase === "pre", `phase: ${gateStep.phase}`);
	assert("run" in gateStep, "the gate step is not a run step");
	const gateIndex = gateSteps.indexOf(gateStep);
	const viteIndex = gateSteps.findIndex((step) => step.name === "vite-build");
	assert(viteIndex >= 0, "no vite-build step resolved");
	assert(
		gateIndex < viteIndex,
		`the gate (${gateIndex}) does not sort before vite-build (${viteIndex})`,
	);
	// ts-morph loads only when a build runs: the scanner reaches gate.ts
	// through a dynamic import, and nothing imports the subpath statically.
	const gateSource = readFileSync(resolve(pkgDir, "src/node/gate.ts"), "utf8");
	assert(
		/await import\(\s*"@fcalell\/ui-core\/gate"\s*\)/.test(gateSource),
		"gate.ts does not dynamic-import the scanner",
	);
	assert(
		!gateSource.includes('from "@fcalell/ui-core/gate"'),
		"gate.ts imports the gate subpath statically",
	);
	const indexSource = readFileSync(resolve(pkgDir, "src/index.ts"), "utf8");
	assert(
		!indexSource.includes("ui-core/gate"),
		"src/index.ts touches the gate subpath",
	);
	return `${gateSteps.length} steps resolved: the pre gate at ${gateIndex}, vite-build at ${viteIndex}`;
});

check("b10", "the gate passes geometry and throws on the look", () => {
	for (const file of [
		"pass/src/page.tsx",
		"pass/src/ui/look.tsx",
		"fail/src/page.tsx",
	]) {
		assert(
			existsSync(resolve(gateFixtureDir, file)),
			`fixture ${file} is missing: is the gate tree tracked?`,
		);
	}
	// The pass tree's src/ui holds the same look the fail tree throws on, so
	// the clean pass is what proves the ui/ carve-out.
	const look = readFileSync(
		resolve(gateFixtureDir, "pass/src/ui/look.tsx"),
		"utf8",
	);
	assert(
		look.includes("flex-1 bg-canvas"),
		"the ui/ carve-out fixture lost its look",
	);
	assert(
		gateOutcomes.get("pass") === "clean",
		`the pass tree reported: ${gateOutcomes.get("pass")}`,
	);
	assert(
		!existsSync(resolve(gateFixtureDir, "empty/src")),
		"the empty tree grew a src/",
	);
	assert(
		gateOutcomes.get("empty") === "clean",
		`the src-less tree reported: ${gateOutcomes.get("empty")}`,
	);
	assert(
		gateFailure instanceof StackError,
		`the resolved step did not throw a StackError: ${String(gateFailure)}`,
	);
	assert(gateFailure.code === "GEOMETRY_GATE", `code: ${gateFailure.code}`);
	const expected = [
		'src/page.tsx:2  "bg-canvas" is not in the geometry vocabulary',
		'src/page.tsx:3  class attribute on non-host tag "Card"',
	].join("\n");
	assert(
		gateFailure.message === expected,
		`unexpected message:\n${gateFailure.message}`,
	);
	return "pass and src-less trees clean, the fail tree throws GEOMETRY_GATE naming both violations in one run";
});

check("b11", "the scroll and frame geometry is pinned from source", () => {
	const scrollArea = read("src/ui/components/scroll-area/index.tsx");
	for (const cell of [
		'"flex-1 min-h-0 min-w-0 overflow-y-auto"',
		'"w-full min-w-0 overflow-x-auto"',
		'"flex-1 min-h-0 min-w-0 overflow-auto"',
	]) {
		assert(scrollArea.includes(cell), `ScrollArea lost ${cell}`);
	}
	assert(
		scrollArea.includes("PIN_THRESHOLD = 40"),
		"the pin threshold moved off 40",
	);
	const frame = read("src/ui/components/frame/index.tsx");
	assert(
		frame.includes('"flex h-dvh min-h-0 flex-col overflow-hidden"'),
		"Frame lost its class string",
	);
	return "three axis strings, the frame string and PIN_THRESHOLD = 40 pinned";
});

// ── Report ──────────────────────────────────────────────────────────

report();
