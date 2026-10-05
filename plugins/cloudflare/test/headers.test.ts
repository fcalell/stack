import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { vite } from "@fcalell/plugin-vite";
import { cloudflare } from "../src/index.ts";

// The graph `stack build` resolves, over a temp project holding
// `dist/client/index.html` and, when given, the client directory's `_headers`.
function buildGraph({
	web = true,
	headersFile,
}: {
	web?: boolean;
	headersFile?: string;
} = {}) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-cloudflare-headers-"));
	mkdirSync(join(cwd, "dist/client"), { recursive: true });
	writeFileSync(join(cwd, "dist/client/index.html"), "<p>shell</p>");
	if (headersFile !== undefined) {
		writeFileSync(join(cwd, "dist/client/_headers"), headersFile);
	}
	const plugins = [
		{ factory: api, config: api() },
		{ factory: cloudflare, config: cloudflare() },
		...(web ? [{ factory: vite, config: vite() }] : []),
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
	const graph = buildGraphFromDiscovered({
		discovered,
		app: { name: "cloudflare-headers", domain: "example.com" },
		cwd,
	}).graph;
	return { graph, cwd };
}

async function postSteps(graph: ReturnType<typeof buildGraph>["graph"]) {
	return (await graph.resolve(cliSlots.buildSteps)).filter(
		(s) => s.phase === "post",
	);
}

test("a Cloudflare build writes the client headers for every asset", async () => {
	const { graph, cwd } = buildGraph();
	const steps = await postSteps(graph);
	assert.equal(steps.length, 1);
	const step = steps[0];
	assert.ok(step && "run" in step, "the step is not a run step");
	await step.run();
	assert.equal(
		readFileSync(join(cwd, "dist/client/_headers"), "utf-8"),
		"/*\n  Content-Security-Policy: frame-ancestors 'none'\n  X-Frame-Options: DENY\n",
	);
});

test("a consumer's own _headers fails the build", async () => {
	const own = "/*\n  X-Frame-Options: SAMEORIGIN\n";
	const { graph, cwd } = buildGraph({ headersFile: own });
	const step = (await postSteps(graph))[0];
	assert.ok(step && "run" in step, "the step is not a run step");
	await assert.rejects(step.run(), /public\/_headers/);
	assert.equal(readFileSync(join(cwd, "dist/client/_headers"), "utf-8"), own);
});

test("without the web client no headers file is written", async () => {
	const { graph } = buildGraph({ web: false });
	assert.deepEqual(await postSteps(graph), []);
});
