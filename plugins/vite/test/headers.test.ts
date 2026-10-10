import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { vite } from "../src/index.ts";

const FRAME_HEADERS = {
	"Content-Security-Policy": "frame-ancestors 'none'",
	"X-Frame-Options": "DENY",
};

function graphOf(web: boolean) {
	const other = plugin("other", { label: "other" });
	const plugins = [
		{ factory: api, config: api() },
		...(web
			? [{ factory: vite, config: vite() }]
			: [{ factory: other, config: other() }]),
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
	return buildGraphFromDiscovered({
		discovered,
		app: { name: "vite-headers", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-vite-headers-")),
	}).graph;
}

test("the web client refuses every frame", async () => {
	const graph = graphOf(true);
	const headers = await graph.resolve(vite.slots.clientHeaders);
	assert.deepEqual(headers, FRAME_HEADERS);
	const files = await graph.resolve(cliSlots.artifactFiles);
	const config =
		files.find((f) => f.path === ".stack/vite.config.ts")?.content ?? "";
	assert.match(
		config,
		/headers: \{\s*"Content-Security-Policy": "frame-ancestors 'none'",\s*"X-Frame-Options": "DENY"\s*\}/,
	);
	assert.deepEqual(await graphOf(false).resolve(vite.slots.clientHeaders), {});
});
