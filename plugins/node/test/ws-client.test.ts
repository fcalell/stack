import assert from "node:assert/strict";
import { test } from "node:test";
import { guardReach, Unreached } from "@fcalell/plugin-api/acts";
import {
	MutationCache,
	MutationObserver,
	onlineManager,
	QueryClient,
	QueryObserver,
} from "@tanstack/react-query";
import { z } from "zod";
import { createWsClient } from "../src/client/index.ts";
import { PAUSE_AFTER } from "../src/live/index.ts";
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
		const seen: string[] = [];
		const shell = client.subscribe(inbox, {
			onMessage: { snapshot: (s) => seen.push(`shell ${s.count}`) },
		});
		const place = client.subscribe(inbox, {
			onMessage: { snapshot: (s) => seen.push(`place ${s.count}`) },
		});

		const socket = FakeSocket.last as FakeSocket;
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
		client.subscribe(inbox, { onMessage: {} });
		const first = FakeSocket.last as FakeSocket;
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

test("a client opens no socket until its first subscribe or reconnect, and a status listener hears connecting only then", () => {
	const real = globalThis.WebSocket;
	globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
	FakeSocket.last = undefined;
	try {
		const client = createWsClient({ url: "ws://test/ws" });
		assert.equal(FakeSocket.last, undefined, "created, no socket");

		const statuses: string[] = [];
		client.subscribe(inbox, {
			onMessage: {},
			onStatus: (status) => statuses.push(status),
		});
		const socket = FakeSocket.last as unknown as FakeSocket | undefined;
		assert.ok(socket, "the first subscribe connects");
		assert.deepEqual(statuses, ["connecting"]);
		socket.emit("open");
		assert.deepEqual(socket.sent, [{ t: "sub", ch: "inbox" }]);
		client.close();

		// A reconnect on a client that never connected opens it.
		FakeSocket.last = undefined;
		const lazy = createWsClient({ url: "ws://test/ws" });
		lazy.reconnect();
		assert.ok(FakeSocket.last, "reconnect connects a fresh client");
		const opened = FakeSocket.last;
		lazy.subscribe(inbox, { onMessage: {} });
		assert.equal(FakeSocket.last, opened, "the subscribe shares that socket");
		lazy.close();
	} finally {
		globalThis.WebSocket = real;
	}
});

const lastSocket = () => FakeSocket.last;
const resetSocket = () => {
	FakeSocket.last = undefined;
};

// The connection read and the guard that asks it, on a client built the way
// `createQueryClient` builds its mutation cache.
function guarded() {
	const client: QueryClient = new QueryClient({
		mutationCache: new MutationCache({ onMutate: () => guardReach(client) }),
	});
	let sent = 0;
	const send = () =>
		new MutationObserver(client, {
			mutationFn: async () => {
				sent += 1;
			},
		}).mutate();
	return { client, send, sent: () => sent };
}

test("offline, an act rejects with Unreached, queues nothing, and going online sends nothing", async () => {
	const { client, send, sent } = guarded();
	onlineManager.setOnline(false);
	try {
		await assert.rejects(send(), (error) => {
			assert.ok(error instanceof Unreached);
			return true;
		});
		assert.equal(
			client
				.getMutationCache()
				.getAll()
				.filter((m) => m.state.isPaused).length,
			0,
		);
		onlineManager.setOnline(true);
		await new Promise((r) => setTimeout(r, 5));
		assert.equal(sent(), 0);
		await send();
		assert.equal(sent(), 1);
	} finally {
		onlineManager.setOnline(true);
	}
});

test("with the connection lost, an act is refused", async (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const real = globalThis.WebSocket;
	globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
	resetSocket();
	try {
		const ws = createWsClient({
			url: "ws://test/ws",
		});
		const { client, send, sent } = guarded();
		const watcher = new QueryObserver(client, ws.connection.options);
		const stop = watcher.subscribe(() => {});
		// The read watches the socket and never opens it.
		assert.equal(lastSocket(), undefined);
		assert.deepEqual(client.getQueryData(["ws", "connection"]), {
			state: "connecting",
			answered: undefined,
		});
		ws.subscribe(inbox, { onMessage: {} });
		const socket = lastSocket() as FakeSocket;
		socket.emit("open");
		assert.equal(
			(client.getQueryData(["ws", "connection"]) as { state: string }).state,
			"open",
		);
		await send();
		assert.equal(sent(), 1);

		socket.readyState = 3;
		socket.emit("close");
		t.mock.timers.tick(PAUSE_AFTER - 1);
		assert.equal(
			(client.getQueryData(["ws", "connection"]) as { state: string }).state,
			"connecting",
		);
		await send();
		t.mock.timers.tick(1);
		const lost = client.getQueryData(["ws", "connection"]) as {
			state: string;
			answered: string;
		};
		assert.equal(lost.state, "lost");
		await assert.rejects(send(), (error) => {
			assert.ok(error instanceof Unreached);
			return true;
		});
		assert.equal(sent(), 2);

		// Answering again lifts the refusal.
		t.mock.timers.tick(5000);
		lastSocket()?.emit("open");
		await send();
		assert.equal(sent(), 3);
		stop();
		ws.close();
	} finally {
		globalThis.WebSocket = real;
		resetSocket();
	}
});

test("the connection read is kept forever, answers when mounted offline, and opens no socket", async (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const real = globalThis.WebSocket;
	globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
	resetSocket();
	onlineManager.setOnline(false);
	try {
		const ws = createWsClient({ url: "ws://test/ws" });
		const { options } = ws.connection;
		assert.equal(options.networkMode, "always");
		assert.equal(options.gcTime, Number.POSITIVE_INFINITY);
		assert.equal(typeof options.meta?.reach, "function");
		const client = new QueryClient();
		const stop = new QueryObserver(client, options).subscribe(() => {});
		assert.equal(lastSocket(), undefined);
		// The query ran although the client is offline.
		assert.equal(
			(client.getQueryData(["ws", "connection"]) as { state: string }).state,
			"connecting",
		);
		stop();
		// Mounted after the socket went down, offline, it records `lost`.
		ws.reconnect();
		lastSocket()?.emit("close");
		const late = new QueryClient();
		const stopLate = new QueryObserver(late, options).subscribe(() => {});
		t.mock.timers.tick(PAUSE_AFTER);
		assert.equal(
			(late.getQueryData(["ws", "connection"]) as { state: string }).state,
			"lost",
		);
		stopLate();
		ws.close();
	} finally {
		onlineManager.setOnline(true);
		globalThis.WebSocket = real;
	}
});
