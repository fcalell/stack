// Reproduction harness for the `.stack/app.css` emission spine.
//
//   pnpm --filter @fcalell/plugin-solid-ui verify
//
// Every acceptance criterion in `.helm/board/epics/001-ui-core/` story 03
// section A is one check below, so a failing check id traces back to a
// criterion. The sheet under test is resolved through the real plugin graph —
// `defineConfig` → `buildGraphFromConfig` → `solidUi.slots.appCssSource` — so
// the contribution wiring is exercised, not just the renderer. A Tailwind
// build over the emitted sheet then decides what the vocabulary resolves to.
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@fcalell/cli";
import { buildGraphFromConfig } from "@fcalell/cli/build-graph";
import { cssTokenValue, cssVarName } from "@fcalell/cli/css";
import { solid } from "@fcalell/plugin-solid";
import { vite } from "@fcalell/plugin-vite";
import { deriveTheme } from "@fcalell/ui-core/derive";
import {
	modeTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import type { Theme } from "@fcalell/ui-core/schema";
import { PER_MODE_COLORS, SHADOW_LEVELS } from "@fcalell/ui-core/tokens";
import { solidUi } from "../src/index.ts";
import { aggregateAppCss } from "../src/node/codegen.ts";
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

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function normalize(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

// The body of the first block whose header matches, brace-balanced so a nested
// rule (`@layer base { .dark { … } }`) comes back whole.
function blockBody(css: string, header: string, from = 0): string {
	const start = css.indexOf(header, from);
	assert(start >= 0, `emitted sheet has no "${header}"`);
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

// Declarations in source order. Property names are not restricted to custom
// properties: a `@utility` body and the mode block also carry plain CSS
// properties.
function declarations(body: string): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	for (const match of body.matchAll(
		/(--[A-Za-z0-9_*-]+|[a-z-]+)\s*:\s*([^;{}]+);/g,
	)) {
		const [, property, value] = match;
		if (property && value) out.push([property, normalize(value)]);
	}
	return out;
}

function declarationMap(body: string): Map<string, string> {
	return new Map(declarations(body));
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

function rejection(run: () => unknown): string {
	try {
		run();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("expected a throw, got none");
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
function prepareFixture(): { stackDir: string; srcDir: string } {
	const stackDir = resolve(fixtureDir, ".stack");
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
	return { stackDir, srcDir };
}

function build(sheet: string, name: string): string {
	const { stackDir } = prepareFixture();
	const inputPath = resolve(stackDir, `${name}.css`);
	const outputPath = resolve(stackDir, `${name}.out.css`);
	writeFileSync(inputPath, sheet);
	const candidates = [
		resolve(pkgDir, "node_modules/.bin/tailwindcss"),
		resolve(pkgDir, "../../node_modules/.bin/tailwindcss"),
	];
	const bin = candidates.find((path) => existsSync(path));
	assert(bin, `no tailwindcss binary at ${candidates.join(" or ")}`);
	execFileSync(bin, ["--input", inputPath, "--output", outputPath], {
		cwd: stackDir,
		stdio: "pipe",
	});
	return readFileSync(outputPath, "utf8");
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

	const base = { imports: [], layers: [] };
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
	];
	for (const message of messages) {
		assert(
			message.includes("solid-ui"),
			`error does not name solid-ui: ${message}`,
		);
	}
	return `${inspected} declarations through cssVarName / cssTokenValue, 3 malformed inputs rejected by name`;
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
	for (const path of [
		"src/node/css-escape.ts",
		"../native-ui/src/node/css.ts",
	]) {
		const source = readFileSync(resolve(pkgDir, path), "utf8");
		assert(
			source.includes("@fcalell/cli/css"),
			`${path} does not read the shared boundary`,
		);
		for (const name of ["cssVarName", "cssTokenValue"]) {
			assert(
				!new RegExp(`function\\s+${name}\\b`).test(source),
				`${path} declares its own ${name}`,
			);
		}
	}
	return "widened name grammar, comment delimiters rejected, no second copy";
});

// ── Report ──────────────────────────────────────────────────────────

let failed = 0;
for (const result of results) {
	if (!result.ok) failed++;
	console.log(
		`${result.ok ? "PASS" : "FAIL"}  ${result.id}  ${result.name}\n        ${result.detail}`,
	);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
