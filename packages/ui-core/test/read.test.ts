import assert from "node:assert/strict";
import { test } from "node:test";
import { type ReadResult, readState } from "../src/read.ts";

const never = () => false;
const result = (over: Partial<ReadResult>): ReadResult => ({
	status: "success",
	fetchStatus: "idle",
	isEnabled: true,
	isPlaceholderData: false,
	isRefetchError: false,
	error: null,
	...over,
});
const pending = { status: "pending", fetchStatus: "fetching" } as const;
const failure = { status: "error", error: new Error("down") } as const;

test("a read not asked for is idle and not busy", () => {
	const s = readState(
		result({ ...pending, isEnabled: false, fetchStatus: "idle" }),
		never,
	);
	assert.equal(s.phase, "idle");
	assert.equal(s.busy, false);
});

test("a read asked for with no data waits, and a waiting read is not busy", () => {
	const s = readState(result(pending), never);
	assert.equal(s.phase, "waiting");
	assert.equal(s.busy, false);
});

test("a placeholder, which reports success, counts as waiting", () => {
	const s = readState(
		result({ isPlaceholderData: true, fetchStatus: "fetching" }),
		never,
	);
	assert.equal(s.phase, "waiting");
	assert.equal(s.busy, false);
});

test("real data is ready, and a refetch over it is busy", () => {
	assert.deepEqual(readState(result({}), never), {
		phase: "ready",
		busy: false,
		stale: false,
		more: false,
		streaming: false,
		paused: false,
	});
	assert.equal(
		readState(result({ fetchStatus: "fetching" }), never).busy,
		true,
	);
});

test("a failure with no data is failed, or missing when the handle says so", () => {
	assert.equal(readState(result(failure), never).phase, "failed");
	const seen: unknown[] = [];
	const s = readState(result(failure), (error) => {
		seen.push(error);
		return true;
	});
	assert.equal(s.phase, "missing");
	assert.deepEqual(seen, [failure.error]);
});

test("a failure that is retrying stays failed and is busy", () => {
	const s = readState(result({ ...failure, fetchStatus: "fetching" }), never);
	assert.equal(s.phase, "failed");
	assert.equal(s.busy, true);
});

test("a missing read that is retrying stays missing and is busy", () => {
	const s = readState(
		result({ ...failure, fetchStatus: "fetching" }),
		() => true,
	);
	assert.equal(s.phase, "missing");
	assert.equal(s.busy, true);
});

test("a refetch error over data is ready and stale, never failed", () => {
	const s = readState(result({ ...failure, isRefetchError: true }), () => true);
	assert.equal(s.phase, "ready");
	assert.equal(s.stale, true);
});

test("a stale read retrying is busy", () => {
	const s = readState(
		result({ ...failure, isRefetchError: true, fetchStatus: "fetching" }),
		never,
	);
	assert.equal(s.stale, true);
	assert.equal(s.busy, true);
});

test("more is an infinite read with a next page on real data", () => {
	assert.equal(readState(result({ hasNextPage: true }), never).more, true);
	assert.equal(readState(result({ hasNextPage: false }), never).more, false);
	assert.equal(
		readState(result({ ...pending, hasNextPage: true }), never).more,
		false,
	);
});

test("a streamed read still writing is streaming, not busy", () => {
	const s = readState(
		result({ fetchStatus: "fetching", streamed: true }),
		never,
	);
	assert.equal(s.streaming, true);
	assert.equal(s.busy, false);
});

test("a streamed read that has settled, or has no data yet, is not streaming", () => {
	assert.equal(readState(result({ streamed: true }), never).streaming, false);
	assert.equal(
		readState(result({ ...pending, streamed: true }), never).streaming,
		false,
	);
});

test("a read waiting for a connection is paused", () => {
	const s = readState(result({ fetchStatus: "paused" }), never);
	assert.equal(s.paused, true);
	assert.equal(s.busy, false);
	assert.equal(readState(result({}), never).paused, false);
});

test("a read paused before any answer is waiting and paused", () => {
	const s = readState(result({ ...pending, fetchStatus: "paused" }), never);
	assert.equal(s.phase, "waiting");
	assert.equal(s.paused, true);
});
