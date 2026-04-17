import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, type StackConfig } from "@fcalell/cli";
import {
	type DiscoveredPlugin,
	discoverPlugins,
	sortByDependencies,
} from "@fcalell/cli/discovery";
import {
	Build,
	createEventBus,
	Deploy,
	type EventBus,
	Generate,
	Init,
	Remove,
} from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

function registerPlugins(
	sorted: DiscoveredPlugin[],
	config: StackConfig,
	cwd: string,
): EventBus {
	const bus = createEventBus();
	for (const p of sorted) {
		const ctx = createMockCtx({
			options: p.options,
			cwd,
			hasPlugin: (name: string) =>
				config.plugins.some((pl: { __plugin: string }) => pl.__plugin === name),
		});
		p.cli.register(ctx, bus, p.events);
	}
	return bus;
}

describe("E2E consumer journey (db + auth + api + solid + solid-ui)", () => {
	let cwd: string;

	beforeAll(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-e2e-"));
	});

	afterAll(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	const config = defineConfig({
		domain: "app.example.com",
		plugins: [
			db({ dialect: "d1", databaseId: "app-db" }),
			auth({ cookies: { prefix: "app" }, organization: true }),
			api({ cors: "https://app.example.com", prefix: "/rpc" }),
			solid(),
			solidUi(),
		],
	});

	it("config validates with no errors", () => {
		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("discovery resolves plugins and orders them by dependency", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const names = sorted.map((p) => p.name);

		expect(names).toEqual(
			expect.arrayContaining(["db", "auth", "api", "solid", "solid-ui"]),
		);
		expect(names.indexOf("db")).toBeLessThan(names.indexOf("auth"));
		expect(names.indexOf("solid")).toBeLessThan(names.indexOf("solid-ui"));
	});

	it("Init.Scaffold collects files and dependencies from every plugin", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const paths = scaffold.files.map((f) => f.path);
		expect(paths).toContain("src/schema/index.ts");
		expect(paths).toContain("src/worker/plugins/auth.ts");
		expect(paths).toContain("wrangler.toml");

		expect(scaffold.dependencies["@fcalell/plugin-db"]).toBe("workspace:*");
		expect(scaffold.dependencies["@fcalell/plugin-auth"]).toBe("workspace:*");
		expect(scaffold.dependencies["@fcalell/plugin-api"]).toBe("workspace:*");
		expect(scaffold.devDependencies.wrangler).toBeDefined();
		expect(scaffold.gitignore).toContain(".stack");
	});

	it("Generate collects bindings for every runtime-critical plugin", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });

		const bindingNames = gen.bindings.map((b) => b.name);
		expect(bindingNames).toContain("DB_MAIN");
		expect(bindingNames).toContain("AUTH_SECRET");
		expect(bindingNames).toContain("APP_URL");
		expect(bindingNames).toContain("RATE_LIMITER_IP");
		expect(bindingNames).toContain("RATE_LIMITER_EMAIL");

		const d1 = gen.bindings.find((b) => b.type === "d1");
		expect(d1?.databaseId).toBe("app-db");
	});

	it("Deploy.Execute collects wrangler + db migration steps", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const result = await bus.emit(Deploy.Execute, { steps: [] });

		const stepNames = result.steps.map((s) => s.name);
		expect(stepNames).toContain("Worker");

		const wranglerStep = result.steps.find((s) => s.name === "Worker");
		expect(wranglerStep).toBeDefined();
		if (wranglerStep && "exec" in wranglerStep) {
			expect(wranglerStep.exec.command).toBe("npx");
			expect(wranglerStep.exec.args[0]).toBe("wrangler");
			expect(wranglerStep.exec.args).toContain("deploy");
		}
	});

	it("Build.Configure collects Vite plugin contributions", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const built = await bus.emit(Build.Configure, {
			vitePlugins: [],
			viteImports: [],
			vitePluginCalls: [],
		});

		expect(built.viteImports.length).toBeGreaterThan(0);
	});

	it("Remove aggregates files and dependencies for every plugin", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const removal = await bus.emit(Remove, { files: [], dependencies: [] });

		expect(removal.files).toContain("src/schema/");
		expect(removal.files).toContain("src/worker/plugins/auth.ts");
		expect(removal.dependencies).toContain("@fcalell/plugin-db");
		expect(removal.dependencies).toContain("@fcalell/plugin-auth");
		expect(removal.dependencies).toContain("@fcalell/plugin-api");
	});

	it("scaffolded files contain valid TypeScript-looking content", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const schema = scaffold.files.find((f) => f.path === "src/schema/index.ts");
		expect(schema?.content).toContain("sqliteTable");

		const authCallbacks = scaffold.files.find(
			(f) => f.path === "src/worker/plugins/auth.ts",
		);
		expect(authCallbacks?.content).toContain("auth.defineCallbacks");

		const wrangler = scaffold.files.find((f) => f.path === "wrangler.toml");
		expect(wrangler?.content).toContain('main = ".stack/worker.ts"');
	});
});

describe("E2E minimal journey (api only)", () => {
	let cwd: string;

	beforeAll(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-e2e-min-"));
	});

	afterAll(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("api-only config generates with no bindings and a wrangler step", async () => {
		const config = defineConfig({ plugins: [api()] });
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const gen = await bus.emit(Generate, { files: [], bindings: [] });
		expect(gen.bindings).toHaveLength(0);

		const deploy = await bus.emit(Deploy.Execute, { steps: [] });
		expect(deploy.steps.find((s) => s.name === "Worker")).toBeDefined();
	});
});
