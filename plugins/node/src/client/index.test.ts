import { createServer } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createNodeServer, defineService } from "../server/index.ts";
import type { ChannelHandle } from "../server/ws-hub.ts";
import { defineChannel } from "../ws/index.ts";
import { createWsClient, type WsStatus } from "./index.ts";

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
		snapshot: z.object({ n: z.number() }),
	},
	client: {
		ask: z.object({ q: z.string() }),
	},
});

async function bootServer(port: number, snapshotValue: number) {
	const asked: string[] = [];
	let handle: ChannelHandle<typeof board.server> | undefined;
	const service = defineService({
		name: "board",
		start: (ctx) => {
			handle = ctx.ws.channel(board, {
				onSubscribe: (conn) => conn.send("snapshot", { n: snapshotValue }),
				onMessage: {
					ask: (payload) => {
						asked.push(payload.q);
					},
				},
			});
		},
	});
	const server = createNodeServer({
		port,
		worker: null,
		services: [service],
		log: noopLog,
	});
	await server.start();
	if (!handle) throw new Error("channel not registered");
	return { server, handle, asked };
}

function waitFor<T>(check: () => T | undefined, ms = 4000): Promise<T> {
	return new Promise((resolve, reject) => {
		const started = Date.now();
		const tick = () => {
			const value = check();
			if (value !== undefined) return resolve(value);
			if (Date.now() - started > ms) {
				return reject(new Error("waitFor timed out"));
			}
			setTimeout(tick, 20);
		};
		tick();
	});
}

describe("createWsClient", () => {
	it("subscribes, receives the typed snapshot, and sends typed client messages", async () => {
		const port = await freePort();
		const { server, asked } = await bootServer(port, 1);
		cleanups.push(() => server.stop());

		const snapshots: number[] = [];
		const client = createWsClient({ url: `ws://localhost:${port}/ws` });
		cleanups.push(() => client.close());
		const sub = client.subscribe(board, {
			onMessage: {
				snapshot: (payload) => {
					snapshots.push(payload.n);
				},
			},
		});

		await waitFor(() => (snapshots.length > 0 ? true : undefined));
		expect(snapshots).toEqual([1]);

		sub.send("ask", { q: "status?" });
		await waitFor(() => (asked.length > 0 ? true : undefined));
		expect(asked).toEqual(["status?"]);
	});

	it("reconnects after a server restart, resubscribes, and receives a fresh snapshot", async () => {
		const port = await freePort();
		const first = await bootServer(port, 1);

		const snapshots: number[] = [];
		const statuses: WsStatus[] = [];
		const client = createWsClient({ url: `ws://localhost:${port}/ws` });
		cleanups.push(() => client.close());
		client.subscribe(board, {
			onMessage: {
				snapshot: (payload) => {
					snapshots.push(payload.n);
				},
			},
			onStatus: (status) => {
				statuses.push(status);
			},
		});
		await waitFor(() => (snapshots.length >= 1 ? true : undefined));

		await first.server.stop();
		const second = await bootServer(port, 2);
		cleanups.push(() => second.server.stop());

		// The client reconnects on its own and re-sends `sub`; the fresh
		// snapshot (n=2) proves the resubscription reached the new hub.
		await waitFor(() => (snapshots.length >= 2 ? true : undefined));
		expect(snapshots).toEqual([1, 2]);
		expect(statuses).toContain("closed");
		expect(statuses.at(-1)).toBe("open");
	});

	it("throws when sending on a closed socket", async () => {
		const port = await freePort();
		const { server } = await bootServer(port, 1);
		cleanups.push(() => server.stop());

		const client = createWsClient({ url: `ws://localhost:${port}/ws` });
		const sub = client.subscribe(board, { onMessage: {} });
		client.close();
		expect(() => sub.send("ask", { q: "late" })).toThrow("not open");
	});
});
