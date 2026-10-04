import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { expo } from "@fcalell/plugin-expo";
import { nativeUi } from "../src/index.ts";

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

test("the generated entry imports the uniwind stylesheet beside it", async () => {
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(expo, expo()),
			discover(nativeUi, nativeUi()),
		],
		app: { name: "My App", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-native-ui-entry-")),
	});
	const entry = await graph.resolve(expo.slots.entrySource);
	assert.match(entry ?? "", /^import "\.\/global\.css";$/m);
});
