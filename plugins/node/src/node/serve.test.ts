import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateServer } from "./codegen.ts";

const payload = {
	port: 8788,
	host: null,
	origins: [],
	listeners: {},
	bounds: { body: 1, frame: 1 },
	hasWorker: true,
	workerPaths: ["/rpc"],
	staticRoot: "dist/client",
	clientHeaders: {},
	hasConsumerServices: false,
	services: [],
};

test("the dev and bundle entries hold no trace of the served controls", () => {
	const bundle = { staticDir: "../client", imports: [], boot: [] };
	for (const source of [
		aggregateServer(payload),
		aggregateServer({ ...payload, bundle }),
	])
		assert.doesNotMatch(source, /fixture|STACK_SERVE|plugin-screens/);
});

test("a served entry loads the run's own worker module", () => {
	assert.match(
		aggregateServer({ ...payload, workerFile: "./serve-x.worker.ts" }),
		/serve-x\.worker\.ts/,
	);
});
