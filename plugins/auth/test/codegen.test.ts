import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { db } from "@fcalell/plugin-db";
import { createAccessControl } from "../src/access.ts";
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

test("an organization access control generates as its statements and role grants", async () => {
	const ac = createAccessControl({
		organization: ["update"],
		project: ["read", "update"],
	});
	const source = await generatedWorker({
		emailOtp: false,
		organization: {
			ac,
			roles: {
				owner: ac.newRole({ organization: ["update"], project: ["read"] }),
			},
		},
	});
	assert.match(
		source,
		/organization: \{\s*statements: \{\s*organization: \["update"\],\s*project: \["read", "update"\],?\s*\},\s*roles: \{\s*owner: \{\s*organization: \["update"\],\s*project: \["read"\],?\s*\},?\s*\},?\s*\}/,
	);
	assert.doesNotMatch(source, /newRole/);
});

test("the web client's flags carry the same access control as the worker", async () => {
	const ac = createAccessControl({ project: ["read", "update"] });
	const cwd = mkdtempSync(join(tmpdir(), "stack-auth-codegen-"));
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
			discover(
				auth,
				auth({
					emailOtp: false,
					organization: {
						ac,
						roles: { editor: ac.newRole({ project: ["read"] }) },
					},
				}),
			),
		],
		app: { name: "codegen", domain: "example.com" },
		cwd,
	});
	const flags = await graph.resolve(auth.slots.clientFlags);
	assert.deepEqual(flags?.organization, {
		statements: { project: ["read", "update"] },
		roles: { editor: { project: ["read"] } },
	});
});

test("with organizations the worker refuses plugin-api's reserved slugs; without them no list", async () => {
	const source = await generatedWorker({ emailOtp: false, organization: true });
	assert.match(
		source,
		/reservedSlugs: \["admin", "api", "auth", "new", "settings", "system"\]/,
	);
	assert.doesNotMatch(
		await generatedWorker({ emailOtp: false }),
		/reservedSlugs/,
	);
});
