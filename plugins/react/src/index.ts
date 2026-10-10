import type { ContributionCtx } from "@fcalell/cli";
import { plugin, slot } from "@fcalell/cli";
import type {
	HtmlInjection,
	ProviderSpec,
	ScaffoldSpec,
	TsExpression,
	TsImportSpec,
} from "@fcalell/cli/ast";
import { cliSlots, emitArtifact } from "@fcalell/cli/cli-slots";
import { type AppPlugin, vite } from "@fcalell/plugin-vite";
import {
	aggregateEntry,
	aggregateHtml,
	aggregateProviders,
	routerPluginFor,
} from "./node/codegen.ts";
import {
	generateRouteTree,
	ROUTES_DTS,
	routerPaths,
	topLevelSegments,
} from "./node/routes.ts";
import {
	type AppIcon,
	type Mount,
	type ReactOptions,
	type RouterOptions,
	reactOptionsSchema,
} from "./types.ts";

const SOURCE = "react";

// ── Slot declarations ──────────────────────────────────────────────
//
// plugin-react owns every fragment of the web bootstrap: entry, providers
// composition, HTML shell, and the router's type registration. Peer plugins
// contribute into the list slots; the derived `*Source` slots compose them
// into the files emitted under `.stack/`.

// Sorted by `order` ascending so lower-order providers become outer wrappers.
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

// A function a peer needs to call with the router instance (`named` imports
// only; each is called as `<name>(router)` right after `createRouter`).
// Sorted by source so the emitted calls are independent of plugin iteration
// order. Only the default mount calls them: a peer's own mount owns its router.
const routerBindings = slot.list<TsImportSpec>({
	source: SOURCE,
	name: "routerBindings",
	sortBy: (a, b) => a.source.localeCompare(b.source),
});

// The root mount: verbatim statements with the imports they need. A value
// slot so a peer plugin can replace the mount; `override: true` lets it cede
// cleanly. `null` means "no mount" → entry.tsx is skipped.
const mountExpression = slot.value<Mount | null>({
	source: SOURCE,
	name: "mountExpression",
	override: true,
	seed: () => null,
});

// The HTML shell template file; override lets a peer swap the shell.
const htmlShell = slot.value<URL | null>({
	source: SOURCE,
	name: "htmlShell",
	override: true,
	seed: () => null,
});

const htmlHead = slot.list<HtmlInjection>({
	source: SOURCE,
	name: "htmlHead",
	// HTML allows at most one <title> and one of each <html> attribute; two
	// contributions fail at generate time instead of producing a malformed
	// document. Other kinds opt out by returning undefined.
	uniqueBy: (item) => {
		if (item.kind === "title") return "title";
		if (item.kind === "html-attr") return `html-attr:${item.name}`;
		return undefined;
	},
});

const htmlBodyEnd = slot.list<HtmlInjection>({
	source: SOURCE,
	name: "htmlBodyEnd",
});

// The app's icon, from the `icon` option: the favicon links read it, and a
// UI plugin that draws the app's mark reads the same value. Null when none.
const icon = slot.derived({
	source: SOURCE,
	name: "icon",
	compute: (_inputs, ctx: ContributionCtx<ReactOptions>): AppIcon | null => {
		const given = ctx.options.icon;
		if (given === undefined) return null;
		return typeof given === "string" ? { light: given } : given;
	},
});

// Resolved routes directory, relative to the project root. `null` means
// file-based routing is off (`routes: false`).
const routesDir = slot.derived({
	source: SOURCE,
	name: "routesDir",
	compute: (_inputs, ctx: ContributionCtx<ReactOptions>): string | null => {
		const routes = ctx.options.routes;
		if (routes === false) return null;
		return routes?.dir ?? "src/app/routes";
	},
});

// The router plugin's options, as data: the app's config runs the plugin on
// them as they are, and a host that draws the screens reads them to run it with
// one changed. Null when routing is off.
const routerOptions = slot.derived({
	source: SOURCE,
	name: "routerOptions",
	inputs: { dir: routesDir },
	compute: (inp): RouterOptions | null =>
		inp.dir === null
			? null
			: { autoCodeSplitting: true, ...routerPaths(inp.dir) },
});

// The router plugin's call and the imports it needs: TanStack's route-tree
// generator, on the app's route files. Null when routing is off. A host that
// draws components renders no route, so it leaves this slot unread.
const routerPlugin = slot.derived({
	source: SOURCE,
	name: "routerPlugin",
	inputs: { options: routerOptions },
	compute: (inp): AppPlugin | null =>
		inp.options === null ? null : routerPluginFor(inp.options),
});

// Rendered `.stack/entry.tsx`; null when no mount is contributed.
const entrySource = slot.derived({
	source: SOURCE,
	name: "entrySource",
	inputs: { imports: entryImports, mount: mountExpression },
	compute: (inp): string | null =>
		aggregateEntry({ imports: inp.imports, mount: inp.mount }),
});

// Rendered `.stack/index.html`.
const htmlSource = slot.derived({
	source: SOURCE,
	name: "htmlSource",
	inputs: { shell: htmlShell, head: htmlHead, bodyEnd: htmlBodyEnd },
	compute: (inp): Promise<string | null> =>
		aggregateHtml({ shell: inp.shell, head: inp.head, bodyEnd: inp.bodyEnd }),
});

// Rendered `.stack/virtual-providers.tsx`.
const providersSource = slot.derived({
	source: SOURCE,
	name: "providersSource",
	inputs: { providers },
	compute: (inp): string | null =>
		aggregateProviders({ providers: inp.providers }),
});

// Rendered `.stack/routes.d.ts`; null when routing is off.
const routesDtsSource = slot.derived({
	source: SOURCE,
	name: "routesDtsSource",
	inputs: { dir: routesDir },
	compute: (inp): string | null => (inp.dir === null ? null : ROUTES_DTS),
});

// The static first segments of the app's URLs (`login`, `settings`), for a
// peer that hands out top-level addresses (an organization's slug) and must
// not shadow a route. Empty when routing is off.
const topLevelRoutes = slot.derived({
	source: SOURCE,
	name: "topLevelRoutes",
	inputs: { dir: routesDir },
	compute: (inp, ctx): string[] =>
		inp.dir === null ? [] : topLevelSegments(ctx.cwd, inp.dir),
});

// The home route's scaffold; `override: true` lets a design-system plugin
// scaffold its own. Null when routing is off.
const homeScaffold = slot.value<ScaffoldSpec | null>({
	source: SOURCE,
	name: "homeScaffold",
	override: true,
	seed: async (ctx) => {
		const dir = await ctx.resolve(routesDir);
		return dir === null ? null : ctx.scaffold("home.tsx", `${dir}/index.tsx`);
	},
});

// One icon link per colour scheme, its type inferred from an `.svg` file.
function iconLink(href: string, scheme: "light" | "dark"): HtmlInjection {
	const link: HtmlInjection = {
		kind: "link",
		rel: "icon",
		href,
		media: `(prefers-color-scheme: ${scheme})`,
	};
	if (/\.svg(?:[?#].*)?$/i.test(href)) link.type = "image/svg+xml";
	return link;
}

export const react = plugin("react", {
	label: "React",

	schema: reactOptionsSchema,

	guide: [
		{
			page: "web-app",
			trigger:
				"Setting the page's title, icon or language, the dev server's port, serving a static file, or reasoning about the web dev server and its API proxy",
		},
		{
			page: "routes",
			trigger:
				"Writing, moving or linking a web route file in `src/app/routes/`, or reading its params",
		},
		{ page: "add-a-route", trigger: "Adding a page or URL to the web app" },
	],

	requires: ["vite"],

	dependencies: {
		"@tanstack/react-router": "^1.170.40",
	},
	// The generated vite config imports them from the consumer, and Babel
	// resolves the compiler plugin from there.
	devDependencies: {
		"@tanstack/router-plugin": "^1.168.41",
		"@vitejs/plugin-react": "^5.2.0",
		"babel-plugin-react-compiler": "^1.0.0",
	},

	slots: {
		providers,
		entryImports,
		routerBindings,
		mountExpression,
		htmlShell,
		htmlHead,
		htmlBodyEnd,
		icon,
		routesDir,
		routerOptions,
		routerPlugin,
		entrySource,
		htmlSource,
		providersSource,
		routesDtsSource,
		topLevelRoutes,
		homeScaffold,
	},

	contributes: (self) => [
		// ── Vite integration ────────────────────────────────────────────
		vite.slots.configImports.contribute(
			(): TsImportSpec => ({
				source: "@vitejs/plugin-react",
				default: "react",
			}),
		),
		// The router plugin is the app's own: a host that draws components
		// (Storybook's roster) never reads it. It runs before the React plugin,
		// which `appPlugins` (rendered ahead of `pluginCalls`) keeps by position.
		vite.slots.appPlugins.contribute(
			async (ctx): Promise<AppPlugin | undefined> =>
				(await ctx.resolve(self.slots.routerPlugin)) ?? undefined,
		),
		vite.slots.pluginCalls.contribute(
			(): TsExpression => ({
				kind: "call",
				callee: { kind: "identifier", name: "react" },
				args: [
					{
						kind: "object",
						properties: [
							{
								key: "babel",
								value: {
									kind: "object",
									properties: [
										{
											key: "plugins",
											value: {
												kind: "array",
												items: [
													{
														kind: "array",
														items: [
															{
																kind: "string",
																value: "babel-plugin-react-compiler",
															},
															{ kind: "object", properties: [] },
														],
													},
												],
											},
										},
									],
								},
							},
						],
					},
				],
			}),
		),

		// React's runtime must be a singleton: a workspace-linked stack
		// checkout resolving its own copy would ship two, and hooks throw.
		vite.slots.resolveDedupe.contribute(() => ["react", "react-dom"]),

		// ── Entry ───────────────────────────────────────────────────────
		// The default mount renders the file routes; with routing off there
		// is nothing to mount until a peer contributes one.
		self.slots.mountExpression.contribute(
			async (ctx): Promise<Mount | undefined> => {
				if ((await ctx.resolve(self.slots.routesDir)) === null)
					return undefined;
				const bindings = await ctx.resolve(self.slots.routerBindings);
				const calls = bindings.flatMap((spec) =>
					"named" in spec
						? spec.named.map(
								(n) => `${typeof n === "string" ? n : n.alias}(router);`,
							)
						: [],
				);
				return {
					imports: [
						...bindings,
						{ source: "react", named: ["StrictMode"] },
						{ source: "react-dom/client", named: ["createRoot"] },
						{
							source: "@tanstack/react-router",
							named: ["createRouter", "RouterProvider"],
						},
						{ source: "./routeTree.gen.ts", named: ["routeTree"] },
						{ source: "virtual:stack-providers", default: "Providers" },
					],
					body: [
						"const router = createRouter({ routeTree });",
						...calls,
						"",
						'createRoot(document.getElementById("app") as HTMLElement).render(',
						"\t<StrictMode>",
						"\t\t<Providers>",
						"\t\t\t<RouterProvider router={router} />",
						"\t\t</Providers>",
						"\t</StrictMode>,",
						");",
					].join("\n"),
				};
			},
		),

		// ── HTML ─────────────────────────────────────────────────────────
		self.slots.htmlShell.contribute((ctx): URL => ctx.template("shell.html")),

		self.slots.htmlHead.contribute(
			(): HtmlInjection => ({
				kind: "html-attr",
				name: "lang",
				value: self.options.lang ?? "en",
			}),
		),
		self.slots.htmlHead.contribute(
			(ctx): HtmlInjection => ({
				kind: "title",
				value: self.options.title ?? ctx.app.name,
			}),
		),
		self.slots.htmlHead.contribute((): HtmlInjection | undefined => {
			const { description } = self.options;
			if (!description) return undefined;
			return { kind: "meta", name: "description", content: description };
		}),
		self.slots.htmlHead.contribute((): HtmlInjection | undefined => {
			const { themeColor } = self.options;
			if (!themeColor) return undefined;
			return { kind: "meta", name: "theme-color", content: themeColor };
		}),
		self.slots.htmlHead.contribute(async (ctx): Promise<HtmlInjection[]> => {
			// With no icon the browser asks for `/favicon.ico` by itself; an
			// empty data URL makes it request nothing.
			const icon = await ctx.resolve(self.slots.icon);
			if (icon === null) return [{ kind: "link", rel: "icon", href: "data:," }];
			if (icon.dark === undefined) {
				return [{ kind: "link", rel: "icon", href: icon.light }];
			}
			return [iconLink(icon.light, "light"), iconLink(icon.dark, "dark")];
		}),
		self.slots.htmlBodyEnd.contribute(
			async (ctx): Promise<HtmlInjection | undefined> => {
				if ((await ctx.resolve(self.slots.entrySource)) === null) {
					return undefined;
				}
				return { kind: "script", type: "module", src: "/entry.tsx" };
			},
		),

		// ── Artifact files ──────────────────────────────────────────────
		emitArtifact(".stack/entry.tsx", self.slots.entrySource),
		emitArtifact(".stack/index.html", self.slots.htmlSource),
		emitArtifact(".stack/virtual-providers.tsx", self.slots.providersSource),
		emitArtifact(".stack/routes.d.ts", self.slots.routesDtsSource),

		// The route tree, from TanStack's own generator, so the typed routes
		// exist before Vite first runs.
		cliSlots.postWrite.contribute(async (ctx) => {
			const dir = await ctx.resolve(self.slots.routesDir);
			if (dir === null) return undefined;
			return () => generateRouteTree(ctx.cwd, dir);
		}),

		// ── Scaffolds ───────────────────────────────────────────────────
		cliSlots.initScaffolds.contribute(async (ctx) => {
			const dir = await ctx.resolve(self.slots.routesDir);
			if (dir === null) return undefined;
			return ctx.scaffold("root.tsx", `${dir}/__root.tsx`);
		}),
		cliSlots.initScaffolds.contribute(async (ctx) => {
			return (await ctx.resolve(self.slots.homeScaffold)) ?? undefined;
		}),

		// Remove cleans up consumer-owned src/app/.
		cliSlots.removeFiles.contribute(() => "src/app/"),
	],
});

export type { AppIcon, Mount, ReactOptions, RouterOptions } from "./types.ts";
