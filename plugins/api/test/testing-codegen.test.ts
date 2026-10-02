import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { type ApiOptions, api } from "../src/index.ts";

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

function consumer(withRoute: boolean): string {
	const cwd = mkdtempSync(join(tmpdir(), "stack-api-testing-"));
	if (withRoute) {
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
		writeFileSync(
			join(cwd, "src/worker/routes/hello.ts"),
			"export const hello = {};\n",
		);
	}
	return cwd;
}

// A peer plugin contributing a test entry and an import its options need,
// as db and auth do.
function stub(name: string) {
	return plugin(name, {
		label: name,
		contributes: [
			api.slots.testingImports.contribute(() => ({
				source: `../src/${name}-constants.ts`,
				namespace: `${name}Constants`,
			})),
			api.slots.testingEntries.contribute(() => ({
				plugin: name,
				import: {
					source: `@fcalell/plugin-${name}/testing`,
					default: `${name}Testing`,
				},
				identifier: `${name}Testing`,
				options: {
					binding: { kind: "string", value: name.toUpperCase() },
					constants: { kind: "identifier", name: `${name}Constants` },
				},
			})),
		],
	});
}

const env: ApiOptions["env"] = [
	{ name: "FIXTURE_SECRET", devDefault: "fixture-secret-0123456789" },
	{ name: "OTHER_KEY", devDefault: "other" },
];

test("api alone renders an entry that loads the worker", async () => {
	const { graph } = buildGraphFromDiscovered({
		discovered: [discover(api, api({ prefix: "/api/rpc", env }))],
		app: { name: "testing", domain: "example.com" },
		cwd: consumer(true),
	});
	const source = (await graph.resolve(api.slots.testingSource)) ?? "";
	assert.match(
		source,
		/import \{ createTestEntry \} from "@fcalell\/plugin-api\/testing";/,
	);
	assert.match(source, /import type \{ AppRouter \} from "\.\/worker\.ts";/);
	assert.match(source, /export const testing = createTestEntry<AppRouter>\(/);
	assert.match(
		source,
		/worker: new URL\("\.\/worker\.ts", import\.meta\.url\)/,
	);
	assert.match(
		source,
		/procedure: new URL\("\.\/procedure\.ts", import\.meta\.url\)/,
	);
	assert.match(source, /root: new URL\("\.\.", import\.meta\.url\)/);
	assert.match(source, /prefix: "\/api\/rpc"/);
	assert.match(
		source,
		/env: \{ STACK_DEV: "1", FIXTURE_SECRET: "fixture-secret-0123456789", OTHER_KEY: "other" \}/,
	);
	assert.doesNotMatch(source, /\.use\(/);
});

test("contributed entries render as imports and calls, sorted by plugin", async () => {
	const zeta = stub("zeta");
	const alpha = stub("alpha");
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(zeta, zeta()),
			discover(alpha, alpha()),
		],
		app: { name: "testing", domain: "example.com" },
		cwd: consumer(true),
	});
	const source = (await graph.resolve(api.slots.testingSource)) ?? "";
	for (const name of ["alpha", "zeta"]) {
		assert.match(
			source,
			new RegExp(
				`import \\* as ${name}Constants from "\\.\\./src/${name}-constants\\.ts";`,
			),
		);
		assert.match(
			source,
			new RegExp(
				`import ${name}Testing from "@fcalell/plugin-${name}/testing";`,
			),
		);
	}
	assert.match(
		source,
		/\.use\(alphaTesting\(\{ binding: "ALPHA", constants: alphaConstants \}\)\)\.use\(zetaTesting\(\{ binding: "ZETA", constants: zetaConstants \}\)\);/,
	);
	assert.match(source, /prefix: "\/rpc"/);
});

test("no worker, no test entry", async () => {
	const build = (cwd: string) =>
		buildGraphFromDiscovered({
			discovered: [discover(api, api())],
			app: { name: "testing", domain: "example.com" },
			cwd,
		}).graph;

	const empty = build(consumer(false));
	assert.equal(await empty.resolve(api.slots.testingSource), null);
	const emptyFiles = await empty.resolve(cliSlots.artifactFiles);
	assert.ok(!emptyFiles.some((file) => file.path === ".stack/testing.ts"));

	const routed = build(consumer(true));
	const routedFiles = await routed.resolve(cliSlots.artifactFiles);
	assert.ok(routedFiles.some((file) => file.path === ".stack/testing.ts"));
});
