import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { solid } from "@fcalell/plugin-solid";
import { vite } from "@fcalell/plugin-vite";
import { describe, expect, it } from "vitest";
import { solidUi } from "./index";
import { defaultFonts, type FontEntry } from "./node/fonts";
import { cssImportSchema, cssLayerSchema, solidUiOptionsSchema } from "./types";

// Resolve `@fcalell/plugin-solid`'s on-disk templates dir so `ctx.template()`
// for the solid plugin returns the real shell.html. Without this the HTML
// derivation throws ENOENT because the fake URL scheme has no file backing it.
// Resolve via require.resolve("@fcalell/plugin-solid") → its entry file path,
// then walk up two levels (src/index.ts → plugin root).
const require = createRequire(import.meta.url);
const SOLID_ENTRY = require.resolve("@fcalell/plugin-solid");
// entry lives at `<root>/src/index.ts`; the templates dir sits at `<root>/templates/`.
const SOLID_TEMPLATES = pathToFileURL(
	`${join(dirname(dirname(SOLID_ENTRY)), "templates")}/`,
);

// ── Fixtures ───────────────────────────────────────────────────────

const inter: FontEntry = {
	family: "Inter Variable",
	specifier: "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
	weight: "100 900",
	style: "normal",
	role: "sans",
	fallback: {
		family: "sans-serif",
		ascentOverride: "90%",
		descentOverride: "22%",
		lineGapOverride: "0%",
		sizeAdjust: "107%",
	},
};

const jetbrains: FontEntry = {
	family: "JetBrains Mono Variable",
	specifier:
		"@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
	weight: "100 800",
	style: "normal",
	role: "mono",
	fallback: {
		family: "monospace",
		ascentOverride: "90%",
		descentOverride: "22%",
		lineGapOverride: "0%",
		sizeAdjust: "100%",
	},
};

// ── Harness ────────────────────────────────────────────────────────

const app = { name: "test-app", domain: "example.com" };

const noopLog = {
	info: () => {},
	warn: () => {},
	success: () => {},
	error: () => {},
};

function templateFor(plugin: string, name: string): URL {
	if (plugin === "solid") return new URL(name, SOLID_TEMPLATES);
	return new URL(`file:///tmp/templates/${plugin}/${name}`);
}

function makeCtxFactory(
	perPluginOptions: Record<string, unknown> = {},
): GraphCtxFactory {
	return {
		app,
		cwd: "/tmp/test",
		log: noopLog,
		ctxForPlugin: (name) => ({
			options: perPluginOptions[name] ?? {},
			fileExists: async () => false,
			readFile: async () => "",
			template: (n) => templateFor(name, n),
			scaffold: (n, target) => ({
				source: templateFor(name, n),
				target,
				plugin: name,
			}),
		}),
	};
}

// Collect api + vite + solid + solid-ui plugins through their production
// `.cli.collect(...)` path. Plugin array order is consumer-style and is
// shuffled in some tests below to prove order-invariance.
function collectSolidUiPlugins(
	opts: {
		solidUi?: Parameters<typeof solidUi>[0];
		withSolidUi?: boolean;
		order?: "default" | "reversed" | "ui-first";
	} = {},
): { plugins: GraphPlugin[]; ctxFactory: GraphCtxFactory } {
	const apiCollected = api.cli.collect({ app, options: {} });
	const viteCollected = vite.cli.collect({ app, options: {} });
	const solidCollected = solid.cli.collect({ app, options: {} });
	const solidUiCollected = solidUi.cli.collect({
		app,
		options: opts.solidUi ?? {},
	});

	const apiP: GraphPlugin = {
		name: "api",
		slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: apiCollected.contributes,
	};
	const viteP: GraphPlugin = {
		name: "vite",
		slots: viteCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: viteCollected.contributes,
	};
	const solidP: GraphPlugin = {
		name: "solid",
		slots: solidCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: solidCollected.contributes,
	};
	const solidUiP: GraphPlugin = {
		name: "solid-ui",
		slots: solidUiCollected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: solidUiCollected.contributes,
	};

	const base: GraphPlugin[] =
		opts.withSolidUi === false
			? [apiP, viteP, solidP]
			: [apiP, viteP, solidP, solidUiP];

	let plugins = base;
	if (opts.order === "reversed") plugins = [...base].reverse();
	if (opts.order === "ui-first" && opts.withSolidUi !== false) {
		plugins = [solidUiP, apiP, viteP, solidP];
	}

	const perPluginOptions: Record<string, unknown> = {
		"solid-ui": opts.solidUi ?? {},
	};
	return { plugins, ctxFactory: makeCtxFactory(perPluginOptions) };
}

// ── fonts derivation ──────────────────────────────────────────────

describe("solidUi.slots.fonts", () => {
	it("falls back to defaultFonts (one JetBrains Mono entry)", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const entries = await g.resolve(solidUi.slots.fonts);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.family).toBe("JetBrains Mono Variable");
	});

	it("uses options.fonts when provided", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins({
			solidUi: { fonts: [inter, jetbrains] },
		});
		const g = buildGraph(plugins, ctxFactory);
		const entries = await g.resolve(solidUi.slots.fonts);
		expect(entries.map((f) => f.family)).toEqual([
			"Inter Variable",
			"JetBrains Mono Variable",
		]);
	});

	// fonts: [] is explicit opt-out. Must NOT resurrect defaultFonts at any
	// layer — neither the slot derivation nor the runtime default parameter
	// on `themeFontsPlugin`. The generated vite config must pass [] through.
	it("fonts: [] means no fonts (slot resolves to [], codegen passes [] explicitly)", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins({
			solidUi: { fonts: [] },
		});
		const g = buildGraph(plugins, ctxFactory);
		const entries = await g.resolve(solidUi.slots.fonts);
		expect(entries).toEqual([]);

		const calls = await g.resolve(vite.slots.pluginCalls);
		const fontsCall = calls.find(
			(c) =>
				c.kind === "call" &&
				c.callee.kind === "identifier" &&
				c.callee.name === "themeFontsPlugin",
		);
		if (fontsCall?.kind !== "call") throw new Error("expected call");
		// Must be exactly one argument: the empty array literal. An empty
		// args list would hit `themeFontsPlugin`'s (formerly default)
		// parameter at runtime and inject JetBrainsMono anyway.
		expect(fontsCall.args).toHaveLength(1);
		const arg = fontsCall.args[0];
		if (arg?.kind !== "array") throw new Error("expected array arg");
		expect(arg.items).toEqual([]);
	});

	// And when fonts: [], no --ui-font-* layer is emitted into app.css.
	it("fonts: [] produces no :root { --ui-font-* } layer", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins({
			solidUi: { fonts: [] },
		});
		const g = buildGraph(plugins, ctxFactory);
		const css = await g.resolve(solidUi.slots.appCssSource);
		if (!css) return;
		expect(css).not.toContain("--ui-font-");
	});
});

// ── Vite contributions ────────────────────────────────────────────

describe("solidUi → vite.slots contributions", () => {
	it("contributes tailwindcss + themeFontsPlugin imports and calls", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const imports = await g.resolve(vite.slots.configImports);
		const calls = await g.resolve(vite.slots.pluginCalls);

		expect(imports).toContainEqual(
			expect.objectContaining({
				source: "@tailwindcss/vite",
				default: "tailwindcss",
			}),
		);
		expect(imports).toContainEqual(
			expect.objectContaining({
				source: "@fcalell/plugin-solid-ui/node/fonts",
				named: ["themeFontsPlugin"],
			}),
		);

		const fontsCall = calls.find(
			(c) =>
				c.kind === "call" &&
				c.callee.kind === "identifier" &&
				c.callee.name === "themeFontsPlugin",
		);
		if (fontsCall?.kind !== "call") throw new Error("expected call");
		const arg = fontsCall.args[0];
		if (arg?.kind !== "array") throw new Error("expected array arg");
		// Default fonts ships one entry (JetBrains Mono).
		expect(arg.items).toHaveLength(1);
	});

	it("inlines custom fonts into themeFontsPlugin args", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins({
			solidUi: { fonts: [inter, jetbrains] },
		});
		const g = buildGraph(plugins, ctxFactory);
		const calls = await g.resolve(vite.slots.pluginCalls);
		const fontsCall = calls.find(
			(c) =>
				c.kind === "call" &&
				c.callee.kind === "identifier" &&
				c.callee.name === "themeFontsPlugin",
		);
		if (fontsCall?.kind !== "call") throw new Error("expected call");
		const arg = fontsCall.args[0];
		if (arg?.kind !== "array") throw new Error("expected array");
		expect(arg.items).toHaveLength(2);
		const first = arg.items[0];
		if (first?.kind !== "object") throw new Error("expected object");
		expect(first.properties).toContainEqual(
			expect.objectContaining({
				key: "family",
				value: { kind: "string", value: "Inter Variable" },
			}),
		);
	});
});

// ── App CSS derivation ────────────────────────────────────────────

describe("solidUi.slots.appCssSource", () => {
	it("contains tailwindcss + globals.css imports and a :root layer for roled fonts", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins({
			solidUi: { fonts: [inter, jetbrains] },
		});
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(solidUi.slots.appCssSource);
		expect(src).not.toBeNull();
		if (!src) return;
		expect(src).toContain('@import "tailwindcss"');
		expect(src).toContain('@import "@fcalell/plugin-solid-ui/globals.css"');
		expect(src).toContain(
			'--ui-font-sans: "Inter Variable", "Inter Variable Fallback"',
		);
		expect(src).toContain(
			'--ui-font-mono: "JetBrains Mono Variable", "JetBrains Mono Variable Fallback"',
		);
	});

	it("omits the --ui-font-* layer when no fonts have roles", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins({
			solidUi: { fonts: [{ ...inter, role: undefined }] },
		});
		const g = buildGraph(plugins, ctxFactory);
		const src = await g.resolve(solidUi.slots.appCssSource);
		// Imports still present; layer block absent.
		expect(src).not.toBeNull();
		if (!src) return;
		expect(src).toContain("@import");
		expect(src).not.toContain("@layer base");
	});

	it("emits .stack/app.css into cliSlots.artifactFiles", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).toContain(".stack/app.css");
	});

	// REVIEW #2 fix — solid-ui owns both the `.stack/app.css` artifact and
	// the `import "./app.css"` line in entry.tsx. The two are contributed
	// together so a solid()-only consumer never gets a dangling import.
	it("contributes the './app.css' side-effect import into entry.tsx", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const entryImports = await g.resolve(solid.slots.entryImports);
		expect(entryImports).toContainEqual(
			expect.objectContaining({ source: "./app.css", sideEffect: true }),
		);
		const files = await g.resolve(cliSlots.artifactFiles);
		const entry = files.find((f) => f.path === ".stack/entry.tsx");
		expect(entry?.content).toContain('import "./app.css"');
	});
});

// ── Provider contribution ─────────────────────────────────────────

describe("solidUi → solid.slots.providers", () => {
	it("contributes MetaProvider wrap + Toaster sibling at order 0", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const provs = await g.resolve(solid.slots.providers);
		const meta = provs.find((p) => p.wrap.identifier === "MetaProvider");
		expect(meta).toBeDefined();
		expect(meta?.order).toBe(0);
		expect(meta?.siblings).toContainEqual(
			expect.objectContaining({ kind: "jsx", tag: "Toaster" }),
		);
	});

	it("rendered virtual-providers.tsx nests MetaProvider with Toaster sibling", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const files = await g.resolve(cliSlots.artifactFiles);
		const providers = files.find(
			(f) => f.path === ".stack/virtual-providers.tsx",
		);
		expect(providers).toBeDefined();
		expect(providers?.content).toContain("MetaProvider");
		expect(providers?.content).toContain("Toaster");
	});
});

// ── REVIEW #21 — home scaffold override ───────────────────────────

describe("REVIEW #21 — home scaffold override (solid vs solid-ui)", () => {
	it("solid alone: cli.slots.initScaffolds contains solid's bare home scaffold", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins({
			withSolidUi: false,
		});
		const g = buildGraph(plugins, ctxFactory);
		const scaffolds = await g.resolve(cliSlots.initScaffolds);
		const homes = scaffolds.filter(
			(s) => s.target === "src/app/pages/index.tsx",
		);
		expect(homes).toHaveLength(1);
		expect(homes[0]?.plugin).toBe("solid");
		// solid's template resolves to `<plugins/solid/templates>/home.tsx`.
		expect(homes[0]?.source.pathname).toContain(
			"/plugins/solid/templates/home.tsx",
		);
	});

	it("solid + solid-ui: initScaffolds contains solid-ui's richer home (NOT solid's, NOT a duplicate)", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const scaffolds = await g.resolve(cliSlots.initScaffolds);
		const homes = scaffolds.filter(
			(s) => s.target === "src/app/pages/index.tsx",
		);
		expect(homes).toHaveLength(1);
		expect(homes[0]?.plugin).toBe("solid-ui");
		// solid-ui's template in this test's stub factory is under /tmp/templates.
		expect(homes[0]?.source.pathname).toContain("/solid-ui/home.tsx");
	});

	it("plugin array order does not change the scaffold winner", async () => {
		const results: Array<string | undefined> = [];
		for (const order of ["default", "reversed", "ui-first"] as const) {
			const { plugins, ctxFactory } = collectSolidUiPlugins({ order });
			const g = buildGraph(plugins, ctxFactory);
			const scaffolds = await g.resolve(cliSlots.initScaffolds);
			const homes = scaffolds.filter(
				(s) => s.target === "src/app/pages/index.tsx",
			);
			expect(homes).toHaveLength(1);
			results.push(homes[0]?.plugin);
		}
		expect(new Set(results)).toEqual(new Set(["solid-ui"]));
	});

	// Bug report claimed solid-ui's homeScaffold contribution "fires even
	// when solid-ui is disabled in config." It can't: contributions live
	// on a plugin and the plugin is only collected when it's in
	// config.plugins. The three cases below demonstrate the structural
	// answer — this is case (c): solid-ui alone, no solid. solid-ui's
	// contribution is registered against solid.slots.homeScaffold but
	// nothing reads it (solid is what contributes to cliSlots.initScaffolds
	// via that slot), so the home scaffold just doesn't land — no errors,
	// no surprise files, no bogus CSS. The bug is a false positive.
	it("solid-ui alone (no solid): no home scaffold lands; resolution does not error", async () => {
		// Collect solid-ui without solid. Include api + vite so the graph
		// has a full surface but no solid reader of homeScaffold.
		const apiCollected = api.cli.collect({ app, options: {} });
		const viteCollected = vite.cli.collect({ app, options: {} });
		const solidUiCollected = solidUi.cli.collect({ app, options: {} });
		const plugins = [
			{
				name: "api",
				slots: apiCollected.slots as unknown as Record<string, Slot<unknown>>,
				contributes: apiCollected.contributes,
			},
			{
				name: "vite",
				slots: viteCollected.slots as unknown as Record<string, Slot<unknown>>,
				contributes: viteCollected.contributes,
			},
			{
				name: "solid-ui",
				slots: solidUiCollected.slots as unknown as Record<
					string,
					Slot<unknown>
				>,
				contributes: solidUiCollected.contributes,
			},
		];
		const g = buildGraph(plugins, makeCtxFactory({ "solid-ui": {} }));
		const scaffolds = await g.resolve(cliSlots.initScaffolds);
		const homes = scaffolds.filter(
			(s) => s.target === "src/app/pages/index.tsx",
		);
		// solid is what emits the index.tsx scaffold (by resolving
		// homeScaffold). Without solid in the graph, nothing lands.
		expect(homes).toHaveLength(0);
	});
});

// ── Auto-deps ─────────────────────────────────────────────────────

describe("solidUi dependency declarations", () => {
	it("auto-wires tailwindcss + @tailwindcss/vite into cli slots", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins();
		const g = buildGraph(plugins, ctxFactory);
		const deps = await g.resolve(cliSlots.initDeps);
		const devDeps = await g.resolve(cliSlots.initDevDeps);
		expect(deps.tailwindcss).toBeDefined();
		expect(devDeps["@tailwindcss/vite"]).toBeDefined();
	});
});

// ── REVIEW #6 — fontEntrySchema validation ────────────────────────

describe("solidUiOptionsSchema fonts validation", () => {
	it("accepts a valid fonts array", () => {
		expect(() =>
			solidUiOptionsSchema.parse({ fonts: [inter, jetbrains] }),
		).not.toThrow();
	});

	it("rejects an entry missing required fields", () => {
		expect(() =>
			solidUiOptionsSchema.parse({ fonts: [{ family: "x" }] }),
		).toThrow();
	});

	it("rejects an invalid style value", () => {
		expect(() =>
			solidUiOptionsSchema.parse({
				fonts: [{ ...inter, style: "oblique" }],
			}),
		).toThrow();
	});

	it("rejects a malformed fallback (missing keys)", () => {
		expect(() =>
			solidUiOptionsSchema.parse({
				fonts: [{ ...inter, fallback: { family: "sans-serif" } }],
			}),
		).toThrow();
	});

	it("parses defaultFonts cleanly", () => {
		expect(() =>
			solidUiOptionsSchema.parse({ fonts: defaultFonts }),
		).not.toThrow();
	});
});

// ── CSS slot-contribution validation ──────────────────────────────
//
// `appCssImports` and `appCssLayers` carry strings that are rendered
// directly into the stylesheet. The slot schemas reject malformed
// contributions on entry so the bad plugin gets a precise error
// instead of producing an injectable stylesheet at render time.

describe("cssImportSchema validation", () => {
	it("accepts a bare-string import", () => {
		expect(() => cssImportSchema.parse("tailwindcss")).not.toThrow();
	});

	it("accepts a structured import with valid layer + supports", () => {
		expect(() =>
			cssImportSchema.parse({
				url: "tailwindcss",
				layer: "theme",
				supports: "(display: grid)",
			}),
		).not.toThrow();
	});

	it("rejects an empty bare-string url", () => {
		expect(() => cssImportSchema.parse("")).toThrow();
	});

	it("rejects a structured import with an empty url", () => {
		expect(() => cssImportSchema.parse({ url: "" })).toThrow();
	});

	it("rejects a non-ident layer() argument", () => {
		expect(() =>
			cssImportSchema.parse({ url: "x", layer: "evil; ident" }),
		).toThrow(/layer/i);
	});

	it("rejects a supports() expression with a statement terminator", () => {
		expect(() =>
			cssImportSchema.parse({
				url: "x",
				supports: "(display: grid); @import url(http://x)",
			}),
		).toThrow(/supports/i);
	});

	it("rejects unbalanced supports() parentheses", () => {
		expect(() =>
			cssImportSchema.parse({ url: "x", supports: "(display: grid" }),
		).toThrow(/supports/i);
	});
});

describe("cssLayerSchema validation", () => {
	it("accepts a layer with an ident name", () => {
		expect(() =>
			cssLayerSchema.parse({ name: "base", content: "/* */" }),
		).not.toThrow();
	});

	it("rejects a layer name with a semicolon", () => {
		expect(() =>
			cssLayerSchema.parse({ name: "evil; @import url(x)", content: "" }),
		).toThrow(/layer/i);
	});

	it("rejects a layer name starting with a digit", () => {
		expect(() => cssLayerSchema.parse({ name: "1bad", content: "" })).toThrow(
			/layer/i,
		);
	});

	it("rejects a layer name with spaces", () => {
		expect(() =>
			cssLayerSchema.parse({ name: "has space", content: "" }),
		).toThrow(/layer/i);
	});
});

// ── Font family + URL CSS injection regression test ──────────────
//
// A consumer-supplied family with a quote/backslash, or an asset href
// with a quote/paren, used to corrupt the @font-face block. The
// rendered stylesheet must escape those characters AND the matching
// `--ui-font-*` token in `:root`.

describe("font CSS escape (regression)", () => {
	const malicious: FontEntry = {
		family: 'Evil"; }body{display:none}@font-face{font-family:"x',
		specifier:
			"@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
		weight: "400",
		style: "normal",
		role: "mono",
		fallback: {
			family: 'sans"serif',
			ascentOverride: "90%",
			descentOverride: "22%",
			lineGapOverride: "0%",
			sizeAdjust: "100%",
		},
	};

	it("escapes the family name in the :root --ui-font-* token", async () => {
		const { plugins, ctxFactory } = collectSolidUiPlugins({
			solidUi: { fonts: [malicious] },
		});
		const g = buildGraph(plugins, ctxFactory);
		const css = await g.resolve(solidUi.slots.appCssSource);
		expect(css).not.toBeNull();
		if (!css) return;
		// The escaped quote sequence (`\"`) must appear — that's what
		// makes the stray `}body{` payload inert: it sits inside a
		// quoted CSS string instead of breaking out of the token.
		expect(css).toContain("--ui-font-mono:");
		expect(css).toContain('\\"');
		// Exactly one `--ui-font-mono` declaration. Without escaping,
		// the embedded `@font-face{font-family:"x` in the hostile name
		// would terminate the value early and either produce malformed
		// CSS or extra declarations.
		expect((css.match(/--ui-font-mono:/g) ?? []).length).toBe(1);
		// The malicious sequence's leading quote ALWAYS appears as
		// `\"`, never as a raw `"` immediately after `Evil`.
		expect(css).not.toMatch(/Evil";/);
	});
});
