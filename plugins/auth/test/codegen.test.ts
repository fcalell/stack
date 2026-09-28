import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { db } from "@fcalell/plugin-db";
import { auth } from "../src/index.ts";
import type { AuthOptions } from "../src/types.ts";

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

// `.stack/worker.ts` for a consumer with a scopes module, auth configured as
// given.
async function generatedWorker(authOptions: AuthOptions): Promise<string> {
	const cwd = mkdtempSync(join(tmpdir(), "stack-auth-codegen-"));
	mkdirSync(join(cwd, "src/shared"), { recursive: true });
	writeFileSync(join(cwd, "src/shared/scopes.ts"), "export {};\n");
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
			discover(auth, auth(authOptions)),
		],
		app: { name: "codegen", domain: "example.com" },
		cwd,
	});
	return (await graph.resolve(api.slots.workerSource)) ?? "";
}

test("with organizations the worker hands the scopes module to the auth runtime", async () => {
	const source = await generatedWorker({ emailOtp: false, organization: true });
	assert.match(
		source,
		/import \* as scopes from "\.\.\/src\/shared\/scopes\.ts"/,
	);
	assert.match(source, /scopes: scopes/);
});

test("without organizations the scopes module stays out of the worker", async () => {
	const source = await generatedWorker({ emailOtp: false });
	assert.doesNotMatch(source, /shared\/scopes/);
});
