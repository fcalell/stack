import { aggregateEnvDts } from "@fcalell/cli/codegen";
import type { CodegenEnvPayload } from "@fcalell/cli/events";
import { describe, expect, it } from "vitest";

const cfTypesImport = {
	source: "@cloudflare/workers-types",
	typeOnly: true as const,
};

describe("aggregateEnvDts", () => {
	it("D1 binding produces D1Database type", () => {
		const result = aggregateEnvDts({
			fields: [
				{
					name: "DB_MAIN",
					type: { kind: "reference", name: "D1Database" },
					from: { ...cfTypesImport, named: ["D1Database"] },
				},
			],
		});

		expect(result).toContain("DB_MAIN: D1Database;");
	});

	it("string-typed field (no import) produces string type", () => {
		const result = aggregateEnvDts({
			fields: [
				{
					name: "AUTH_SECRET",
					type: { kind: "reference", name: "string" },
				},
			],
		});

		expect(result).toContain("AUTH_SECRET: string;");
	});

	it("rate limiter field produces RateLimiter type", () => {
		const result = aggregateEnvDts({
			fields: [
				{
					name: "RATE_LIMITER_IP",
					type: { kind: "reference", name: "RateLimiter" },
					from: { ...cfTypesImport, named: ["RateLimiter"] },
				},
			],
		});

		expect(result).toContain("RATE_LIMITER_IP: RateLimiter;");
	});

	it("multiple fields produce correct interface", () => {
		const stringType = { kind: "reference" as const, name: "string" };
		const rl = { kind: "reference" as const, name: "RateLimiter" };
		const d1 = { kind: "reference" as const, name: "D1Database" };
		const payload: CodegenEnvPayload = {
			fields: [
				{
					name: "DB_MAIN",
					type: d1,
					from: { ...cfTypesImport, named: ["D1Database"] },
				},
				{ name: "AUTH_SECRET", type: stringType },
				{ name: "APP_URL", type: stringType },
				{
					name: "RATE_LIMITER_IP",
					type: rl,
					from: { ...cfTypesImport, named: ["RateLimiter"] },
				},
				{
					name: "RATE_LIMITER_EMAIL",
					type: rl,
					from: { ...cfTypesImport, named: ["RateLimiter"] },
				},
			],
		};

		const result = aggregateEnvDts(payload);

		expect(result).toContain("interface Env {");
		expect(result).toContain("DB_MAIN: D1Database;");
		expect(result).toContain("AUTH_SECRET: string;");
		expect(result).toContain("APP_URL: string;");
		expect(result).toContain("RATE_LIMITER_IP: RateLimiter;");
		expect(result).toContain("RATE_LIMITER_EMAIL: RateLimiter;");
	});

	it("empty fields produce minimal interface", () => {
		const result = aggregateEnvDts({ fields: [] });

		expect(result).toMatch(/interface Env \{\s*\}/);
		expect(result).not.toContain(": D1Database");
		expect(result).not.toContain(": string");
		expect(result).not.toContain(": RateLimiter");
	});

	it("dedupes imports by source and merges named lists", () => {
		const payload: CodegenEnvPayload = {
			fields: [
				{
					name: "A",
					type: { kind: "reference", name: "D1Database" },
					from: { ...cfTypesImport, named: ["D1Database"] },
				},
				{
					name: "B",
					type: { kind: "reference", name: "RateLimiter" },
					from: { ...cfTypesImport, named: ["RateLimiter"] },
				},
			],
		};

		const result = aggregateEnvDts(payload);
		const importLines = result
			.split("\n")
			.filter((l) => l.startsWith("import"));
		expect(importLines).toHaveLength(1);
		expect(importLines[0]).toContain("D1Database");
		expect(importLines[0]).toContain("RateLimiter");
	});
});
