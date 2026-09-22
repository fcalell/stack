import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createTables } from "@fcalell/auth-testing";
import type { TsExpression } from "@fcalell/cli/ast";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
import { cliSlots } from "@fcalell/cli/cli-slots";
import type { DiscoveredPlugin } from "@fcalell/cli/discovery";
import { api } from "@fcalell/plugin-api";
import createWorker from "@fcalell/plugin-api/runtime";
import { auth } from "@fcalell/plugin-auth";
import authRuntime from "@fcalell/plugin-auth/runtime";
import * as authSchema from "@fcalell/plugin-auth/schema";
import dbRuntime from "@fcalell/plugin-db/runtime/sqlite";
import { vite } from "@fcalell/plugin-vite";
import { node } from "../src/index.ts";

// The graph `stack dev` resolves for api + auth + node, plus vite when its
// config is given; auth is OAuth-only so no callbacks file is needed.
function devGraph(viteConfig?: ReturnType<typeof vite>) {
	const plugins = [
		{ factory: api, config: api() },
		{ factory: auth, config: auth({ emailOtp: false }) },
		{ factory: node, config: node() },
		...(viteConfig ? [{ factory: vite, config: viteConfig }] : []),
	];
	const discovered = plugins.map(
		({ factory, config }) =>
			({
				name: config.__plugin,
				cli: factory.cli,
				factory,
				options: config.options,
			}) as unknown as DiscoveredPlugin,
	);
	const { graph } = buildGraphFromDiscovered({
		discovered,
		app: { name: "dev-origin", domain: "example.com" },
		cwd: mkdtempSync(join(tmpdir(), "stack-dev-origin-")),
	});
	return graph;
}

// The dev origin lists as codegen bakes them: `createWorker({ devCors })`
// from api's `workerBase` and `devTrustedOrigins` from auth's options.
async function bakedDevLists(graph: ReturnType<typeof devGraph>) {
	const workerBase = await graph.resolve(api.slots.workerBase);
	const workerOptions =
		workerBase.kind === "call" ? workerBase.args[0] : undefined;
	const devCors =
		workerOptions?.kind === "object"
			? workerOptions.properties.find((p) => p.key === "devCors")?.value
			: undefined;
	const authOptions = await graph.resolve(auth.slots.runtimeOptions);
	return {
		devCors: strings(devCors),
		devTrustedOrigins: strings(authOptions.devTrustedOrigins),
	};
}

function strings(expression: TsExpression | undefined): string[] {
	if (expression?.kind !== "array") throw new Error("expected an array");
	return expression.items.map((item) => {
		if (item.kind !== "string") throw new Error("expected a string");
		return item.value;
	});
}

test("with no frontend, APP_URL's dev default is the node server's origin", async () => {
	const graph = devGraph();
	const processes = await graph.resolve(cliSlots.devProcesses);
	const devEnv = processes.find((p) => p.name === "node")?.env ?? {};
	assert.equal(devEnv.APP_URL, "http://localhost:8788");
	assert.equal(devEnv.STACK_DEV, "1");

	// The worker as the codegen composes it: the dev lists as baked, every
	// other list from the graph, the env the dev process hands it, and a
	// database file of its own.
	const cors = await graph.resolve(api.slots.cors);
	const { devCors, devTrustedOrigins } = await bakedDevLists(graph);
	assert.deepEqual(devCors, ["http://localhost:8788"]);
	assert.deepEqual(devTrustedOrigins, devCors);
	const envChecks = (await graph.resolve(api.slots.env)).map((spec) => ({
		name: spec.name,
		...spec.validate,
	}));
	const env = {
		...devEnv,
		DB_FILE: join(mkdtempSync(join(tmpdir(), "stack-node-")), "app.sqlite"),
	};
	const db = dbRuntime({ fileVar: "DB_FILE", schema: authSchema });
	await createTables((await db.context(env, {})).db, authSchema);
	const worker = createWorker({ cors, devCors, envChecks })
		.use(db)
		.use(
			authRuntime({
				secretVar: "AUTH_SECRET",
				appUrlVar: "APP_URL",
				emailOtp: false,
				trustedOrigins: cors,
				devTrustedOrigins,
			}),
		)
		.handler();

	const response = await worker.fetch(
		new Request(`${devEnv.APP_URL}/api/auth/get-session`, {
			headers: { origin: devEnv.APP_URL ?? "" },
		}),
		env,
		undefined,
	);
	assert.equal(response.status, 200, await response.clone().text());
	assert.equal(await response.json(), null);
});

// Port 9000 sorts after the node server's 8788, so the preference for the
// frontend's origin has to come from the slot it rides, not from sorting.
test("with vite, APP_URL's dev default and the dev lists lead with vite's origin", async () => {
	const graph = devGraph(vite({ port: 9000 }));
	const processes = await graph.resolve(cliSlots.devProcesses);
	assert.equal(
		processes.find((p) => p.name === "node")?.env?.APP_URL,
		"http://localhost:9000",
	);
	const { devCors, devTrustedOrigins } = await bakedDevLists(graph);
	assert.deepEqual(devCors, ["http://localhost:9000", "http://localhost:8788"]);
	assert.deepEqual(devTrustedOrigins, devCors);
});
