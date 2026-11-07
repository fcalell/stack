import assert from "node:assert/strict";
import { test } from "node:test";
import type { JobBatch, JobScheduledEvent } from "../procedure.ts";
import createWorker from "./index.ts";

const db = {
	name: "db",
	context: () => ({ db: "the database" }),
	// A plugin's own fetch never runs for a job.
	fetch: () => {
		throw new Error("fetch ran");
	},
};

const batch = (): JobBatch => ({
	queue: "app",
	messages: [],
	ackAll() {},
	retryAll() {},
});
const event: JobScheduledEvent = { cron: "*/10 * * * *", scheduledTime: 1 };

test("a queue batch gets the plugin context without the request", async () => {
	let seen: Record<string, unknown> | undefined;
	const waited: Promise<unknown>[] = [];
	const worker = createWorker()
		.use(db)
		.handler(
			{},
			{
				queue: async (_batch, context) => {
					seen = context as Record<string, unknown>;
				},
			},
		);
	assert.ok(worker.queue);
	await worker.queue(
		batch(),
		{ STACK_DEV: "1" },
		{
			waitUntil: (p: Promise<unknown>) => waited.push(p),
		},
	);
	assert.ok(seen);
	assert.equal(seen.db, "the database");
	assert.equal(seen._devMode, true);
	assert.deepEqual(seen.env, { STACK_DEV: "1" });
	for (const key of ["httpRequest", "reqHeaders", "resHeaders"])
		assert.equal(key in seen, false, key);
	const done = Promise.resolve();
	(seen.executionCtx as { waitUntil(p: Promise<unknown>): void }).waitUntil(
		done,
	);
	assert.deepEqual(waited, [done]);
});

test("a cron event gets the same context", async () => {
	let seen: Record<string, unknown> | undefined;
	let given: JobScheduledEvent | undefined;
	const worker = createWorker()
		.use(db)
		.handler(
			{},
			{
				scheduled: async (controller, context) => {
					given = controller;
					seen = context as Record<string, unknown>;
				},
			},
		);
	assert.ok(worker.scheduled);
	await worker.scheduled(event, {}, undefined);
	assert.equal(given, event);
	assert.equal(seen?.db, "the database");
	assert.equal(seen?._devMode, false);
	assert.equal("httpRequest" in (seen ?? {}), false);
	// No Workers context: waitUntil is a no-op, not a throw.
	(seen?.executionCtx as { waitUntil(p: Promise<unknown>): void }).waitUntil(
		Promise.resolve(),
	);
});

test("a handler's throw reaches the caller", async () => {
	const worker = createWorker().handler(
		{},
		{
			queue: async () => {
				throw new Error("queue failed");
			},
			scheduled: async () => {
				throw new Error("cron failed");
			},
		},
	);
	await assert.rejects(
		() => worker.queue?.(batch(), {}, undefined) ?? Promise.resolve(),
		/queue failed/,
	);
	await assert.rejects(
		() => worker.scheduled?.(event, {}, undefined) ?? Promise.resolve(),
		/cron failed/,
	);
});

test("the env checks run before a job", async () => {
	const worker = createWorker({
		envChecks: [{ name: "AUTH_SECRET", minLength: 32 }],
	}).handler({}, { queue: async () => {} });
	await assert.rejects(
		() => worker.queue?.(batch(), {}, undefined) ?? Promise.resolve(),
		/Missing env var: AUTH_SECRET/,
	);
});

test("without the files, neither member is on the worker", () => {
	const worker = createWorker().handler();
	assert.equal("queue" in worker, false);
	assert.equal("scheduled" in worker, false);
	const queueOnly = createWorker().handler({}, { queue: async () => {} });
	assert.ok(queueOnly.queue);
	assert.equal("scheduled" in queueOnly, false);
});

test("a job never runs a plugin's fetch", async () => {
	let ran = false;
	const worker = createWorker()
		.use(db)
		.handler(
			{},
			{
				queue: async () => {
					ran = true;
				},
			},
		);
	await worker.queue?.(batch(), {}, undefined);
	assert.equal(ran, true);
});
