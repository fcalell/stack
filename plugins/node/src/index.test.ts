import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { buildGraph } from "@fcalell/cli/graph";
import { api } from "@fcalell/plugin-api";
import { node } from "./index.ts";

// The node server's source for a project holding the given files.
async function serverSource(files: Record<string, string>) {
	const cwd = await mkdtemp(join(tmpdir(), "stack-node-"));
	try {
		for (const [path, content] of Object.entries(files)) {
			await mkdir(dirname(join(cwd, path)), { recursive: true });
			await writeFile(join(cwd, path), content);
		}
		const app = { name: "app", domain: "example.com" };
		const options = {
			api: { prefix: "/rpc", env: [], entities: [] },
			node: {},
		};
		const plugins = [
			{ name: "api", ...api.cli.collect({ app, options: options.api }) },
			{
				name: "node",
				...node.cli.collect({
					app,
					options: node.cli.schema?.parse({}) as never,
				}),
			},
		];
		const graph = buildGraph(plugins, {
			app,
			cwd,
			log: console as never,
			ctxForPlugin: (name) => ({
				options: name === "api" ? options.api : node.cli.schema?.parse({}),
				fileExists: async (path) =>
					access(join(cwd, path)).then(
						() => true,
						() => false,
					),
				readFile: async () => "",
				template: (n) => new URL(`file:///${n}`),
				scaffold: (n, target) => ({
					source: new URL(`file:///${n}`),
					target,
					plugin: name,
				}),
			}),
		});
		return await graph.resolve(node.slots.serverSource);
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
}

const ROUTE = { "src/worker/routes/a.ts": "export const a = 1;\n" };

test("a server renders without background handler files", async () => {
	assert.match((await serverSource(ROUTE)) ?? "", /worker/);
});

test("a queue or cron handler file is refused on the node target", async () => {
	for (const file of ["src/worker/queue.ts", "src/worker/scheduled.ts"]) {
		await assert.rejects(
			() => serverSource({ ...ROUTE, [file]: "export default 1;\n" }),
			(error: Error) =>
				error.message.includes(file) &&
				/runs on the Cloudflare target; on node, use a service in src\/server\/services/.test(
					error.message,
				),
		);
	}
});
