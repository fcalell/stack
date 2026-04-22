import { plugin, slot } from "@fcalell/cli";
import type {
	HtmlInjection,
	ProviderSpec,
	ScaffoldSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { vite } from "@fcalell/plugin-vite";
import {
	aggregateEntry,
	aggregateHtml,
	aggregateProviders,
} from "./node/codegen";
import { buildRoutesDts } from "./node/routes-core";
import { type SolidOptions, solidOptionsSchema } from "./types";

const SOURCE = "solid";

// ── Slot declarations ──────────────────────────────────────────────
//
// plugin-solid owns every fragment of the frontend bootstrap: entry,
// providers composition, HTML shell, and typed routes declarations. Peer
// plugins (solid-ui today, a custom third-party theme tomorrow) contribute
// into the list slots; the derived `*Source` slots compose them into the
// files emitted under `.stack/`. There is no barrier event — ordering is
// derived from dataflow.

// Providers — solid-ui contributes MetaProvider + Toaster here. Sorted by
// `order` ascending so lower-order providers become outer wrappers.
const providers = slot.list<ProviderSpec>({
	source: SOURCE,
	name: "providers",
	sortBy: (a, b) => a.order - b.order,
});

// Sort by source so the emitted entry.tsx import order is independent of
// plugin iteration order.
const entryImports = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "entryImports",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// The root `render(() => ... , document.getElementById("app"))` call. A value
// slot so a peer plugin could override the mount target (rare); solid itself
// contributes the default. `override: true` lets a consumer-side plugin cede
// cleanly without a duplicate-contribution error.
const mountExpression = slot.value<TsExpression | null>({
	source: SOURCE,
	name: "mountExpression",
	override: true,
	seed: () => null,
});

// The HTML shell template file — solid contributes the canonical shell.html;
// override lets a consumer plugin swap the shell without tripping dup detection.
const htmlShell = slot.value<URL | null>({
	source: SOURCE,
	name: "htmlShell",
	override: true,
	seed: () => null,
});

const htmlHead = slot.list<HtmlInjection>({
	source: SOURCE,
	name: "htmlHead",
});

const htmlBodyEnd = slot.list<HtmlInjection>({
	source: SOURCE,
	name: "htmlBodyEnd",
});

// Resolved pages directory. `null` means file-based routing is disabled
// entirely (consumer passed `routes: false`). Drives both the vite routes
// plugin contribution and routesDtsSource.
const routesPagesDir = slot.derived<string | null, Record<string, never>>({
	source: SOURCE,
	name: "routesPagesDir",
	inputs: {},
	compute: (_inputs, ctx) => {
		const opts = (ctx.options ?? {}) as SolidOptions;
		if (opts.routes === false) return null;
		if (opts.routes && typeof opts.routes === "object") {
			return opts.routes.pagesDir ?? "src/app/pages";
		}
		return "src/app/pages";
	},
});

// Rendered `.stack/entry.tsx`. Returns null when no mount expression is
// contributed (worker-only project), which skips file emission.
const entrySource = slot.derived<
	string | null,
	{ imports: typeof entryImports; mount: typeof mountExpression }
>({
	source: SOURCE,
	name: "entrySource",
	inputs: { imports: entryImports, mount: mountExpression },
	compute: (inp) =>
		aggregateEntry({
			imports: inp.imports,
			mountExpression: inp.mount,
		}),
});

// Rendered `.stack/index.html`.
const htmlSource = slot.derived<
	string | null,
	{
		shell: typeof htmlShell;
		head: typeof htmlHead;
		bodyEnd: typeof htmlBodyEnd;
	}
>({
	source: SOURCE,
	name: "htmlSource",
	inputs: { shell: htmlShell, head: htmlHead, bodyEnd: htmlBodyEnd },
	compute: (inp) =>
		aggregateHtml({
			shell: inp.shell,
			head: inp.head,
			bodyEnd: inp.bodyEnd,
		}),
});

// Rendered `.stack/virtual-providers.tsx`.
const providersSource = slot.derived<
	string | null,
	{ providers: typeof providers }
>({
	source: SOURCE,
	name: "providersSource",
	inputs: { providers },
	compute: (inp) => aggregateProviders({ providers: inp.providers }),
});

// Rendered `.stack/routes.d.ts`. Null when routing is disabled; otherwise
// `buildRoutesDts` returns a valid empty stub even when src/app/pages is
// missing — REVIEW #3 structural fix (no try/catch, no swallow).
const routesDtsSource = slot.derived<
	string | null,
	{ pagesDir: typeof routesPagesDir }
>({
	source: SOURCE,
	name: "routesDtsSource",
	inputs: { pagesDir: routesPagesDir },
	compute: (inp, ctx) => {
		if (inp.pagesDir === null) return null;
		return buildRoutesDts(ctx.cwd, inp.pagesDir);
	},
});

// Home scaffold. `override: true` lets plugin-solid-ui cede this slot to its
// own richer home page — REVIEW #21 structural fix, no `ctx.hasPlugin("solid-ui")`
// string checks live in this plugin anymore.
const homeScaffold = slot.value<ScaffoldSpec>({
	source: SOURCE,
	name: "homeScaffold",
	override: true,
	seed: (ctx) => ctx.scaffold("home.tsx", "src/app/pages/index.tsx"),
});

export const solid = plugin<
	"solid",
	SolidOptions,
	{
		providers: typeof providers;
		entryImports: typeof entryImports;
		mountExpression: typeof mountExpression;
		htmlShell: typeof htmlShell;
		htmlHead: typeof htmlHead;
		htmlBodyEnd: typeof htmlBodyEnd;
		routesPagesDir: typeof routesPagesDir;
		entrySource: typeof entrySource;
		htmlSource: typeof htmlSource;
		providersSource: typeof providersSource;
		routesDtsSource: typeof routesDtsSource;
		homeScaffold: typeof homeScaffold;
	}
>("solid", {
	label: "SolidJS",

	schema: solidOptionsSchema,

	dependencies: {
		"@fcalell/plugin-solid": "workspace:*",
		"solid-js": "^1.9.0",
	},

	slots: {
		providers,
		entryImports,
		mountExpression,
		htmlShell,
		htmlHead,
		htmlBodyEnd,
		routesPagesDir,
		entrySource,
		htmlSource,
		providersSource,
		routesDtsSource,
		homeScaffold,
	},

	contributes: (self) => [
		// ── Vite integration ────────────────────────────────────────────
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "vite-plugin-solid",
				default: "solidPlugin",
			}),
		),
		vite.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "solidPlugin" },
				args: [],
			}),
		),

		// routesPlugin — gated on routing being enabled.
		vite.slots.configImports.contribute(async (ctx) => {
			const pagesDir = await ctx.resolve(self.slots.routesPagesDir);
			if (pagesDir === null) return undefined;
			return {
				source: "@fcalell/plugin-solid/node/vite-routes",
				named: ["routesPlugin"],
			} as TsImportSpec;
		}),
		vite.slots.pluginCalls.contribute(async (ctx) => {
			const pagesDir = await ctx.resolve(self.slots.routesPagesDir);
			if (pagesDir === null) return undefined;
			return {
				kind: "call",
				callee: { kind: "identifier", name: "routesPlugin" },
				args: [
					{
						kind: "object",
						properties: [
							{
								key: "pagesDir",
								value: { kind: "string", value: pagesDir },
							},
						],
					},
				],
			} as TsExpression;
		}),

		// ── Entry source ────────────────────────────────────────────────
		self.slots.entryImports.contribute(
			(): TsImportSpec => ({ source: "./app.css", sideEffect: true }),
		),
		self.slots.entryImports.contribute(
			(): TsImportSpec => ({ source: "solid-js/web", named: ["render"] }),
		),
		self.slots.entryImports.contribute(
			(): TsImportSpec => ({ source: "@solidjs/router", named: ["Router"] }),
		),
		self.slots.entryImports.contribute(
			(): TsImportSpec => ({
				source: "virtual:fcalell-routes",
				named: ["routes"],
			}),
		),
		self.slots.entryImports.contribute(
			(): TsImportSpec => ({
				source: "virtual:stack-providers",
				default: "Providers",
			}),
		),

		// The default mount expression. Seeded as null; solid writes the
		// canonical render call here.
		self.slots.mountExpression.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "render" },
				args: [
					{
						kind: "arrow",
						params: [],
						body: {
							kind: "jsx",
							tag: "Providers",
							props: [],
							children: [
								{
									kind: "jsx",
									tag: "Router",
									props: [],
									children: [{ kind: "identifier", name: "routes" }],
								},
							],
						},
					},
					{
						kind: "as",
						expression: {
							kind: "call",
							callee: {
								kind: "member",
								object: { kind: "identifier", name: "document" },
								property: "getElementById",
							},
							args: [{ kind: "string", value: "app" }],
						},
						type: { kind: "reference", name: "HTMLElement" },
					},
				],
			}),
		),

		// ── HTML ─────────────────────────────────────────────────────────
		self.slots.htmlShell.contribute((ctx): URL => ctx.template("shell.html")),

		self.slots.htmlHead.contribute((ctx): HtmlInjection => {
			const opts = (ctx.options ?? {}) as SolidOptions;
			return {
				kind: "html-attr",
				name: "lang",
				value: opts.lang ?? "en",
			};
		}),
		self.slots.htmlHead.contribute((ctx): HtmlInjection => {
			const opts = (ctx.options ?? {}) as SolidOptions;
			return { kind: "title", value: opts.title ?? ctx.app.name };
		}),
		self.slots.htmlHead.contribute((ctx): HtmlInjection | undefined => {
			const opts = (ctx.options ?? {}) as SolidOptions;
			if (!opts.description) return undefined;
			return { kind: "meta", name: "description", content: opts.description };
		}),
		self.slots.htmlHead.contribute((ctx): HtmlInjection | undefined => {
			const opts = (ctx.options ?? {}) as SolidOptions;
			if (!opts.themeColor) return undefined;
			return { kind: "meta", name: "theme-color", content: opts.themeColor };
		}),
		self.slots.htmlHead.contribute((ctx): HtmlInjection | undefined => {
			const opts = (ctx.options ?? {}) as SolidOptions;
			if (!opts.icon) return undefined;
			return { kind: "link", rel: "icon", href: opts.icon };
		}),
		self.slots.htmlBodyEnd.contribute(
			(): HtmlInjection => ({
				kind: "script",
				type: "module",
				src: "/entry.tsx",
			}),
		),

		// ── Artifact files ──────────────────────────────────────────────
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const src = await ctx.resolve(self.slots.entrySource);
			if (src === null) return undefined;
			return { path: ".stack/entry.tsx", content: src };
		}),
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const src = await ctx.resolve(self.slots.htmlSource);
			if (src === null) return undefined;
			return { path: ".stack/index.html", content: src };
		}),
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const src = await ctx.resolve(self.slots.providersSource);
			if (src === null) return undefined;
			return { path: ".stack/virtual-providers.tsx", content: src };
		}),
		cliSlots.artifactFiles.contribute(async (ctx) => {
			const src = await ctx.resolve(self.slots.routesDtsSource);
			if (src === null) return undefined;
			return { path: ".stack/routes.d.ts", content: src };
		}),

		// ── Home scaffold ───────────────────────────────────────────────
		// Resolved from `homeScaffold` so solid-ui's override seamlessly wins.
		cliSlots.initScaffolds.contribute(async (ctx) => {
			return ctx.resolve(self.slots.homeScaffold);
		}),

		// Remove cleans up consumer-owned src/app/.
		cliSlots.removeFiles.contribute(() => "src/app/"),
	],
});

export type { SolidOptions } from "./types";
