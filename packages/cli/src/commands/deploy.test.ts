import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StackConfig } from "#config";
import { Deploy } from "#events";
import type { DiscoveredPlugin } from "#lib/discovery";
import { StepFailedError } from "#lib/errors";

// `spawnSync` has many properties (stdout, signal, etc.). Tests only assert
// on `status`, so we build a minimal object cast through `unknown` — strictly
// typing the full SpawnSyncReturns shape adds noise without value here.
type SpawnResult = { status: number | null };
const spawnMock = vi.fn<(...args: unknown[]) => SpawnResult>(() => ({
	status: 0,
}));

vi.mock("node:child_process", () => ({
	spawnSync: (...args: unknown[]) => spawnMock(...args),
}));

const buildMock = vi.fn<(configPath: string) => Promise<void>>(async () => {});
vi.mock("#commands/build", () => ({
	build: (...args: [string]) => buildMock(...args),
}));

let mockConfig: StackConfig = {
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

function makePlugin(
	name: string,
	register: DiscoveredPlugin["cli"]["register"] = () => {},
): DiscoveredPlugin {
	return {
		name,
		cli: {
			name,
			label: name,
			implicit: false,
			package: `@fcalell/plugin-${name}`,
			depends: [],
			callbacks: {},
			commands: {},
			register,
		},
		events: {},
		options: {},
	};
}

const { deploy } = await import("./deploy");

describe("deploy()", () => {
	let dir: string;
	const originalCwd = process.cwd();
	const originalIsTTY = process.stdin.isTTY;

	beforeEach(() => {
		spawnMock.mockReset();
		spawnMock.mockImplementation(() => ({ status: 0 }));
		buildMock.mockClear();
		mockConfig = { plugins: [], validate: () => ({ valid: true, errors: [] }) };
		mockDiscovered = [];
		dir = mkdtempSync(join(tmpdir(), "stack-deploy-"));
		process.chdir(dir);
		// Force non-interactive (no confirm prompt) for every test.
		Object.defineProperty(process.stdin, "isTTY", {
			value: false,
			configurable: true,
		});
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(dir, { recursive: true, force: true });
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			configurable: true,
		});
	});

	it("calls build first with the same config path", async () => {
		await deploy({ config: "stack.config.ts" });
		expect(buildMock).toHaveBeenCalledWith("stack.config.ts");
	});

	it("emits Deploy.Complete after executing steps", async () => {
		const completed: string[] = [];
		mockDiscovered = [
			makePlugin("api", (_ctx, bus) => {
				bus.on(Deploy.Complete, () => {
					completed.push("done");
				});
			}),
		];

		await deploy({ config: "stack.config.ts" });
		expect(completed).toEqual(["done"]);
	});

	it("executes deploy steps in phase order", async () => {
		const order: string[] = [];
		mockDiscovered = [
			makePlugin("api", (_ctx, bus) => {
				bus.on(Deploy.Execute, (p) => {
					p.steps.push({
						name: "post",
						phase: "post",
						run: async () => {
							order.push("post");
						},
					});
					p.steps.push({
						name: "pre",
						phase: "pre",
						run: async () => {
							order.push("pre");
						},
					});
					p.steps.push({
						name: "main",
						phase: "main",
						run: async () => {
							order.push("main");
						},
					});
				});
			}),
		];

		await deploy({ config: "stack.config.ts" });
		expect(order).toEqual(["pre", "main", "post"]);
	});

	it("runs exec steps via spawnSync and throws StepFailedError on non-zero status", async () => {
		spawnMock.mockImplementation(() => ({ status: 2 }));

		mockDiscovered = [
			makePlugin("api", (_ctx, bus) => {
				bus.on(Deploy.Execute, (p) => {
					p.steps.push({
						name: "Worker",
						phase: "main",
						exec: { command: "npx", args: ["wrangler", "deploy"] },
					});
				});
			}),
		];

		await expect(deploy({ config: "stack.config.ts" })).rejects.toBeInstanceOf(
			StepFailedError,
		);
		expect(spawnMock).toHaveBeenCalled();
	});

	it("proceeds without a confirm prompt when stdin is not a TTY, even with deploy plan checks", async () => {
		// When a plugin contributes a Deploy.Plan check AND stdin is a TTY,
		// deploy.ts would call `confirm`. Our beforeEach forces isTTY = false,
		// so no confirm is needed and Deploy.Execute must still run.
		const executed: string[] = [];

		mockDiscovered = [
			makePlugin("db", (_ctx, bus) => {
				bus.on(Deploy.Plan, (p) => {
					p.checks.push({
						plugin: "db",
						description: "migrations",
						items: [{ label: "0001_init.sql" }],
						action: async () => {},
					});
				});
				bus.on(Deploy.Execute, (p) => {
					p.steps.push({
						name: "migrations",
						phase: "pre",
						run: async () => {
							executed.push("migrate");
						},
					});
				});
			}),
		];

		await deploy({ config: "stack.config.ts" });
		expect(executed).toEqual(["migrate"]);
	});
});
