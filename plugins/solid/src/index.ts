import { createPlugin } from "@fcalell/cli";
import { Codegen, Generate, Init, Remove } from "@fcalell/cli/events";
import { vite } from "@fcalell/plugin-vite";
import { writeRoutesDts } from "./node/routes-core";
import type { SolidOptions } from "./types";

export const solid = createPlugin("solid", {
	label: "SolidJS",
	events: ["SolidConfigured"],
	depends: [vite.events.ViteConfigured],

	config(options: SolidOptions = {}) {
		return options;
	},

	register(ctx, bus, events) {
		bus.on(Init.Scaffold, (p) => {
			// When plugin-solid-ui is present it contributes its own richer
			// home scaffold with the same target. Skip our bare version so
			// writeScaffoldSpecs never trips on a duplicate target.
			if (!ctx.hasPlugin("solid-ui")) {
				p.files.push({
					source: new URL("../templates/home.tsx", import.meta.url),
					target: "src/app/pages/index.tsx",
				});
			}
			p.dependencies["@fcalell/plugin-solid"] = "workspace:*";
			p.dependencies["solid-js"] = "^1.9.0";
		});

		bus.on(Remove, (p) => {
			p.files.push("src/app/");
			p.dependencies.push("@fcalell/plugin-solid", "solid-js");
		});

		bus.on(Codegen.ViteConfig, (p) => {
			const pagesDir =
				ctx.options?.routes && typeof ctx.options.routes === "object"
					? (ctx.options.routes.pagesDir ?? "src/app/pages")
					: "src/app/pages";
			p.imports.push({
				source: "vite-plugin-solid",
				default: "solidPlugin",
			});
			p.imports.push({
				source: "@fcalell/plugin-solid/node/vite-routes",
				named: ["routesPlugin"],
			});
			p.pluginCalls.push({
				kind: "call",
				callee: { kind: "identifier", name: "solidPlugin" },
				args: [],
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
								value: { kind: "string", value: pagesDir },
							},
						],
					},
				],
			});
		});

		bus.on(Codegen.RoutesDts, (p) => {
			// Mirrors the direct writeRoutesDts call below; Phase 5 wires the
			// aggregator-backed writer.
			if (ctx.options?.routes === false) {
				p.pagesDir = null;
				return;
			}
			const routesConfig =
				ctx.options?.routes && typeof ctx.options.routes === "object"
					? ctx.options.routes
					: {};
			p.pagesDir = routesConfig.pagesDir ?? "src/app/pages";
		});

		bus.on(Codegen.Entry, (p) => {
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

		bus.on(Codegen.Html, (p) => {
			const opts = ctx.options ?? {};
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

		bus.on(Generate, async (_p) => {
			if (ctx.options?.routes === false) return;

			const routesConfig =
				ctx.options?.routes && typeof ctx.options.routes === "object"
					? ctx.options.routes
					: {};
			const pagesDirRel = routesConfig.pagesDir ?? "src/app/pages";

			writeRoutesDts(ctx.cwd, pagesDirRel);

			await bus.emit(events.SolidConfigured);
		});
	},
});

export type { SolidOptions } from "./types";
