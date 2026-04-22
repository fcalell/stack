import { log } from "@clack/prompts";
import { parse as parseToml } from "smol-toml";
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
		const parsed = parseToml(result) as { main?: string };
		expect(parsed.main).toBe("worker.ts");
	});

	it("inserts main line when consumer wrangler.toml has none", () => {
		const consumer = 'name = "my-app"\ncompatibility_date = "2024-01-01"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		const parsed = parseToml(result) as { main?: string; name?: string };
		expect(parsed.main).toBe("worker.ts");
		expect(parsed.name).toBe("my-app");
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("leaves main untouched and does not warn when it targets .stack/worker.ts", () => {
		const consumer = 'name = "my-app"\nmain = ".stack/worker.ts"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		const parsed = parseToml(result) as { main?: string };
		expect(parsed.main).toBe(".stack/worker.ts");
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("warns when the consumer overrides main with a non-generated path", () => {
		const consumer =
			'name = "my-app"\nmain = "src/other.ts"\ncompatibility_date = "2024-01-01"';
		const result = aggregateWrangler({
			consumerWrangler: consumer,
			payload: emptyPayload,
		});

		const parsed = parseToml(result) as { main?: string };
		expect(parsed.main).toBe("src/other.ts");
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

		const parsed = parseToml(result) as Record<string, unknown>;
		expect(parsed.d1_databases).toEqual([
			{
				binding: "DB_MAIN",
				database_id: "abc-123",
				database_name: "my-db",
			},
		]);
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

		const parsed = parseToml(result) as {
			unsafe?: { bindings?: unknown[] };
		};
		expect(parsed.unsafe?.bindings).toEqual([
			{
				name: "RATE_LIMITER_IP",
				type: "ratelimit",
				limit: 100,
				period: 60,
			},
		]);
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

		const parsed = parseToml(result) as {
			vars?: Record<string, string>;
		};
		// Secrets must land as empty strings (wrangler treats [vars] entries as
		// public config; real secret values go in .dev.vars / `wrangler secret put`).
		expect(parsed.vars).toEqual({
			MY_VAR: "hello",
			AUTH_SECRET: "",
		});
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

		const parsed = parseToml(result) as Record<string, unknown>;
		expect(parsed.kv_namespaces).toEqual([{ binding: "MY_KV", id: "kv-id" }]);
		expect(parsed.r2_buckets).toEqual([
			{ binding: "MY_BUCKET", bucket_name: "assets" },
		]);
	});

	it("generates default name + compatibility_date when no consumer file exists", () => {
		const result = aggregateWrangler({
			consumerWrangler: null,
			payload: emptyPayload,
			name: "test-app",
		});

		const parsed = parseToml(result) as {
			name?: string;
			compatibility_date?: string;
		};
		expect(parsed.name).toBe("test-app");
		expect(parsed.compatibility_date).toBe("2025-01-01");
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
