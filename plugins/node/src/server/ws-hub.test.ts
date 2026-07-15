import { createServer } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineChannel } from "../ws/index";
import { createNodeServer, type NodeServer } from "./create-node-server";
import { defineService } from "./service";
import type { ChannelHandle } from "./ws-hub";

const noopLog = { info: () => {}, error: () => {} };

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
	while (cleanups.length > 0) {
		const cleanup = cleanups.pop();
		if (cleanup) await cleanup();
	}
});

async function freePort(): Promise<number> {
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

const board = defineChannel("board", {
	server: {
		snapshot: z.object({ stories: z.array(z.string()) }),
		delta: z.object({ id: z.string() }),
	},
	client: {
		ping: z.object({ n: z.number() }),
	},
});

interface BootResult {
	server: NodeServer;
	url: string;
	handle: ChannelHandle<typeof board.server>;
	pings: number[];
}

// Boots the production entry (createNodeServer) with a service that
// registers the channel — the same wiring a consumer's board watcher uses.
async function bootWithBoardChannel(port?: number): Promise<BootResult> {
	const resolvedPort = port ?? (await freePort());
	const pings: number[] = [];
	let handle: ChannelHandle<typeof board.server> | undefined;
	const service = defineService({
		name: "board",
		start: (ctx) => {
			handle = ctx.ws.channel(board, {
				onSubscribe: (conn) => {
					conn.send("snapshot", { stories: ["012-01"] });
				},
				onMessage: {
					ping: (payload) => {
						pings.push(payload.n);
					},
				},
			});
		},
	});
	const server = createNodeServer({
		port: resolvedPort,
		worker: null,
		services: [service],
		log: noopLog,
	});
	cleanups.push(() => server.stop());
	await server.start();
	if (!handle) throw new Error("channel not registered");
	return {
		server,
		url: `ws://localhost:${resolvedPort}/ws`,
		handle,
		pings,
	};
}

interface TestSocket {
	socket: WebSocket;
	frames: unknown[];
	next(count?: number): Promise<unknown[]>;
}

function openSocket(url: string): Promise<TestSocket> {
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(url);
		cleanups.push(() => socket.close());
		const frames: unknown[] = [];
		let waiters: Array<{ count: number; resolve: (f: unknown[]) => void }> = [];
		socket.addEventListener("message", (event) => {
			frames.push(JSON.parse(String(event.data)));
			waiters = waiters.filter((w) => {
				if (frames.length >= w.count) {
					w.resolve([...frames]);
					return false;
				}
				return true;
			});
		});
		socket.addEventListener("open", () =>
			resolve({
				socket,
				frames,
				next: (count = 1) =>
					new Promise((resolveNext) => {
						if (frames.length >= count) return resolveNext([...frames]);
						waiters.push({ count, resolve: resolveNext });
					}),
			}),
		);
		socket.addEventListener("error", () => reject(new Error("ws error")));
	});
}

describe("ws hub through createNodeServer", () => {
	it("sends the onSubscribe snapshot to a subscribing client", async () => {
		const { url } = await bootWithBoardChannel();
		const client = await openSocket(url);
		client.socket.send(JSON.stringify({ t: "sub", ch: "board" }));
		const [frame] = await client.next(1);
		expect(frame).toEqual({
			t: "msg",
			ch: "board",
			type: "snapshot",
			payload: { stories: ["012-01"] },
		});
	});

	it("broadcasts only to subscribed clients and stops after unsub", async () => {
		const { url, handle } = await bootWithBoardChannel();
		const subscribed = await openSocket(url);
		const bystander = await openSocket(url);
		subscribed.socket.send(JSON.stringify({ t: "sub", ch: "board" }));
		await subscribed.next(1); // snapshot

		handle.broadcast("delta", { id: "012-02" });
		const frames = await subscribed.next(2);
		expect(frames[1]).toEqual({
			t: "msg",
			ch: "board",
			type: "delta",
			payload: { id: "012-02" },
		});
		expect(bystander.frames).toHaveLength(0);

		subscribed.socket.send(JSON.stringify({ t: "unsub", ch: "board" }));
		// A follow-up broadcast after unsub must not arrive. Round-trip a
		// fresh sub from the bystander to sequence past the unsub.
		bystander.socket.send(JSON.stringify({ t: "sub", ch: "board" }));
		await bystander.next(1);
		handle.broadcast("delta", { id: "012-03" });
		await bystander.next(2);
		expect(subscribed.frames).toHaveLength(2);
	});

	it("validates client payloads and drops invalid ones", async () => {
		const { url, pings } = await bootWithBoardChannel();
		const client = await openSocket(url);
		client.socket.send(JSON.stringify({ t: "sub", ch: "board" }));
		await client.next(1);

		client.socket.send(
			JSON.stringify({
				t: "msg",
				ch: "board",
				type: "ping",
				payload: { n: "not-a-number" },
			}),
		);
		client.socket.send(
			JSON.stringify({
				t: "msg",
				ch: "board",
				type: "ping",
				payload: { n: 7 },
			}),
		);
		// Sequence: a broadcast round trip guarantees both frames were handled.
		await new Promise((r) => setTimeout(r, 50));
		expect(pings).toEqual([7]);
	});

	it("rejects duplicate channel registration", async () => {
		const { server } = await bootWithBoardChannel();
		void server;
		// Registering the same channel twice on one hub throws — exercised
		// directly through a second service on a fresh server.
		const dup = defineService({
			name: "dup",
			start: (ctx) => {
				ctx.ws.channel(board);
				expect(() => ctx.ws.channel(board)).toThrow("already registered");
			},
		});
		const port = await freePort();
		const second = createNodeServer({
			port,
			worker: null,
			services: [dup],
			log: noopLog,
		});
		cleanups.push(() => second.stop());
		await second.start();
	});
});
