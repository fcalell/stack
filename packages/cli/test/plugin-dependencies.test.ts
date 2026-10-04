import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "../src/lib/build-graph.ts";
import { cliSlots } from "../src/lib/cli-slots.ts";
import { plugin } from "../src/lib/create-plugin.ts";
import type { DiscoveredPlugin } from "../src/lib/discovery.ts";
import { pluginDependencies } from "../src/lib/plugin-dependencies.ts";
import { patchPackageJson } from "../src/lib/scaffold.ts";

function graphOf(...factories: DiscoveredPlugin["factory"][]) {
	const discovered = factories.map((factory) => ({
		name: factory.name,
		cli: factory.cli,
		factory,
		options: {},
	}));
	return buildGraphFromDiscovered({
		discovered,
		app: { name: "app", domain: "example.com" },
		cwd: "/nonexistent",
	}).graph;
}

// A native plugin whose options name a config plugin's package, as expo's
// `configPlugins` do, beside the plugin being added, whose own package is
// the table's spec.
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

test("a plugin's dependencies and devDependencies land in their own fields", async () => {
	assert.deepEqual(await pluginDependencies(graphOf(native, db), ["db"]), {
		dependencies: {
			"expo-camera": "~56.0.0",
			"db-driver": "^1.0.0",
			"@fcalell/plugin-db": "github:fcalell/stack#path:/plugins/db",
		},
		devDependencies: { "db-types": "^1.0.0" },
	});
});

test("the manifest gains each package once, in the field the patch names", async () => {
	const dir = mkdtempSync(join(tmpdir(), "stack-manifest-"));
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({ devDependencies: { "db-driver": "^0.9.0" } }),
	);
	patchPackageJson(dir, await pluginDependencies(graphOf(native, db), []));
	const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
	assert.deepEqual(pkg.dependencies, { "expo-camera": "~56.0.0" });
	assert.deepEqual(pkg.devDependencies, {
		"db-driver": "^0.9.0",
		"db-types": "^1.0.0",
	});
});

test("a package contributed as both kinds is a dependency only", async () => {
	const both = plugin("both", {
		label: "Both",
		dependencies: { shared: "^1.0.0" },
		devDependencies: { shared: "^1.0.0", "both-types": "^1.0.0" },
	});
	const dir = mkdtempSync(join(tmpdir(), "stack-manifest-"));
	writeFileSync(join(dir, "package.json"), "{}");
	patchPackageJson(dir, await pluginDependencies(graphOf(both), []));
	const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
	assert.deepEqual(pkg.dependencies, { shared: "^1.0.0" });
	assert.deepEqual(pkg.devDependencies, { "both-types": "^1.0.0" });
});

test("the patched dependency maps stay sorted by name", () => {
	const dir = mkdtempSync(join(tmpdir(), "stack-manifest-"));
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({ dependencies: { b: "1", d: "1" } }),
	);
	patchPackageJson(dir, { dependencies: { c: "1", a: "1" } });
	const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
	assert.deepEqual(Object.keys(pkg.dependencies), ["a", "b", "c", "d"]);
});
