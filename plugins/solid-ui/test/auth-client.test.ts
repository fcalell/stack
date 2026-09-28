import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import { type AuthOptions, auth } from "@fcalell/plugin-auth";
import { db } from "@fcalell/plugin-db";
import { solid } from "@fcalell/plugin-solid";
import { vite } from "@fcalell/plugin-vite";
import { solidUi } from "../src/index.ts";

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

// `.stack/auth-client.ts` for a web consumer, with auth configured as given
// or left out.
async function generatedAuthClient(
	authOptions: AuthOptions | null,
): Promise<string | undefined> {
	const discovered = [
		discover(api, api()),
		discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
		discover(solid, solid()),
		discover(vite, vite()),
		discover(solidUi, solidUi()),
		...(authOptions ? [discover(auth, auth(authOptions))] : []),
	];
	// With email OTP on, auth refuses to generate without the callbacks file.
	const cwd = mkdtempSync(join(tmpdir(), "stack-auth-client-"));
	mkdirSync(join(cwd, "src/worker/plugins"), { recursive: true });
	writeFileSync(
		join(cwd, "src/worker/plugins/auth.ts"),
		"export default {};\n",
	);
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "auth-client", domain: "example.com" },
		cwd,
	});
	const files = await graph.resolve(cliSlots.artifactFiles);
	return files.find((f) => f.path === ".stack/auth-client.ts")?.content;
}

test("the web auth client carries the flags the auth options set", async () => {
	const source = await generatedAuthClient({ organization: true });
	assert.match(
		source ?? "",
		/createAuthClient\(\{"passkey":false,"emailOtp":true,"organization":true\}\)/,
	);
});

test("without organizations the client leaves the organization plugin off", async () => {
	const source = await generatedAuthClient({ emailOtp: false, passkey: {} });
	assert.match(
		source ?? "",
		/createAuthClient\(\{"passkey":true,"emailOtp":false,"organization":false\}\)/,
	);
});

test("without auth in the config no client is generated", async () => {
	assert.equal(await generatedAuthClient(null), undefined);
});
