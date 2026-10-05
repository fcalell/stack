import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { SlotConflictError } from "@fcalell/cli/slots";
import { type ApiOptions, api, apiOptionsSchema } from "../src/index.ts";

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

// What db contributes from the schema's export names.
const db = plugin("db", {
	label: "db",
	contributes: [api.slots.entities.contribute(() => ["items", "users"])],
});

function graphOf(options: ApiOptions, withDb = false) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-api-entities-"));
	mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
	writeFileSync(
		join(cwd, "src/worker/routes/hello.ts"),
		"export const hello = {};\n",
	);
	return buildGraphFromDiscovered({
		discovered: [
			discover(api, api(options)),
			...(withDb ? [discover(db, db())] : []),
		],
		app: { name: "Entities", domain: "example.com" },
		cwd,
	}).graph;
}

test("the option's names reach the slot and the rendered Entity union", async () => {
	const graph = graphOf({ entities: ["settings", "repos"] }, true);
	assert.deepEqual(await graph.resolve(api.slots.entities), [
		"items",
		"repos",
		"settings",
		"users",
	]);
	const source = (await graph.resolve(api.slots.procedureSource)) ?? "";
	assert.match(
		source,
		/type Entity = "items" \| "repos" \| "settings" \| "users";/,
	);
});

test("a name a plugin already declares is a slot conflict", async () => {
	const graph = graphOf({ entities: ["items"] }, true);
	await assert.rejects(graph.resolve(api.slots.entities), (error: unknown) => {
		assert.ok(error instanceof SlotConflictError);
		assert.equal(error.slotName, "api:entities");
		assert.equal(error.key, "items");
		return true;
	});
});

test("a name outside the wire pattern is refused at parse", () => {
	assert.throws(
		() => apiOptionsSchema.parse({ entities: ["a,b"] }),
		/an entity name may only contain/,
	);
	assert.throws(
		() => apiOptionsSchema.parse({ entities: [""] }),
		/an entity name may only contain/,
	);
	assert.deepEqual(apiOptionsSchema.parse({}).entities, []);
});

test("with no db and no auth, Entity is the app's union and not string", async () => {
	const named = (await graphOf({ entities: ["settings"] }).resolve(
		api.slots.procedureSource,
	)) as string;
	assert.match(named, /type Entity = "settings";/);

	const bare = (await graphOf({}).resolve(api.slots.procedureSource)) as string;
	assert.match(bare, /type Entity = string;/);
});
