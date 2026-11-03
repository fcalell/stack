import assert from "node:assert/strict";
import { test } from "node:test";
import { listenOf } from "./start-node-server.ts";

const configured = { port: 8788, host: "127.0.0.1" };

test("the configured listen stands without PORT and HOST", () => {
	assert.deepEqual(listenOf(configured, {}), configured);
});

test("PORT and HOST override the configured listen", () => {
	assert.deepEqual(listenOf(configured, { PORT: "9000", HOST: "0.0.0.0" }), {
		port: 9000,
		host: "0.0.0.0",
	});
	assert.deepEqual(listenOf({ port: 8788 }, { PORT: " 80 " }), {
		port: 80,
		host: undefined,
	});
});

test("stack dev ignores both, so the proxy still finds the server", () => {
	assert.deepEqual(
		listenOf(configured, { STACK_DEV: "1", PORT: "9000", HOST: "0.0.0.0" }),
		configured,
	);
});

test("a PORT that is not a port stops the boot", () => {
	assert.throws(() => listenOf(configured, { PORT: "eighty" }), /PORT/);
	assert.throws(() => listenOf(configured, { PORT: "70000" }), /PORT/);
});
