import assert from "node:assert/strict";
import { test } from "node:test";
import { busyRequests, HELD_MS, type OpenRequest, Tab } from "./tab.ts";

const request = (over: Partial<OpenRequest>): OpenRequest => ({
	type: "Fetch",
	mime: "",
	headersAt: 0,
	...over,
});

test("a request awaiting its headers keeps the page busy", () => {
	assert.equal(busyRequests([request({})], 99_999), 1);
});

test("a response just started keeps it busy, and a held one does not", () => {
	const now = 10_000;
	const fresh = request({ headersAt: now - 100, mime: "application/json" });
	const held = request({ headersAt: now - HELD_MS, mime: "application/json" });
	assert.equal(busyRequests([fresh], now), 1);
	assert.equal(busyRequests([held], now), 0);
});

test("an event stream or an EventSource never counts", () => {
	const now = 10_000;
	const stream = request({ headersAt: now, mime: "text/event-stream" });
	const source = request({ type: "EventSource" });
	assert.equal(busyRequests([stream, source, request({})], now), 1);
});

// A tab over a recording Cdp: the input events it sends, in order.
function recorded(touch: boolean) {
	const sent: { method: string; params: unknown }[] = [];
	const cdp = {
		send: async (method: string, params: unknown) => {
			sent.push({ method, params });
		},
		on: () => {},
	};
	const tab = new Tab(cdp as never, "session", "target");
	tab.touch = touch;
	return { tab, sent };
}

test("rest moves the pointer off the page, so no hover or tooltip carries over a width", async () => {
	const { tab, sent } = recorded(false);
	await tab.click(40, 50);
	await tab.rest();
	const last = sent.at(-1);
	assert.equal(last?.method, "Input.dispatchMouseEvent");
	assert.deepEqual(last?.params, { type: "mouseMoved", x: -1, y: -1 });
});

test("rest sends nothing to a touch tab, which has no pointer", async () => {
	const { tab, sent } = recorded(true);
	await tab.rest();
	assert.equal(sent.length, 0);
});
