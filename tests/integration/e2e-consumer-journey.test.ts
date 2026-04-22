import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { buildTestGraph, runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";
import { vite } from "@fcalell/plugin-vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

function seedFs(cwd: string, files: string[]): void {
	for (const file of files) {
		const abs = join(cwd, file);
		mkdirSync(dirname(abs), { recursive: true });
		if (file.endsWith("/")) {
			mkdirSync(abs, { recursive: true });
		} else {
			writeFileSync(abs, "");
		}
	}
}

describe("E2E consumer journey (db + auth + api + solid + solid-ui)", () => {
	let cwd: string;

	beforeAll(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-e2e-"));
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/routes/",
		]);
	});

	afterAll(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	const config = defineConfig({
		app: { name: "app", domain: "app.example.com" },
		plugins: [
			cloudflare(),
			db({ dialect: "d1", databaseId: "app-db" }),
			auth({ cookies: { prefix: "app" }, organization: true }),
			api({ prefix: "/rpc" }),
			vite(),
			solid(),
			solidUi(),
		],
	});

	it("config validates with no errors", () => {
		const result = config.validate();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("init scaffolds collect files and dependencies from every plugin", async () => {
		const { graph } = await buildTestGraph({ config, cwd });

		const scaffolds = await graph.resolve(cliSlots.initScaffolds);
		const dependencies = await graph.resolve(cliSlots.initDeps);
		const devDependencies = await graph.resolve(cliSlots.initDevDeps);
		const gitignore = await graph.resolve(cliSlots.gitignore);

		const targets = scaffolds.map((f) => f.target);
		expect(targets).toContain("src/schema/index.ts");
		expect(targets).toContain("src/worker/plugins/auth.ts");
		// solid + solid-ui coordinate via override on homeScaffold — only one
		// scaffold lands for src/app/pages/index.tsx.
		expect(
			targets.filter((t) => t === "src/app/pages/index.tsx").length,
		).toBeGreaterThanOrEqual(1);
		expect(targets).not.toContain("wrangler.toml");
		expect(targets).not.toContain("src/app/entry.tsx");
		expect(targets).not.toContain("index.html");

		expect(dependencies["@fcalell/plugin-db"]).toBe("workspace:*");
		expect(dependencies["@fcalell/plugin-auth"]).toBe("workspace:*");
		expect(dependencies["@fcalell/plugin-api"]).toBe("workspace:*");
		expect(devDependencies.wrangler).toBeDefined();
		expect(gitignore).toContain(".stack");
	});

	it("cloudflare slot aggregation includes every runtime-critical binding", async () => {
		const { graph } = await buildTestGraph({ config, cwd });
		const bindings = await graph.resolve(cloudflare.slots.bindings);
		const secrets = await graph.resolve(cloudflare.slots.secrets);

		const bindingIds = bindings.map((b) =>
			b.kind === "var" ? b.name : b.binding,
		);
		expect(bindingIds).toContain("DB_MAIN");
		expect(bindingIds).toContain("RATE_LIMITER_IP");
		expect(bindingIds).toContain("RATE_LIMITER_EMAIL");

		const secretNames = secrets.map((s) => s.name);
		expect(secretNames).toContain("AUTH_SECRET");
		expect(secretNames).toContain("APP_URL");

		const d1 = bindings.find((b) => b.kind === "d1");
		expect(d1?.kind === "d1" ? d1.databaseId : null).toBe("app-db");
	});

	it("deploy steps include wrangler + db migration", async () => {
		const { graph } = await buildTestGraph({ config, cwd });
		const steps = await graph.resolve(cliSlots.deploySteps);

		const stepNames = steps.map((s) => s.name);
		expect(stepNames).toContain("Worker");
		expect(stepNames).toContain("Database migrations");

		const wranglerStep = steps.find((s) => s.name === "Worker");
		expect(wranglerStep).toBeDefined();
		if (wranglerStep && "exec" in wranglerStep) {
			expect(wranglerStep.exec.command).toBe("npx");
			expect(wranglerStep.exec.args[0]).toBe("wrangler");
			expect(wranglerStep.exec.args).toContain("deploy");
		}
	});

	it("vite slot aggregation collects framework plugin calls and imports", async () => {
		const { graph } = await buildTestGraph({ config, cwd });
		const imports = await graph.resolve(vite.slots.configImports);
		const pluginCalls = await graph.resolve(vite.slots.pluginCalls);

		expect(imports.length).toBeGreaterThan(0);
		expect(pluginCalls.length).toBeGreaterThan(0);
	});

	it("remove slots aggregate files and dependencies for every plugin", async () => {
		const { graph } = await buildTestGraph({ config, cwd });
		const files = await graph.resolve(cliSlots.removeFiles);
		const deps = await graph.resolve(cliSlots.removeDeps);

		expect(files).toContain("src/schema/");
		expect(files).toContain("src/worker/plugins/auth.ts");
		expect(deps).toContain("@fcalell/plugin-db");
		expect(deps).toContain("@fcalell/plugin-auth");
		expect(deps).toContain("@fcalell/plugin-api");
	});

	it("scaffold templates resolve to real on-disk URLs with expected contents", async () => {
		const { graph } = await buildTestGraph({ config, cwd });
		const scaffolds = await graph.resolve(cliSlots.initScaffolds);

		const { readFileSync } = await import("node:fs");
		const { fileURLToPath } = await import("node:url");

		const schema = scaffolds.find((f) => f.target === "src/schema/index.ts");
		expect(schema).toBeDefined();
		if (schema) {
			const src = readFileSync(fileURLToPath(schema.source), "utf8");
			expect(src).toContain("sqliteTable");
		}

		const authCallbacks = scaffolds.find(
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
		seedFs(cwd, ["src/worker/routes/", "src/schema/"]);
	});

	afterAll(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("cloudflare + api config generates route barrel, no db bindings, and a wrangler deploy step", async () => {
		const config = defineConfig({
			app: { name: "api-only", domain: "api.example.com" },
			plugins: [cloudflare(), api()],
		});

		const gen = await runStackGenerate({ config, cwd });
		expect(gen.files.map((f) => f.path)).toContain(
			"src/worker/routes/index.ts",
		);

		const { graph } = await buildTestGraph({ config, cwd });
		const bindings = await graph.resolve(cloudflare.slots.bindings);
		expect(bindings).toHaveLength(0);

		const steps = await graph.resolve(cliSlots.deploySteps);
		expect(steps.find((s) => s.name === "Worker")).toBeDefined();
	});

	it("runStackGenerate exposes the post-write hook queue", async () => {
		const config = defineConfig({
			app: { name: "api-only", domain: "api.example.com" },
			plugins: [cloudflare(), api()],
		});

		const gen = await runStackGenerate({ config, cwd });

		// plugin-cloudflare queues a `wrangler types` shell-out in the
		// post-write hook. Present but not invoked here (writeToDisk: false).
		expect(gen.postWrite.length).toBeGreaterThanOrEqual(1);
		expect(gen.postWrite.every((h) => typeof h === "function")).toBe(true);
	});
});
