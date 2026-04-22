import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Consumer wrangler.toml merging: plugin-cloudflare reads the consumer's
// wrangler.toml (at cwd root), preserves every root-level key it does not
// own, and appends plugin-contributed bindings. The deleted
// tests/integration/wrangler-generation.test.ts used to cover this; the
// per-aggregator test in plugins/cloudflare/src/node/codegen.test.ts only
// covers `main`, so arbitrary root-level keys (observability, rules, custom
// [vars]) went uncovered after the refactor.
//
// We assert against the emitted TOML with regex/substring checks to avoid
// pulling smol-toml into tests/integration's package graph (it's a
// transitive dep of plugin-cloudflare, not a direct integration-test dep).

describe("wrangler.toml merging with consumer-authored base", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-wrangler-merge-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	// Helper: run generate and pull the merged wrangler.toml from the
	// in-memory files array. Avoids `writeToDisk: true`, which triggers the
	// slow `npx wrangler types` postWrite hook.
	async function generateWrangler(
		config: Parameters<typeof runStackGenerate>[0]["config"],
		cwd: string,
	): Promise<string> {
		const result = await runStackGenerate({ config, cwd });
		const file = result.files.find((f) => f.path === ".stack/wrangler.toml");
		if (!file) throw new Error("No .stack/wrangler.toml in generate output");
		return file.content;
	}

	it("preserves consumer root keys alongside plugin-contributed bindings", async () => {
		// Author a consumer wrangler.toml with a mix of surfaces the plugin
		// does not own: [observability], [[rules]], and a custom [vars] entry.
		// The merge must keep these intact AND append the d1_databases binding.
		const consumerWrangler = [
			'name = "my-consumer-app"',
			'compatibility_date = "2024-08-01"',
			"",
			"[observability]",
			"enabled = true",
			"head_sampling_rate = 0.5",
			"",
			"[[rules]]",
			'type = "Text"',
			'globs = ["**/*.md"]',
			"fallthrough = true",
			"",
			"[vars]",
			'FEATURE_FLAG_X = "enabled"',
			"",
		].join("\n");
		writeFileSync(join(cwd, "wrangler.toml"), consumerWrangler);

		// Minimal fs layout plugin-api/plugin-db expect so generate emits a
		// non-empty worker/wrangler. We only assert on the wrangler merge.
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
		mkdirSync(join(cwd, "src/schema"), { recursive: true });

		const config = defineConfig({
			app: { name: "my-consumer-app", domain: "example.com" },
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-xyz" }),
				api(),
			],
		});

		const toml = await generateWrangler(config, cwd);

		// Consumer-authored root keys survive the merge verbatim.
		expect(toml).toContain('name = "my-consumer-app"');
		expect(toml).toContain('compatibility_date = "2024-08-01"');

		// [observability] block survived with both fields.
		expect(toml).toMatch(/\[observability\][\s\S]*enabled\s*=\s*true/);
		expect(toml).toMatch(
			/\[observability\][\s\S]*head_sampling_rate\s*=\s*0\.5/,
		);

		// [[rules]] array-table survived with every field.
		expect(toml).toMatch(/\[\[rules\]\][\s\S]*type\s*=\s*"Text"/);
		expect(toml).toMatch(/\[\[rules\]\][\s\S]*globs\s*=\s*\[\s*"\*\*\/\*\.md"/);
		expect(toml).toMatch(/\[\[rules\]\][\s\S]*fallthrough\s*=\s*true/);

		// Consumer's custom var merged alongside plugin-contributed vars.
		expect(toml).toMatch(/FEATURE_FLAG_X\s*=\s*"enabled"/);

		// Plugin-contributed binding was appended.
		expect(toml).toContain("[[d1_databases]]");
		expect(toml).toMatch(/binding\s*=\s*"DB_MAIN"/);
		expect(toml).toMatch(/database_id\s*=\s*"abc-xyz"/);

		// `main` defaults to "worker.ts" (relative to .stack/) since the
		// consumer did not specify one.
		expect(toml).toMatch(/^main\s*=\s*"worker\.ts"$/m);
	});

	it("preserves a consumer-supplied `main` without overriding it", async () => {
		writeFileSync(
			join(cwd, "wrangler.toml"),
			[
				'name = "custom-main-app"',
				'compatibility_date = "2024-08-01"',
				'main = "./src/custom-entry.ts"',
				"",
			].join("\n"),
		);
		mkdirSync(join(cwd, "src/schema"), { recursive: true });

		// db declares `requires: ["api"]`, so api() is a required companion
		// in any valid config that uses db.
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
		mkdirSync(join(cwd, "src/schema"), { recursive: true });

		const config = defineConfig({
			app: { name: "custom-main-app", domain: "example.com" },
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "custom-main-db" }),
				api(),
			],
		});

		const toml = await generateWrangler(config, cwd);
		expect(toml).toMatch(/^main\s*=\s*"\.\/src\/custom-entry\.ts"$/m);
	});

	it("falls back to name + compatibility_date when no consumer wrangler.toml exists", async () => {
		// No wrangler.toml written — plugin-cloudflare synthesizes defaults from
		// app.name and today's date.
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
		mkdirSync(join(cwd, "src/schema"), { recursive: true });

		const config = defineConfig({
			app: { name: "greenfield-app", domain: "example.com" },
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "green-db" }),
				api(),
			],
		});

		const toml = await generateWrangler(config, cwd);

		expect(toml).toContain('name = "greenfield-app"');
		expect(toml).toMatch(/^compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"$/m);
		expect(toml).toMatch(/^main\s*=\s*"worker\.ts"$/m);
	});
});
