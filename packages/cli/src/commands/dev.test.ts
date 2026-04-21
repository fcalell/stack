import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StackConfig } from "#config";
import { Dev } from "#events";
import type { DiscoveredPlugin } from "#lib/discovery";

// Mocked fs.watch returns a fake FSWatcher we can introspect. Tests grab the
// handler and fire it synchronously to simulate a change.
interface FakeWatcher {
	path: string;
	close: ReturnType<typeof vi.fn>;
	handler: (event: string, filename: string) => void;
}
const watchers: FakeWatcher[] = [];
const watchMock = vi.fn((path: string, ..._rest: unknown[]) => {
	// watch signatures: watch(path, listener) | watch(path, options, listener).
	const listener = (
		_rest.length === 1 ? _rest[0] : _rest[1]
	) as FakeWatcher["handler"];
	const w: FakeWatcher = {
		path,
		close: vi.fn(),
		handler: listener,
	};
	watchers.push(w);
	return { close: w.close };
});
const existsMock = vi.fn((_p: string) => true);

vi.mock("node:fs", async () => {
	const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
	return {
		...actual,
		watch: (path: string, ...rest: unknown[]) => watchMock(path, ...rest),
		existsSync: (p: string) => existsMock(p),
	};
});

// Spawned processes: collect a fake ChildProcess so we can assert .kill() later.
interface FakeChild extends EventEmitter {
	killed: boolean;
	kill: ReturnType<typeof vi.fn>;
}
const spawnedChildren: FakeChild[] = [];
const spawnMock = vi.fn<
	(command: string, args: string[], options?: unknown) => FakeChild
>((_command, _args, _options) => {
	const child = new EventEmitter() as FakeChild;
	child.killed = false;
	child.kill = vi.fn(() => {
		child.killed = true;
		return true;
	});
	spawnedChildren.push(child);
	return child;
});
vi.mock("node:child_process", () => ({
	spawn: (command: string, args: string[], options?: unknown) =>
		spawnMock(command, args, options),
}));

const generateMock = vi.fn<(configPath: string) => Promise<void>>(
	async (_configPath) => {},
);
vi.mock("#commands/generate", () => ({
	generate: (configPath: string) => generateMock(configPath),
}));

let mockConfig: StackConfig = {
	app: { name: "app", domain: "example.com" },
	plugins: [],
	validate: () => ({ valid: true, errors: [] }),
};
let mockDiscovered: DiscoveredPlugin[] = [];
vi.mock("#lib/config", () => ({
	loadConfig: vi.fn(async () => mockConfig),
}));
vi.mock("#lib/discovery", () => ({
	discoverPlugins: vi.fn(async () => mockDiscovered),
	sortByDependencies: (p: DiscoveredPlugin[]) => p,
}));

// Force dev.ts to treat every plugin package as worker-less by default. One
// test flips this to true to assert the wrangler branch.
const hasRuntimeMock = vi.fn<(packageName: string) => boolean>(() => false);
vi.mock("#lib/codegen", () => ({
	hasRuntimeExport: (pkg: string) => hasRuntimeMock(pkg),
}));

function makePlugin(
	name: string,
	register: DiscoveredPlugin["cli"]["register"] = () => {},
): DiscoveredPlugin {
	return {
		name,
		cli: {
			name,
			label: name,
			package: `@fcalell/plugin-${name}`,
			after: [],
			callbacks: {},
			commands: {},
			register,
		},
		events: {},
		options: {},
	};
}

const { dev } = await import("./dev");

describe("dev()", () => {
	let dir: string;
	const originalCwd = process.cwd();

	beforeEach(() => {
		watchers.length = 0;
		spawnedChildren.length = 0;
		watchMock.mockClear();
		spawnMock.mockClear();
		existsMock.mockClear();
		existsMock.mockImplementation(() => true);
		generateMock.mockClear();
		hasRuntimeMock.mockClear();
		hasRuntimeMock.mockImplementation(() => false);
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [],
			validate: () => ({ valid: true, errors: [] }),
		};
		mockDiscovered = [];
		dir = mkdtempSync(join(tmpdir(), "stack-dev-"));
		process.chdir(dir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(dir, { recursive: true, force: true });
	});

	it("invokes generate before Dev.Start / Dev.Ready", async () => {
		const order: string[] = [];
		generateMock.mockImplementation(async () => {
			order.push("generate");
		});
		mockDiscovered = [
			makePlugin("p", (_ctx, bus) => {
				bus.on(Dev.Start, () => {
					order.push("start");
				});
				bus.on(Dev.Ready, () => {
					order.push("ready");
				});
			}),
		];

		await dev({ studio: false, config: "stack.config.ts" });

		expect(order).toEqual(["generate", "start", "ready"]);
	});

	it("runs Dev.Ready setup tasks in registration order", async () => {
		const run: string[] = [];
		mockDiscovered = [
			makePlugin("p", (_ctx, bus) => {
				bus.on(Dev.Ready, (p) => {
					p.setup.push({
						name: "first",
						run: async () => {
							run.push("first");
						},
					});
					p.setup.push({
						name: "second",
						run: async () => {
							run.push("second");
						},
					});
				});
			}),
		];

		await dev({ studio: false, config: "stack.config.ts" });

		expect(run).toEqual(["first", "second"]);
	});

	it("registers watchers from both Dev.Start and Dev.Ready", async () => {
		mockDiscovered = [
			makePlugin("p", (_ctx, bus) => {
				bus.on(Dev.Start, (p) => {
					p.watchers.push({
						name: "start-watch",
						paths: "src/start",
						handler: async () => {},
					});
				});
				bus.on(Dev.Ready, (p) => {
					p.watchers.push({
						name: "ready-watch",
						paths: "src/ready",
						handler: async () => {},
					});
				});
			}),
		];

		await dev({ studio: false, config: "stack.config.ts" });

		// Plugin watchers + built-in config watcher. The routes watcher is skipped
		// because existsSync is mocked to return true universally but still: test
		// on the plugin-contributed paths specifically.
		const paths = watchers.map((w) => w.path);
		expect(paths.some((p) => p.endsWith("src/start"))).toBe(true);
		expect(paths.some((p) => p.endsWith("src/ready"))).toBe(true);
	});

	it("invokes the watcher handler after debounce when a change fires", async () => {
		vi.useFakeTimers();
		try {
			const handler = vi.fn(async () => {});
			mockDiscovered = [
				makePlugin("p", (_ctx, bus) => {
					bus.on(Dev.Start, (p) => {
						p.watchers.push({
							name: "schema",
							paths: "src/schema",
							debounce: 100,
							handler,
						});
					});
				}),
			];

			await dev({ studio: false, config: "stack.config.ts" });

			const schema = watchers.find((w) => w.path.endsWith("src/schema"));
			expect(schema).toBeDefined();
			schema?.handler("change", "schema.ts");
			expect(handler).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(150);
			expect(handler).toHaveBeenCalledWith("schema.ts", "change");
		} finally {
			vi.useFakeTimers({ toFake: [] });
			vi.useRealTimers();
		}
	});

	it("spawns wrangler when any plugin reports a runtime export", async () => {
		hasRuntimeMock.mockImplementation(() => true);
		mockDiscovered = [makePlugin("api")];

		await dev({ studio: false, config: "stack.config.ts" });

		// First spawn is wrangler; assert the command and that --config points at
		// the generated wrangler.toml.
		expect(spawnMock).toHaveBeenCalled();
		const firstCall = spawnMock.mock.calls[0];
		if (!firstCall) throw new Error("spawn was not called");
		const [cmd, args] = firstCall;
		expect(cmd).toBe("npx");
		expect(args).toEqual(
			expect.arrayContaining(["wrangler", "dev", "--config"]),
		);
	});

	it("does not spawn wrangler when no plugin reports a runtime", async () => {
		hasRuntimeMock.mockImplementation(() => false);
		mockDiscovered = [
			makePlugin("p", (_ctx, bus) => {
				bus.on(Dev.Start, (payload) => {
					payload.processes.push({
						name: "vite",
						command: "npx",
						args: ["vite"],
					});
				});
			}),
		];

		await dev({ studio: false, config: "stack.config.ts" });

		// Only the plugin-contributed process got spawned (no wrangler).
		expect(spawnMock).toHaveBeenCalledTimes(1);
		const firstCall = spawnMock.mock.calls[0];
		if (!firstCall) throw new Error("spawn was not called");
		const [, args] = firstCall;
		expect(args).not.toContain("wrangler");
	});

	it("spawns plugin-contributed processes from Dev.Start", async () => {
		mockDiscovered = [
			makePlugin("vite", (_ctx, bus) => {
				bus.on(Dev.Start, (p) => {
					p.processes.push({
						name: "vite",
						command: "npx",
						args: ["vite", "--port", "3000"],
					});
				});
			}),
		];

		await dev({ studio: false, config: "stack.config.ts" });

		const matched = spawnMock.mock.calls.find(
			(call) => Array.isArray(call[1]) && call[1][0] === "vite",
		);
		expect(matched).toBeDefined();
	});

	it("falls through when watched paths do not exist", async () => {
		// existsSync false → those watchers are skipped entirely.
		existsMock.mockImplementation(() => false);
		mockDiscovered = [
			makePlugin("p", (_ctx, bus) => {
				bus.on(Dev.Start, (p) => {
					p.watchers.push({
						name: "absent",
						paths: "does/not/exist",
						handler: async () => {},
					});
				});
			}),
		];

		await dev({ studio: false, config: "stack.config.ts" });

		// Only watchers that were set up get a handler; paths that didn't exist
		// should be skipped, but the config watcher attaches on cwd itself so we
		// still expect at least one watcher: assert no watcher was registered for
		// the skipped path.
		expect(
			watchers.find((w) => w.path.endsWith("does/not/exist")),
		).toBeUndefined();
	});
});
