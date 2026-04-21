import { createPlugin, type } from "@fcalell/cli";
import { Generate, Init, Remove } from "@fcalell/cli/events";
import { vite } from "@fcalell/plugin-vite";
import {
	aggregateEntry,
	aggregateHtml,
	aggregateProviders,
} from "./node/codegen";
import { buildRoutesDts, writeRoutesDts } from "./node/routes-core";
import type {
	CodegenEntryPayload,
	CodegenHtmlPayload,
	CodegenRoutesDtsPayload,
	CompositionProvidersPayload,
	SolidOptions,
} from "./types";
import { solidOptionsSchema } from "./types";

type RoutesConfig = { enabled: false } | { enabled: true; pagesDir: string };

// File-based routing is on by default. `routes: false` disables it entirely;
// `routes: { pagesDir }` customises the directory.
function resolveRoutesConfig(options: SolidOptions | undefined): RoutesConfig {
	const raw = options?.routes;
	if (raw === false) return { enabled: false };
	const pagesDir =
		raw && typeof raw === "object"
			? (raw.pagesDir ?? "src/app/pages")
			: "src/app/pages";
	return { enabled: true, pagesDir };
}

export const solid = createPlugin("solid", {
	label: "SolidJS",
	events: {
		SolidConfigured: type<void>(),
		Entry: type<CodegenEntryPayload>(),
		Html: type<CodegenHtmlPayload>(),
		Providers: type<CompositionProvidersPayload>(),
		RoutesDts: type<CodegenRoutesDtsPayload>(),
	},
	after: [vite.events.ViteConfigured],

	schema: solidOptionsSchema,

	dependencies: {
		"@fcalell/plugin-solid": "workspace:*",
		"solid-js": "^1.9.0",
	},

	register(ctx, bus, events) {
		bus.on(Init.Scaffold, (p) => {
			// When plugin-solid-ui is present it contributes its own richer
			// home scaffold with the same target. Skip our bare version so
			// writeScaffoldSpecs never trips on a duplicate target.
			if (!ctx.hasPlugin("solid-ui")) {
				p.files.push(ctx.scaffold("home.tsx", "src/app/pages/index.tsx"));
			}
		});

		bus.on(Remove, (p) => {
			p.files.push("src/app/");
		});

		bus.on(vite.events.ViteConfig, (p) => {
			p.imports.push({
				source: "vite-plugin-solid",
				default: "solidPlugin",
			});
			p.pluginCalls.push({
				kind: "call",
				callee: { kind: "identifier", name: "solidPlugin" },
				args: [],
			});

			const routes = resolveRoutesConfig(ctx.options);
			if (!routes.enabled) return;

			p.imports.push({
				source: "@fcalell/plugin-solid/node/vite-routes",
				named: ["routesPlugin"],
			});
			p.pluginCalls.push({
				kind: "call",
				callee: { kind: "identifier", name: "routesPlugin" },
				args: [
					{
						kind: "object",
						properties: [
							{
								key: "pagesDir",
								value: { kind: "string", value: routes.pagesDir },
							},
						],
					},
				],
			});
		});

		// Contributes the mount expression to plugin-solid's own Entry event.
		bus.on(events.Entry, (p) => {
			p.imports.push({ source: "./app.css", sideEffect: true });
			p.imports.push({
				source: "solid-js/web",
				named: ["render"],
			});
			p.imports.push({
				source: "@solidjs/router",
				named: ["Router"],
			});
			p.imports.push({
				source: "virtual:fcalell-routes",
				named: ["routes"],
			});
			p.imports.push({
				source: "virtual:stack-providers",
				default: "Providers",
			});
			p.mountExpression = {
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
			};
		});

		// Contributes <head>/<body> defaults to plugin-solid's own Html event.
		// Shell template lives in this plugin since solid owns the HTML pipeline.
		bus.on(events.Html, (p) => {
			const opts = ctx.options ?? {};
			p.shell = ctx.template("shell.html");
			p.head.push({
				kind: "html-attr",
				name: "lang",
				value: opts.lang ?? "en",
			});
			p.head.push({
				kind: "title",
				value: opts.title ?? ctx.app.name,
			});
			if (opts.description) {
				p.head.push({
					kind: "meta",
					name: "description",
					content: opts.description,
				});
			}
			if (opts.themeColor) {
				p.head.push({
					kind: "meta",
					name: "theme-color",
					content: opts.themeColor,
				});
			}
			if (opts.icon) {
				p.head.push({
					kind: "link",
					rel: "icon",
					href: opts.icon,
				});
			}
			p.bodyEnd.push({
				kind: "script",
				type: "module",
				src: "/entry.tsx",
			});
		});

		bus.on(Generate, async (p) => {
			// Emit plugin-owned events, aggregate, push files into the shared
			// accumulator. Ordering mirrors the previous generate.ts sequence
			// so snapshot output stays stable.
			const providersPayload = await bus.emit(events.Providers, {
				providers: [],
			});
			const providersSource = aggregateProviders(providersPayload);
			if (providersSource !== null) {
				p.files.push({
					path: ".stack/virtual-providers.tsx",
					content: providersSource,
				});
			}

			const entryPayload = await bus.emit(events.Entry, {
				imports: [],
				mountExpression: null,
			});
			const entrySource = aggregateEntry(entryPayload);
			if (entrySource !== null) {
				p.files.push({ path: ".stack/entry.tsx", content: entrySource });
			}

			const htmlPayload = await bus.emit(events.Html, {
				shell: null,
				head: [],
				bodyEnd: [],
			});
			const htmlSource = await aggregateHtml(htmlPayload);
			if (htmlSource !== null) {
				p.files.push({ path: ".stack/index.html", content: htmlSource });
			}

			const routes = resolveRoutesConfig(ctx.options);
			const routesPayload = await bus.emit(events.RoutesDts, {
				pagesDir: routes.enabled ? routes.pagesDir : null,
			});
			if (routesPayload.pagesDir) {
				// Directory-presence check lives in buildRoutesDts; swallow the
				// error so a fresh consumer without src/app/pages yet doesn't
				// block `stack generate`. writeRoutesDts covers the happy path.
				try {
					const dts = buildRoutesDts(ctx.cwd, routesPayload.pagesDir);
					p.files.push({ path: ".stack/routes.d.ts", content: dts });
				} catch {
					// pagesDir doesn't exist yet — nothing to write.
				}
				// Keep writeRoutesDts for parity with prior behavior (mkdirs
				// .stack/ as a side effect when the CLI hasn't yet).
				try {
					writeRoutesDts(ctx.cwd, routesPayload.pagesDir);
				} catch {}
			}

			await bus.emit(events.SolidConfigured);
		});
	},
});

export type { SolidOptions } from "./types";
