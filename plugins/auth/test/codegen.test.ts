import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { RESERVED_SLUGS } from "@fcalell/plugin-api/lib/slugify";
import { cloudflare } from "@fcalell/plugin-cloudflare";
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
	assert.ok(
		source.includes(
			`reservedSlugs: [${[...RESERVED_SLUGS]
				.sort()
				.map((slug) => `"${slug}"`)
				.join(", ")}]`,
		),
	);
	assert.doesNotMatch(
		await generatedWorker({ emailOtp: false }),
		/reservedSlugs/,
	);
});

// A native frontend contributing its deep-link scheme, as expo does.
const nativeApp = plugin("native-app", {
	label: "Native app",
	contributes: [api.slots.nativeScheme.contribute(() => "my-app")],
});

test("a native client's trusted scheme is the one the native app registers", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "stack-auth-codegen-"));
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
			discover(auth, auth({ emailOtp: false, expo: true })),
			discover(nativeApp, nativeApp()),
		],
		app: { name: "My App", domain: "example.com" },
		cwd,
	});
	assert.match(
		(await graph.resolve(api.slots.workerSource)) ?? "",
		/trustedOrigins: \[[^\]]*"my-app:\/\/", "my-app:\/\/\*"\]/,
	);
});

// The auth entry `.stack/testing.ts` gets, auth configured as given, for a
// consumer with one route so the worker exists.
async function authTestingEntry(config: ReturnType<typeof auth>) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-auth-codegen-"));
	mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
	writeFileSync(
		join(cwd, "src/worker/routes/hello.ts"),
		"export const hello = {};\n",
	);
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
			discover(auth, config),
		],
		app: { name: "codegen", domain: "example.com" },
		cwd,
	});
	const entries = (await graph.resolve(api.slots.testingEntries)).filter(
		(entry) => entry.plugin === "auth",
	);
	assert.equal(entries.length, 1);
	return entries[0];
}

const string = (value: string) => ({ kind: "string", value });

test("the testing entry bakes the cookie prefix, the var names, the session length and the role names", async () => {
	const ac = createAccessControl({ organization: ["update"] });
	const configured = await authTestingEntry(
		auth({
			cookies: { prefix: "mtt" },
			session: { expiresIn: 3600 },
			organization: {
				ac,
				roles: {
					owner: ac.newRole({ organization: ["update"] }),
					editor: ac.newRole({ organization: [] }),
					viewer: ac.newRole({ organization: [] }),
				},
			},
		}),
	);
	assert.deepEqual(configured?.options?.cookiePrefix, string("mtt"));
	assert.deepEqual(configured?.options?.expiresIn, {
		kind: "number",
		value: 3600,
	});
	assert.deepEqual(configured?.options?.roles, {
		kind: "array",
		items: [string("owner"), string("editor"), string("viewer")],
	});

	const defaults = await authTestingEntry(auth({ organization: true }));
	assert.deepEqual(defaults?.options?.roles, {
		kind: "array",
		items: [string("owner"), string("admin"), string("member")],
	});
	assert.deepEqual(defaults?.options?.cookiePrefix, string("better-auth"));

	const bare = await authTestingEntry(auth());
	assert.deepEqual(bare?.options, {
		cookiePrefix: string("better-auth"),
		secretVar: string("AUTH_SECRET"),
		appUrlVar: string("APP_URL"),
	});
});

test("the magic link alone requires the callbacks file", async () => {
	await assert.rejects(
		generatedWorker({ emailOtp: false, magicLink: true }),
		/src\/worker\/plugins\/auth\.ts/,
	);
	const flagsFor = async (options: AuthOptions) => {
		const { graph } = buildGraphFromDiscovered({
			discovered: [
				discover(api, api()),
				discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
				discover(auth, auth(options)),
			],
			app: { name: "codegen", domain: "example.com" },
			cwd: mkdtempSync(join(tmpdir(), "stack-auth-codegen-")),
		});
		return graph.resolve(auth.slots.clientFlags);
	};
	assert.equal(
		(await flagsFor({ emailOtp: false, magicLink: true }))?.magicLink,
		true,
	);
	assert.equal((await flagsFor({ emailOtp: false }))?.magicLink, false);
});

// The graph a `mcp` consumer composes: cloudflare owns the bindings and the
// prefixes the worker serves.
async function mcpGraph(options: AuthOptions) {
	const { graph } = buildGraphFromDiscovered({
		discovered: [
			discover(api, api()),
			discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
			discover(cloudflare, cloudflare()),
			discover(auth, auth({ emailOtp: false, ...options })),
		],
		app: { name: "codegen", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-auth-codegen-")),
	});
	return graph;
}

test("mcp wires its bindings, prefixes and tables", async () => {
	assert.throws(
		() => auth({ emailOtp: false, mcp: true }),
		/`mcp` needs `organization`/,
	);

	const graph = await mcpGraph({ organization: true, mcp: true });
	const agent = (await graph.resolve(cloudflare.slots.bindings)).find(
		(binding) =>
			binding.kind === "rate_limiter" &&
			binding.binding === "RATE_LIMITER_AGENT",
	);
	assert.deepEqual(agent, {
		kind: "rate_limiter",
		binding: "RATE_LIMITER_AGENT",
		simple: { limit: 120, period: 60 },
	});
	const prefixes = await graph.resolve(api.slots.routePrefixes);
	for (const prefix of [
		"/api/auth",
		"/.well-known/oauth-authorization-server",
		"/.well-known/oauth-protected-resource",
	]) {
		assert.ok(prefixes.includes(prefix), prefix);
	}
	const entities = await graph.resolve(api.slots.entities);
	for (const name of ["oauthConsent", "oauthClient", "jwks"]) {
		assert.ok(entities.includes(name), name);
	}
	assert.ok(
		(await graph.resolve(db.slots.schemaModules)).includes(
			"@fcalell/plugin-auth/schema/oauth",
		),
	);
	assert.equal((await graph.resolve(auth.slots.clientFlags))?.mcp, true);
	const source = (await graph.resolve(api.slots.workerSource)) ?? "";
	assert.match(source, /mcp: true/);
	assert.match(source, /agent: \{\s*binding: "RATE_LIMITER_AGENT"/);

	// Without `mcp` none of it is there.
	const plain = await mcpGraph({ organization: true });
	assert.equal(
		(await plain.resolve(cloudflare.slots.bindings)).some(
			(binding) =>
				binding.kind === "rate_limiter" &&
				binding.binding === "RATE_LIMITER_AGENT",
		),
		false,
	);
	assert.deepEqual(await plain.resolve(api.slots.routePrefixes), [
		"/api/auth",
		"/rpc",
	]);
	assert.equal(
		(await plain.resolve(db.slots.schemaModules)).includes(
			"@fcalell/plugin-auth/schema/oauth",
		),
		false,
	);
	assert.equal((await plain.resolve(auth.slots.clientFlags))?.mcp, false);
	assert.doesNotMatch(
		(await plain.resolve(api.slots.workerSource)) ?? "",
		/mcp:|RATE_LIMITER_AGENT/,
	);
});

test("the testing entry bakes mcp only when it is on", async () => {
	const on = await authTestingEntry(auth({ organization: true, mcp: true }));
	assert.deepEqual(on?.options?.mcp, { kind: "boolean", value: true });
	const off = await authTestingEntry(auth({ organization: true }));
	assert.equal(off?.options && "mcp" in off.options, false);
});

test("mcp mounts the endpoint through this provider and reserves its slug", async () => {
	const graphOf = (options: AuthOptions) => {
		const cwd = mkdtempSync(join(tmpdir(), "stack-auth-codegen-"));
		mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
		writeFileSync(
			join(cwd, "src/worker/routes/hello.ts"),
			"export const hello = {};\n",
		);
		writeFileSync(join(cwd, "src/worker/mcp.ts"), "export default {};\n");
		return buildGraphFromDiscovered({
			discovered: [
				discover(api, api()),
				discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
				discover(auth, auth({ emailOtp: false, ...options })),
			],
			app: { name: "codegen", domain: "example.com" },
			cwd,
		}).graph;
	};

	const source =
		(await graphOf({ organization: true, mcp: true }).resolve(
			api.slots.workerSource,
		)) ?? "";
	assert.match(source, /\.handler\(routes, \{ mcp: mcp, name: "codegen" \}\)/);
	assert.match(source, /reservedSlugs: \[[^\]]*"mcp"/);
});
