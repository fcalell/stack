import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createWsHub, type HubSocket } from "../src/server/ws-hub.ts";
import { defineChannel } from "../src/ws/index.ts";

const presence = defineChannel("presence", {
	server: { snapshot: z.object({ watching: z.array(z.string()) }) },
	client: { watch: z.object({ room: z.string() }) },
});

function socket(): HubSocket & { sent: string[] } {
	const sent: string[] = [];
	return { readyState: 1, send: (data) => sent.push(data), sent };
}

const log = { info: () => {}, error: () => {} };

test("a connection's id holds across its messages, and unsubscribe runs once on unsub and once on close", async () => {
	const { hub, connectionHandlers } = createWsHub(log);
	const seen: Array<[string, string]> = [];
	const watching = new Map<string, string>();
	hub.channel(presence, {
		onSubscribe: (conn) => {
			seen.push(["sub", conn.id]);
			conn.send("snapshot", { watching: [...watching.values()] });
		},
		onUnsubscribe: (conn) => {
			seen.push(["unsub", conn.id]);
			watching.delete(conn.id);
		},
		onMessage: {
			watch: (payload, conn) => {
				watching.set(conn.id, payload.room);
			},
		},
	});
	const handlers = connectionHandlers();
	const a = socket();
	const b = socket();
	const send = (ws: HubSocket, frame: unknown) =>
		handlers.onMessage({ data: JSON.stringify(frame) }, ws);

	send(a, { t: "sub", ch: "presence" });
	send(b, { t: "sub", ch: "presence" });
	send(a, { t: "msg", ch: "presence", type: "watch", payload: { room: "r1" } });
	send(b, { t: "msg", ch: "presence", type: "watch", payload: { room: "r2" } });
	await new Promise((r) => setImmediate(r));
	const [idA, idB] = [seen[0]?.[1], seen[1]?.[1]];
	assert.ok(idA && idB && idA !== idB);
	assert.deepEqual(
		[...watching.entries()],
		[
			[idA, "r1"],
			[idB, "r2"],
		],
	);

	// An unsub runs the hook once; a second unsub of the same socket is nothing.
	send(a, { t: "unsub", ch: "presence" });
	send(a, { t: "unsub", ch: "presence" });
	await new Promise((r) => setImmediate(r));
	assert.deepEqual(
		seen.filter(([k]) => k === "unsub"),
		[["unsub", idA]],
	);
	assert.deepEqual([...watching.keys()], [idB]);

	// A closed socket unsubscribes from every channel it was on.
	handlers.onClose({}, b);
	await new Promise((r) => setImmediate(r));
	assert.deepEqual(
		seen.filter(([k]) => k === "unsub"),
		[
			["unsub", idA],
			["unsub", idB],
		],
	);
	assert.deepEqual([...watching.keys()], []);
	assert.equal(a.sent.length, 1, "the snapshot on subscribe");
});
