import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { defineConfig, type PluginConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { vite } from "@fcalell/plugin-vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

async function renderWorker(opts: {
	cwd: string;
	plugins: readonly PluginConfig[];
	origins?: string[];
	domain?: string;
}): Promise<string | null> {
	const result = await runStackGenerate({
		config: defineConfig({
			app: {
				name: "test-app",
				domain: opts.domain ?? "example.com",
				origins: opts.origins,
			},
			plugins: opts.plugins,
		}),
		cwd: opts.cwd,
	});
	return (
		result.files.find((f) => f.path === ".stack/worker.ts")?.content ?? null
	);
}

describe("virtual worker codegen pipeline (defineConfig-driven)", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-virtual-worker-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("full-stack config produces correct imports and builder chain", async () => {
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/middleware.ts",
			"src/worker/routes/",
		]);

		const result = await renderWorker({
			cwd,
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "test-id" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
		});

		expect(result).not.toBeNull();
		if (!result) return;
		expect(result).toContain(
			'import createWorker from "@fcalell/plugin-api/runtime"',
		);
		expect(result).toContain(
			'import dbRuntime from "@fcalell/plugin-db/runtime"',
		);
		expect(result).toContain(
			'import authRuntime from "@fcalell/plugin-auth/runtime"',
		);
		expect(result).toContain(
			'import authCallbacks from "../src/worker/plugins/auth"',
		);
		expect(result).toContain('import * as schema from "../src/schema"');
		expect(result).toContain('import * as routes from "../src/worker/routes"');
		expect(result).toContain(
			'import middleware from "../src/worker/middleware"',
		);
		expect(result).toMatch(/\.use\(dbRuntime\(\{[\s\S]*schema[\s\S]*\}\)\)/);
		expect(result).toMatch(
			/\.use\(authRuntime\(\{[\s\S]*callbacks: authCallbacks[\s\S]*\}\)\)/,
		);
		expect(result).toContain(".use(middleware)");
		expect(result).toContain(".handler(routes)");
		expect(result).toContain("export type AppRouter = typeof worker._router");
		expect(result).toContain("export default worker");
	});

	it("API-only config (no auth) produces simpler worker", async () => {
		seedFs(cwd, ["src/schema/", "src/worker/routes/"]);

		const result = await renderWorker({
			cwd,
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "test-id" }),
				api(),
			],
		});

		expect(result).not.toBeNull();
		if (!result) return;
		expect(result).toContain(
			'import dbRuntime from "@fcalell/plugin-db/runtime"',
		);
		expect(result).not.toContain("authRuntime");
		expect(result).not.toContain('from "../src/worker/middleware"');
		expect(result).toContain(".handler(routes)");
	});

	it("middleware import is included only when middleware.ts exists", async () => {
		seedFs(cwd, ["src/worker/middleware.ts"]);
		const withMiddleware = await renderWorker({
			cwd,
			plugins: [cloudflare(), db({ dialect: "d1", databaseId: "x" }), api()],
		});

		const withoutCwd = mkdtempSync(join(tmpdir(), "stack-virtual-worker-no-"));
		try {
			const withoutMiddleware = await renderWorker({
				cwd: withoutCwd,
				plugins: [cloudflare(), db({ dialect: "d1", databaseId: "x" }), api()],
			});

			expect(withMiddleware).toContain(
				'import middleware from "../src/worker/middleware"',
			);
			expect(withMiddleware).toContain(".use(middleware)");
			expect(withoutMiddleware).not.toContain(
				'from "../src/worker/middleware"',
			);
		} finally {
			rmSync(withoutCwd, { recursive: true, force: true });
		}
	});

	it("callback imports are included only when auth callback file exists", async () => {
		seedFs(cwd, ["src/worker/plugins/auth.ts"]);
		const withCallbacks = await renderWorker({
			cwd,
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "x" }),
				auth(),
				api(),
			],
		});

		const withoutCwd = mkdtempSync(join(tmpdir(), "stack-virtual-worker-no-"));
		try {
			const withoutCallbacks = await renderWorker({
				cwd: withoutCwd,
				plugins: [
					cloudflare(),
					db({ dialect: "d1", databaseId: "x" }),
					auth(),
					api(),
				],
			});

			expect(withCallbacks).toContain(
				'import authCallbacks from "../src/worker/plugins/auth"',
			);
			expect(withCallbacks).toContain("callbacks: authCallbacks");
			expect(withoutCallbacks).not.toContain("authCallbacks");
		} finally {
			rmSync(withoutCwd, { recursive: true, force: true });
		}
	});

	it("routes import is included when routes dir exists", async () => {
		seedFs(cwd, ["src/worker/routes/"]);
		const withRoutes = await renderWorker({
			cwd,
			plugins: [cloudflare(), db({ dialect: "d1", databaseId: "x" }), api()],
		});

		const withoutCwd = mkdtempSync(join(tmpdir(), "stack-virtual-worker-no-"));
		try {
			const withoutRoutes = await renderWorker({
				cwd: withoutCwd,
				plugins: [cloudflare(), db({ dialect: "d1", databaseId: "x" }), api()],
			});

			expect(withRoutes).toContain(
				'import * as routes from "../src/worker/routes"',
			);
			expect(withRoutes).toContain(".handler(routes)");
			expect(withoutRoutes).not.toContain('from "../src/worker/routes"');
			expect(withoutRoutes).toContain(".handler()");
		} finally {
			rmSync(withoutCwd, { recursive: true, force: true });
		}
	});

	it("inlines cors from app.origins into the createWorker options object", async () => {
		// A runtime plugin (db) is required for a worker to emit at all — the
		// workerSource derivation returns null with zero runtimes.
		const result = await renderWorker({
			cwd,
			origins: [
				"https://example.com",
				"https://app.example.com",
				"http://localhost:3000",
			],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "cors-test" }),
				vite({ port: 3000 }),
				api(),
			],
		});

		expect(result).not.toBeNull();
		if (!result) return;
		const createWorkerArgs = result.match(/createWorker\(\{([\s\S]*?)\}\)/);
		expect(createWorkerArgs).not.toBeNull();
		const args = createWorkerArgs?.[1] ?? "";
		expect(args).toContain('"https://example.com"');
		expect(args).toContain('"https://app.example.com"');
		expect(args).toContain('"http://localhost:3000"');
		expect(args).toMatch(/cors:\s*\[/);
	});

	it("auto-derives cors from app.domain when origins aren't set", async () => {
		const result = await renderWorker({
			cwd,
			domain: "my-app.test",
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "derive-test" }),
				api(),
			],
		});

		expect(result).not.toBeNull();
		if (!result) return;
		const createWorkerArgs = result.match(/createWorker\(\{([\s\S]*?)\}\)/);
		expect(createWorkerArgs).not.toBeNull();
		const args = createWorkerArgs?.[1] ?? "";
		expect(args).toMatch(/cors:\s*\[/);
		expect(args).toContain('"https://my-app.test"');
		expect(args).toContain('"https://app.my-app.test"');
	});

	it("sets auth sameSite=none when cors includes a localhost origin", async () => {
		seedFs(cwd, ["src/worker/plugins/auth.ts"]);

		const result = await renderWorker({
			cwd,
			origins: ["http://localhost:3000"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "x" }),
				vite({ port: 3000 }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
		});

		expect(result).not.toBeNull();
		if (!result) return;
		const authRuntimeCall = result.match(/authRuntime\(\{([\s\S]*?)\}\)/);
		expect(authRuntimeCall).not.toBeNull();
		expect(authRuntimeCall?.[1] ?? "").toMatch(/sameSite:\s*"none"/);
	});

	it("does not set sameSite when no frontend signal is present", async () => {
		seedFs(cwd, ["src/worker/plugins/auth.ts"]);

		const result = await renderWorker({
			cwd,
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "x" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
		});

		expect(result).not.toBeNull();
		if (!result) return;
		expect(result).not.toContain("sameSite");
	});

	it("plugin order does not affect the generated worker", async () => {
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/routes/",
		]);

		const canonical = await renderWorker({
			cwd,
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "order-test" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
		});

		const shuffled = await renderWorker({
			cwd,
			origins: ["https://example.com"],
			plugins: [
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
				cloudflare(),
				db({ dialect: "d1", databaseId: "order-test" }),
			],
		});

		expect(shuffled).toEqual(canonical);
	});

	it("generated code has correct structure (imports, builder chain, export)", async () => {
		const result = await renderWorker({
			cwd,
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "test-id" }),
				api(),
			],
		});

		expect(result).not.toBeNull();
		if (!result) return;
		const lines = result.split("\n");

		const importLines = lines.filter((l) => l.startsWith("import"));
		expect(importLines.length).toBeGreaterThanOrEqual(2);

		expect(result).toContain("const worker = createWorker(");
		expect(result).toContain("export default worker");
	});
});
