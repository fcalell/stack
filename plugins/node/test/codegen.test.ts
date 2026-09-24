import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateServer } from "../src/node/codegen.ts";

const payload = {
	port: 8788,
	hasWorker: true,
	workerPaths: ["/rpc"],
	hasConsumerServices: false,
	services: [],
};

test("the generated entry names the host when the config sets one", () => {
	const source = aggregateServer({ ...payload, host: "127.0.0.1" });
	assert.match(source, /port: 8788,\s*host: "127\.0\.0\.1",/);
});

test("the generated entry omits the host when the config leaves it unset", () => {
	const source = aggregateServer({ ...payload, host: null });
	assert.doesNotMatch(source, /host:/);
});
