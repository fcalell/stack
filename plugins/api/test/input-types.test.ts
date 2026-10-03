import assert from "node:assert/strict";
import { test } from "node:test";
import type { z } from "zod";
import { createTestEntry, ORPCError } from "../src/testing/index.ts";
import type {
	greetingInput,
	wordOutput,
} from "./fixtures/testing/routes/inputs.ts";
import type { AppRouter } from "./fixtures/testing/worker.ts";
import { assertType, type Equal, type Flat } from "./types.ts";

const fixture = new URL("./fixtures/testing/", import.meta.url);

function boot() {
	return createTestEntry<AppRouter>({
		worker: new URL("worker.ts", fixture),
		procedure: new URL("procedure.ts", fixture),
		root: fixture,
		prefix: "/rpc",
		env: { STACK_DEV: "1", FIXTURE_SECRET: "fixture-secret-0123456789" },
	}).boot();
}

type Client = ReturnType<Awaited<ReturnType<typeof boot>>["client"]>;

test("a defaulted field is optional for the caller and present in the handler", async () => {
	await using app = await boot();
	const answer = await app.client().inputs.greet({ name: "ada", count: "2" });
	assert.equal(answer.greeting, "hello");
});

test("a transformed field is sent pre-transform and read transformed", async () => {
	await using app = await boot();
	const answer = await app
		.client()
		.inputs.greet({ name: "ada", greeting: "hi", count: "3" });
	assert.deepEqual(answer, { greeting: "hi", count: 3 });
	await assert.rejects(
		// @ts-expect-error the caller sends the schema's input, a string
		app.client().inputs.greet({ name: "ada", count: 3 }),
		(error: unknown) =>
			error instanceof ORPCError && error.code === "BAD_REQUEST",
	);
});

test("the client parameter type is the schema's input", () => {
	assertType<
		Equal<
			Flat<Parameters<Client["inputs"]["greet"]>[0]>,
			z.input<typeof greetingInput>
		>
	>(true);
});

test("a paginated caller may omit limit; the handler holds a number", async () => {
	await using app = await boot();
	type PageInput = Parameters<Client["inputs"]["page"]>[0];
	assertType<Equal<Pick<PageInput, "limit">, { limit?: number | undefined }>>(
		true,
	);
	assert.deepEqual(await app.client().inputs.page({}), {
		limit: 20,
		type: "number",
	});
	assert.deepEqual(await app.client().inputs.page({ limit: 100 }), {
		limit: 100,
		type: "number",
	});
	await assert.rejects(
		app.client().inputs.page({ limit: 500 }),
		(error: unknown) =>
			error instanceof ORPCError && error.code === "BAD_REQUEST",
	);
});

test("an output schema's handler returns its input and the caller receives its output", async () => {
	await using app = await boot();
	const answer = await app.client().inputs.word({ word: "stack" });
	assertType<Equal<Flat<typeof answer>, z.output<typeof wordOutput>>>(true);
	assert.deepEqual(answer, { length: 5 });
});
