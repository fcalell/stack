import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { Plugin, ViteDevServer } from "vite";
import {
	buildTree,
	emitDts,
	emitRoutes,
	emitVirtualModule,
} from "./routes-core";

const VIRTUAL_ID = "virtual:fcalell-routes";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;
const DTS_DIR = ".stack";
const DTS_FILE = "routes.d.ts";

export interface RoutesPluginOptions {
	pagesDir?: string;
}

export function routesPlugin(opts: RoutesPluginOptions = {}): Plugin {
	const pagesDirRel = opts.pagesDir ?? "src/app/pages";
	let projectRoot = process.cwd();
	let absPagesDir = "";
	let cachedModule = "";
	let server: ViteDevServer | null = null;

	function rebuild(): void {
		const files = fg
			.sync(["**/*.tsx", "**/*.jsx"], { cwd: absPagesDir })
			.sort();
		const { root, notFoundFile } = buildTree(files, absPagesDir);
		const { routesArray, typedRoutesRuntime, typedRoutesTypes } = emitRoutes(
			root,
			projectRoot,
			notFoundFile,
		);
		cachedModule = emitVirtualModule(routesArray, typedRoutesRuntime);

		const dtsDir = join(projectRoot, DTS_DIR);
		mkdirSync(dtsDir, { recursive: true });
		writeFileSync(join(dtsDir, DTS_FILE), emitDts(typedRoutesTypes));
	}

	return {
		name: "fcalell:routes",

		configResolved(config) {
			projectRoot = config.root;
			absPagesDir = join(projectRoot, pagesDirRel);
			rebuild();
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
			return null;
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_ID) return cachedModule;
			return null;
		},

		configureServer(devServer) {
			server = devServer;
			devServer.watcher.add(absPagesDir);

			const handler = (file: string): void => {
				if (!file.startsWith(absPagesDir)) return;
				if (!/\.(tsx|jsx)$/.test(file)) return;
				rebuild();
				const mod = devServer.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
				if (mod) devServer.moduleGraph.invalidateModule(mod);
				devServer.ws.send({ type: "full-reload" });
			};

			devServer.watcher.on("add", handler);
			devServer.watcher.on("unlink", handler);
		},

		handleHotUpdate(ctx) {
			if (!server) return;
			if (!ctx.file.startsWith(absPagesDir)) return;
			if (!/_layout\.(tsx|jsx)$/.test(ctx.file)) return;
			// Layout re-nesting isn't HMR-safe — full reload.
			server.ws.send({ type: "full-reload" });
			return [];
		},
	};
}
