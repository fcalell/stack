import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Covers REVIEW-71e4064.md #4: `.stack/worker-configuration.d.ts` emitted by
// the cloudflare plugin's `postWrite` hook must contain every contributed
// binding. The hook shells out to `npx wrangler types`; we probe for
// wrangler and gate the test with `it.skipIf`.

function probeWrangler(): boolean {
	if (process.env.WRANGLER_UNAVAILABLE === "1") return false;
	if (process.env.WRANGLER_AVAILABLE === "1") return true;

	const probeDir = mkdtempSync(join(tmpdir(), "stack-wrangler-probe-"));
	try {
		const result = spawnSync("npx", ["--yes", "wrangler", "--version"], {
			cwd: probeDir,
			stdio: "pipe",
			timeout: 120_000,
		});
		return result.status === 0;
	} catch {
		return false;
	} finally {
		rmSync(probeDir, { recursive: true, force: true });
	}
}

const wranglerAvailable = probeWrangler();
if (!wranglerAvailable) {
	console.warn(
		"[env-generation.test.ts] Skipping wrangler-types tests: `npx wrangler --version` failed. " +
			"Set WRANGLER_AVAILABLE=1 to force-run, or install wrangler locally.",
	);
}

function seedProjectFs(cwd: string): void {
	mkdirSync(join(cwd, "src/schema"), { recursive: true });
	mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
	mkdirSync(join(cwd, "src/worker/plugins"), { recursive: true });
	writeFileSync(join(cwd, "src/worker/plugins/auth.ts"), "");
}

describe("`.stack/worker-configuration.d.ts` generation via wrangler types", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-env-gen-"));
		seedProjectFs(cwd);
		writeFileSync(
			join(cwd, "package.json"),
			JSON.stringify(
				{ name: "stack-env-gen-fixture", version: "0.0.0", private: true },
				null,
				2,
			),
		);
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it.skipIf(!wranglerAvailable)(
		"emits an Env interface containing every plugin-contributed binding",
		async () => {
			const config = defineConfig({
				app: { name: "env-fixture", domain: "example.com" },
				plugins: [
					cloudflare(),
					db({ dialect: "d1", databaseId: "env-test-db" }),
					auth({ secretVar: "AUTH_SECRET" }),
					api(),
				],
			});

			// writeToDisk: true flushes .stack/** AND runs postWrite hooks.
			await runStackGenerate({ config, cwd, writeToDisk: true });

			const dtsPath = join(cwd, ".stack/worker-configuration.d.ts");
			expect(existsSync(dtsPath)).toBe(true);

			const dts = readFileSync(dtsPath, "utf-8");

			expect(dts).toMatch(/AUTH_SECRET:\s*(string|"")/);
			expect(dts).toMatch(/APP_URL:\s*(string|"")/);

			expect(dts).toMatch(/RATE_LIMITER_IP:\s*RateLimit\b/);
			expect(dts).toMatch(/RATE_LIMITER_EMAIL:\s*RateLimit\b/);

			expect(dts).toMatch(/DB_MAIN:\s*D1Database/);
		},
		240_000,
	);
});

describe("`.dev.vars` write-once behavior", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-devvars-"));
		seedProjectFs(cwd);
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("writes .dev.vars on first generate with auth secrets", async () => {
		const config = defineConfig({
			app: { name: "devvars-fixture", domain: "example.com" },
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "devvars-db" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
		});

		await runStackGenerate({ config, cwd, writeToDisk: true });

		const devVarsPath = join(cwd, ".dev.vars");
		expect(existsSync(devVarsPath)).toBe(true);
		const content = readFileSync(devVarsPath, "utf-8");
		expect(content).toContain("AUTH_SECRET=dev-secret-change-me");
		expect(content).toContain("APP_URL=http://localhost:3000");
	});

	it("does not overwrite an existing .dev.vars on subsequent generates", async () => {
		const config = defineConfig({
			app: { name: "devvars-fixture", domain: "example.com" },
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "devvars-db" }),
				auth({ secretVar: "AUTH_SECRET" }),
				api(),
			],
		});

		await runStackGenerate({ config, cwd, writeToDisk: true });

		const devVarsPath = join(cwd, ".dev.vars");
		const customContent =
			"AUTH_SECRET=my-real-dev-secret\nAPP_URL=http://localhost:5173\n";
		writeFileSync(devVarsPath, customContent);

		await runStackGenerate({ config, cwd, writeToDisk: true });

		expect(readFileSync(devVarsPath, "utf-8")).toBe(customContent);
	});
});
