import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import { syncStories } from "./stories.ts";
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
// (the app's route tree, fixtures and entry imports as one virtual module, MSW's
// worker from this package), keeps the story files in step with the routes and
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
			return id === SCREENS ? `\0${id}` : undefined;
		},
		load(id) {
			return id === `\0${SCREENS}` ? screensModule(options) : undefined;
		},
		configureServer(server) {
			startOptimizer(server);
			// Vite's root is `.stack/` and its watcher sees files under it and the
			// modules it loaded, so a route file added outside it would never reach
			// the router plugin, which regenerates the route tree on that event.
			const routes = resolve(options.stackDir, options.routesDir);
			server.watcher.add(routes);
			// A new route file is a story file, and a deleted one's goes. A file is
			// also read once it changes: the router plugin fills a new file in with
			// its `createFileRoute` after it appears. One sync at a time, so two
			// events never write the folder together.
			let syncing = Promise.resolve();
			const sync = (file: string) => {
				if (!file.startsWith(routes)) return;
				syncing = syncing
					.then(() =>
						syncStories({
							root: join(options.stackDir, ".."),
							routes,
							fixtures: resolve(options.stackDir, options.fixtures),
							previewGlobals: options.previewGlobals,
						}),
					)
					.catch((error) => server.config.logger.error(String(error)));
			};
			for (const event of ["add", "change", "unlink"]) {
				server.watcher.on(event, sync);
			}
			server.middlewares.use(WORKER, (_request, response) => {
				response.setHeader("Content-Type", "text/javascript");
				response.end(readFileSync(worker));
			});
		},
	};
}
