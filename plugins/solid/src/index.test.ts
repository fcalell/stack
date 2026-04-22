import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Slot } from "@fcalell/cli";
import type { ProviderSpec } from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { vite } from "@fcalell/plugin-vite";
import { describe, expect, it } from "vitest";
import { type SolidOptions, solid } from "./index";

// ── Harness ────────────────────────────────────────────────────────

const app = { name: "test-app", domain: "example.com" };

const noopLog = {
	info: () => {},
	warn: () => {},
	success: () => {},
	error: () => {},
};

type AppOverride = typeof app & { origins?: string[] };

// Resolve solid's real templates dir on disk so html rendering (which reads
// shell.html to splice injections into) actually works in tests. The fake
// `/tmp/templates/...` URL used elsewhere would hit ENOENT.
const SOLID_TEMPLATES = pathToFileURL(
	`${join(dirname(fileURLToPath(import.meta.url)), "..", "templates")}/`,
);

function templateFor(plugin: string, name: string): URL {
	if (plugin === "solid") return new URL(name, SOLID_TEMPLATES);
	return new URL(`file:///tmp/templates/${plugin}/${name}`);
}

function makeCtxFactory(
	perPluginOptions: Record<string, unknown> = {},
	perPluginFiles: Record<string, Set<string>> = {},
	appOverride?: AppOverride,
	cwd = "/tmp/test",
): GraphCtxFactory {
	return {
		app: appOverride ?? app,
		cwd,
		log: noopLog,
		ctxForPlugin: (name) => ({
			options: perPluginOptions[name] ?? {},
			fileExists: async (p) => perPluginFiles[name]?.has(p) ?? false,
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

// Collect real `api` + `vite` + `solid` plugins via their collect() paths —
// same production wiring the CLI walks. Extras are inserted *after* so plugin
// array ordering is consumer-style, not hand-ordered for topo convenience.
function collectSolidPlugins(
	extras: GraphPlugin[] = [],
	opts: { solid?: SolidOptions } = {},
): GraphPlugin[] {
	const apiCollected = api.cli.collect({ app, options: {} });
	const viteCollected = vite.cli.collect({ app, options: {} });
	const solidCollected = solid.cli.collect({
		app,
		options: opts.solid ?? {},
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
	return [apiP, viteP, solidP, ...extras];
}

// ── Config factory ────────────────────────────────────────────────

describe("solid config factory", () => {
	it("returns PluginConfig with __plugin 'solid'", () => {
		const config = solid();
		expect(config.__plugin).toBe("solid");
	});

	it("defaults to empty options", () => {
		const config = solid();
		expect(config.options).toEqual({});
	});

	it("accepts routes config", () => {
		const config = solid({ routes: { pagesDir: "src/pages" } });
		expect(config.options.routes).toEqual({ pagesDir: "src/pages" });
	});

	it("accepts routes: false to disable routing", () => {
		const config = solid({ routes: false });
		expect(config.options.routes).toBe(false);
	});
});

// ── Slot ownership ────────────────────────────────────────────────

describe("solid.slots", () => {
	it("owns providers, entryImports, mountExpression, htmlShell, htmlHead, htmlBodyEnd", () => {
		expect(solid.slots.providers.source).toBe("solid");
		expect(solid.slots.entryImports.source).toBe("solid");
		expect(solid.slots.mountExpression.source).toBe("solid");
		expect(solid.slots.htmlShell.source).toBe("solid");
		expect(solid.slots.htmlHead.source).toBe("solid");
		expect(solid.slots.htmlBodyEnd.source).toBe("solid");
	});

	it("owns the *Source derived slots + routesPagesDir + homeScaffold", () => {
		expect(solid.slots.routesPagesDir.source).toBe("solid");
		expect(solid.slots.entrySource.source).toBe("solid");
		expect(solid.slots.htmlSource.source).toBe("solid");
		expect(solid.slots.providersSource.source).toBe("solid");
		expect(solid.slots.routesDtsSource.source).toBe("solid");
		expect(solid.slots.homeScaffold.source).toBe("solid");
	});
});

// ── routesPagesDir — options gating ───────────────────────────────

describe("solid.slots.routesPagesDir", () => {
	it("defaults to src/app/pages", async () => {
		const g = buildGraph(collectSolidPlugins(), makeCtxFactory());
		expect(await g.resolve(solid.slots.routesPagesDir)).toBe("src/app/pages");
	});

	it("honours options.routes.pagesDir", async () => {
		const g = buildGraph(
			collectSolidPlugins([], { solid: { routes: { pagesDir: "src/pages" } } }),
			makeCtxFactory({
				solid: { routes: { pagesDir: "src/pages" } },
			}),
		);
		expect(await g.resolve(solid.slots.routesPagesDir)).toBe("src/pages");
	});

	it("is null when routes: false", async () => {
		const g = buildGraph(
			collectSolidPlugins([], { solid: { routes: false } }),
			makeCtxFactory({ solid: { routes: false } }),
		);
		expect(await g.resolve(solid.slots.routesPagesDir)).toBeNull();
	});
});

// ── HTML head defaults ────────────────────────────────────────────

describe("solid.slots.htmlHead", () => {
	it("contributes lang + title (from app.name) by default", async () => {
		const g = buildGraph(collectSolidPlugins(), makeCtxFactory());
		const head = await g.resolve(solid.slots.htmlHead);
		expect(head).toContainEqual({
			kind: "html-attr",
			name: "lang",
			value: "en",
		});
		expect(head).toContainEqual({ kind: "title", value: "test-app" });
	});

	it("uses options.title / lang when set, and emits optional meta/link entries", async () => {
		const solidOpts: SolidOptions = {
			title: "Hello",
			description: "hi",
			themeColor: "#fff",
			icon: "./icon.svg",
			lang: "fr",
		};
		const g = buildGraph(
			collectSolidPlugins([], { solid: solidOpts }),
			makeCtxFactory({ solid: solidOpts }),
		);
		const head = await g.resolve(solid.slots.htmlHead);
		expect(head).toContainEqual({
			kind: "html-attr",
			name: "lang",
			value: "fr",
		});
		expect(head).toContainEqual({ kind: "title", value: "Hello" });
		expect(head).toContainEqual({
			kind: "meta",
			name: "description",
			content: "hi",
		});
		expect(head).toContainEqual({
			kind: "meta",
			name: "theme-color",
			content: "#fff",
		});
		expect(head).toContainEqual({
			kind: "link",
			rel: "icon",
			href: "./icon.svg",
		});
	});

	it("omits optional entries when options are absent", async () => {
		const g = buildGraph(collectSolidPlugins(), makeCtxFactory());
		const head = await g.resolve(solid.slots.htmlHead);
		expect(head).not.toContainEqual(
			expect.objectContaining({ kind: "meta", name: "description" }),
		);
		expect(head).not.toContainEqual(
			expect.objectContaining({ kind: "meta", name: "theme-color" }),
		);
		expect(head).not.toContainEqual(
			expect.objectContaining({ kind: "link", rel: "icon" }),
		);
	});

	it("contributes the bodyEnd script tag", async () => {
		const g = buildGraph(collectSolidPlugins(), makeCtxFactory());
		const bodyEnd = await g.resolve(solid.slots.htmlBodyEnd);
		expect(bodyEnd).toContainEqual(
			expect.objectContaining({ kind: "script", src: "/entry.tsx" }),
		);
	});
});

// ── Vite contributions ────────────────────────────────────────────

describe("solid → vite.slots contributions", () => {
	it("contributes vite-plugin-solid + routesPlugin imports/plugin calls", async () => {
		const g = buildGraph(collectSolidPlugins(), makeCtxFactory());
		const imports = await g.resolve(vite.slots.configImports);
		const calls = await g.resolve(vite.slots.pluginCalls);

		expect(imports).toContainEqual(
			expect.objectContaining({
				source: "vite-plugin-solid",
				default: "solidPlugin",
			}),
		);
		expect(imports).toContainEqual(
			expect.objectContaining({
				source: "@fcalell/plugin-solid/node/vite-routes",
				named: ["routesPlugin"],
			}),
		);
		// routesPlugin call carries pagesDir
		const routesCall = calls.find(
			(c) =>
				c.kind === "call" &&
				c.callee.kind === "identifier" &&
				c.callee.name === "routesPlugin",
		);
		expect(routesCall).toBeTruthy();
		if (routesCall?.kind !== "call") throw new Error("expected call");
		const arg = routesCall.args[0];
		if (arg?.kind !== "object") throw new Error("expected object arg");
		expect(arg.properties).toContainEqual(
			expect.objectContaining({
				key: "pagesDir",
				value: { kind: "string", value: "src/app/pages" },
			}),
		);
	});

	it("omits routesPlugin when routes: false", async () => {
		const g = buildGraph(
			collectSolidPlugins([], { solid: { routes: false } }),
			makeCtxFactory({ solid: { routes: false } }),
		);
		const imports = await g.resolve(vite.slots.configImports);
		const calls = await g.resolve(vite.slots.pluginCalls);

		expect(imports).not.toContainEqual(
			expect.objectContaining({
				source: "@fcalell/plugin-solid/node/vite-routes",
			}),
		);
		const routesCall = calls.find(
			(c) =>
				c.kind === "call" &&
				c.callee.kind === "identifier" &&
				c.callee.name === "routesPlugin",
		);
		expect(routesCall).toBeUndefined();
	});
});

// ── Artifact emissions ────────────────────────────────────────────

describe("solid → cliSlots.artifactFiles", () => {
	it("emits entry.tsx, index.html, routes.d.ts by default", async () => {
		const g = buildGraph(collectSolidPlugins(), makeCtxFactory());
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).toContain(".stack/entry.tsx");
		expect(paths).toContain(".stack/index.html");
		expect(paths).toContain(".stack/routes.d.ts");
		// virtual-providers.tsx is emitted only when at least one provider is
		// contributed (solid-ui pushes MetaProvider). With solid alone the
		// providersSource derivation returns null and the file is skipped.
		expect(paths).not.toContain(".stack/virtual-providers.tsx");
	});

	it("emits .stack/virtual-providers.tsx when a peer contributes a provider", async () => {
		const peer: GraphPlugin = {
			name: "peer",
			contributes: [
				solid.slots.providers.contribute(() => ({
					imports: [{ source: "@ui/x", named: ["X"] }],
					wrap: { identifier: "X" },
					order: 100,
				})),
			],
		};
		const g = buildGraph(collectSolidPlugins([peer]), makeCtxFactory());
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).toContain(".stack/virtual-providers.tsx");
	});

	it("entry.tsx contains the default render(Providers → Router)", async () => {
		const g = buildGraph(collectSolidPlugins(), makeCtxFactory());
		const files = await g.resolve(cliSlots.artifactFiles);
		const entry = files.find((f) => f.path === ".stack/entry.tsx");
		expect(entry).toBeDefined();
		expect(entry?.content).toContain("render(");
		expect(entry?.content).toContain("<Providers>");
		expect(entry?.content).toContain("<Router>");
		expect(entry?.content).toContain("routes");
	});

	it("omits routes.d.ts when routes: false", async () => {
		const g = buildGraph(
			collectSolidPlugins([], { solid: { routes: false } }),
			makeCtxFactory({ solid: { routes: false } }),
		);
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).not.toContain(".stack/routes.d.ts");
	});
});

// ── REVIEW #3 fix: routesDtsSource on missing pagesDir ────────────

describe("solid.slots.routesDtsSource (REVIEW #3 — graceful missing dir)", () => {
	it("returns a non-null empty stub when pagesDir does not exist", async () => {
		// Use a guaranteed-empty tmp directory for cwd — no src/app/pages.
		const cwd = mkdtempSync(join(tmpdir(), "solid-rdts-"));
		try {
			const g = buildGraph(
				collectSolidPlugins(),
				makeCtxFactory({}, {}, undefined, cwd),
			);
			const src = await g.resolve(solid.slots.routesDtsSource);
			expect(src).not.toBeNull();
			if (!src) return;
			expect(src).toContain("virtual:fcalell-routes");
			// Empty typed routes — no leaves → empty `{  }` on the declaration.
			expect(src).toContain("export const typedRoutes:");
			// And it must still be included in artifactFiles.
			const files = await g.resolve(cliSlots.artifactFiles);
			const routesDts = files.find((f) => f.path === ".stack/routes.d.ts");
			expect(routesDts).toBeDefined();
			expect(routesDts?.content).toContain("virtual:fcalell-routes");
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});

	it("returns a populated dts when pagesDir exists", async () => {
		const cwd = mkdtempSync(join(tmpdir(), "solid-rdts-"));
		try {
			const pagesDir = join(cwd, "src/app/pages");
			mkdirSync(pagesDir, { recursive: true });
			writeFileSync(join(pagesDir, "index.tsx"), "export default () => null;");
			const g = buildGraph(
				collectSolidPlugins(),
				makeCtxFactory({}, {}, undefined, cwd),
			);
			const src = await g.resolve(solid.slots.routesDtsSource);
			expect(src).not.toBeNull();
			expect(src).toContain("() => string");
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});
});

// ── REVIEW #21 fix: homeScaffold override ─────────────────────────

describe("solid.slots.homeScaffold (REVIEW #21 — override-scaffold)", () => {
	it("seeds the bare home scaffold when only solid is present", async () => {
		const g = buildGraph(collectSolidPlugins(), makeCtxFactory());
		const spec = await g.resolve(solid.slots.homeScaffold);
		expect(spec.target).toBe("src/app/pages/index.tsx");
		// Template came from solid's own ctx.scaffold — makeCtxFactory routes
		// solid's template lookups to the real on-disk templates dir.
		expect(spec.source.pathname).toContain("/plugins/solid/templates/home.tsx");
		expect(spec.plugin).toBe("solid");
	});

	it("cedes to a peer plugin that contributes an override", async () => {
		const peer: GraphPlugin = {
			name: "solid-ui-like",
			contributes: [
				solid.slots.homeScaffold.contribute((ctx) =>
					ctx.scaffold("home.tsx", "src/app/pages/index.tsx"),
				),
			],
		};
		const g = buildGraph(collectSolidPlugins([peer]), makeCtxFactory());
		const spec = await g.resolve(solid.slots.homeScaffold);
		// Override wins — plugin is the contributor, source points to the peer's
		// template (makeCtxFactory stamps the plugin name into the URL path).
		expect(spec.plugin).toBe("solid-ui-like");
		expect(spec.source.pathname).toContain("/solid-ui-like/home.tsx");

		// And the initScaffolds slot sees exactly one home entry — no duplicate.
		const scaffolds = await g.resolve(cliSlots.initScaffolds);
		const homes = scaffolds.filter(
			(s) => s.target === "src/app/pages/index.tsx",
		);
		expect(homes).toHaveLength(1);
		expect(homes[0]?.plugin).toBe("solid-ui-like");
	});

	it("plugin array order does not affect the scaffold winner", async () => {
		const peer: GraphPlugin = {
			name: "solid-ui-like",
			contributes: [
				solid.slots.homeScaffold.contribute((ctx) =>
					ctx.scaffold("home.tsx", "src/app/pages/index.tsx"),
				),
			],
		};
		const forward = buildGraph(collectSolidPlugins([peer]), makeCtxFactory());
		// Put the peer first — consumer would never hand-order like this, but
		// the slot graph is order-invariant. Keep solid last to prove it.
		const apiCollected = api.cli.collect({ app, options: {} });
		const viteCollected = vite.cli.collect({ app, options: {} });
		const solidCollected = solid.cli.collect({ app, options: {} });
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
		const reverse = buildGraph([peer, apiP, viteP, solidP], makeCtxFactory());

		const f = await forward.resolve(solid.slots.homeScaffold);
		const r = await reverse.resolve(solid.slots.homeScaffold);
		expect(f.plugin).toBe("solid-ui-like");
		expect(r.plugin).toBe("solid-ui-like");
	});

	it("initScaffolds contains exactly one home entry whether or not a peer overrides", async () => {
		// Without peer: solid's bare scaffold wins.
		const gSolo = buildGraph(collectSolidPlugins(), makeCtxFactory());
		const soloScaffolds = await gSolo.resolve(cliSlots.initScaffolds);
		const soloHomes = soloScaffolds.filter(
			(s) => s.target === "src/app/pages/index.tsx",
		);
		expect(soloHomes).toHaveLength(1);
		expect(soloHomes[0]?.plugin).toBe("solid");
	});
});

// ── Provider ordering ─────────────────────────────────────────────

describe("solid.slots.providers sort", () => {
	it("sorts contributions by order ascending, stable on ties", async () => {
		const outer: ProviderSpec = {
			imports: [{ source: "@ui/outer", named: ["OuterProvider"] }],
			wrap: { identifier: "OuterProvider" },
			order: 10,
		};
		const inner: ProviderSpec = {
			imports: [{ source: "@ui/inner", named: ["InnerProvider"] }],
			wrap: { identifier: "InnerProvider" },
			order: 20,
		};
		const tieA: ProviderSpec = {
			imports: [{ source: "@ui/tieA", named: ["TieA"] }],
			wrap: { identifier: "TieA" },
			order: 15,
		};
		const tieB: ProviderSpec = {
			imports: [{ source: "@ui/tieB", named: ["TieB"] }],
			wrap: { identifier: "TieB" },
			order: 15,
		};

		// Contributed in non-sorted order. `composeList` uses a stable sort, so
		// items with equal `order` keep their contribution order — `tieA` was
		// contributed before `tieB`, so the ordered output keeps that tie-break.
		const peer: GraphPlugin = {
			name: "peer",
			contributes: [
				solid.slots.providers.contribute(() => inner),
				solid.slots.providers.contribute(() => tieA),
				solid.slots.providers.contribute(() => outer),
				solid.slots.providers.contribute(() => tieB),
			],
		};
		const g = buildGraph(collectSolidPlugins([peer]), makeCtxFactory());
		const provs = await g.resolve(solid.slots.providers);
		expect(provs.map((p) => p.wrap.identifier)).toEqual([
			"OuterProvider",
			"TieA",
			"TieB",
			"InnerProvider",
		]);
	});
});
