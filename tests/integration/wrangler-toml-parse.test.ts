import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, type PluginConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Parses the emitted .stack/wrangler.toml with a real TOML parser and asserts
// on structured fields — catches malformed TOML that happens to `toContain()`
// the right substring (e.g. a stray unquoted value or a broken array table).
// Complements the string-level regex checks in wrangler-merge.test.ts: those
// are fine when the aim is "this specific field survived merging", but they
// would never catch a syntactically-valid-looking output that a real parser
// chokes on.

async function generateWrangler(opts: {
	cwd: string;
	plugins: readonly PluginConfig[];
	origins?: string[];
}): Promise<string> {
	const result = await runStackGenerate({
		config: defineConfig({
			app: {
				name: "test-app",
				domain: "example.com",
				origins: opts.origins,
			},
			plugins: opts.plugins,
		}),
		cwd: opts.cwd,
	});
	const file = result.files.find((f) => f.path === ".stack/wrangler.toml");
	if (!file) throw new Error("No .stack/wrangler.toml in generate output");
	return file.content;
}

interface ParsedWrangler {
	name?: string;
	main?: string;
	compatibility_date?: string;
	vars?: Record<string, unknown>;
	d1_databases?: Array<{
		binding?: string;
		database_id?: string;
		database_name?: string;
		migrations_dir?: string;
	}>;
	unsafe?: {
		bindings?: Array<{
			name?: string;
			type?: string;
			limit?: number;
			period?: number;
		}>;
	};
	observability?: { enabled?: boolean };
	rules?: Array<{ type?: string; globs?: string[] }>;
}

describe("wrangler.toml TOML-parse validation", () => {
	let cwd: string;

	beforeEach(() => {
		cwd = mkdtempSync(join(tmpdir(), "stack-wrangler-parse-"));
	});

	afterEach(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	it("emits syntactically valid TOML that a real parser accepts", async () => {
		mkdirSync(join(cwd, "src/schema"), { recursive: true });
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });

		const toml = await generateWrangler({
			cwd,
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				api(),
			],
		});

		// smol-toml throws on malformed input — this is the primary assertion.
		const parsed = parseToml(toml) as ParsedWrangler;

		expect(parsed.name).toBe("test-app");
		expect(parsed.main).toBe("worker.ts");
	});

	it("compatibility_date matches YYYY-MM-DD after parsing (not string fragment)", async () => {
		mkdirSync(join(cwd, "src/schema"), { recursive: true });
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });

		const toml = await generateWrangler({
			cwd,
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				api(),
			],
		});

		const parsed = parseToml(toml) as ParsedWrangler;
		// The value must be a real string matching the ISO date shape.
		expect(typeof parsed.compatibility_date).toBe("string");
		expect(parsed.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("produces exactly one [[d1_databases]] table with the expected fields", async () => {
		mkdirSync(join(cwd, "src/schema"), { recursive: true });
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });

		const toml = await generateWrangler({
			cwd,
			plugins: [
				cloudflare(),
				db({
					dialect: "d1",
					databaseId: "parse-test-id",
					binding: "DB_MAIN",
				}),
				api(),
			],
		});

		const parsed = parseToml(toml) as ParsedWrangler;
		expect(parsed.d1_databases).toHaveLength(1);
		const d1 = parsed.d1_databases?.[0];
		expect(d1).toMatchObject({
			binding: "DB_MAIN",
			database_id: "parse-test-id",
			database_name: "parse-test-id",
		});

		// `migrations_dir` is required: wrangler silently skips migrations
		// when it's missing. This is the bug recently caught only by a human
		// noticing the snapshot; now a real parser confirms the key exists.
		expect(d1?.migrations_dir).toBeDefined();
		expect(typeof d1?.migrations_dir).toBe("string");
	});

	it("auth rate limiters emit as a parseable unsafe.bindings array", async () => {
		mkdirSync(join(cwd, "src/schema"), { recursive: true });
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
		mkdirSync(join(cwd, "src/worker/plugins"), { recursive: true });
		// plugin-auth requires its callback file to exist (sendOTP).
		writeFileSync(
			join(cwd, "src/worker/plugins/auth.ts"),
			'import { auth } from "@fcalell/plugin-auth";\n' +
				"export default auth.defineCallbacks({});\n",
		);

		const toml = await generateWrangler({
			cwd,
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				auth({
					secretVar: "AUTH_SECRET",
					rateLimiter: {
						ip: { binding: "RATE_LIMITER_IP", limit: 100, period: 60 },
						email: { binding: "RATE_LIMITER_EMAIL", limit: 5, period: 300 },
					},
				}),
				api(),
			],
		});

		const parsed = parseToml(toml) as ParsedWrangler;
		const bindings = parsed.unsafe?.bindings ?? [];
		expect(bindings).toHaveLength(2);

		const ip = bindings.find((b) => b.name === "RATE_LIMITER_IP");
		expect(ip).toMatchObject({
			name: "RATE_LIMITER_IP",
			type: "ratelimit",
			limit: 100,
			period: 60,
		});

		const email = bindings.find((b) => b.name === "RATE_LIMITER_EMAIL");
		expect(email).toMatchObject({
			name: "RATE_LIMITER_EMAIL",
			type: "ratelimit",
			limit: 5,
			period: 300,
		});
	});

	it("auth secrets land in [vars] as top-level empty strings", async () => {
		mkdirSync(join(cwd, "src/schema"), { recursive: true });
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
		mkdirSync(join(cwd, "src/worker/plugins"), { recursive: true });
		writeFileSync(
			join(cwd, "src/worker/plugins/auth.ts"),
			'import { auth } from "@fcalell/plugin-auth";\n' +
				"export default auth.defineCallbacks({});\n",
		);

		const toml = await generateWrangler({
			cwd,
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "abc-123" }),
				auth({ secretVar: "AUTH_SECRET", appUrlVar: "APP_URL" }),
				api(),
			],
		});

		const parsed = parseToml(toml) as ParsedWrangler;
		expect(parsed.vars).toBeDefined();
		expect(parsed.vars?.AUTH_SECRET).toBe("");
		expect(parsed.vars?.APP_URL).toBe("");
	});
});
