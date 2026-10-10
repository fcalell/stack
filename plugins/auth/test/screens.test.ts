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
import { react } from "@fcalell/plugin-react";
import { screens } from "@fcalell/plugin-screens";
import { getResponse } from "@fcalell/plugin-screens/msw";
import { vite } from "@fcalell/plugin-vite";
import { auth } from "../src/index.ts";
import handlers from "../src/screens.ts";

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

function graphWithScreens() {
	const cwd = mkdtempSync(join(tmpdir(), "stack-auth-screens-"));
	return buildGraphFromDiscovered({
		discovered: [
			discover(vite, vite()),
			discover(react, react()),
			discover(api, api()),
			discover(db, db({ dialect: "sqlite", path: "app.sqlite" })),
			discover(auth, auth({ emailOtp: false })),
			discover(screens, screens()),
		],
		app: { name: "shop", domain: "example.com" },
		cwd,
	}).graph;
}

test("with screens in the config, auth contributes its session handlers to the host", async () => {
	const host = (await graphWithScreens().resolve(cliSlots.artifactFiles)).find(
		(file) => file.path === ".stack/screens.vite.config.ts",
	);
	assert.match(
		host?.content ?? "",
		/handlerModules: \["@fcalell\/plugin-auth\/screens"\]/,
	);
	// The mount the handlers answer under is one the host treats as the worker's.
	assert.match(host?.content ?? "", /prefixes: \[[^\]]*"\/api\/auth"/);
});

test("the handler answers better-auth's session shape: a session and its user", async () => {
	const request = new Request("http://localhost:6006/api/auth/get-session");
	const response = await getResponse(handlers, request);
	assert.equal(response?.status, 200);

	const body = (await response?.json()) as {
		session: Record<string, unknown>;
		user: Record<string, unknown>;
	};
	assert.deepEqual(Object.keys(body).sort(), ["session", "user"]);
	assert.equal(body.session.userId, body.user.id);
	for (const key of ["id", "token", "expiresAt", "createdAt", "updatedAt"]) {
		assert.ok(key in body.session, `session.${key}`);
	}
	for (const key of ["id", "name", "email", "emailVerified", "createdAt"]) {
		assert.ok(key in body.user, `user.${key}`);
	}
	assert.ok(new Date(body.session.expiresAt as string) > new Date());
});

test("the handler answers the worker's mount from any origin, and no other path", async () => {
	const cross = new Request("https://api.example.com/api/auth/get-session");
	assert.equal((await getResponse(handlers, cross))?.status, 200);

	const other = new Request("http://localhost:6006/api/auth/sign-out");
	assert.equal(await getResponse(handlers, other), undefined);
});
