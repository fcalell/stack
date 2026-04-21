import { log } from "@clack/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aggregateDevVars, aggregateWrangler } from "./codegen";

vi.mock("@clack/prompts", () => ({
	log: {
		info: vi.fn(),
		warn: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("aggregateWrangler", () => {
	beforeEach(() => {
		vi.mocked(log.warn).mockClear();
	});

	const emptyPayload = {
		bindings: [],
		routes: [],
		vars: {},
		secrets: [],
		compatibilityDate: "2025-01-01",
	};

	it("sets main to worker.ts in a freshly generated config", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: emptyPayload,
		});
		expect(result).toContain('main = "worker.ts"');
	});

	it("inserts main line when consumer wrangler.toml has none", () => {
		const consumer = 'name = "my-app"\ncompatibility_date = "2024-01-01"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		expect(result).toContain('main = "worker.ts"');
		expect(result).toContain('name = "my-app"');
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("leaves main untouched and does not warn when it targets .stack/worker.ts", () => {
		const consumer = 'name = "my-app"\nmain = ".stack/worker.ts"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		expect(result).toContain('main = ".stack/worker.ts"');
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("warns when the consumer overrides main with a non-generated path", () => {
		const consumer =
			'name = "my-app"\nmain = "src/other.ts"\ncompatibility_date = "2024-01-01"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		expect(result).toContain('main = "src/other.ts"');
		expect(log.warn).toHaveBeenCalledTimes(1);
	});

	it("emits [[d1_databases]] with binding + database_id", () => {
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

	it("emits [[unsafe.bindings]] for rate_limiter", () => {
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

	it("emits [vars] for secrets (empty values) and var-bindings", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [{ kind: "var", name: "MY_VAR", value: "hello" }],
				secrets: [{ name: "AUTH_SECRET", devDefault: "dev" }],
			},
		});

		expect(result).toContain("[vars]");
		expect(result).toContain('MY_VAR = "hello"');
		expect(result).toContain('AUTH_SECRET = ""');
	});

	it("emits [[kv_namespaces]] and [[r2_buckets]]", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: {
				...emptyPayload,
				bindings: [
					{ kind: "kv", binding: "MY_KV", id: "kv-id" },
					{ kind: "r2", binding: "MY_BUCKET", bucketName: "assets" },
				],
			},
		});

		expect(result).toContain("[[kv_namespaces]]");
		expect(result).toContain('id = "kv-id"');
		expect(result).toContain("[[r2_buckets]]");
		expect(result).toContain('bucket_name = "assets"');
	});

	it("generates default name when no consumer file exists", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: emptyPayload,
			name: "test-app",
		});

		expect(result).toContain('name = "test-app"');
		expect(result).toContain("compatibility_date");
	});
});

describe("aggregateDevVars", () => {
	it("returns null for no secrets", () => {
		expect(aggregateDevVars([])).toBeNull();
	});

	it("renders KEY=VALUE lines terminated with a newline", () => {
		const result = aggregateDevVars([
			{ name: "AUTH_SECRET", devDefault: "dev-secret-change-me" },
			{ name: "APP_URL", devDefault: "http://localhost:3000" },
		]);
		expect(result).toBe(
			"AUTH_SECRET=dev-secret-change-me\nAPP_URL=http://localhost:3000\n",
		);
	});
});
