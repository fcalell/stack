import { aggregateWrangler } from "@fcalell/cli/codegen";
import type {
	CodegenWranglerPayload,
	WranglerBindingSpec,
} from "@fcalell/cli/events";
import { describe, expect, it } from "vitest";

const emptyPayload: CodegenWranglerPayload = {
	bindings: [],
	routes: [],
	vars: {},
	secrets: [],
	compatibilityDate: "2025-01-01",
};

describe("aggregateWrangler", () => {
	it("D1 binding produces [[d1_databases]] section", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{
						kind: "d1",
						binding: "DB_MAIN",
						databaseId: "abc-123",
						databaseName: "my-db",
					},
				],
			},
		});

		expect(result).toContain("[[d1_databases]]");
		expect(result).toContain('binding = "DB_MAIN"');
		expect(result).toContain('database_id = "abc-123"');
		expect(result).toContain('database_name = "my-db"');
	});

	it("rate limiter produces [[unsafe.bindings]] section", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{
						kind: "rate_limiter",
						binding: "RATE_LIMITER_IP",
						simple: { limit: 100, period: 60 },
					},
				],
			},
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
main = ".stack/worker.ts"`;

		const result = aggregateWrangler({
			consumerWrangler,
			payload: {
				...emptyPayload,
				bindings: [
					{
						kind: "d1",
						binding: "DB_MAIN",
						databaseId: "abc",
						databaseName: "my-db",
					},
				],
			},
		});

		expect(result).toContain('name = "my-custom-app"');
		expect(result).toContain('compatibility_date = "2025-01-01"');
		expect(result).toContain("[[d1_databases]]");
	});

	it("secrets appear under [vars] with empty values (not as bindings)", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				secrets: [
					{ name: "AUTH_SECRET", devDefault: "dev" },
					{ name: "APP_URL", devDefault: "http://localhost:3000" },
				],
			},
		});

		expect(result).not.toContain("[[d1_databases]]");
		expect(result).not.toContain("[[r2_buckets]]");
		expect(result).not.toContain("[[unsafe.bindings]]");
		expect(result).toContain("[vars]");
		expect(result).toContain('AUTH_SECRET = ""');
		expect(result).toContain('APP_URL = ""');
	});

	it("generates default header when no consumer wrangler exists", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: emptyPayload,
			name: "test-app",
		});

		expect(result).toContain('name = "test-app"');
		expect(result).toContain("compatibility_date");
		expect(result).toContain('main = "worker.ts"');
	});

	it("multiple binding types produce all sections correctly", () => {
		const bindings: WranglerBindingSpec[] = [
			{
				kind: "d1",
				binding: "DB_MAIN",
				databaseId: "db-id",
				databaseName: "db",
			},
			{
				kind: "rate_limiter",
				binding: "RATE_LIMITER_IP",
				simple: { limit: 100, period: 60 },
			},
			{ kind: "kv", binding: "MY_KV", id: "kv-id" },
			{ kind: "r2", binding: "MY_BUCKET", bucketName: "assets" },
		];

		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings,
				secrets: [{ name: "AUTH_SECRET", devDefault: "dev" }],
			},
		});

		expect(result).toContain("[[d1_databases]]");
		expect(result).toContain("[[unsafe.bindings]]");
		expect(result).toContain("[vars]");
		expect(result).toContain("[[kv_namespaces]]");
		expect(result).toContain('id = "kv-id"');
		expect(result).toContain("[[r2_buckets]]");
		expect(result).toContain('bucket_name = "assets"');
	});

	it("var-type bindings get string values under [vars]", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [{ kind: "var", name: "MY_VAR", value: "hello" }],
			},
		});

		expect(result).toContain("[vars]");
		expect(result).toContain('MY_VAR = "hello"');
	});
});
