import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { vite } from "../src/index.ts";

// A peer that contributes a call only the app's own config runs.
const peer = plugin("peer", {
	label: "Peer",
	contributes: [
		vite.slots.appPlugins.contribute(() => ({
			imports: [{ source: "@acme/router", named: ["acmeRouter"] }],
			call: {
				kind: "call",
				callee: { kind: "identifier", name: "acmeRouter" },
				args: [],
			},
		})),
	],
});

test("an app-only plugin call renders ahead of the shared calls and stays out of them", async () => {
	const plugins = [
		{ factory: vite, config: vite() },
		{ factory: peer, config: peer() },
	];
	const { graph } = buildGraphFromDiscovered({
		discovered: plugins.map(
			({ factory, config }) =>
				({
					name: config.__plugin,
					cli: factory.cli,
					factory,
					options: config.options,
				}) as unknown as DiscoveredPlugin,
		),
		app: { name: "shop", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-vite-app-")),
	});
	const files = await graph.resolve(cliSlots.artifactFiles);
	const config =
		files.find((f) => f.path === ".stack/vite.config.ts")?.content ?? "";
	assert.match(config, /import \{ acmeRouter \} from "@acme\/router";/);
	assert.match(config, /plugins: \[acmeRouter\(\), providersPlugin\(\)\]/);

	const shared = await graph.resolve(vite.slots.pluginCalls);
	assert.equal(
		shared.some(
			(call) =>
				call.kind === "call" &&
				call.callee.kind === "identifier" &&
				call.callee.name === "acmeRouter",
		),
		false,
	);
	assert.deepEqual(
		(await graph.resolve(vite.slots.configImports)).map((s) => s.source),
		["@fcalell/plugin-vite/preset"],
	);
});
