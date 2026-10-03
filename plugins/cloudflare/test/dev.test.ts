import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { vite } from "@fcalell/plugin-vite";
import { cloudflare } from "../src/index.ts";

// The graph `stack dev` resolves for api + cloudflare + vite, over a consumer
// directory holding the given root `.dev.vars`. `web: false` leaves vite
// out, for what only its presence decides.
function devGraph(devVars?: string, web = true) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-cloudflare-dev-"));
	if (devVars !== undefined) writeFileSync(join(cwd, ".dev.vars"), devVars);
	const plugins = [
		{
			factory: api,
			config: api({
				env: [{ name: "RESEND_API_KEY", devDefault: "re_dev" }],
			}),
		},
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
	return buildGraphFromDiscovered({
		discovered,
		app: { name: "cloudflare-dev", domain: "example.com" },
		cwd,
	}).graph;
}

async function artifact(
	graph: ReturnType<typeof devGraph>,
	path: string,
): Promise<string | undefined> {
	const files = await graph.resolve(cliSlots.artifactFiles);
	return files.find((f) => f.path === path)?.content;
}

test("the vite dev server proxies every worker-owned path to wrangler dev", async () => {
	const proxy = await devGraph().resolve(vite.slots.serverProxy);
	assert.deepEqual(proxy, [{ path: "/rpc", target: "http://localhost:8787" }]);
});

// wrangler writes its dev bundle under `.stack/.wrangler/tmp/`, inside
// Vite's root; a watcher event there full-reloads the page.
test("the vite dev server's watcher skips wrangler's scratch directory", async () => {
	const config = await artifact(devGraph(), ".stack/vite.config.ts");
	assert.match(
		config ?? "",
		/watch: \{ ignored: \["\*\*\/\.wrangler\/\*\*"\] \}/,
	);
});

test("an existing .dev.vars is topped up with the vars it lacks", async () => {
	const graph = devGraph("STACK_DEV=1\nAPI_OTHER=keep\n");
	const root = await artifact(graph, ".dev.vars");
	assert.equal(root, "STACK_DEV=1\nAPI_OTHER=keep\nRESEND_API_KEY=re_dev\n");
	assert.match(
		(await artifact(graph, ".stack/.dev.vars")) ?? "",
		/^RESEND_API_KEY=re_dev$/m,
	);
});

test("an existing .dev.vars holding every var is left as written", async () => {
	const graph = devGraph("STACK_DEV=1\nRESEND_API_KEY=re_real\n");
	assert.equal(await artifact(graph, ".dev.vars"), undefined);
	assert.match(
		(await artifact(graph, ".stack/.dev.vars")) ?? "",
		/^RESEND_API_KEY=re_real$/m,
	);
});

// Vite's root is the directory of its generated config; a write it sees
// there is a full reload, and the running worker writes its state on every
// request.
test("wrangler dev keeps its state outside Vite's root", async () => {
	const graph = devGraph();
	const processes = await graph.resolve(cliSlots.devProcesses);
	const args = processes.find((p) => p.name === "wrangler")?.args ?? [];
	const persist = args[args.indexOf("--persist-to") + 1];
	assert.ok(persist, "wrangler dev passes no --persist-to");
	const viteConfig = (await graph.resolve(cliSlots.artifactFiles)).find((f) =>
		f.path.endsWith("vite.config.ts"),
	);
	assert.ok(viteConfig, "no generated vite config");
	const fromRoot = relative(dirname(viteConfig.path), persist);
	assert.ok(
		fromRoot.startsWith("..") || isAbsolute(fromRoot),
		`${persist} sits inside Vite's root`,
	);
});

// wrangler's esbuild reads the tsconfig nearest each file unless told
// otherwise; under the split that is the solution `tsconfig.json`, which
// holds no `paths`, and `virtual:stack-procedure` fails to resolve. Every
// bundling wrangler command names the tsconfig holding them, absolute
// because esbuild resolves a relative one against `.stack/`.
test("wrangler bundles the worker with the tsconfig holding its paths", async () => {
	const argsOf = async (graph: ReturnType<typeof devGraph>) => {
		const dev = (await graph.resolve(cliSlots.devProcesses)).find(
			(p) => p.name === "wrangler",
		);
		const step = (await graph.resolve(cliSlots.deploySteps)).find(
			(s) => s.name === "Worker",
		);
		return [dev?.args ?? [], step && "exec" in step ? step.exec.args : []];
	};
	for (const [web, expected] of [
		[true, "tsconfig.worker.json"],
		[false, "tsconfig.json"],
	] as const) {
		const graph = devGraph(undefined, web);
		for (const args of await argsOf(graph)) {
			const tsconfig = args[args.indexOf("--tsconfig") + 1] ?? "";
			assert.ok(isAbsolute(tsconfig), `${tsconfig} is not absolute`);
			assert.equal(basename(tsconfig), expected);
		}
	}
});

// A declared env var's production value is a secret; a `[vars]` entry of the
// same name would deploy as a plain-text binding beside it.
test("the generated wrangler config declares no secret under [vars]", async () => {
	const toml = await devGraph().resolve(cloudflare.slots.wranglerToml);
	assert.doesNotMatch(toml, /RESEND_API_KEY/);
});
