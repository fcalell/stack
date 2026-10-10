import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { react } from "@fcalell/plugin-react";
import { screens } from "@fcalell/plugin-screens";
import { vite } from "@fcalell/plugin-vite";
import { type ReactUiOptions, reactUi } from "../src/index.ts";

function previewGlobals(options: ReactUiOptions = {}) {
	const plugins = [
		{ factory: vite, config: vite() },
		{ factory: react, config: react() },
		{ factory: reactUi, config: reactUi(options) },
		{ factory: screens, config: screens() },
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
		app: { name: "shop", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-react-ui-")),
	});
	return graph.resolve(screens.slots.previewGlobals);
}

test("the workbench opens in the theme's default mode", async () => {
	const globals = await previewGlobals({ theme: { defaultMode: "dark" } });
	assert.equal(globals.find((g) => g.name === "mode")?.default, "dark");
});
