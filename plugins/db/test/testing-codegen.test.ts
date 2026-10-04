import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { db } from "../src/index.ts";
import type { DbOptions } from "../src/types.ts";

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

// A graph over a consumer with a schema directory and db configured as given.
function graphFor(options: DbOptions) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-db-codegen-"));
	mkdirSync(join(cwd, "src/schema"), { recursive: true });
	writeFileSync(join(cwd, "src/schema/index.ts"), "export {};\n");
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(cloudflare, cloudflare()),
			discover(db, db(options)),
		],
		app: { name: "codegen", domain: "example.com" },
		cwd,
	});
	return graph;
}

const SCHEMA_IMPORT = { source: "../src/schema/index.ts", namespace: "schema" };

test("a d1 consumer gets a db testing entry baked from its options", async () => {
	const graph = graphFor({ dialect: "d1", databaseId: "db-id" });
	assert.deepEqual(await graph.resolve(api.slots.testingEntries), [
		{
			plugin: "db",
			import: { source: "@fcalell/plugin-db/testing", default: "dbTesting" },
			identifier: "dbTesting",
			options: {
				binding: { kind: "string", value: "DB_MAIN" },
				migrations: { kind: "string", value: "./src/migrations" },
				schema: { kind: "identifier", name: "schema" },
			},
		},
	]);
	assert.deepEqual(await graph.resolve(api.slots.testingImports), [
		SCHEMA_IMPORT,
	]);
});

test("custom options are baked and sqlite contributes nothing", async () => {
	const custom = graphFor({
		dialect: "d1",
		databaseId: "db-id",
		binding: "DB_OTHER",
		migrations: "./db/migrations",
	});
	const [entry] = await custom.resolve(api.slots.testingEntries);
	assert.deepEqual(entry?.options?.binding, {
		kind: "string",
		value: "DB_OTHER",
	});
	assert.deepEqual(entry?.options?.migrations, {
		kind: "string",
		value: "./db/migrations",
	});

	const sqlite = graphFor({ dialect: "sqlite", path: "app.sqlite" });
	const entries = await sqlite.resolve(api.slots.testingEntries);
	assert.equal(
		entries.some((e) => e.plugin === "db"),
		false,
	);
	assert.deepEqual(await sqlite.resolve(api.slots.testingImports), []);
});

test("the worker imports the schema file on both dialects", async () => {
	for (const options of [
		{ dialect: "d1", databaseId: "db-id" },
		{ dialect: "sqlite", path: "app.sqlite" },
	] satisfies DbOptions[]) {
		const imports = await graphFor(options).resolve(api.slots.workerImports);
		assert.deepEqual(
			imports.filter((i) => "namespace" in i && i.namespace === "schema"),
			[SCHEMA_IMPORT],
		);
	}
});
