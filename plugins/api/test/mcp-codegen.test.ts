import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { plugin } from "@fcalell/cli";
import { buildGraphFromDiscovered } from "@fcalell/cli/build-graph";
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

// What auth contributes under `auth({ mcp: true })`.
const oauth = plugin("auth", {
	label: "auth",
	contributes: [api.slots.mcpAuth.contribute(() => true)],
});

function consumer({ routes = true, mcp = true }): string {
	const cwd = mkdtempSync(join(tmpdir(), "stack-api-mcp-"));
	mkdirSync(join(cwd, "src/worker/routes"), { recursive: true });
	if (routes) {
		writeFileSync(
			join(cwd, "src/worker/routes/hello.ts"),
			"export const hello = {};\n",
		);
	}
	if (mcp)
		writeFileSync(join(cwd, "src/worker/mcp.ts"), "export default {};\n");
	return cwd;
}

function graphOf(
	cwd: string,
	{ auth = true, options }: { auth?: boolean; options?: ApiOptions } = {},
) {
	return buildGraphFromDiscovered({
		discovered: [
			discover(api, options ? api(options) : api()),
			...(auth ? [discover(oauth, oauth())] : []),
		],
		app: { name: "Mcp App", domain: "example.com" },
		cwd,
	}).graph;
}

test("mcp.ts mounts /mcp only beside the OAuth provider", async () => {
	const graph = graphOf(consumer({}));
	const source = (await graph.resolve(api.slots.workerSource)) ?? "";
	assert.match(source, /import mcp from "\.\.\/src\/worker\/mcp\.ts";/);
	assert.match(source, /\.handler\(routes, \{ mcp: mcp, name: "Mcp App" \}\)/);
	assert.ok((await graph.resolve(api.slots.routePrefixes)).includes("/mcp"));
	// The procedure entry never imports the file, which types itself against
	// the routes that import the entry.
	const procedure = (await graph.resolve(api.slots.procedureSource)) ?? "";
	assert.doesNotMatch(procedure, /worker\/mcp/);

	await assert.rejects(
		graphOf(consumer({}), { auth: false }).resolve(api.slots.workerSource),
		/auth\(\{ mcp: true \}\)/,
	);
	await assert.rejects(
		graphOf(consumer({ routes: false })).resolve(api.slots.workerSource),
		/no routable file/,
	);
	await assert.rejects(
		graphOf(consumer({}), { options: { prefix: "/mcp" } }).resolve(
			api.slots.workerSource,
		),
		/pick another api\(\{ prefix \}\)/,
	);

	const plain = graphOf(consumer({ mcp: false }), { auth: false });
	const plainSource = (await plain.resolve(api.slots.workerSource)) ?? "";
	assert.match(plainSource, /\.handler\(routes\)/);
	assert.doesNotMatch(plainSource, /mcp/);
	assert.ok(!(await plain.resolve(api.slots.routePrefixes)).includes("/mcp"));
});
