import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createTestEntry, ORPCError } from "../src/testing/index.ts";
import { procedure } from "./fixtures/testing/procedure.ts";
import type { AppRouter } from "./fixtures/testing/worker.ts";

const fixture = new URL("./fixtures/testing/", import.meta.url);
const orgId = "org-1";

function boot() {
	return createTestEntry<AppRouter>({
		worker: new URL("worker.ts", fixture),
		procedure: new URL("procedure.ts", fixture),
		root: fixture,
		prefix: "/rpc",
		env: { STACK_DEV: "1", FIXTURE_SECRET: "fixture-secret-0123456789" },
	}).boot();
}

function refusedWith(code: string) {
	return (error: unknown) => error instanceof ORPCError && error.code === code;
}

test("a strict scoped input refuses an unknown key and accepts the known ones", async () => {
	await using app = await boot();
	await assert.rejects(
		app
			.client()
			// @ts-expect-error the strict input declares no `extra`
			.scoped.strict({ orgId, name: "ada", extra: true }),
		refusedWith("BAD_REQUEST"),
	);
	assert.deepEqual(await app.client().scoped.strict({ orgId, name: "ada" }), {
		orgId,
		name: "ada",
	});
});

test("a plain scoped input still strips an unknown key", async () => {
	await using app = await boot();
	const answer = await app
		.client()
		// @ts-expect-error the plain input declares no `extra`
		.scoped.plain({ orgId, name: "ada", extra: true });
	assert.deepEqual(answer, { keys: ["name", "orgId"] });
});

test("an object-level refinement on a scoped input still runs", async () => {
	await using app = await boot();
	await assert.rejects(
		app.client().scoped.refined({ orgId, low: 2, high: 1 }),
		refusedWith("BAD_REQUEST"),
	);
	assert.deepEqual(
		await app.client().scoped.refined({ orgId, low: 1, high: 2 }),
		{ low: 1, high: 2 },
	);
});

test("the output-then-input path keeps the input's policy", async () => {
	await using app = await boot();
	await assert.rejects(
		app
			.client()
			// @ts-expect-error the strict input declares no `extra`
			.scoped.strictAfterOutput({ orgId, name: "ada", extra: true }),
		refusedWith("BAD_REQUEST"),
	);
	assert.deepEqual(
		await app.client().scoped.strictAfterOutput({ orgId, name: "ada" }),
		{ name: "ada" },
	);
});

test("a strict paginated input refuses an unknown key and still defaults limit", async () => {
	await using app = await boot();
	await assert.rejects(
		// @ts-expect-error the strict input declares no `extra`
		app.client().scoped.page({ extra: true }),
		refusedWith("BAD_REQUEST"),
	);
	assert.deepEqual(await app.client().scoped.page({}), { limit: 20 });
});

test("an input declaring a config key is refused when the route loads", () => {
	assert.throws(
		() =>
			procedure({ auth: true, scope: { name: "org" } }).input(
				z.object({ orgId: z.string() }),
			),
		/`orgId`/,
	);
	assert.throws(
		() => procedure({ paginated: true }).input(z.object({ limit: z.number() })),
		/`limit`/,
	);
});

test("a scoped input without the scope key answers NOT_FOUND", async () => {
	await using app = await boot();
	await assert.rejects(
		// @ts-expect-error the scope id is required
		app.client().scoped.strict({ name: "ada" }),
		refusedWith("NOT_FOUND"),
	);
});
