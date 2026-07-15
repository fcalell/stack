import { existsSync } from "node:fs";
import { posix } from "node:path";
import fg from "fast-glob";
import type { Logger, Plugin, ViteDevServer } from "vite";
import {
	buildTree,
	emitRoutes,
	emitVirtualModule,
	VIRTUAL_ROUTES_ID,
	writeRoutesDts,
} from "./routes-core.ts";

const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ROUTES_ID}`;

export interface RoutesPluginOptions {
	pagesDir?: string;
}

// Normalize to POSIX forward-slashes regardless of host platform. Vite's
// `normalizePath` also converts, but only on Windows — doing the conversion
// unconditionally here makes path comparisons separator-agnostic by
// construction, and keeps simulated-Windows tests trivial on a POSIX CI host.
// Every absolute path that enters this file — pagesDir (joined from
// `process.cwd()` + the user option), watcher events, handleHotUpdate's
// ctx.file — flows through `toPosix` exactly once at the boundary, so
// intra-plugin comparisons never need to think about slashes.
function toPosix(p: string): string {
	return posix.normalize(p.replaceAll("\\", "/"));
}

// Join arbitrary-slash inputs and normalize to POSIX in one step.
function joinPosix(...parts: string[]): string {
	return toPosix(parts.join("/"));
}

export function routesPlugin(opts: RoutesPluginOptions = {}): Plugin {
	const pagesDirRel = opts.pagesDir ?? "src/app/pages";
	// `stack dev`/`stack build` always spawn vite with cwd = the consumer
	// project root, but the generated `.stack/vite.config.ts` sets Vite's
	// own `root` to `.stack` (see plugin-vite's codegen), one level below.
	// Consumer sources — including the pages dir — live under the invoking
	// cwd, never under `config.root`. `projectCwd` is what fast-glob and the
	// dev-server watcher use to find real files on disk; `configRoot` is
	// only used for the glob-key math in `emitRoutes`, which must match
	// Vite's own root-relative `import.meta.glob` key convention (Vite
	// always keys glob results relative to `config.root`, however the glob
	// pattern reached the file — see routes-core's `emitVirtualModule`).
	let projectCwd = process.cwd();
	let configRoot = "";
	let absPagesDir = "";
	let cachedModule = "";
	let server: ViteDevServer | null = null;
	let logger: Logger | null = null;
	// Per-instance so double-instantiation (e.g. a dev-server restart, or two
	// routesPlugin() calls composed in one Vite config) warns each time —
	// matches the scope of the plugin instance that produced the warning.
	let warnedMissing = false;

	function warnMissingPagesDir(): void {
		if (warnedMissing) return;
		warnedMissing = true;
		const message =
			`[plugin-solid] pages directory not found: ${absPagesDir}. ` +
			"Routes will be empty. Check your `solid({ pagesDir })` setting or create the directory.";
		if (logger) logger.warn(message);
		else console.warn(message);
	}

	function rebuild(): void {
		if (!existsSync(absPagesDir)) {
			warnMissingPagesDir();
			cachedModule = emitVirtualModule("[]", "", pagesDirRel);
			return;
		}
		const files = fg
			.sync(["**/*.tsx", "**/*.jsx"], { cwd: absPagesDir })
			.sort();
		const { root, notFoundFile } = buildTree(files, absPagesDir);
		const { routesArray, typedRoutesRuntime } = emitRoutes(
			root,
			configRoot,
			notFoundFile,
		);
		cachedModule = emitVirtualModule(
			routesArray,
			typedRoutesRuntime,
			pagesDirRel,
		);
		writeRoutesDts(projectCwd, pagesDirRel);
	}

	return {
		name: "fcalell:routes",

		configResolved(config) {
			projectCwd = toPosix(process.cwd());
			configRoot = toPosix(config.root);
			absPagesDir = joinPosix(projectCwd, pagesDirRel);
			logger = config.logger;
			rebuild();
		},

		resolveId(id) {
			if (id === VIRTUAL_ROUTES_ID) return RESOLVED_VIRTUAL_ID;
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
				const normalized = toPosix(file);
				if (!normalized.startsWith(absPagesDir)) return;
				if (!/\.(tsx|jsx)$/.test(normalized)) return;
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
			const file = toPosix(ctx.file);
			if (!file.startsWith(absPagesDir)) return;
			if (!/_layout\.(tsx|jsx)$/.test(file)) return;
			// Layout re-nesting isn't HMR-safe — full reload.
			server.ws.send({ type: "full-reload" });
			return [];
		},
	};
}
