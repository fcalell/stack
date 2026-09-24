import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { node } from "../src/index.ts";

const origins = ["http://127.0.0.1:8788", "https://example.com"];

async function corsFor(host: string | undefined) {
	const plugins = [
		{ factory: api, config: api() },
		{ factory: node, config: node(host ? { host } : {}) },
	];
	const discovered = plugins.map(
		({ factory, config }) =>
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "local", domain: "example.com", origins },
		cwd: mkdtempSync(join(tmpdir(), "stack-local-origins-")),
	});
	return {
		cors: await graph.resolve(api.slots.cors),
		dev: await graph.resolve(api.slots.devCorsOrigins),
	};
}

test("a server bound to loopback keeps the local origins in the deployed list", async () => {
	const { cors, dev } = await corsFor("127.0.0.1");
	assert.deepEqual(cors, origins);
	assert.deepEqual(dev, []);
});

test("a server bound to every interface treats the local origins as dev origins", async () => {
	const { cors, dev } = await corsFor(undefined);
	assert.deepEqual(cors, ["https://example.com"]);
	assert.deepEqual(dev, ["http://127.0.0.1:8788"]);
});
