import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { expo } from "../src/index.ts";

function discover(
	factory: { cli: unknown },
	config: { __plugin: string; options: unknown },
): DiscoveredPlugin {
	return {
		name: config.__plugin,
		cli: factory.cli,
		factory,
		options: config.options,
	} as unknown as DiscoveredPlugin;
}

// The scheme api carries to its readers, and the one the app config registers.
async function schemes(config: ReturnType<typeof expo>) {
	const { graph } = buildGraphFromDiscovered({
		discovered: [discover(api, api()), discover(expo, config)],
		app: { name: "My App", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-expo-scheme-")),
	});
	return {
		trusted: await graph.resolve(api.slots.nativeScheme),
		registered: await graph.resolve(expo.slots.expoConfig),
	};
}

test("the native scheme is the one the app config registers, the app name's slug by default", async () => {
	const { trusted, registered } = await schemes(expo());
	assert.equal(trusted, "my-app");
	assert.match(registered ?? "", /scheme: "my-app",/);
});

test("an explicit scheme reaches api and the app config alike", async () => {
	const { trusted, registered } = await schemes(expo({ scheme: "acme" }));
	assert.equal(trusted, "acme");
	assert.match(registered ?? "", /scheme: "acme",/);
});
