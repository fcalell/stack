import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createWsClient } from "../src/client/index.ts";
import { defineChannel } from "../src/ws/index.ts";

const inbox = defineChannel("inbox", {
	server: { snapshot: z.object({ count: z.number() }) },
	client: {},
});

// The global WebSocket the client opens, played in-process: the test reads
// what the client sent and delivers what the server would.
class FakeSocket {
	static OPEN = 1;
	static last: FakeSocket | undefined;
	readyState = 0;
	sent: Array<{ t: string; ch: string }> = [];
	private listeners = new Map<string, Array<(e: { data?: string }) => void>>();
	constructor() {
		FakeSocket.last = this;
	}
	addEventListener(type: string, fn: (e: { data?: string }) => void) {
		this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
	}
	send(data: string) {
		this.sent.push(JSON.parse(data));
	}
	close() {
		this.readyState = 3;
	}
	emit(type: string, e: { data?: string } = {}) {
		if (type === "open") this.readyState = 1;
		for (const fn of this.listeners.get(type) ?? []) fn(e);
	}
}

test("subscriptions sharing a channel each get its frames, and the channel is left only by its last", () => {
	const real = globalThis.WebSocket;
	globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
	try {
		const client = createWsClient({ url: "ws://test/ws" });
		const socket = FakeSocket.last as FakeSocket;
		const seen: string[] = [];
		const shell = client.subscribe(inbox, {
			onMessage: { snapshot: (s) => seen.push(`shell ${s.count}`) },
		});
		const place = client.subscribe(inbox, {
			onMessage: { snapshot: (s) => seen.push(`place ${s.count}`) },
		});

		// Opened after both subscribed: one `sub` for the channel.
		socket.emit("open");
		assert.deepEqual(socket.sent, [{ t: "sub", ch: "inbox" }]);
		socket.emit("message", {
			data: JSON.stringify({
				t: "msg",
				ch: "inbox",
				type: "snapshot",
				payload: { count: 5 },
			}),
		});
		assert.deepEqual(seen, ["shell 5", "place 5"]);

		// A third on an open socket asks for its own snapshot.
		const third = client.subscribe(inbox, { onMessage: {} });
		assert.deepEqual(socket.sent.at(-1), { t: "sub", ch: "inbox" });

		// Leaving: `unsub` goes with the last subscription alone, and once.
		place.unsubscribe();
		third.unsubscribe();
		third.unsubscribe();
		assert.equal(socket.sent.filter((f) => f.t === "unsub").length, 0);
		shell.unsubscribe();
		assert.deepEqual(socket.sent.at(-1), { t: "unsub", ch: "inbox" });
		assert.equal(socket.sent.filter((f) => f.t === "unsub").length, 1);
		client.close();
	} finally {
		globalThis.WebSocket = real;
	}
});

test("reconnect opens a closed socket at once and resubscribes, and does nothing while one is open", () => {
	const real = globalThis.WebSocket;
	globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
	try {
		const client = createWsClient({ url: "ws://test/ws" });
		const first = FakeSocket.last as FakeSocket;
		client.subscribe(inbox, { onMessage: {} });
		first.emit("open");
		client.reconnect();
		assert.equal(FakeSocket.last, first, "an open socket is kept");

		// Closed: the backoff would wait; reconnect opens a socket now.
		first.emit("close");
		client.reconnect();
		const second = FakeSocket.last as FakeSocket;
		assert.notEqual(second, first);
		second.emit("open");
		assert.deepEqual(second.sent, [{ t: "sub", ch: "inbox" }]);
		client.close();
	} finally {
		globalThis.WebSocket = real;
	}
});
