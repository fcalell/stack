import assert from "node:assert/strict";
import { test } from "node:test";
import { createNodeServer } from "./create-node-server.ts";
import { defineService } from "./service.ts";

test("every service starts before any service is ready, then the server listens; stops run in reverse", async () => {
	const order: string[] = [];
	const service = (name: string) =>
		defineService({
			name,
			start() {
				order.push(`${name}:start`);
				return () => {
					order.push(`${name}:stop`);
				};
			},
			ready() {
				order.push(`${name}:ready`);
				return () => {
					order.push(`${name}:stop-ready`);
				};
			},
		});
	const server = createNodeServer({
		port: 0,
		host: "127.0.0.1",
		worker: null,
		workerPaths: [],
		staticRoot: null,
		env: {},
		log: {
			info(message) {
				if (message.includes("listening")) order.push("listening");
			},
			error() {},
		},
		// File-name order: `inbox` before `jobs`.
		services: [
			service("inbox"),
			service("jobs"),
			defineService({ name: "plain", start() {} }),
		],
	});
	await server.start();
	await server.stop();
	assert.deepEqual(order, [
		"inbox:start",
		"jobs:start",
		"inbox:ready",
		"jobs:ready",
		"listening",
		"jobs:stop-ready",
		"inbox:stop-ready",
		"jobs:stop",
		"inbox:stop",
	]);
});
