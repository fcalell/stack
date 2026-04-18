import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StackConfig } from "#config";
import { Build } from "#events";
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

// Mock `hasRuntimeExport` so we don't need real plugin packages installed.
// The flag controls whether build.ts adds the wrangler bundle step.
let mockHasRuntime = false;
vi.mock("#lib/codegen", () => ({
	hasRuntimeExport: () => mockHasRuntime,
}));

// Stub the generate command — build.ts calls it first. We don't want to
// exercise all of generate's side effects here.
const generateMock = vi.fn<(configPath: string) => Promise<void>>(
	async () => {},
);
vi.mock("#commands/generate", () => ({
	generate: (...args: [string]) => generateMock(...args),
}));

// Stub config loading + discovery so build.ts runs with a synthetic plugin set.
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

const { build } = await import("./build");

describe("build()", () => {
	let dir: string;
	const originalCwd = process.cwd();

	beforeEach(() => {
		spawnMock.mockReset();
		spawnMock.mockImplementation(() => ({ status: 0 }));
		generateMock.mockClear();
		mockHasRuntime = false;
		mockConfig = {
			app: { name: "app", domain: "example.com" },
			plugins: [],
			validate: () => ({ valid: true, errors: [] }),
		};
		mockDiscovered = [];
		dir = mkdtempSync(join(tmpdir(), "stack-build-"));
		process.chdir(dir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(dir, { recursive: true, force: true });
	});

	it("runs generate first, then no steps when there are no plugins", async () => {
		await build("stack.config.ts");
		expect(generateMock).toHaveBeenCalledWith("stack.config.ts");
		expect(spawnMock).not.toHaveBeenCalled();
	});

	it("adds the wrangler bundle step when any plugin has a worker runtime", async () => {
		mockHasRuntime = true;
		mockDiscovered = [makePlugin("api")];

		await build("stack.config.ts");

		expect(spawnMock).toHaveBeenCalledTimes(1);
		const [command, args] = spawnMock.mock.calls[0] ?? [];
		expect(command).toBe("npx");
		expect(args).toEqual(
			expect.arrayContaining([
				"wrangler",
				"deploy",
				"--dry-run",
				"--config",
				expect.stringContaining(".stack/wrangler.toml"),
			]),
		);
	});

	it("executes plugin-contributed steps in phase order (pre → main → post)", async () => {
		const order: string[] = [];

		mockDiscovered = [
			makePlugin("api", (_ctx, bus) => {
				bus.on(Build.Start, (p) => {
					p.steps.push({
						name: "post-step",
						phase: "post",
						run: async () => {
							order.push("post");
						},
					});
					p.steps.push({
						name: "pre-step",
						phase: "pre",
						run: async () => {
							order.push("pre");
						},
					});
					p.steps.push({
						name: "main-step",
						phase: "main",
						run: async () => {
							order.push("main");
						},
					});
				});
			}),
		];

		await build("stack.config.ts");
		expect(order).toEqual(["pre", "main", "post"]);
	});

	it("throws StepFailedError when an exec step returns a non-zero status", async () => {
		mockHasRuntime = true;
		mockDiscovered = [makePlugin("api")];
		spawnMock.mockImplementation(() => ({ status: 1 }));

		await expect(build("stack.config.ts")).rejects.toBeInstanceOf(
			StepFailedError,
		);
	});
});
