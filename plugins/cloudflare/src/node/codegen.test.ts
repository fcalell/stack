import assert from "node:assert/strict";
import { test } from "node:test";
import type { CodegenWranglerPayload, WranglerBindingSpec } from "../types.ts";
import { aggregateWrangler } from "./codegen.ts";

const QUEUE: WranglerBindingSpec = {
	kind: "queue",
	binding: "QUEUE",
	queue: "shop",
	consumer: { maxBatchSize: 10, maxBatchTimeout: 5, maxRetries: 3 },
};

function payload(
	over: Partial<CodegenWranglerPayload> = {},
): CodegenWranglerPayload {
	return {
		bindings: [],
		routes: [],
		vars: {},
		secrets: [],
		compatibilityDate: "2025-01-01",
		compatibilityFlags: [],
		clientDir: null,
		routePrefixes: [],
		queueHandler: false,
		scheduledHandler: false,
		...over,
	};
}

function render(
	consumerWrangler: string | null,
	over: Partial<CodegenWranglerPayload> = {},
): string {
	return aggregateWrangler({
		consumerWrangler,
		payload: payload(over),
		name: "shop",
	});
}

test("a queue binding renders a producer and, with a consumer, its consumer table", () => {
	const out = render(null, { bindings: [QUEUE], queueHandler: true });
	assert.match(
		out,
		/\[\[queues\.producers\]\]\nbinding = "QUEUE"\nqueue = "shop"/,
	);
	assert.match(
		out,
		/\[\[queues\.consumers\]\]\nqueue = "shop"\nmax_batch_size = 10\nmax_batch_timeout = 5\nmax_retries = 3/,
	);
});

test("a queue binding without a consumer renders only the producer", () => {
	const { consumer: _, ...producer } = QUEUE as Extract<
		WranglerBindingSpec,
		{ kind: "queue" }
	>;
	const out = render(null, { bindings: [producer] });
	assert.match(out, /\[\[queues\.producers\]\]/);
	assert.doesNotMatch(out, /queues\.consumers/);
});

test("root queue tables merge beside the plugin's", () => {
	const out = render(
		[
			"[[queues.producers]]",
			'binding = "AUDIT"',
			'queue = "audit"',
			"[[queues.consumers]]",
			'queue = "audit"',
			"",
		].join("\n"),
		{ bindings: [QUEUE], queueHandler: true },
	);
	assert.match(out, /binding = "QUEUE"/);
	assert.match(out, /binding = "AUDIT"/);
	assert.equal(out.match(/\[\[queues\.consumers\]\]/g)?.length, 2);
});

test("a binding name both sides declare fails", () => {
	assert.throws(
		() =>
			render('[[queues.producers]]\nbinding = "QUEUE"\nqueue = "other"\n', {
				bindings: [QUEUE],
				queueHandler: true,
			}),
		/Duplicate wrangler identifier[\s\S]*"QUEUE"/,
	);
});

test("a consumer of the plugin's queue in the root file fails", () => {
	assert.throws(
		() =>
			render('[[queues.consumers]]\nqueue = "shop"\n', {
				bindings: [QUEUE],
				queueHandler: true,
			}),
		/Duplicate wrangler queue consumer[\s\S]*"shop"/,
	);
});

test("a root queue consumer without src/worker/queue.ts fails", () => {
	assert.throws(
		() => render('[[queues.consumers]]\nqueue = "audit"\n'),
		/a queue consumer needs src\/worker\/queue\.ts/,
	);
});

test("a root queue producer without src/worker/queue.ts is copied", () => {
	const out = render('[[queues.producers]]\nbinding = "AUDIT"\nqueue = "a"\n');
	assert.match(out, /binding = "AUDIT"/);
});

test("crons with a scheduled handler are copied", () => {
	const out = render('[triggers]\ncrons = ["*/10 * * * *"]\n', {
		scheduledHandler: true,
	});
	assert.match(out, /\[triggers\]\ncrons = \[ "\*\/10 \* \* \* \*" \]/);
});

test("crons without src/worker/scheduled.ts fail", () => {
	assert.throws(
		() => render('[triggers]\ncrons = ["0 7 * * *"]\n'),
		/a cron needs src\/worker\/scheduled\.ts/,
	);
});

test("a scheduled handler with no cron fails", () => {
	assert.throws(
		() => render(null, { scheduledHandler: true }),
		/src\/worker\/scheduled\.ts runs on no cron: add \[triggers\] crons/,
	);
	assert.throws(
		() => render("[triggers]\ncrons = []\n", { scheduledHandler: true }),
		/runs on no cron/,
	);
});

test("no crons and no handler is fine", () => {
	assert.doesNotThrow(() => render("[triggers]\n"));
	assert.doesNotThrow(() => render(null));
});

test("[browser] is copied as written", () => {
	const out = render('[browser]\nbinding = "BROWSER"\n');
	assert.match(out, /\[browser\]\nbinding = "BROWSER"/);
});
