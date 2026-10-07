import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import { routeOfModuleId, screenModule } from "./screens.ts";
import { type ScreensModuleOptions, screensModule } from "./virtual.ts";

export interface ScreensPluginOptions extends ScreensModuleOptions {
	// The routes directory, relative to `stackDir`.
	routesDir: string;
}

const SCREENS = "virtual:stack-screens";
const WORKER = "/mockServiceWorker.js";

// Storybook runs Vite in middleware mode and never calls `server.listen()`,
// the call that starts Vite's dependency optimizer: without it `optimizeDeps`
// never scans or pre-bundles, a CJS dependency behind a `node_modules` import
// (`react-dom/client` through Storybook's dom shim) is served raw ("require is
// not defined"), and each dependency found late reloads the page.
function startOptimizer(server: ViteDevServer): void {
	void server.environments.client.depsOptimizer?.init();
}

// The Vite plugin every Storybook host over the app's config runs: it starts
// the dependency optimizer. A host that draws routes runs `screensPlugin`
// instead, which does this too.
export function storybookHost(): Plugin {
	return { name: "stack:storybook-host", configureServer: startOptimizer };
}

// The Vite plugin only the screens host runs: it serves what a story needs
// (the app's route tree, fixtures and entry imports as one virtual module, the
// routes' stories, MSW's worker from this package), watches the routes and
// starts the dependency optimizer. It is added to the config `.stack/screens.vite.config.ts` only,
// never to the app's.
export function screensPlugin(options: ScreensPluginOptions): Plugin {
	// From this package, beside the `msw` the preview imports: the worker file
	// and the library are one copy.
	const worker = createRequire(import.meta.url).resolve(
		"msw/mockServiceWorker.js",
	);

	return {
		name: "stack:screens",
		resolveId(id) {
			if (id === SCREENS || routeOfModuleId(id) !== null) return `\0${id}`;
			return undefined;
		},
		load(id) {
			if (!id.startsWith("\0")) return undefined;
			if (id === `\0${SCREENS}`) return screensModule(options);
			const routeId = routeOfModuleId(id.slice(1));
			return routeId === null ? undefined : screenModule(routeId);
		},
		configureServer(server) {
			startOptimizer(server);
			// Vite's root is `.stack/` and its watcher sees files under it and the
			// modules it loaded, so a route file added outside it would never reach
			// the router plugin, which regenerates the route tree on that event.
			server.watcher.add(join(options.stackDir, options.routesDir));
			server.middlewares.use(WORKER, (_request, response) => {
				response.setHeader("Content-Type", "text/javascript");
				response.end(readFileSync(worker));
			});
		},
	};
}
