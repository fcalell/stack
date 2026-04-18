import { createPlugin } from "@fcalell/cli";
import {
	Build,
	Dev,
	Generate,
	Init,
	Remove,
	type ViteImportSpec,
	type VitePluginCallSpec,
} from "@fcalell/cli/events";
import { vite } from "@fcalell/plugin-vite";
import solidPlugin from "vite-plugin-solid";
import { writeRoutesDts } from "./node/routes-core";
import type { SolidOptions } from "./types";

const INDEX_HTML = `<!doctype html>
<html lang="en">
\t<head>
\t\t<meta charset="UTF-8" />
\t\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />
\t\t<title>App</title>
\t</head>
\t<body>
\t\t<div id="app"></div>
\t\t<script type="module" src="./src/app/entry.tsx"></script>
\t</body>
</html>
`;

const ENTRY_TEMPLATE = `import { createApp } from "@fcalell/plugin-solid/app";

const app = createApp();
app.mount("#app");
`;

const LAYOUT_TEMPLATE = `import type { ParentProps } from "solid-js";

export default function Layout(props: ParentProps) {
\treturn <>{props.children}</>;
}
`;

const INDEX_TEMPLATE = `export default function Home() {
\treturn <h1>Welcome</h1>;
}
`;

export const solid = createPlugin("solid", {
	label: "SolidJS",
	events: ["SolidConfigured"],
	depends: [vite.events.ViteConfigured],

	config(options: SolidOptions = {}) {
		return options;
	},

	register(ctx, bus, events) {
		bus.on(Init.Scaffold, (p) => {
			p.files.push({
				path: "index.html",
				content: INDEX_HTML,
			});
			p.files.push({
				path: "src/app/entry.tsx",
				content: ENTRY_TEMPLATE,
			});
			p.files.push({
				path: "src/app/pages/_layout.tsx",
				content: LAYOUT_TEMPLATE,
			});
			p.files.push({
				path: "src/app/pages/index.tsx",
				content: INDEX_TEMPLATE,
			});
			p.dependencies["@fcalell/plugin-solid"] = "workspace:*";
			p.dependencies["solid-js"] = "^1.9.0";
		});

		bus.on(Remove, (p) => {
			p.files.push("src/app/");
			p.dependencies.push("@fcalell/plugin-solid", "solid-js");
		});

		const injectVitePlugins = async (p: {
			vitePlugins: unknown[];
			viteImports: ViteImportSpec[];
			vitePluginCalls: VitePluginCallSpec[];
		}) => {
			p.vitePlugins.push(solidPlugin());
			const { routesPlugin } = await import("./node/vite-routes");
			const pagesDir =
				ctx.options?.routes && typeof ctx.options.routes === "object"
					? (ctx.options.routes.pagesDir ?? "src/app/pages")
					: "src/app/pages";
			p.vitePlugins.push(routesPlugin({ pagesDir }));

			p.viteImports.push({
				from: "vite-plugin-solid",
				default: "solidPlugin",
			});
			p.viteImports.push({
				from: "@fcalell/plugin-solid/node/vite-routes",
				named: ["routesPlugin"],
			});
			p.vitePluginCalls.push({ name: "solidPlugin" });
			p.vitePluginCalls.push({ name: "routesPlugin", options: { pagesDir } });
		};
		bus.on(Dev.Configure, injectVitePlugins);
		bus.on(Build.Configure, injectVitePlugins);

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
