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
// `configPlugins` do, beside the plugin being added, whose own package is
// the table's spec.
test("stack add writes the dependencies a plugin's options derive", async () => {
	const native = plugin("native", {
		label: "Native",
		contributes: [
			cliSlots.initDeps.contribute(() => ({ "expo-camera": "~56.0.0" })),
		],
	});
	const db = plugin("db", {
		label: "Database",
		dependencies: { "db-driver": "^1.0.0" },
		devDependencies: { "db-types": "^1.0.0" },
	});
	const discovered = discover(native, db);
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "app", domain: "example.com" },
		cwd: "/nonexistent",
	});
	assert.deepEqual(await addDependencies(graph, ["db"]), {
		"expo-camera": "~56.0.0",
		"db-driver": "^1.0.0",
		"db-types": "^1.0.0",
		"@fcalell/plugin-db": "github:fcalell/stack#path:/plugins/db",
	});
});
