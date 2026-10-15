import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import {
	notifyManager,
	QueryClient,
	QueryObserver,
} from "@tanstack/react-query";
import { z } from "zod";
import type {
	SubscriptionHandlers,
	WsClient,
	WsStatus,
} from "../src/client/index.ts";
import { channelRead, PAUSE_AFTER } from "../src/live/index.ts";
import { defineChannel } from "../src/ws/index.ts";

const inbox = defineChannel("inbox", {
	server: {
		snapshot: z.object({ items: z.array(z.string()) }),
		item: z.string(),
		bad: z.string(),
	},
	client: {},
});
type Inbox = { items: string[] };

// The client played in-process: it holds the live subscriptions, so a test
// delivers frames, moves the socket and counts what the read asked of it.
function fakeWs(status: WsStatus = "open") {
	const subs = new Set<SubscriptionHandlers<never>>();
	const fake = {
		status,
		reconnects: 0,
		subscribed: 0,
		subs,
		subscribe(_def: unknown, handlers: SubscriptionHandlers<never>) {
			fake.subscribed += 1;
			subs.add(handlers);
			handlers.onStatus?.(fake.status);
			return { send() {}, unsubscribe: () => void subs.delete(handlers) };
		},
		reconnect() {
			fake.reconnects += 1;
		},
		close() {},
		emit(type: string, payload: unknown) {
			for (const s of [...subs]) {
				(s.onMessage as Record<string, (p: unknown) => void>)[type]?.(payload);
			}
		},
		move(next: WsStatus) {
			fake.status = next;
			for (const s of [...subs]) s.onStatus?.(next);
		},
	};
	return fake;
}

function setup(ws = fakeWs()) {
	const client = new QueryClient();
	const inboxRead = channelRead(ws as unknown as WsClient, inbox, {
		snapshot: (_, s): Inbox => s,
		item: (value, item) => ({ items: [...(value?.items ?? []), item] }),
		bad: () => {
			throw new Error("bad frame");
		},
	});
	const observer = new QueryObserver(client, inboxRead.options);
	const watch = () => observer.subscribe(() => {});
	const now = () => observer.getCurrentResult();
	return { ws, client, inboxRead, observer, watch, now };
}

// Drain what TanStack defers: the fetch's promise chain, then the notify batch.
const flush = async () => {
	for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
	mock.timers.enable({ apis: ["setTimeout"] });
	// The notify batch is a zero timeout by default; a microtask is enough here.
	notifyManager.setScheduler((cb) => queueMicrotask(cb));
});
afterEach(() => {
	mock.timers.reset();
	notifyManager.setScheduler((cb) => setTimeout(cb, 0));
});

test("the read is a stream keyed by channel, and a snapshot makes it ready while the fetch stays open", async () => {
	const { ws, inboxRead, watch, now } = setup();
	assert.equal(inboxRead.kind, "stream");
	assert.deepEqual(inboxRead.options.queryKey, ["ws", "inbox"]);
	assert.equal(inboxRead.options.staleTime, Number.POSITIVE_INFINITY);
	assert.equal(inboxRead.options.retry, false);
	const stop = watch();
	await flush();
	assert.equal(now().status, "pending");
	assert.equal(now().fetchStatus, "fetching");
	ws.emit("snapshot", { items: ["a"] });
	await flush();
	assert.equal(now().status, "success");
	assert.deepEqual(now().data, { items: ["a"] });
	// TanStack keeps the fetch open: it is what readState excludes by kind.
	assert.equal(now().fetchStatus, "fetching");
	stop();
});

test("a delta folds into the current value, and a type without a handler is ignored", async () => {
	const { ws, watch, now } = setup();
	const stop = watch();
	ws.emit("snapshot", { items: ["a"] });
	ws.emit("item", "b");
	await flush();
	assert.deepEqual(now().data, { items: ["a", "b"] });
	stop();
});

test("a handler that throws fails the read; with data it is stale, and the subscription ends", async () => {
	const first = setup();
	const stopFirst = first.watch();
	first.ws.emit("bad", "x");
	await flush();
	assert.equal(first.now().status, "error");
	assert.equal(first.ws.subs.size, 0);
	stopFirst();

	const { ws, watch, now } = setup();
	const stop = watch();
	ws.emit("snapshot", { items: ["a"] });
	ws.emit("bad", "x");
	await flush();
	assert.equal(now().status, "error");
	assert.equal(now().isRefetchError, true);
	assert.deepEqual(now().data, { items: ["a"] });
	assert.equal(now().fetchStatus, "idle");
	assert.equal(ws.subs.size, 0);
	stop();
});

test("a socket down past the grace pauses the read, and reopening resumes it", async () => {
	const { ws, watch, now } = setup();
	const stop = watch();
	ws.emit("snapshot", { items: ["a"] });
	ws.move("closed");
	mock.timers.tick(PAUSE_AFTER - 1);
	await flush();
	assert.equal(now().fetchStatus, "fetching");
	mock.timers.tick(1);
	await flush();
	assert.equal(now().fetchStatus, "paused");
	assert.deepEqual(now().data, { items: ["a"] });
	ws.move("open");
	await flush();
	assert.equal(now().fetchStatus, "fetching");
	stop();
});

test("a blink inside the grace never pauses", async () => {
	const { ws, watch, now } = setup();
	const stop = watch();
	ws.move("closed");
	mock.timers.tick(PAUSE_AFTER - 1);
	ws.move("open");
	mock.timers.tick(PAUSE_AFTER);
	await flush();
	assert.equal(now().fetchStatus, "fetching");
	stop();
});

test("a read that never got a snapshot pauses too, and leaving ends its subscription", async () => {
	const { ws, watch, now } = setup(fakeWs("connecting"));
	const stop = watch();
	mock.timers.tick(PAUSE_AFTER);
	await flush();
	assert.equal(now().status, "pending");
	assert.equal(now().fetchStatus, "paused");
	stop();
	await flush();
	assert.equal(ws.subs.size, 0);
});

test("the last observer leaving unsubscribes and keeps the data setQueryData wrote", async () => {
	const { ws, client, watch } = setup();
	const stop = watch();
	ws.emit("snapshot", { items: ["a"] });
	await flush();
	assert.equal(ws.subs.size, 1);
	stop();
	await flush();
	assert.equal(ws.subs.size, 0);
	const query = client.getQueryCache().find({ queryKey: ["ws", "inbox"] });
	// TanStack reverts a cancelled fetch to the state before it, which a manual
	// write updates (`#revertState`): the snapshot survives, and the fetch is over.
	assert.deepEqual(query?.state.data, { items: ["a"] });
	assert.equal(query?.state.status, "success");
	assert.equal(query?.state.fetchStatus, "idle");
});

test("a second observer keeps the subscription while the first leaves", async () => {
	const { ws, client, inboxRead, watch } = setup();
	const stop = watch();
	const other = new QueryObserver(client, inboxRead.options);
	const stopOther = other.subscribe(() => {});
	ws.emit("snapshot", { items: ["a"] });
	stop();
	await flush();
	assert.equal(ws.subs.size, 1);
	stopOther();
	await flush();
	assert.equal(ws.subs.size, 0);
});

test("Retry after a failure resubscribes, asks the socket to reconnect, and the next snapshot recovers", async () => {
	const { ws, watch, now, observer } = setup();
	const stop = watch();
	ws.emit("snapshot", { items: ["a"] });
	ws.emit("bad", "x");
	await flush();
	assert.equal(now().status, "error");
	const subscribed = ws.subscribed;
	const reconnects = ws.reconnects;
	void observer.refetch();
	await flush();
	assert.equal(ws.subscribed, subscribed + 1);
	assert.equal(ws.reconnects, reconnects + 1);
	assert.equal(ws.subs.size, 1);
	ws.emit("snapshot", { items: ["b"] });
	await flush();
	assert.deepEqual(now().data, { items: ["b"] });
	assert.equal(now().status, "success");
	stop();
});

test("a refetch with a live subscription replaces it rather than doubling it", async () => {
	const { ws, watch, observer } = setup();
	const stop = watch();
	ws.emit("snapshot", { items: ["a"] });
	void observer.refetch();
	await flush();
	assert.equal(ws.subs.size, 1);
	stop();
});
