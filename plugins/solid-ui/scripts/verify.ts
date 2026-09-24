// Reproduction harness for the `.stack/app.css` emission spine and for the
// component roster that reads it.
//
//   pnpm --filter @fcalell/plugin-solid-ui verify
//
// The `a` checks resolve the sheet through the real plugin graph
// (`defineConfig`, then `buildGraphFromConfig`, then
// `solidUi.slots.appCssSource`), so the contribution wiring is exercised and
// not just the renderer. A Tailwind build over the emitted sheet then decides
// what the vocabulary resolves to. The `b` checks read the plugin's own source
// against ui-core's roster and matrices: every cell they compare against is
// produced by calling the ui-core cva rather than written out here.
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
// The graph discovers the plugin by package name, which resolves to `dist/`,
// so the suite takes the same instance or its slots are strangers to the
// graph. `pnpm check` builds `dist/` first; the codegen helpers stay source.
import { solidUi } from "@fcalell/plugin-solid-ui";
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
import {
	CLOSED_PROPS,
	componentDir,
	rosterEntries,
} from "@fcalell/ui-core/roster";
import type { Theme } from "@fcalell/ui-core/schema";
import {
	INVARIANT_COLORS,
	PER_MODE_COLORS,
	SHADOW_LEVELS,
	SPACING_RUNGS,
	STATUS_STATES,
	TYPE_ROLES,
} from "@fcalell/ui-core/tokens";
import * as variants from "@fcalell/ui-core/variants";
import {
	avatar,
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
} from "@fcalell/ui-core/variants";
import { Node, Project, SyntaxKind } from "ts-morph";
import { aggregateAppCss } from "../src/node/codegen.ts";
import * as solidUiCss from "../src/node/css-escape.ts";
import { runGeometryGate } from "../src/node/gate.ts";
import { darkLayer } from "../src/node/theme.ts";
import { type SolidUiOptions, solidUiOptionsSchema } from "../src/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const fixtureDir = resolve(here, "fixture");
const globalsPath = resolve(pkgDir, "src/ui/globals.css");

// The five tokens the web owns on top of the contract, spelled out here rather
// than imported so the check is a second opinion and not a mirror of the
// emitter.
const WEB_ONLY_NAMES = [
	"--ease-ui",
	"--duration-fast",
	"--duration-base",
	"--animate-content-show",
	"--animate-content-hide",
];

// A Tailwind build must emit nothing for these and a declaration for those.
const OFF_CONTRACT = [
	"bg-primary",
	"text-muted-foreground",
	"border-border",
	"text-sm",
	"text-4xl",
	"text-h1",
	"text-callout",
	"rounded-lg",
	"rounded-control",
	"rounded-xl",
	"shadow-md",
	"shadow-1",
	"p-card",
	"gap-gutter",
	"bg-red-500",
	"bg-ink-1",
	"bg-surface-2",
	"text-interactive",
	"max-w-md",
	"font-serif",
];

const ON_CONTRACT = [
	"bg-canvas",
	"bg-group",
	"bg-accent",
	"bg-accent-soft",
	"bg-avatar-5",
	"text-on-accent",
	"text-ink-meta",
	"text-tint",
	"border-edge",
	"bg-scrim",
	"bg-thumb",
	"text-title",
	"leading-title",
	"tracking-title",
	"text-label",
	"text-mono",
	"font-mono",
	"font-sans",
	"gap-row",
	"gap-inset",
	"p-section",
	"min-h-11",
	"rounded-group",
	"rounded-sheet",
	"rounded-full",
	"shadow-float",
	"shadow-sheet",
	"w-rail",
	"max-w-reading",
	"p-4",
];

// The responsive variants are the three breakpoints and nothing else.
const ON_VARIANTS = ["tablet:flex", "desktop:flex-row", "wide:block"];
const OFF_VARIANTS = ["sm:flex", "md:flex", "lg:flex", "xl:flex"];

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
		...ON_VARIANTS,
		...OFF_VARIANTS,
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

const THEME: Theme = { accentHue: 120 };
const resolved = deriveTheme(THEME);

const sheet = await emit({ theme: THEME });
const darkSeeded = await emit({ theme: { ...THEME, defaultMode: "dark" } });
const noFonts = await emit({ theme: THEME, fonts: [] });
const reFonted = await emit({
	theme: { ...THEME, fonts: { sans: "Inter Variable", mono: "Menlo" } },
});

const themeDecls = declarations(blockBody(sheet, "@theme"));
const themeMap = new Map(themeDecls);
const globals = readFileSync(globalsPath, "utf8");

const built = build(sheet, "app");
const builtNoFonts = build(noFonts, "app-no-fonts");

const unbalancedPair = await asyncRejection(() =>
	emit({
		theme: {
			overrides: {
				scales: { "--radius-group": "calc(1px", "--radius-sheet": "2px)" },
			},
		},
	}),
);

// ── The geometry gate, resolved through the graph and executed ──────

const gateFixtureDir = resolve(fixtureDir, "gate");

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

// ── The words provider, resolved through the graph ──────────────────

const ENGLISH_PROVIDERS = await (async () => {
	const config = defineConfig({
		app: { name: "verify", domain: "example.com" },
		plugins: [vite(), solid(), solidUi({})],
	});
	const { graph } = await buildGraphFromConfig({ config, cwd: fixtureDir });
	return graph.resolve(solid.slots.providers);
})();

const TRANSLATED_PROVIDERS = await (async () => {
	const { ENGLISH } = await import("@fcalell/ui-core/tokens");
	const config = defineConfig({
		app: { name: "verify", domain: "example.com" },
		plugins: [
			vite(),
			solid(),
			solidUi({ words: { ...ENGLISH, send: "Envoyer" } }),
		],
	});
	const { graph } = await buildGraphFromConfig({ config, cwd: fixtureDir });
	return graph.resolve(solid.slots.providers);
})();

// ── Criteria ────────────────────────────────────────────────────────

check("a2", "render order and the declaration boundary", () => {
	const source = sheet.indexOf('@source "../src";');
	const firstImport = sheet.indexOf("@import ");
	const firstBlock = sheet.indexOf("@theme {");
	const firstLayer = sheet.indexOf("@layer ");
	assert(firstImport >= 0 && firstImport < source, "@import after @source");
	assert(source < firstBlock, "@source after the first block");
	assert(firstBlock < firstLayer, "a block after the first @layer");
	assert(
		sheet.includes("@utility shadow-float {"),
		"no @utility block emitted",
	);

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

	const poisoned: ResolvedTheme = {
		...resolved,
		colors: {
			...resolved.colors,
			dark: { ...resolved.colors.dark, canvas: "red; }" },
		},
	};

	const base = { imports: [], blocks: [], layers: [] };
	const messages = [
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
						name: "shadow-float",
						declarations: { "box shadow": "0 0 0" },
					},
				],
			}),
		),
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

check("a5", "the two shadows ship as utilities", () => {
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
	assert(
		(sheet.match(/@utility /g) ?? []).length === SHADOW_LEVELS.length,
		"the sheet carries a third @utility block",
	);
	return "shadow-float and shadow-sheet emit a box-shadow";
});

check("a6", "the build resolves the contract and nothing else", () => {
	const alive = OFF_CONTRACT.filter((name) => rule(built, name) !== undefined);
	assert(alive.length === 0, `off-contract classes still compile: ${alive}`);
	const dead = ON_CONTRACT.filter((name) => rule(built, name) === undefined);
	assert(dead.length === 0, `contract classes compile to nothing: ${dead}`);
	const deadVariants = ON_VARIANTS.filter((name) => !emitted(built, name));
	assert(
		deadVariants.length === 0,
		`breakpoint variants unreachable: ${deadVariants}`,
	);
	const aliveVariants = OFF_VARIANTS.filter((name) => emitted(built, name));
	assert(
		aliveVariants.length === 0,
		`stock breakpoints survive: ${aliveVariants}`,
	);
	assert(
		built.includes("(width >= 768px)"),
		"tablet: is not the 768 breakpoint",
	);
	return `${OFF_CONTRACT.length} probes emit nothing, ${ON_CONTRACT.length} emit a declaration, 3 breakpoints on and 4 off`;
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
			/--color-(primary|secondary|muted|destructive|background|foreground|card|popover|border|input|ring|success|warning|white|black)\s*:/,
		],
		["a tailwindcss import", /@import\s+"tailwindcss"/],
		["a @theme block", /@theme\s*\{/],
		["a retired ink token", /--color-ink-[1-4]\b/],
	] as const) {
		assert(!pattern.test(globals), `globals.css still declares ${what}`);
	}
	for (const [what, pattern] of [
		["@source", /@source\s+"\.\/"/],
		["the dark variant", /@custom-variant\s+dark/],
		["the base layer", /@layer\s+base\s*\{/],
		[
			"the sans family on html",
			/html\s*\{[^}]*font-family:\s*var\(--font-sans\)/,
		],
	] as const) {
		assert(pattern.test(globals), `globals.css lost ${what}`);
	}
	const keyframes = globals.match(/@keyframes\s+[a-z-]+/g) ?? [];
	assert(
		keyframes.length === 2,
		`expected 2 keyframe blocks, got ${keyframes.length}`,
	);
	for (const token of ["--color-edge", "--color-canvas", "--color-ink"]) {
		assert(
			globals.includes(`var(${token})`),
			`the base layer never reads ${token}`,
		);
	}
	return "2 keyframes, the dark variant, a contract-bound base layer, the sans family";
});

check("a9", "the families come from the knob and survive fonts: []", () => {
	for (const [role, expected] of [
		["sans", "ui-sans-serif"],
		["mono", '"JetBrains Mono Variable", ui-monospace'],
	] as const) {
		const declaration = declarationMap(blockBody(noFonts, "@theme")).get(
			`--font-${role}`,
		);
		assert(
			declaration?.includes(expected),
			`--font-${role} carries no stack: ${declaration}`,
		);
		assert(
			builtNoFonts.includes(expected.split(",")[0] ?? expected),
			`the built sheet never resolves --font-${role} to a real stack`,
		);
	}
	assert(!/--ui-font-/.test(noFonts), "a --ui-font-* token survives");
	const fonted = declarationMap(blockBody(reFonted, "@theme"));
	assert(
		fonted.get("--font-sans")?.startsWith('"Inter Variable", ui-sans-serif'),
		`--font-sans does not read the knob: ${fonted.get("--font-sans")}`,
	);
	assert(
		fonted.get("--font-mono")?.startsWith('"Menlo", ui-monospace'),
		`--font-mono does not read the knob: ${fonted.get("--font-mono")}`,
	);
	assert(rule(builtNoFonts, "p-4") !== undefined, "p-4 resolves to nothing");
	return "sans and mono read the knob ahead of a real fallback stack; p-4 resolves";
});

check("a10", "the validators are one shared boundary", () => {
	assert(cssVarName("--color-*") === "--color-*", "--color-* is rejected");
	assert(
		cssVarName("--text-title--line-height") === "--text-title--line-height",
		"the Tailwind modifier form is rejected",
	);
	rejection(() => cssTokenValue("red /* x"));
	rejection(() => cssVarName("--bad name"));
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
	const source = readFileSync(
		resolve(pkgDir, "src/node/css-escape.ts"),
		"utf8",
	);
	assert(
		source.includes("@fcalell/cli/css"),
		"css-escape.ts does not read the shared boundary",
	);
	assert(
		!/\bthrow\b/.test(source),
		"css-escape.ts throws its own validation error",
	);
	assert(
		!/=\s*\/\^/.test(source),
		"css-escape.ts declares its own validation pattern",
	);
	for (const name of ["cssVarName", "cssTokenValue"]) {
		assert(
			new RegExp(`${name}\\s*=[^;]*${name}Base\\(`).test(source),
			`css-escape.ts does not delegate ${name} to the shared implementation`,
		);
	}
	for (const value of ["calc(1px", "2px)"])
		rejection(() => cssTokenValue(value));
	assert(
		unbalancedPair.includes("--radius-group"),
		`the theme schema does not name the offending key: ${unbalancedPair}`,
	);
	return "widened name grammar, comment delimiters and unbalanced parens rejected, the wrapper delegates";
});

check("a11", "the words provider mounts from the option alone", () => {
	const english = ENGLISH_PROVIDERS.filter(
		(spec) => spec.wrap?.identifier === "WordsProvider",
	);
	assert(english.length === 0, "an unset words option still mounts a provider");
	const translated = TRANSLATED_PROVIDERS.filter(
		(spec) => spec.wrap?.identifier === "WordsProvider",
	);
	assert(
		translated.length === 1,
		`expected one WordsProvider, got ${translated.length}`,
	);
	const spec = translated[0];
	assert(spec, "no provider");
	const words = spec.wrap?.props?.find((prop) => prop.name === "words")?.value;
	assert(
		words && words.kind === "object",
		"the provider carries no words object",
	);
	const send = words.properties.find((prop) => prop.key === "send")?.value;
	assert(
		send && send.kind === "string" && send.value === "Envoyer",
		"the translated word did not reach the entry",
	);
	assert(
		spec.imports.some(
			(imp) => imp.source === "@fcalell/plugin-solid-ui/lib/words",
		),
		"the provider is not imported from lib/words",
	);
	const shortWords = solidUiOptionsSchema.safeParse({ words: { send: "x" } });
	assert(!shortWords.success, "a partial words object was accepted");
	return `no provider for English, one for ${words.properties.length} translated words, partial words rejected`;
});

// ── The component surface ───────────────────────────────────────────

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

// The files that name a class: the components, the libs and the templates.
// `src/node` renders the sheet and names no utility.
const CLASSED = ["src/ui", "templates"].flatMap((dir) =>
	walk(resolve(pkgDir, dir), [".ts", ".tsx", ".css"]),
);

const COMPONENTS_DIR = resolve(pkgDir, "src/ui/components");
const COMPONENT_FILES = walk(COMPONENTS_DIR, [".ts", ".tsx"]);
const STYLED_FILES = [
	...COMPONENT_FILES,
	...walk(resolve(pkgDir, "src/ui/lib"), [".ts", ".tsx"]),
];
const styledSources = new Map(
	STYLED_FILES.map((path) => [
		relative(pkgDir, path),
		readFileSync(path, "utf8"),
	]),
);

// The retired vocabulary. Bare `accent` is absent on purpose: it is a contract
// token, not shadcn's.
const RETIRED: Array<[string, RegExp]> = [
	[
		"a shadcn colour class",
		/\b(bg|text|border|border-[lrtbxy]|ring|fill|stroke|from|to|via|outline|divide|placeholder|caret|shadow|decoration)-(primary|secondary|muted|destructive|success|warning|border|input|ring|background|foreground|card|popover)(-foreground)?\b/,
	],
	["accent-foreground", /\baccent-foreground\b/],
	["a t-shirt type size", /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/],
	["a retired type role", /\btext-(h1|h2|h3|callout|caption|micro)\b/],
	["an off-scale radius", /\brounded-(xs|sm|lg|md|control|xl)\b/],
	["a retired shadow", /\bshadow-(xs|sm|md|lg|xl|1|2|3)\b/],
	["a retired rung", /\b(p|px|py|gap|m|mx|my)-(card|gutter)\b/],
	["a retired ink token", /\b(text|bg|border)-ink-[1-4]\b/],
	["a retired surface token", /\b(bg|border)-surface-[23]\b/],
	["a retired edge token", /\b(bg|border|divide)-edge-2\b/],
	[
		"a retired hue token",
		/\b(text|bg|border|outline)-(brand|interactive|accent-ink)(-soft)?\b/,
	],
	["bg-black", /\bbg-black\b/],
];

// ── The matrices, read back off the cvas ────────────────────────────

const TEXT_ROLES = [...TYPE_ROLES];
const FAMILIES: Family[] = [
	{ name: "TEXT", cva: text as AnyCva, axes: { role: TEXT_ROLES } },
	{
		name: "TEXT_STRONG",
		cva: textStrong as AnyCva,
		axes: { role: TEXT_ROLES },
	},
	{
		name: "BUTTON",
		cva: button as AnyCva,
		axes: { act: ["primary", "secondary", "destructive"] },
	},
	{
		name: "BUTTON_LABEL",
		cva: buttonLabel as AnyCva,
		axes: { act: ["primary", "secondary", "destructive"] },
	},
	{
		name: "STATUS",
		cva: status as AnyCva,
		axes: { state: [...STATUS_STATES] },
	},
	{
		name: "FIELD",
		cva: field as AnyCva,
		axes: {
			kind: ["text", "search", "code"],
			state: ["default", "focused", "error"],
		},
	},
	{
		name: "ROW",
		cva: row as AnyCva,
		axes: { state: ["rest", "pressed", "selected"] },
	},
	{
		name: "SWITCH",
		cva: switchTrack as AnyCva,
		axes: { state: ["off", "on"] },
	},
	{
		name: "CHECKBOX",
		cva: checkbox as AnyCva,
		axes: { state: ["unchecked", "checked"] },
	},
	{
		name: "SEGMENT",
		cva: segment as AnyCva,
		axes: { state: ["idle", "selected"] },
	},
	{
		name: "BANNER",
		cva: banner as AnyCva,
		axes: { kind: ["note", "warn", "danger"] },
	},
	{
		name: "DIFF_LINE",
		cva: diffLine as AnyCva,
		axes: { kind: ["context", "added", "removed", "header"] },
	},
	{
		name: "MESSAGE",
		cva: message as AnyCva,
		axes: { author: ["you", "other", "system"] },
	},
	{
		name: "AVATAR",
		cva: avatar as AnyCva,
		axes: { step: ["1", "2", "3", "4", "5", "6", "7", "8"] },
	},
	{
		name: "PLACE",
		cva: place as AnyCva,
		axes: { state: ["idle", "selected"] },
	},
	{ name: "RHYTHM", cva: rhythm as AnyCva, axes: { unit: [...SPACING_RUNGS] } },
];

const FAMILY_ROSTER =
	"TEXT TEXT_STRONG BUTTON BUTTON_LABEL STATUS FIELD ROW SWITCH CHECKBOX SEGMENT BANNER DIFF_LINE MESSAGE AVATAR PLACE RHYTHM";

const CELLS = matrixCells(FAMILIES);
const CELL_CLASSES = new Map<string, string>();
for (const [path, cell] of CELLS) {
	for (const name of cell)
		if (!CELL_CLASSES.has(name)) CELL_CLASSES.set(name, path);
}
// The single-cell constants join the cell map, so a prefixed class can mirror
// one of them too.
for (const [name, value] of Object.entries(
	variants as unknown as Record<string, unknown>,
)) {
	if (typeof value !== "string" || !/^[A-Z_]+$/.test(name)) continue;
	for (const cls of classes(value))
		if (!CELL_CLASSES.has(cls)) CELL_CLASSES.set(cls, name);
}
const CELL_ROOTS = new Set(
	[...CELL_CLASSES.keys()].map((name) => name.split("-")[0]),
);
const CONTRACT_COLORS: string[] = [...PER_MODE_COLORS, ...INVARIANT_COLORS];

// ── Source shredding ────────────────────────────────────────────────

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

// A variant class emits as `.tablet\:flex`, so the selector is matched by what
// may *not* follow it rather than by a fixed delimiter.
function emitted(css: string, name: string): boolean {
	const escaped = name
		.replace(/[.[\]()/%:!*]/g, (char) => `\\${char}`)
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`\\.${escaped}(?![\\w\\\\-])`).test(css);
}

// ── The roster, through the type checker ────────────────────────────

const project = new Project({
	tsConfigFilePath: resolve(pkgDir, "tsconfig.json"),
	skipAddingFilesFromTsConfig: true,
});
for (const path of COMPONENT_FILES) project.addSourceFileAtPath(path);
project.resolveSourceFileDependencies();

function propsOf(name: string): { file: string; props: Map<string, string> } {
	const file = resolve(COMPONENTS_DIR, componentDir(name), "index.tsx");
	const source = project.getSourceFileOrThrow(file);
	const alias = source.getTypeAliasOrThrow(`${name}Props`);
	assert(alias.isExported(), `${name}Props is not exported`);
	assert(source.getExportedDeclarations().has(name), `${name} is not exported`);
	const props = new Map<string, string>();
	for (const symbol of alias.getType().getProperties()) {
		const declaration = symbol.getDeclarations()[0];
		props.set(
			symbol.getName(),
			declaration ? symbol.getTypeAtLocation(declaration).getText() : "?",
		);
	}
	return { file: relative(pkgDir, file), props };
}

// ── Criteria ────────────────────────────────────────────────────────

check("b0", "the matrices read back off the cvas are the real ones", () => {
	assert(CELLS.size > 0, "no matrix cell was recovered from any cva");
	const roster = FAMILIES.map((family) => family.name).join(" ");
	assert(roster === FAMILY_ROSTER, `the family roster drifted: ${roster}`);
	for (const act of ["primary", "secondary", "destructive"] as const) {
		const ink = `text-${buttonContentTone(act)}`;
		assert(
			CELL_CLASSES.has(ink),
			`BUTTON_LABEL ${act}: ${ink} is in no recovered cell`,
		);
	}
	for (const state of STATUS_STATES) {
		const ink = `text-${statusContentTone(state)}`;
		assert(
			CELLS.get(`STATUS.state.${state}`)?.has(ink),
			`STATUS ${state}: expected ${ink}`,
		);
	}
	return `${CELLS.size} cells over ${FAMILIES.length} matrices, ${CELL_CLASSES.size} distinct classes with the constants`;
});

check("b1", "the retired vocabulary is gone from src and templates", () => {
	for (const name of ["bg-primary", "text-muted-foreground", "border-border"]) {
		assert(RETIRED[0]?.[1].test(name), `the pattern misses ${name}`);
	}
	for (const name of ["bg-accent", "text-on-accent", "bg-accent-soft"]) {
		for (const [what, pattern] of RETIRED) {
			assert(!pattern.test(name), `"${what}" matches the contract's ${name}`);
		}
	}
	const hits: string[] = [];
	for (const path of SWEPT) {
		const source = readFileSync(path, "utf8");
		for (const [what, pattern] of RETIRED) {
			const found = source.match(new RegExp(pattern, "g"));
			if (found)
				hits.push(`${relative(pkgDir, path)}: ${what} (${found.join(", ")})`);
		}
	}
	assert(
		hits.length === 0,
		`retired vocabulary survives:\n  ${hits.join("\n  ")}`,
	);
	return `${SWEPT.length} files clear of ${RETIRED.length} retired patterns`;
});

check("b2", "leading and tracking appear only as a role", () => {
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

check(
	"b3",
	"the components render through the matrices, no cell copied",
	() => {
		const required: Record<string, string[]> = {
			text: ["text"],
			button: ["button", "buttonLabel"],
			status: ["status"],
			input: ["field"],
			"text-area": ["field"],
			switch: ["switchTrack"],
			checkbox: ["checkbox"],
			avatar: ["avatar"],
			"list-row": ["row", "text", "textStrong"],
			"definition-row": ["row", "text"],
			"segmented-control": ["segment"],
			banner: ["banner"],
			diff: ["diffLine"],
			message: ["message"],
			shell: ["place"],
			form: ["rhythm"],
			toolbar: ["rhythm"],
			"action-bar": ["rhythm"],
			columns: ["rhythm"],
		};
		for (const [dir, callees] of Object.entries(required)) {
			const source = read(`src/ui/components/${dir}/index.tsx`);
			assert(
				source.includes("@fcalell/ui-core/variants"),
				`${dir} does not import the matrices`,
			);
			for (const callee of callees) {
				assert(
					callArguments(source, callee).length > 0,
					`${dir} never calls ${callee}()`,
				);
			}
		}
		const source = read("src/ui/components/button/index.tsx");
		assert(
			callArguments(source, "cn").some(
				(args) => args.includes("button(") && args.includes("buttonLabel("),
			),
			"button does not compose button and buttonLabel in one cn()",
		);
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
		return `${Object.keys(required).length} files call their family's cvas, button composes two tables on one node, no cell copied`;
	},
);

// The ground a primary button moves to on hover: no matrix models a button's
// interaction ground, and the ink-meta step is the only in-contract step
// under a filled ink control.
const OVERLAY_GROUNDS = ["bg-ink-meta"];

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
		assert(
			!CELL_CLASSES.has(ground),
			`${ground} is a matrix cell now, so it does not belong on this list`,
		);
		assert(reached.has(ground), `${ground} is listed but never used`);
	}
	for (const [token, path] of [
		["border-tint", "FIELD.state.focused"],
		["border-danger", "FIELD.state.error"],
	] as const) {
		assert(CELLS.get(path)?.has(token), `${path} no longer holds ${token}`);
	}
	assert(
		checked.some((entry) => entry.startsWith("focus-within:border-tint")),
		"no component reaches FIELD's focused cell by prefix",
	);
	assert(
		checked.some((entry) => entry.startsWith("aria-invalid:border-danger")),
		"no component reaches FIELD's error cell by prefix",
	);
	return `${checked.length} prefixed classes resolved against a cell, ${OVERLAY_GROUNDS.length} named overlay ground`;
});

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
	"pt",
	"pb",
	"min-h",
	"max-h",
	"h",
	"w",
	"max-w",
	"min-w",
	"overflow",
	"shadow",
	"font",
	"leading",
	"tracking",
	"duration",
	"ease",
	"animate",
	"fill",
	"divide",
];

check("b-resolves", "every class the plugin names compiles", () => {
	const named = new Set<string>();
	for (const path of CLASSED) {
		const source = readFileSync(path, "utf8");
		for (const literal of literals(source)) {
			for (const token of classes(literal)) {
				if (token.includes("[") || token.includes("]")) continue;
				const bare = token.slice(token.lastIndexOf(":") + 1);
				if (LOOK_ROOTS.some((root) => bare.startsWith(`${root}-`)))
					named.add(token);
			}
		}
	}
	const dead = [...named].filter((name) => !emitted(built, name));
	assert(
		dead.length === 0,
		`classes that compile to nothing: ${dead.sort().join(", ")}`,
	);
	const unscanned = [...CELL_CLASSES.keys()].filter(
		(name) => !emitted(built, name),
	);
	assert(
		unscanned.length === 0,
		`matrix cells the build never sees: ${unscanned.sort().join(", ")}`,
	);
	const orphans = new Set<string>();
	for (const path of SWEPT) {
		const source = readFileSync(path, "utf8");
		for (const match of source.matchAll(
			/var\(\s*(--(?:color|font|spacing)-[a-z0-9-]+)/g,
		)) {
			const name = match[1];
			if (name && !themeMap.has(name)) orphans.add(name);
		}
	}
	assert(
		orphans.size === 0,
		`named tokens the @theme block does not emit: ${[...orphans].sort().join(", ")}`,
	);
	return `${named.size} classes across ${CLASSED.length} files, ${CELL_CLASSES.size} cells, and every named token resolve`;
});

check("b7", "every closed channel is never and no channel survives", () => {
	const hits: string[] = [];
	for (const [, name] of rosterEntries()) {
		const { file, props } = propsOf(name);
		for (const channel of CLOSED_PROPS) {
			const type = props.get(channel);
			if (type !== "undefined")
				hits.push(`${file}: ${channel} is ${type ?? "open"}`);
		}
	}
	for (const path of COMPONENT_FILES) {
		const raw = readFileSync(path, "utf8");
		const name = relative(pkgDir, path);
		const code = raw
			.split("\n")
			.map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? "" : line))
			.join("\n");
		for (const match of code.matchAll(
			/\b(?:className|classList|contentClass|listClass|containerClass)\b/g,
		)) {
			const line = code.slice(0, match.index ?? 0).split("\n").length;
			hits.push(`${name}:${line}: a surviving channel token`);
		}
		for (const match of code.matchAll(
			/\b(?:local|props|rest|others|merged)\.(?:class|className|classList|style)\b/g,
		)) {
			const line = code.slice(0, match.index ?? 0).split("\n").length;
			hits.push(`${name}:${line}: a props-sourced style value`);
		}
	}
	assert(hits.length === 0, `the closure leaks:\n  ${hits.join("\n  ")}`);
	return `${rosterEntries().length} props types close ${CLOSED_PROPS.length} channels as never; no channel token in ${COMPONENT_FILES.length} files`;
});

check(
	"b8",
	"the closure fixture proves every channel at the type layer",
	() => {
		const fixturePath = resolve(fixtureDir, "closure.tsx");
		const source = readFileSync(fixturePath, "utf8");
		const directives = source.match(/@ts-expect-error/g) ?? [];
		const expected = rosterEntries().length * CLOSED_PROPS.length;
		assert(
			directives.length >= expected,
			`only ${directives.length} @ts-expect-error sites, expected ${expected}`,
		);
		for (const token of [
			'class="x"',
			"style={{}}",
			"classList={{}}",
			'className="x"',
		]) {
			assert(source.includes(token), `the fixture never passes ${token}`);
		}
		for (const dir of readdirSync(COMPONENTS_DIR)) {
			assert(
				source.includes(`/components/${dir}"`),
				`the fixture never imports components/${dir}`,
			);
		}
		execFileSync(binPath(pkgDir, "tsc"), ["--noEmit"], {
			cwd: pkgDir,
			stdio: "pipe",
		});
		return `${directives.length} closures under @ts-expect-error, tsc --noEmit exits 0`;
	},
);

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
		'src/page.tsx:3  class attribute on non-host tag "Group"',
	].join("\n");
	assert(
		gateFailure.message === expected,
		`unexpected message:\n${gateFailure.message}`,
	);
	return "pass and src-less trees clean, the fail tree throws GEOMETRY_GATE naming both violations in one run";
});

check(
	"b-roster",
	"every component is the roster's, with exactly its props",
	() => {
		const entries = rosterEntries();
		const dirs = new Set(readdirSync(COMPONENTS_DIR));
		for (const [, name, props] of entries) {
			const dir = componentDir(name);
			assert(dirs.has(dir), `no directory for ${name} (${dir})`);
			dirs.delete(dir);
			const expected = new Set<string>([...props, ...CLOSED_PROPS]);
			const actual = new Set(propsOf(name).props.keys());
			const missing = [...expected].filter((prop) => !actual.has(prop));
			const extra = [...actual].filter((prop) => !expected.has(prop));
			assert(
				missing.length === 0 && extra.length === 0,
				`${name}Props drifts from the roster: missing [${missing}], extra [${extra}]`,
			);
		}
		assert(
			dirs.size === 0,
			`component directories the roster does not name: ${[...dirs].join(", ")}`,
		);
		return `${entries.length} components, each with its roster props and the ${CLOSED_PROPS.length} closed channels`;
	},
);

check("b-words", "no component draws a word of its own", () => {
	const hits: string[] = [];
	for (const path of COMPONENT_FILES) {
		const source = project.getSourceFileOrThrow(path);
		const name = relative(pkgDir, path);
		source.forEachDescendant((node) => {
			if (Node.isJsxText(node) && /[A-Za-z]/.test(node.getText())) {
				hits.push(
					`${name}:${node.getStartLineNumber()}: JSX text "${node.getText().trim()}"`,
				);
			}
			if (Node.isJsxAttribute(node)) {
				const attr = node.getNameNode().getText();
				const initializer = node.getInitializer();
				if (
					(attr === "aria-label" ||
						attr === "title" ||
						attr === "placeholder") &&
					initializer &&
					Node.isStringLiteral(initializer)
				) {
					hits.push(
						`${name}:${node.getStartLineNumber()}: ${attr}="${initializer.getLiteralText()}"`,
					);
				}
			}
		});
	}
	assert(
		hits.length === 0,
		`a component speaks for itself:\n  ${hits.join("\n  ")}`,
	);
	return `${COMPONENT_FILES.length} files: every drawn word is a prop or a words.* read`;
});

const NOUNS = [
	"stead",
	"inbox",
	"lane",
	"job",
	"epic",
	"card",
	"story",
	"brief",
	"repo",
	"sailward",
	"trip",
	"marina",
];

check("b-nouns", "no product noun in src", () => {
	const hits: string[] = [];
	const pattern = new RegExp(`\\b(${NOUNS.join("|")})s?\\b`, "i");
	for (const path of walk(resolve(pkgDir, "src"), [".ts", ".tsx", ".css"])) {
		const lines = readFileSync(path, "utf8").split("\n");
		lines.forEach((line, index) => {
			if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
			const match = pattern.exec(line);
			if (match)
				hits.push(`${relative(pkgDir, path)}:${index + 1}: ${match[0]}`);
		});
	}
	assert(hits.length === 0, `a product noun survives:\n  ${hits.join("\n  ")}`);
	return `${NOUNS.length} nouns absent from src`;
});

// The fixture's ts-morph program is also the roster's type oracle: pin that
// `SyntaxKind` resolved, so a ts-morph upgrade that changes the AST shape
// fails here and not silently in b-words.
assert(typeof SyntaxKind.JsxText === "number", "ts-morph lost JsxText");

// ── Report ──────────────────────────────────────────────────────────

report();
