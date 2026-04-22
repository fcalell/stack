import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Regression guard for REVIEW-71e4064.md bug #1 (callback auto-wiring).
// Under the slot-graph, callback wiring is dataflow, not handler order —
// `api.slots.workerSource` derives from `{ runtimes, callbacks, ... }` so
// there's no "fires before contribution lands" race. This test scaffolds
// src/worker/plugins/auth.ts and proves the generated .stack/worker.ts
// both imports authCallbacks AND threads it into .use(authRuntime({...})).

function seedFs(cwd: string, files: string[]): void {
	for (const file of files) {
		const abs = join(cwd, file);
		if (file.endsWith("/")) {
			mkdirSync(abs, { recursive: true });
		} else {
			mkdirSync(dirname(abs), { recursive: true });
			writeFileSync(abs, "");
		}
	}
}

describe("callback auto-wiring (slot-graph dataflow)", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-callback-wiring-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("stamps callbacks: authCallbacks onto authRuntime() in .stack/worker.ts", async () => {
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/routes/",
		]);

		// Consumer-order plugins array.
		const config = defineConfig({
			app: { name: "bug1-repro", domain: "example.com" },
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "repro-db" }),
				api(),
				auth({ secretVar: "AUTH_SECRET" }),
			],
		});

		const result = await runStackGenerate({ config, cwd });
		const worker = result.files.find((f) => f.path === ".stack/worker.ts");
		expect(worker).toBeDefined();
		if (!worker) return;

		// authRuntime() must include `callbacks: authCallbacks`.
		expect(worker.content).toMatch(
			/\.use\(authRuntime\(\{[\s\S]*callbacks: authCallbacks[\s\S]*\}\)\)/,
		);
		expect(worker.content).toContain(
			'import authCallbacks from "../src/worker/plugins/auth"',
		);
	});

	it("skips callbacks when src/worker/plugins/auth.ts does not exist", async () => {
		seedFs(cwd, ["src/schema/", "src/worker/routes/"]);

		const config = defineConfig({
			app: { name: "no-callbacks", domain: "example.com" },
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "nocb-db" }),
				api(),
				auth({ secretVar: "AUTH_SECRET" }),
			],
		});

		const result = await runStackGenerate({ config, cwd });
		const worker = result.files.find((f) => f.path === ".stack/worker.ts");
		expect(worker).toBeDefined();
		if (!worker) return;

		// authRuntime still present, but no callbacks identifier.
		expect(worker.content).toContain("authRuntime(");
		expect(worker.content).not.toContain("authCallbacks");
	});

	it("plugin array order does not affect callback wiring", async () => {
		seedFs(cwd, [
			"src/schema/",
			"src/worker/plugins/auth.ts",
			"src/worker/routes/",
		]);

		// Shuffle the plugins: a consumer could legitimately write them in any
		// order. The slot graph derives ordering from data dependencies.
		const shuffled = defineConfig({
			app: { name: "shuffle", domain: "example.com" },
			plugins: [
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
				cloudflare(),
				db({ dialect: "d1", databaseId: "shuf-db" }),
			],
		});

		const result = await runStackGenerate({ config: shuffled, cwd });
		const worker = result.files.find((f) => f.path === ".stack/worker.ts");
		expect(worker).toBeDefined();
		if (!worker) return;

		expect(worker.content).toMatch(
			/\.use\(authRuntime\(\{[\s\S]*callbacks: authCallbacks[\s\S]*\}\)\)/,
		);
		expect(worker.content).toContain(
			'import authCallbacks from "../src/worker/plugins/auth"',
		);
	});
});
