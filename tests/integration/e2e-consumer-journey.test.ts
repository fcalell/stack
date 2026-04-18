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
	Codegen,
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
		app: { name: "app", domain: "app.example.com" },
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

		const targets = scaffold.files.map((f) => f.target);
		expect(targets).toContain("src/schema/index.ts");
		expect(targets).toContain("src/worker/plugins/auth.ts");
		// plugin-solid + plugin-solid-ui coordinate so only one contributes the
		// home page (solid-ui wins); there is no duplicate target.
		expect(targets.filter((t) => t === "src/app/pages/index.tsx")).toHaveLength(
			1,
		);
		// wrangler.toml scaffold was dropped in Phase 4 — the CLI aggregates
		// wrangler config directly.
		expect(targets).not.toContain("wrangler.toml");
		// Tier A hidden wiring files also no longer scaffold.
		expect(targets).not.toContain("src/app/entry.tsx");
		expect(targets).not.toContain("src/app/pages/_layout.tsx");
		expect(targets).not.toContain("index.html");
		expect(targets).not.toContain("src/app/app.css");

		expect(scaffold.dependencies["@fcalell/plugin-db"]).toBe("workspace:*");
		expect(scaffold.dependencies["@fcalell/plugin-auth"]).toBe("workspace:*");
		expect(scaffold.dependencies["@fcalell/plugin-api"]).toBe("workspace:*");
		expect(scaffold.devDependencies.wrangler).toBeDefined();
		expect(scaffold.gitignore).toContain(".stack");
	});

	it("Codegen.Wrangler collects bindings + secrets for every runtime-critical plugin", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const wrangler = await bus.emit(Codegen.Wrangler, {
			bindings: [],
			routes: [],
			vars: {},
			secrets: [],
			compatibilityDate: "2025-01-01",
		});

		const bindingIds = wrangler.bindings.map((b) =>
			b.kind === "var" ? b.name : b.binding,
		);
		expect(bindingIds).toContain("DB_MAIN");
		expect(bindingIds).toContain("RATE_LIMITER_IP");
		expect(bindingIds).toContain("RATE_LIMITER_EMAIL");

		const secretNames = wrangler.secrets.map((s) => s.name);
		expect(secretNames).toContain("AUTH_SECRET");
		expect(secretNames).toContain("APP_URL");

		const d1 = wrangler.bindings.find((b) => b.kind === "d1");
		expect(d1?.kind === "d1" ? d1.databaseId : null).toBe("app-db");
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

	it("Codegen.ViteConfig collects Vite plugin contributions", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const cfg = await bus.emit(Codegen.ViteConfig, {
			imports: [],
			pluginCalls: [],
			resolveAliases: [],
			devServerPort: 0,
		});

		expect(cfg.imports.length).toBeGreaterThan(0);
		expect(cfg.pluginCalls.length).toBeGreaterThan(0);
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

	it("scaffold templates on disk contain the expected source", async () => {
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const scaffold = await bus.emit(Init.Scaffold, {
			files: [],
			dependencies: {},
			devDependencies: {},
			gitignore: [],
		});

		const { readFileSync } = await import("node:fs");
		const { fileURLToPath } = await import("node:url");

		const schema = scaffold.files.find(
			(f) => f.target === "src/schema/index.ts",
		);
		expect(schema).toBeDefined();
		if (schema) {
			const src = readFileSync(fileURLToPath(schema.source), "utf8");
			expect(src).toContain("sqliteTable");
		}

		const authCallbacks = scaffold.files.find(
			(f) => f.target === "src/worker/plugins/auth.ts",
		);
		expect(authCallbacks).toBeDefined();
		if (authCallbacks) {
			const src = readFileSync(fileURLToPath(authCallbacks.source), "utf8");
			expect(src).toContain("auth.defineCallbacks");
		}
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
		const config = defineConfig({
			app: { name: "api-only", domain: "api.example.com" },
			plugins: [api()],
		});
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const bus = registerPlugins(sorted, config, cwd);

		const gen = await bus.emit(Generate, { files: [] });
		// api plugin contributes a route barrel file via Generate.
		expect(gen.files.map((f) => f.path)).toContain(
			"src/worker/routes/index.ts",
		);

		const wrangler = await bus.emit(Codegen.Wrangler, {
			bindings: [],
			routes: [],
			vars: {},
			secrets: [],
			compatibilityDate: "2025-01-01",
		});
		expect(wrangler.bindings).toHaveLength(0);

		const deploy = await bus.emit(Deploy.Execute, { steps: [] });
		expect(deploy.steps.find((s) => s.name === "Worker")).toBeDefined();
	});
});
