import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Logger, Plugin, ViteDevServer } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routesPlugin } from "./vite-routes";

// Minimal stubs for the bits of Vite we use. Kept intentionally shallow —
// the point is to exercise the real path-handling + watcher-hookup logic in
// the plugin, not to simulate a full Vite server.
interface StubWatcher extends EventEmitter {
	add: (path: string) => void;
}

function makeWatcher(): StubWatcher {
	const w = new EventEmitter() as StubWatcher;
	w.add = vi.fn();
	return w;
}

type TestLogger = Logger & { warnings: string[] };

function makeLogger(): TestLogger {
	const warnings: string[] = [];
	return {
		warnings,
		warn: (msg: string) => warnings.push(msg),
		warnOnce: (msg: string) => warnings.push(msg),
		info: () => {},
		error: () => {},
		clearScreen: () => {},
		hasErrorLogged: () => false,
		hasWarned: false,
	} as unknown as TestLogger;
}

interface TestServer extends ViteDevServer {
	ws: { send: ReturnType<typeof vi.fn> } & ViteDevServer["ws"];
}

function makeServer(root: string, watcher: StubWatcher): TestServer {
	return {
		watcher,
		moduleGraph: {
			getModuleById: vi.fn(() => ({ id: "stub" })),
			invalidateModule: vi.fn(),
		},
		ws: { send: vi.fn() },
		config: { root, logger: makeLogger() },
	} as unknown as TestServer;
}

// Vite plugin hooks can be declared as functions or as objects with a
// `handler` property — Plugin<T> reflects that union. The plugin we build
// uses the function form; these helpers give us typed access without
// reaching into internal context types at the call site.
function configResolvedOf(
	p: Plugin,
	cfg: { root: string; logger: Logger },
): void {
	const hook = p.configResolved;
	if (typeof hook === "function") {
		// biome-ignore lint/suspicious/noExplicitAny: minimal ResolvedConfig stub
		(hook as unknown as (c: any) => void).call({}, cfg);
		return;
	}
	if (hook && typeof hook === "object" && "handler" in hook) {
		// biome-ignore lint/suspicious/noExplicitAny: minimal ResolvedConfig stub
		(hook.handler as unknown as (c: any) => void).call({}, cfg);
	}
}

function configureServerOf(p: Plugin, server: ViteDevServer): void {
	const hook = p.configureServer;
	if (typeof hook === "function") {
		(hook as unknown as (s: ViteDevServer) => void).call({}, server);
		return;
	}
	if (hook && typeof hook === "object" && "handler" in hook) {
		(hook.handler as unknown as (s: ViteDevServer) => void).call({}, server);
	}
}

function loadOf(p: Plugin, id: string): string | null {
	const hook = p.load;
	if (typeof hook === "function") {
		const out = (
			hook as unknown as (id: string) => string | null | undefined
		).call({}, id);
		return (out ?? null) as string | null;
	}
	if (hook && typeof hook === "object" && "handler" in hook) {
		const out = (
			hook.handler as unknown as (id: string) => string | null | undefined
		).call({}, id);
		return (out ?? null) as string | null;
	}
	return null;
}

function handleHotUpdateOf(p: Plugin, ctx: { file: string }): unknown {
	const hook = p.handleHotUpdate ?? p.hotUpdate;
	if (typeof hook === "function") {
		// biome-ignore lint/suspicious/noExplicitAny: minimal HmrContext
		return (hook as unknown as (c: any) => unknown).call({}, ctx);
	}
	if (hook && typeof hook === "object" && "handler" in hook) {
		// biome-ignore lint/suspicious/noExplicitAny: minimal HmrContext
		return (hook.handler as unknown as (c: any) => unknown).call({}, ctx);
	}
	return undefined;
}

describe("routesPlugin — path normalization", () => {
	let cwd: string;
	let pagesDir: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "plugin-solid-vr-"));
		pagesDir = join(cwd, "src/app/pages");
		mkdirSync(pagesDir, { recursive: true });
		writeFileSync(join(pagesDir, "index.tsx"), "export default () => null;");
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("rebuilds when a .tsx file is added under the pages dir (POSIX host)", () => {
		const plugin = routesPlugin({ pagesDir: "src/app/pages" });
		configResolvedOf(plugin, { root: cwd, logger: makeLogger() });

		const watcher = makeWatcher();
		const server = makeServer(cwd, watcher);
		configureServerOf(plugin, server);

		// Write a new file then emit an `add` event the way chokidar does (POSIX).
		const newFile = join(pagesDir, "about.tsx");
		writeFileSync(newFile, "export default () => null;");
		const asPosix = newFile.split(/[\\/]/).join("/");
		watcher.emit("add", asPosix);

		const module = loadOf(plugin, "\0virtual:fcalell-routes");
		expect(module).toContain("about.tsx");
	});

	// Load-bearing regression test. Simulates a Windows host: the plugin was
	// initialised with Windows-style `\` separators in pagesDir / config.root,
	// while the watcher emits POSIX `/` (chokidar always does). The old
	// `file.startsWith(absPagesDir)` returned false and routes never
	// regenerated. The fix normalises every inbound path through toPosix at
	// the plugin boundary, so POSIX wins by construction — independent of
	// the host platform.
	it("rebuilds on watcher `add` when pagesDir was initialised with Windows-style backslashes", () => {
		const plugin = routesPlugin({ pagesDir: "src\\app\\pages" });
		const winishRoot = cwd.replaceAll("/", "\\");
		configResolvedOf(plugin, { root: winishRoot, logger: makeLogger() });

		const watcher = makeWatcher();
		const server = makeServer(winishRoot, watcher);
		configureServerOf(plugin, server);

		// Chokidar emits POSIX paths even on Windows — the plugin must accept.
		const newFile = join(pagesDir, "contact.tsx");
		writeFileSync(newFile, "export default () => null;");
		const asPosix = newFile.split(/[\\/]/).join("/");
		watcher.emit("add", asPosix);

		const module = loadOf(plugin, "\0virtual:fcalell-routes");
		expect(module).toContain("contact.tsx");
		expect(server.ws.send).toHaveBeenCalledWith({ type: "full-reload" });
	});

	it("ignores add events for files outside the pages dir", () => {
		const plugin = routesPlugin({ pagesDir: "src/app/pages" });
		configResolvedOf(plugin, { root: cwd, logger: makeLogger() });

		const watcher = makeWatcher();
		const server = makeServer(cwd, watcher);
		configureServerOf(plugin, server);

		const unrelated = join(cwd, "other/file.tsx").split(/[\\/]/).join("/");
		watcher.emit("add", unrelated);

		expect(server.ws.send).not.toHaveBeenCalled();
	});

	it("triggers full-reload on handleHotUpdate for a _layout file (POSIX)", () => {
		const plugin = routesPlugin({ pagesDir: "src/app/pages" });
		configResolvedOf(plugin, { root: cwd, logger: makeLogger() });

		const watcher = makeWatcher();
		const server = makeServer(cwd, watcher);
		configureServerOf(plugin, server);

		const layoutFile = join(pagesDir, "_layout.tsx").split(/[\\/]/).join("/");
		const result = handleHotUpdateOf(plugin, { file: layoutFile });
		expect(server.ws.send).toHaveBeenCalledWith({ type: "full-reload" });
		expect(result).toEqual([]);
	});

	it("triggers full-reload on _layout HMR when ctx.file uses Windows-style backslashes", () => {
		const plugin = routesPlugin({ pagesDir: "src/app/pages" });
		configResolvedOf(plugin, { root: cwd, logger: makeLogger() });

		const watcher = makeWatcher();
		const server = makeServer(cwd, watcher);
		configureServerOf(plugin, server);

		// Simulate a Windows path arriving through handleHotUpdate — our
		// normalisation must coerce it to POSIX before the startsWith check.
		const backslashLayout = join(pagesDir, "_layout.tsx").replaceAll("/", "\\");
		handleHotUpdateOf(plugin, { file: backslashLayout });
		expect(server.ws.send).toHaveBeenCalledWith({ type: "full-reload" });
	});

	it("handleHotUpdate ignores non-layout file changes", () => {
		const plugin = routesPlugin({ pagesDir: "src/app/pages" });
		configResolvedOf(plugin, { root: cwd, logger: makeLogger() });

		const watcher = makeWatcher();
		const server = makeServer(cwd, watcher);
		configureServerOf(plugin, server);

		const regular = join(pagesDir, "index.tsx").split(/[\\/]/).join("/");
		const result = handleHotUpdateOf(plugin, { file: regular });
		expect(server.ws.send).not.toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it("handleHotUpdate ignores files outside the pages dir", () => {
		const plugin = routesPlugin({ pagesDir: "src/app/pages" });
		configResolvedOf(plugin, { root: cwd, logger: makeLogger() });

		const watcher = makeWatcher();
		const server = makeServer(cwd, watcher);
		configureServerOf(plugin, server);

		const outside = join(cwd, "src/other/_layout.tsx").split(/[\\/]/).join("/");
		handleHotUpdateOf(plugin, { file: outside });
		expect(server.ws.send).not.toHaveBeenCalled();
	});
});

describe("routesPlugin — per-instance missing-pages-dir warning", () => {
	let cwd: string;

	beforeEach(() => {
		// cwd has no pages dir.
		cwd = mkdtempSync(join(tmpdir(), "plugin-solid-missing-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("warns once per plugin instance (not once per process)", () => {
		const a = routesPlugin({ pagesDir: "src/app/pages" });
		const b = routesPlugin({ pagesDir: "src/app/pages" });
		const loggerA = makeLogger();
		const loggerB = makeLogger();

		configResolvedOf(a, { root: cwd, logger: loggerA });
		configResolvedOf(b, { root: cwd, logger: loggerB });

		expect(loggerA.warnings.length).toBe(1);
		expect(loggerB.warnings.length).toBe(1);
		expect(loggerA.warnings[0]).toMatch(/pages directory not found/);
		expect(loggerB.warnings[0]).toMatch(/pages directory not found/);
	});

	it("does not re-warn on successive rebuilds from the same instance", () => {
		const plugin = routesPlugin({ pagesDir: "src/app/pages" });
		const logger = makeLogger();
		configResolvedOf(plugin, { root: cwd, logger });

		const watcher = makeWatcher();
		const server = makeServer(cwd, watcher);
		configureServerOf(plugin, server);

		// Each add event triggers rebuild(). The first warned (configResolved →
		// rebuild → warn). Subsequent adds should not re-warn.
		watcher.emit("add", join(cwd, "src/app/pages/x.tsx"));
		watcher.emit("add", join(cwd, "src/app/pages/y.tsx"));
		expect(logger.warnings.length).toBe(1);
	});
});

// Covers the route-generation surface through the real `load()` hook.
// Exercises nested dirs, dynamic segments, catch-all, route groups, index /
// layout placement — the whole surface the Vite plugin resolves at runtime
// and the surface routes.d.ts codegen must match. These catch drift between
// routesPlugin's emitted module and routes-core's emitRoutes/emitDts output.
describe("routesPlugin — load() output vs filesystem layout", () => {
	let cwd: string;
	let pagesDir: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "plugin-solid-load-"));
		pagesDir = join(cwd, "src/app/pages");
		mkdirSync(pagesDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	function runPlugin(): string | null {
		const plugin = routesPlugin({ pagesDir: "src/app/pages" });
		configResolvedOf(plugin, { root: cwd, logger: makeLogger() });
		return loadOf(plugin, "\0virtual:fcalell-routes");
	}

	it("handles index + dynamic + catch-all + nested routes together", () => {
		writeFileSync(join(pagesDir, "index.tsx"), "");
		writeFileSync(join(pagesDir, "_layout.tsx"), "");
		mkdirSync(join(pagesDir, "projects"), { recursive: true });
		writeFileSync(join(pagesDir, "projects/index.tsx"), "");
		writeFileSync(join(pagesDir, "projects/[id].tsx"), "");
		mkdirSync(join(pagesDir, "docs"), { recursive: true });
		writeFileSync(join(pagesDir, "docs/[...slug].tsx"), "");

		const out = runPlugin();
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toMatch(/path:\s*"\/"/);
		expect(out).toMatch(/path:\s*"\/projects\/:id"/);
		expect(out).toMatch(/path:\s*"\/docs\/\*slug"/);
		expect(out).toContain("typedRoutes");
	});

	it("honours _layout files for nested dirs", () => {
		mkdirSync(join(pagesDir, "app"), { recursive: true });
		writeFileSync(join(pagesDir, "app/_layout.tsx"), "");
		writeFileSync(join(pagesDir, "app/index.tsx"), "");

		const out = runPlugin();
		expect(out).not.toBeNull();
		if (!out) return;
		expect(out).toMatch(/path:\s*"\/app"/);
		expect(out).toContain("_layout.tsx");
	});

	it("strips route-group directories from the emitted URL but keeps them in the on-disk load path", () => {
		mkdirSync(join(pagesDir, "(marketing)"), { recursive: true });
		writeFileSync(join(pagesDir, "(marketing)/about.tsx"), "");

		const out = runPlugin();
		expect(out).not.toBeNull();
		if (!out) return;
		// URL is /about — the `(marketing)` group is peeled off.
		expect(out).toMatch(/path:\s*"\/about"/);
		// URL must NOT contain the group prefix.
		expect(out).not.toMatch(/path:\s*"\/\(marketing\)/);
		// The component load path still references the real on-disk file.
		expect(out).toContain("(marketing)/about.tsx");
	});
});
