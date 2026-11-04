import assert from "node:assert/strict";
import { test } from "node:test";
import { busyRequests, HELD_MS, type OpenRequest } from "./tab.ts";

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
