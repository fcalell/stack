import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { db } from "@fcalell/plugin-db";
import { auth } from "../src/index.ts";
import type { AuthOptions } from "../src/types.ts";

function discover(
	factory: { cli: unknown },
	config: { __plugin: string; options: unknown },
): DiscoveredPlugin {
	// The test builds the discovery record `stack` builds from the config.
	return {
		name: config.__plugin,
		cli: factory.cli,
		factory,
		options: config.options,
	} as unknown as DiscoveredPlugin;
}

// The `src/schema/index.ts` that `stack init` writes, with auth configured
// as given, or without auth.
async function scaffoldedSchema(authOptions?: AuthOptions): Promise<string> {
	const discovered = [
		discover(api, api()),
		discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
	];
	if (authOptions) discovered.push(discover(auth, auth(authOptions)));
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "scaffold", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-auth-scaffold-")),
	});
	const scaffolds = await graph.resolve(cliSlots.initScaffolds);
	const schema = scaffolds.find((s) => s.target === "src/schema/index.ts");
	assert.ok(schema?.content, "db scaffolds the schema from composed content");
	return schema.content;
}

test("an app with auth scaffolds a schema that re-exports auth's tables", async () => {
	const schema = await scaffoldedSchema({ emailOtp: false });
	assert.match(
		schema,
		/^import .*\n\nexport \* from "@fcalell\/plugin-auth\/schema";\n\nexport const examples/m,
	);
});

test("organizations and passkeys add their own tables' modules", async () => {
	const schema = await scaffoldedSchema({
		emailOtp: false,
		organization: true,
		passkey: {},
	});
	assert.match(
		schema,
		/export \* from "@fcalell\/plugin-auth\/schema\/organization";/,
	);
	assert.match(
		schema,
		/export \* from "@fcalell\/plugin-auth\/schema\/passkey";/,
	);
});

test("an app without auth scaffolds a schema with no re-export", async () => {
	const schema = await scaffoldedSchema();
	assert.doesNotMatch(schema, /export \*/);
});
