import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { buildGraph } from "@fcalell/cli/graph";
import { api } from "./index.ts";

// The api plugin alone, over a project directory holding the given files.
function project(files: Record<string, string>) {
	const cwd = mkdtempSync(join(tmpdir(), "stack-api-"));
	for (const [path, content] of Object.entries(files)) {
		mkdirSync(dirname(join(cwd, path)), { recursive: true });
		writeFileSync(join(cwd, path), content);
	}
	const app = { name: "app", domain: "example.com" };
	const { slots, contributes } = api.cli.collect({
		app,
		options: { prefix: "/rpc", env: [], entities: [] },
	});
	const graph = buildGraph([{ name: "api", slots, contributes }], {
		app,
		cwd,
		log: console as never,
		ctxForPlugin: () => ({
			options: { prefix: "/rpc", env: [], entities: [] },
			fileExists: async (path) => {
				try {
					const { access } = await import("node:fs/promises");
					await access(join(cwd, path));
					return true;
				} catch {
					return false;
				}
			},
			readFile: async () => "",
			template: (name) => new URL(`file:///${name}`),
			scaffold: (name, target) => ({
				source: new URL(`file:///${name}`),
				target,
				plugin: "api",
			}),
		}),
	});
	return { graph, slots, cwd };
}

const ROUTE = { "src/worker/routes/a.ts": "export const a = 1;\n" };
const HANDLER = "export default async () => {};\n";

test("the handler slots are null without their files", async () => {
	const { graph, slots, cwd } = project(ROUTE);
	try {
		assert.equal(await graph.resolve(slots.queueHandler), null);
		assert.equal(await graph.resolve(slots.scheduledHandler), null);
		const worker = await graph.resolve(slots.workerSource);
		assert.match(worker ?? "", /\.handler\(routes\)/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("each file sets its slot and the worker mounts it", async () => {
	const { graph, slots, cwd } = project({
		...ROUTE,
		"src/worker/queue.ts": HANDLER,
		"src/worker/scheduled.ts": HANDLER,
	});
	try {
		assert.deepEqual(await graph.resolve(slots.queueHandler), {
			identifier: "queue",
		});
		assert.deepEqual(await graph.resolve(slots.scheduledHandler), {
			identifier: "scheduled",
		});
		const worker = (await graph.resolve(slots.workerSource)) ?? "";
		assert.match(worker, /import queue from "\.\.\/src\/worker\/queue\.ts"/);
		assert.match(
			worker,
			/import scheduled from "\.\.\/src\/worker\/scheduled\.ts"/,
		);
		assert.match(
			worker,
			/\.handler\(routes, \{ queue: queue, scheduled: scheduled \}\)/,
		);
		// The procedure file is what the handlers import: it never imports them back.
		const procedure = (await graph.resolve(slots.procedureSource)) ?? "";
		assert.doesNotMatch(procedure, /worker\/queue|worker\/scheduled/);
		assert.match(procedure, /export const \{ defineQueue, defineScheduled \}/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("only the file that is there is mounted", async () => {
	const { graph, slots, cwd } = project({
		...ROUTE,
		"src/worker/queue.ts": HANDLER,
	});
	try {
		const worker = (await graph.resolve(slots.workerSource)) ?? "";
		assert.match(worker, /\.handler\(routes, \{ queue: queue \}\)/);
		assert.doesNotMatch(worker, /scheduled/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});

test("a handler file without a worker is refused, naming the file", async () => {
	for (const file of ["src/worker/queue.ts", "src/worker/scheduled.ts"]) {
		const { graph, slots, cwd } = project({ [file]: HANDLER });
		try {
			await assert.rejects(
				() =>
					file.endsWith("queue.ts")
						? graph.resolve(slots.queueHandler)
						: graph.resolve(slots.scheduledHandler),
				new RegExp(file),
			);
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	}
});
