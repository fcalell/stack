import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { defineConfig } from "@fcalell/cli";
import { runStackGenerate } from "@fcalell/cli/testing";
import { api } from "@fcalell/plugin-api";
import { node } from "@fcalell/plugin-node";
import { createWsClient } from "@fcalell/plugin-node/client";
import { defineChannel } from "@fcalell/plugin-node/ws";
import { vite } from "@fcalell/plugin-vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

// The Helm-journey proof: generate a [node(), vite(), api()] project with
// routes + a WS channel service, run the CONSUMER path — plain
// `node .stack/server.ts` (type stripping, no build, no tsx) — and drive it
// over real HTTP and WebSocket. This is the only place the whole node-target
// chain (registerHooks for virtual:stack-procedure, dynamic worker load,
// services, static SPA, WS hub) runs exactly as a consumer runs it.

const INTEGRATION_ROOT = resolve(import.meta.dirname);
const NODE_MODULES = resolve(INTEGRATION_ROOT, "node_modules");
const WORKSPACE = resolve(INTEGRATION_ROOT, `.tmp-node-server-${process.pid}`);

// Mirrors the fixture's src/shared/channel.ts — the test acts as the browser
// side of the same contract.
const board = defineChannel("board", {
	server: {
		snapshot: z.object({ stories: z.array(z.string()) }),
		delta: z.object({ id: z.string() }),
	},
	client: {
		poke: z.object({ id: z.string() }),
	},
});

const FIXTURE_SEED: Record<string, string> = {
	"src/worker/routes/hello.ts": `import { procedure } from "virtual:stack-procedure";
import { z } from "zod";

export const hello = {
	greet: procedure()
		.input(z.object({ name: z.string() }))
		.handler(async ({ input }) => ({ greeting: \`hi \${input.name}\` })),
};
`,
	"src/shared/channel.ts": `import { defineChannel } from "@fcalell/plugin-node/ws";
import { z } from "zod";

export const board = defineChannel("board", {
	server: {
		snapshot: z.object({ stories: z.array(z.string()) }),
		delta: z.object({ id: z.string() }),
	},
	client: {
		poke: z.object({ id: z.string() }),
	},
});
`,
	"src/server/services/broadcaster.ts": `import { defineService } from "@fcalell/plugin-node/server";
import { board } from "../../shared/channel.ts";

export default defineService({
	name: "broadcaster",
	start: (ctx) => {
		const handle = ctx.ws.channel(board, {
			onSubscribe: (conn) => {
				conn.send("snapshot", { stories: ["012-01"] });
			},
			onMessage: {
				poke: (payload) => {
					handle.broadcast("delta", { id: payload.id });
				},
			},
		});
	},
});
`,
	"dist/client/index.html": "<html><body>spa-shell</body></html>",
	"dist/client/assets/app.js": "console.log('app');",
};

async function freePort(): Promise<number> {
	return new Promise((resolvePort, reject) => {
		const srv = createServer();
		srv.listen(0, () => {
			const address = srv.address();
			if (address === null || typeof address === "string") {
				reject(new Error("no port"));
				return;
			}
			srv.close(() => resolvePort(address.port));
		});
	});
}

let child: ChildProcess | null = null;
let origin = "";
let port = 0;

beforeAll(async () => {
	rmSync(WORKSPACE, { recursive: true, force: true });
	mkdirSync(WORKSPACE, { recursive: true });
	symlinkSync(NODE_MODULES, resolve(WORKSPACE, "node_modules"), "dir");

	for (const [path, content] of Object.entries(FIXTURE_SEED)) {
		const abs = resolve(WORKSPACE, path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, content);
	}

	port = await freePort();
	const config = defineConfig({
		app: { name: "node-server-test", domain: "example.com" },
		plugins: [node({ port }), vite(), api()],
	});
	const result = await runStackGenerate({ config, cwd: WORKSPACE });
	for (const file of result.files) {
		const abs = resolve(WORKSPACE, file.path);
		mkdirSync(resolve(abs, ".."), { recursive: true });
		writeFileSync(abs, file.content);
	}

	origin = `http://localhost:${port}`;
	child = spawn(process.execPath, [".stack/server.ts"], {
		cwd: WORKSPACE,
		env: { ...process.env, STACK_DEV: "1" },
		stdio: ["ignore", "pipe", "pipe"],
	});
	const spawned = child;
	const stderrChunks: string[] = [];
	spawned.stderr?.on("data", (chunk: Buffer) => {
		stderrChunks.push(chunk.toString());
	});
	await new Promise<void>((resolveReady, reject) => {
		const timeout = setTimeout(() => {
			reject(
				new Error(
					`server never became ready. stderr:\n${stderrChunks.join("")}`,
				),
			);
		}, 15000);
		spawned.stdout?.on("data", (chunk: Buffer) => {
			if (/listening on/i.test(chunk.toString())) {
				clearTimeout(timeout);
				resolveReady();
			}
		});
		spawned.on("exit", (code) => {
			clearTimeout(timeout);
			reject(
				new Error(
					`server exited early (code ${code}). stderr:\n${stderrChunks.join("")}`,
				),
			);
		});
	});
}, 30000);

afterAll(async () => {
	if (child) {
		const exited = new Promise((resolveExit) =>
			child?.once("exit", resolveExit),
		);
		child.kill("SIGTERM");
		await exited;
	}
	rmSync(WORKSPACE, { recursive: true, force: true });
});

describe("node target end-to-end (plain `node .stack/server.ts`)", () => {
	it("serves an oRPC procedure round trip through the worker mount", async () => {
		const res = await fetch(`${origin}/rpc/hello/greet`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ json: { name: "helm" } }),
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({
			json: { greeting: "hi helm" },
		});
	});

	it("serves static assets and falls back to the SPA shell for deep links", async () => {
		const asset = await fetch(`${origin}/assets/app.js`);
		expect(asset.status).toBe(200);
		expect(await asset.text()).toContain("console.log('app')");

		const deepLink = await fetch(`${origin}/board/012-01`);
		expect(deepLink.status).toBe(200);
		expect(await deepLink.text()).toContain("spa-shell");
	});

	it("subscribes over WS, receives the snapshot, and round-trips a broadcast", async () => {
		const snapshots: string[][] = [];
		const deltas: string[] = [];
		const client = createWsClient({ url: `ws://localhost:${port}/ws` });
		try {
			const sub = client.subscribe(board, {
				onMessage: {
					snapshot: (payload) => {
						snapshots.push(payload.stories);
					},
					delta: (payload) => {
						deltas.push(payload.id);
					},
				},
			});
			await expect
				.poll(() => snapshots.length, { timeout: 5000 })
				.toBeGreaterThan(0);
			expect(snapshots[0]).toEqual(["012-01"]);

			sub.send("poke", { id: "012-02" });
			await expect
				.poll(() => deltas.length, { timeout: 5000 })
				.toBeGreaterThan(0);
			expect(deltas[0]).toBe("012-02");
		} finally {
			client.close();
		}
	});
});
