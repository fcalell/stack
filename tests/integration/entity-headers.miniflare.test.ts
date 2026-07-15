import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "@fcalell/plugin-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	emitWorkerMiniflare,
	type MiniflareWorker,
	teardownMiniflareWorkspace,
} from "./miniflare-harness";

// Miniflare E2E coverage for docs/prd/backend-hardening.md WS3.1 (plugin-api
// entity-based cache-invalidation wire contract): `procedure({ reads, writes })`
// stamps `x-stack-reads` / `x-stack-writes` response headers on success, and
// never on a thrown error. Driven through the real emitted `.stack/worker.ts`
// + a real consumer `src/worker/routes/*.ts` importing `virtual:stack-procedure`,
// same harness shape as `worker-hardening.miniflare.test.ts`'s WS1.2 coverage.

const entityHeadersFixture = {
	"src/schema/index.ts": "export const tables = {};\n",
	"src/worker/routes/testing.ts": `import { procedure } from "virtual:stack-procedure";

export const testing = {
	listTodos: procedure({ reads: ["todos"] }).handler(async () => {
		return { ok: true };
	}),
	createTodo: procedure({ writes: ["todos", "users"] }).handler(async () => {
		return { ok: true };
	}),
	noop: procedure().handler(async () => {
		return { ok: true };
	}),
	boom: procedure({ reads: ["todos"] }).handler(async () => {
		throw new Error("boom");
	}),
};
`,
};

async function callRpc(
	worker: MiniflareWorker,
	path: string,
): Promise<Response> {
	return worker.dispatch(`https://example.com/rpc/${path}`, {
		method: "POST",
		headers: {
			origin: "https://example.com",
			"content-type": "application/json",
		},
		body: JSON.stringify({ json: {} }),
	});
}

afterAll(() => {
	teardownMiniflareWorkspace();
});

describe("rpc hardening: entity cache-invalidation headers (WS3.1)", () => {
	let worker: MiniflareWorker;

	beforeAll(async () => {
		worker = await emitWorkerMiniflare({
			label: "rpc-entity-headers",
			origins: ["https://example.com"],
			plugins: [
				cloudflare(),
				db({ dialect: "d1", databaseId: "mf-entity-headers" }),
				api(),
			],
			seed: entityHeadersFixture,
		});
	});

	afterAll(async () => {
		await worker.dispose();
	});

	it("a query declaring reads carries x-stack-reads on success", async () => {
		const res = await callRpc(worker, "testing/listTodos");
		expect(res.status).toBe(200);
		expect(res.headers.get("x-stack-reads")).toBe("todos");
		expect(res.headers.get("x-stack-writes")).toBeNull();
	});

	it("a mutation declaring writes carries x-stack-writes (comma-joined) on success", async () => {
		const res = await callRpc(worker, "testing/createTodo");
		expect(res.status).toBe(200);
		expect(res.headers.get("x-stack-writes")).toBe("todos,users");
		expect(res.headers.get("x-stack-reads")).toBeNull();
	});

	it("a procedure with no reads/writes declarations carries neither header", async () => {
		const res = await callRpc(worker, "testing/noop");
		expect(res.status).toBe(200);
		expect(res.headers.get("x-stack-reads")).toBeNull();
		expect(res.headers.get("x-stack-writes")).toBeNull();
	});

	it("a procedure that declares reads but throws carries no x-stack-reads on the error response", async () => {
		const res = await callRpc(worker, "testing/boom");
		expect(res.status).toBe(500);
		expect(res.headers.get("x-stack-reads")).toBeNull();
		expect(res.headers.get("x-stack-writes")).toBeNull();
	});
});
