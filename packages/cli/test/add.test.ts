import assert from "node:assert/strict";
import { test } from "node:test";
import { addDependencies } from "../src/commands/add.ts";
import { buildGraphFromDiscovered } from "../src/lib/build-graph.ts";
import { cliSlots } from "../src/lib/cli-slots.ts";
import { plugin } from "../src/lib/create-plugin.ts";
import type { DiscoveredPlugin } from "../src/lib/discovery.ts";

function discover(...factories: DiscoveredPlugin["factory"][]) {
	return factories.map((factory) => ({
		name: factory.name,
		cli: factory.cli,
		factory,
		options: {},
	}));
}

// A native plugin whose options name a config plugin's package, as expo's
// `configPlugins` do, beside the plugin being added.
test("stack add writes the dependencies a plugin's options derive", async () => {
	const native = plugin("native", {
		label: "Native",
		contributes: [
			cliSlots.initDeps.contribute(() => ({ "expo-camera": "~56.0.0" })),
		],
	});
	const widget = plugin("widget", {
		label: "Widget",
		package: "@acme/stack-widget",
		dependencies: { "widget-core": "^1.0.0" },
		devDependencies: { "widget-types": "^1.0.0" },
	});
	const discovered = discover(native, widget);
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "app", domain: "example.com" },
		cwd: "/nonexistent",
	});
	const added = discovered.filter((d) => d.name === "widget");
	assert.deepEqual(await addDependencies(graph, added), {
		"expo-camera": "~56.0.0",
		"widget-core": "^1.0.0",
		"widget-types": "^1.0.0",
		"@acme/stack-widget": "latest",
	});
});
