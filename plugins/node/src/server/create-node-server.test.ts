import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import createWorker from "@fcalell/plugin-api/runtime";
import { afterEach, describe, expect, it } from "vitest";
import { createNodeServer, type NodeServer } from "./create-node-server.ts";
import { defineService } from "./service.ts";

const noopLog = { info: () => {}, error: () => {} };

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
	while (cleanups.length > 0) {
		const cleanup = cleanups.pop();
		if (cleanup) await cleanup();
	}
});

// Ephemeral port per server: bind port 0 is not supported by the options
// schema (real consumers pick a port), so tests reserve one by binding a
// throwaway net server first.
async function freePort(): Promise<number> {
	const { createServer } = await import("node:net");
	return new Promise((resolve, reject) => {
		const srv = createServer();
		srv.listen(0, () => {
			const address = srv.address();
			if (address === null || typeof address === "string") {
				reject(new Error("no port"));
				return;
			}
			srv.close(() => resolve(address.port));
		});
	});
}

async function startServer(
	options: Omit<Parameters<typeof createNodeServer>[0], "port" | "log"> & {
		port?: number;
	},
): Promise<{ server: NodeServer; origin: string }> {
	const port = options.port ?? (await freePort());
	const server = createNodeServer({ ...options, port, log: noopLog });
	cleanups.push(() => server.stop());
	await server.start();
	return { server, origin: `http://localhost:${port}` };
}

function makeStaticRoot(files: Record<string, string>): string {
	const dir = mkdtempSync(join(tmpdir(), "node-static-"));
	cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
	for (const [name, content] of Object.entries(files)) {
		const full = join(dir, name);
		mkdirSync(join(full, ".."), { recursive: true });
		writeFileSync(full, content);
	}
	return dir;
}

describe("createNodeServer — worker mounting", () => {
	it("routes worker paths to worker.fetch with the configured env", async () => {
		let seenEnv: unknown;
		let seenUrl = "";
		const worker = {
			fetch: (request: Request, env: unknown) => {
				seenEnv = env;
				seenUrl = request.url;
				return new Response("from-worker", { status: 200 });
			},
		};
		const { origin } = await startServer({
			worker,
			workerPaths: ["/rpc"],
			env: { MARKER: "yes" },
		});

		const res = await fetch(`${origin}/rpc/board/get`, { method: "POST" });
		expect(await res.text()).toBe("from-worker");
		expect(seenUrl).toContain("/rpc/board/get");
		expect(seenEnv).toEqual({ MARKER: "yes" });
	});

	it("dispatches a real createWorker through the /rpc mount (worker owns the reply, not the SPA)", async () => {
		const worker = createWorker().handler({});
		const staticRoot = makeStaticRoot({ "index.html": "<html>spa</html>" });
		const { origin } = await startServer({
			worker,
			workerPaths: ["/rpc"],
			staticRoot,
		});
		const res = await fetch(`${origin}/rpc/missing`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ json: {} }),
		});
		// The real worker answers (an oRPC/Hono error), never the SPA shell.
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(await res.text()).not.toContain("spa");
	});

	it("lets the worker answer its own 404s instead of the SPA fallback", async () => {
		const worker = {
			fetch: () => new Response("worker-404", { status: 404 }),
		};
		const staticRoot = makeStaticRoot({ "index.html": "<html>spa</html>" });
		const { origin } = await startServer({
			worker,
			workerPaths: ["/rpc"],
			staticRoot,
		});
		const res = await fetch(`${origin}/rpc/missing`, { method: "POST" });
		expect(res.status).toBe(404);
		expect(await res.text()).toBe("worker-404");
	});
});

describe("createNodeServer — static + SPA fallback", () => {
	it("serves files from staticRoot and falls back to index.html for deep links", async () => {
		const staticRoot = makeStaticRoot({
			"index.html": "<html>spa</html>",
			"assets/app.js": "console.log(1);",
		});
		const { origin } = await startServer({ worker: null, staticRoot });

		const asset = await fetch(`${origin}/assets/app.js`);
		expect(await asset.text()).toBe("console.log(1);");

		const deepLink = await fetch(`${origin}/board/012-01`);
		expect(deepLink.status).toBe(200);
		expect(await deepLink.text()).toBe("<html>spa</html>");
	});
});

describe("createNodeServer — service lifecycle", () => {
	it("starts services before listening and stops them in reverse order", async () => {
		const events: string[] = [];
		const first = defineService({
			name: "first",
			start: () => {
				events.push("start:first");
				return () => {
					events.push("stop:first");
				};
			},
		});
		const second = defineService({
			name: "second",
			start: () => {
				events.push("start:second");
				return () => {
					events.push("stop:second");
				};
			},
		});

		const { server } = await startServer({
			worker: null,
			services: [[first, second]],
		});
		expect(events).toEqual(["start:first", "start:second"]);

		await server.stop();
		expect(events).toEqual([
			"start:first",
			"start:second",
			"stop:second",
			"stop:first",
		]);
	});

	it("flattens mixed single-spec and array entries", async () => {
		const started: string[] = [];
		const make = (name: string) =>
			defineService({
				name,
				start: () => {
					started.push(name);
				},
			});
		await startServer({
			worker: null,
			services: [[make("a"), make("b")], make("c")],
		});
		expect(started).toEqual(["a", "b", "c"]);
	});
});

describe("createNodeServer — service http mounts", () => {
	it("routes GET and POST under a mounted prefix without rewriting the path", async () => {
		const seen: Array<{ method: string; path: string }> = [];
		const mcp = defineService({
			name: "mcp",
			start: (ctx) => {
				ctx.http.mount("/mcp", (request) => {
					seen.push({
						method: request.method,
						path: new URL(request.url).pathname,
					});
					return new Response("mounted", { status: 200 });
				});
			},
		});
		const { origin } = await startServer({ worker: null, services: [mcp] });

		const get = await fetch(`${origin}/mcp/abc/def`);
		expect(await get.text()).toBe("mounted");
		const post = await fetch(`${origin}/mcp`, { method: "POST" });
		expect(await post.text()).toBe("mounted");

		expect(seen).toEqual([
			{ method: "GET", path: "/mcp/abc/def" },
			{ method: "POST", path: "/mcp" },
		]);
	});

	it("lets a sibling path past a mount fall through to the SPA fallback", async () => {
		const mcp = defineService({
			name: "mcp",
			start: (ctx) => {
				ctx.http.mount("/mcp", () => new Response("mounted"));
			},
		});
		const staticRoot = makeStaticRoot({ "index.html": "<html>spa</html>" });
		const { origin } = await startServer({
			worker: null,
			services: [mcp],
			staticRoot,
		});

		const res = await fetch(`${origin}/mcpx`);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("<html>spa</html>");
	});

	it("routes a nested request to the longest matching prefix", async () => {
		const nested = defineService({
			name: "nested",
			start: (ctx) => {
				ctx.http.mount("/mcp", () => new Response("outer"));
				ctx.http.mount("/mcp/deep", () => new Response("inner"));
			},
		});
		const { origin } = await startServer({ worker: null, services: [nested] });

		expect(await (await fetch(`${origin}/mcp/deep/x`)).text()).toBe("inner");
		expect(await (await fetch(`${origin}/mcp/other`)).text()).toBe("outer");
	});

	it("throws on a duplicate prefix and on an invalid prefix", async () => {
		let duplicate: unknown;
		let invalid: unknown;
		const guard = defineService({
			name: "guard",
			start: (ctx) => {
				ctx.http.mount("/mcp", () => new Response("ok"));
				try {
					ctx.http.mount("/mcp", () => new Response("dup"));
				} catch (error) {
					duplicate = error;
				}
				try {
					ctx.http.mount("mcp", () => new Response("bad"));
				} catch (error) {
					invalid = error;
				}
			},
		});
		await startServer({ worker: null, services: [guard] });

		expect(duplicate).toBeInstanceOf(Error);
		expect(invalid).toBeInstanceOf(Error);
	});

	it("exposes the configured listen port to services", async () => {
		const port = await freePort();
		let seenPort: number | undefined;
		const probe = defineService({
			name: "probe",
			start: (ctx) => {
				seenPort = ctx.http.port;
			},
		});
		await startServer({ worker: null, services: [probe], port });
		expect(seenPort).toBe(port);
	});
});
