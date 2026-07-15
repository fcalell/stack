import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Slot } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import {
	buildGraph,
	type GraphCtxFactory,
	type GraphPlugin,
} from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { vite } from "@fcalell/plugin-vite";
import { afterEach, describe, expect, it } from "vitest";
import { node } from "./index";

// ── Harness ────────────────────────────────────────────────────────

const app = { name: "test-app", domain: "example.com" };

const noopLog = {
	info: () => {},
	warn: () => {},
	success: () => {},
	error: () => {},
};

const scratchDirs: string[] = [];

afterEach(() => {
	while (scratchDirs.length > 0) {
		const dir = scratchDirs.pop();
		if (dir) rmSync(dir, { recursive: true, force: true });
	}
});

// Real cwd with optional route files (api's hasRoutableFiles walks the real
// filesystem) and optional service files (node's hasServiceFiles does too).
function makeRealCwd(options: {
	routes?: string[];
	services?: string[];
}): string {
	const dir = mkdtempSync(join(tmpdir(), "node-test-"));
	scratchDirs.push(dir);
	if (options.routes && options.routes.length > 0) {
		const routesDir = join(dir, "src", "worker", "routes");
		mkdirSync(routesDir, { recursive: true });
		for (const file of options.routes) {
			writeFileSync(join(routesDir, file), "// fixture");
		}
	}
	if (options.services && options.services.length > 0) {
		const servicesDir = join(dir, "src", "server", "services");
		mkdirSync(servicesDir, { recursive: true });
		for (const file of options.services) {
			writeFileSync(join(servicesDir, file), "// fixture");
		}
	}
	return dir;
}

function makeCtxFactory(
	cwd: string,
	perPluginOptions: Record<string, unknown> = {},
): GraphCtxFactory {
	return {
		app,
		cwd,
		log: noopLog,
		ctxForPlugin: (name) => ({
			options: perPluginOptions[name] ?? {},
			fileExists: async () => false,
			readFile: async () => "",
			template: (n) => new URL(`file:///tmp/templates/${name}/${n}`),
			scaffold: (n, target) => ({
				source: new URL(`file:///tmp/templates/${name}/${n}`),
				target,
				plugin: name,
			}),
		}),
	};
}

function toGraphPlugin(
	name: string,
	factory: typeof api | typeof node | typeof vite,
	options: Record<string, unknown> = {},
): GraphPlugin {
	// The factory union's collect() wants an intersection of every plugin's
	// options; each call site passes its own plugin's options, so the cast is
	// sound.
	const collected = factory.cli.collect({
		app,
		options: factory(options as never).options as never,
	});
	return {
		name,
		slots: collected.slots as unknown as Record<string, Slot<unknown>>,
		contributes: collected.contributes,
	};
}

// ── Decoupling proof: api + node, no cloudflare ────────────────────

describe("node + api without cloudflare", () => {
	it("emits .stack/server.ts and .stack/worker.ts for a routes-only project", async () => {
		const cwd = makeRealCwd({ routes: ["board.ts"] });
		const plugins = [toGraphPlugin("node", node), toGraphPlugin("api", api)];
		const g = buildGraph(plugins, makeCtxFactory(cwd));
		const files = await g.resolve(cliSlots.artifactFiles);
		const paths = files.map((f) => f.path);
		expect(paths).toContain(".stack/server.ts");
		expect(paths).toContain(".stack/worker.ts");
	});

	it("is order-independent (api before node yields the same server source)", async () => {
		const cwd = makeRealCwd({ routes: ["board.ts"] });
		const forward = buildGraph(
			[toGraphPlugin("node", node), toGraphPlugin("api", api)],
			makeCtxFactory(cwd),
		);
		const reverse = buildGraph(
			[toGraphPlugin("api", api), toGraphPlugin("node", node)],
			makeCtxFactory(cwd),
		);
		expect(await forward.resolve(node.slots.serverSource)).toBe(
			await reverse.resolve(node.slots.serverSource),
		);
	});

	it("emits no server when there is no worker and no services", async () => {
		const cwd = makeRealCwd({});
		const plugins = [toGraphPlugin("node", node), toGraphPlugin("api", api)];
		const g = buildGraph(plugins, makeCtxFactory(cwd));
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).not.toContain(".stack/server.ts");
	});
});

// ── Options dataflow ───────────────────────────────────────────────

describe("node server source dataflow", () => {
	it("carries node({ port }) and api({ prefix }) into the generated entry", async () => {
		const cwd = makeRealCwd({ routes: ["board.ts"] });
		const plugins = [
			toGraphPlugin("node", node, { port: 9100 }),
			toGraphPlugin("api", api, { prefix: "/api" }),
		];
		const g = buildGraph(
			plugins,
			makeCtxFactory(cwd, { node: { port: 9100 }, api: { prefix: "/api" } }),
		);
		const src = await g.resolve(node.slots.serverSource);
		expect(src).toContain("port: 9100");
		expect(src).toContain('workerPaths: ["/api"]');
	});
});

// ── Consumer services ──────────────────────────────────────────────

describe("node consumer services", () => {
	it("emits the barrel and imports it from the server when service files exist", async () => {
		const cwd = makeRealCwd({
			routes: ["board.ts"],
			services: ["board-watcher.ts"],
		});
		const plugins = [toGraphPlugin("node", node), toGraphPlugin("api", api)];
		const g = buildGraph(plugins, makeCtxFactory(cwd));
		const files = await g.resolve(cliSlots.artifactFiles);
		const barrel = files.find((f) => f.path === "src/server/services/index.ts");
		expect(barrel?.content).toContain(
			'import boardWatcher from "./board-watcher";',
		);
		expect(barrel?.content).toContain(
			"export const services = [boardWatcher];",
		);
		const server = files.find((f) => f.path === ".stack/server.ts");
		expect(server?.content).toContain(
			'import { services } from "../src/server/services";',
		);
		expect(server?.content).toContain("services: [services]");
	});

	it("skips the barrel and its import when no service files exist", async () => {
		const cwd = makeRealCwd({ routes: ["board.ts"] });
		const plugins = [toGraphPlugin("node", node), toGraphPlugin("api", api)];
		const g = buildGraph(plugins, makeCtxFactory(cwd));
		const files = await g.resolve(cliSlots.artifactFiles);
		expect(files.map((f) => f.path)).not.toContain(
			"src/server/services/index.ts",
		);
		const server = files.find((f) => f.path === ".stack/server.ts");
		expect(server?.content).not.toContain("src/server/services");
		expect(server?.content).toContain("services: []");
	});

	it("runs a services-only server when api emits no worker", async () => {
		const cwd = makeRealCwd({ services: ["queue.ts"] });
		const plugins = [toGraphPlugin("node", node), toGraphPlugin("api", api)];
		const g = buildGraph(plugins, makeCtxFactory(cwd));
		const src = await g.resolve(node.slots.serverSource);
		expect(src).toContain("worker: null");
		expect(src).not.toContain("workerPaths");
	});
});

// ── Dev process ────────────────────────────────────────────────────

describe("node dev process", () => {
	it("supervises node --watch with STACK_DEV=1 and the resolved port", async () => {
		const cwd = makeRealCwd({ routes: ["board.ts"] });
		const plugins = [
			toGraphPlugin("node", node, { port: 9100 }),
			toGraphPlugin("api", api),
		];
		const g = buildGraph(
			plugins,
			makeCtxFactory(cwd, { node: { port: 9100 } }),
		);
		const procs = await g.resolve(cliSlots.devProcesses);
		const proc = procs.find((p) => p.name === "node");
		expect(proc).toBeDefined();
		expect(proc?.command).toBe("node");
		expect(proc?.args).toEqual(["--watch", ".stack/server.ts"]);
		expect(proc?.env).toEqual({ STACK_DEV: "1" });
		expect(proc?.defaultPort).toBe(9100);
	});

	it("contributes no dev process when the server has nothing to run", async () => {
		const cwd = makeRealCwd({});
		const plugins = [toGraphPlugin("node", node), toGraphPlugin("api", api)];
		const g = buildGraph(plugins, makeCtxFactory(cwd));
		const procs = await g.resolve(cliSlots.devProcesses);
		expect(procs.find((p) => p.name === "node")).toBeUndefined();
	});
});

// ── Vite proxy ─────────────────────────────────────────────────────

describe("node → vite.slots.serverProxy", () => {
	it("proxies every api route prefix to the node port in the generated vite config", async () => {
		const cwd = makeRealCwd({ routes: ["board.ts"] });
		const plugins = [
			toGraphPlugin("vite", vite),
			toGraphPlugin("node", node),
			toGraphPlugin("api", api),
		];
		const g = buildGraph(plugins, makeCtxFactory(cwd));
		const proxy = await g.resolve(vite.slots.serverProxy);
		expect(proxy).toContainEqual({
			path: "/rpc",
			target: "http://localhost:8788",
		});
		const viteConfig = await g.resolve(vite.slots.viteConfig);
		expect(viteConfig).toContain('"/rpc": {');
		expect(viteConfig).toContain('target: "http://localhost:8788"');
	});
});
