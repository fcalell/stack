import type { BindingDeclaration } from "@fcalell/cli";
import { generateWranglerToml } from "@fcalell/cli/codegen";
import { describe, expect, it } from "vitest";

describe("generateWranglerToml", () => {
	it("D1 binding produces [[d1_databases]] section", () => {
		const result = generateWranglerToml({
			consumerWrangler: null,
			bindings: [
				{
					name: "DB_MAIN",
					type: "d1",
					databaseId: "abc-123",
					databaseName: "my-db",
				},
			],
		});

		expect(result).toContain("[[d1_databases]]");
		expect(result).toContain('binding = "DB_MAIN"');
		expect(result).toContain('database_id = "abc-123"');
		expect(result).toContain('database_name = "my-db"');
	});

	it("rate limiter produces [[unsafe.bindings]] section", () => {
		const result = generateWranglerToml({
			consumerWrangler: null,
			bindings: [
				{
					name: "RATE_LIMITER_IP",
					type: "rate_limiter",
					rateLimit: { limit: 100, period: 60 },
				},
			],
		});

		expect(result).toContain("[[unsafe.bindings]]");
		expect(result).toContain('name = "RATE_LIMITER_IP"');
		expect(result).toContain('type = "ratelimit"');
		expect(result).toContain("limit = 100");
		expect(result).toContain("period = 60");
	});

	it("consumer wrangler.toml is preserved when provided", () => {
		const consumerWrangler = `name = "my-custom-app"
compatibility_date = "2025-01-01"
main = "src/worker/index.ts"`;

		const result = generateWranglerToml({
			consumerWrangler,
			bindings: [{ name: "DB_MAIN", type: "d1", databaseId: "abc" }],
		});

		expect(result).toContain('name = "my-custom-app"');
		expect(result).toContain('compatibility_date = "2025-01-01"');
		expect(result).toContain("[[d1_databases]]");
	});

	it("secret bindings are NOT included as d1/kv/r2 sections but placed under [vars]", () => {
		const bindings: BindingDeclaration[] = [
			{ name: "AUTH_SECRET", type: "secret" },
			{ name: "APP_URL", type: "secret" },
		];

		const result = generateWranglerToml({
			consumerWrangler: null,
			bindings,
		});

		expect(result).not.toContain("[[d1_databases]]");
		expect(result).not.toContain("[[r2_buckets]]");
		expect(result).not.toContain("[[unsafe.bindings]]");
		expect(result).toContain("[vars]");
	});

	it("generates default header when no consumer wrangler exists", () => {
		const result = generateWranglerToml({
			consumerWrangler: null,
			bindings: [],
			name: "test-app",
		});

		expect(result).toContain('name = "test-app"');
		expect(result).toContain("compatibility_date");
		expect(result).toContain('main = "worker.ts"');
	});

	it("multiple binding types produce all sections correctly", () => {
		const bindings: BindingDeclaration[] = [
			{ name: "DB_MAIN", type: "d1", databaseId: "db-id", databaseName: "db" },
			{
				name: "RATE_LIMITER_IP",
				type: "rate_limiter",
				rateLimit: { limit: 100, period: 60 },
			},
			{ name: "AUTH_SECRET", type: "secret" },
			{ name: "MY_KV", type: "kv", kvNamespaceId: "kv-id" },
			{ name: "MY_BUCKET", type: "r2", bucketName: "assets" },
		];

		const result = generateWranglerToml({
			consumerWrangler: null,
			bindings,
		});

		expect(result).toContain("[[d1_databases]]");
		expect(result).toContain("[[unsafe.bindings]]");
		expect(result).toContain("[vars]");
		expect(result).toContain("[[kv_namespaces]]");
		expect(result).toContain('id = "kv-id"');
		expect(result).toContain("[[r2_buckets]]");
		expect(result).toContain('bucket_name = "assets"');
	});

	it("var-type bindings get empty string values under [vars]", () => {
		const result = generateWranglerToml({
			consumerWrangler: null,
			bindings: [{ name: "MY_VAR", type: "var" }],
		});

		expect(result).toContain("[vars]");
		expect(result).toContain('MY_VAR = ""');
	});
});
