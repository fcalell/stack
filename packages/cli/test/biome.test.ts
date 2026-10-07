import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "../src/lib/build-graph.ts";
import { cliSlots } from "../src/lib/cli-slots.ts";
import { plugin } from "../src/lib/create-plugin.ts";
import type { DiscoveredPlugin } from "../src/lib/discovery.ts";
import { biomeTemplate, lintConfig } from "../src/templates/biome.ts";

async function generated(
	...factories: DiscoveredPlugin["factory"][]
): Promise<unknown> {
	const { graph } = buildGraphFromDiscovered({
		discovered: factories.map((factory) => ({
			name: factory.name,
			cli: factory.cli,
			factory,
			options: {},
		})),
		app: { name: "app", domain: "example.com" },
		cwd: "/nonexistent",
	});
	const files = await graph.resolve(cliSlots.artifactFiles);
	const file = files.find((f) => f.path === ".stack/biome.json");
	assert.ok(file);
	return JSON.parse(file.content);
}

test("a consumer's biome.json extends the shared preset and the generated plugins", () => {
	const config = JSON.parse(biomeTemplate({ rootConfig: null }));
	assert.deepEqual(config.extends, [
		"@fcalell/biome-config/shared.json",
		"./.stack/biome.json",
	]);
	assert.match(config.$schema, /biome\/configuration_schema\.json$/);
});

test("an app in the stack workspace extends the checkout's root config and the generated plugins", () => {
	assert.deepEqual(
		JSON.parse(biomeTemplate({ rootConfig: "../../biome.json" })),
		{ root: false, extends: ["../../biome.json", "./.stack/biome.json"] },
	);
});

test("a plugin's rules land in an override on the sources it names, under node_modules", async () => {
	const owner = plugin("owner", {
		label: "Owner",
		contributes: [
			cliSlots.lintPlugins.contribute(() => [
				{ path: "@acme/owner/lint/a.grit", includes: ["src/app/**"] },
				{ path: "@acme/owner/lint/b.grit", includes: ["src/app/**"] },
				{ path: "@acme/owner/lint/c.grit", includes: ["src/ui/**"] },
			]),
		],
	});
	assert.deepEqual(await generated(owner), {
		root: false,
		overrides: [
			{
				includes: ["src/app/**"],
				plugins: [
					"node_modules/@acme/owner/lint/a.grit",
					"node_modules/@acme/owner/lint/b.grit",
				],
			},
			{
				includes: ["src/ui/**"],
				plugins: ["node_modules/@acme/owner/lint/c.grit"],
			},
		],
	});
});

test("an app with no lint plugins still gets the file its biome.json extends", async () => {
	const bare = plugin("bare", { label: "Bare" });
	assert.deepEqual(await generated(bare), { root: false, overrides: [] });
	assert.deepEqual(JSON.parse(lintConfig([])), { root: false, overrides: [] });
});
