import assert from "node:assert/strict";
import { test } from "node:test";
import { frameOf, type ReadResult, readState, turnOf } from "../src/read.ts";

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

const root = (over: Partial<ReadResult>, held = true) => ({
	result: result(over),
	missing: (e: unknown) => e === "gone",
	held,
});

test("a frame holding no value is ready, busy while its read refetches", () => {
	assert.deepEqual(frameOf({}), {
		form: "ready",
		count: undefined,
		busy: false,
		stale: false,
		paused: false,
	});
	assert.deepEqual(frameOf({ reads: [root({ fetchStatus: "fetching" })] }), {
		form: "ready",
		count: undefined,
		busy: true,
		stale: false,
		paused: false,
	});
});

test("a failed or missing read ends the frame whatever it draws, failed busy while it retries", () => {
	const drawn = { painted: true, value: [] };
	assert.deepEqual(
		frameOf({ drawn, reads: [root({ ...failure, fetchStatus: "fetching" })] }),
		{
			form: "failed",
			count: undefined,
			busy: true,
			stale: false,
			paused: false,
		},
	);
	assert.equal(
		frameOf({ drawn, reads: [root({ status: "error", error: "gone" })] }).form,
		"missing",
	);
});

test("a painted value is waiting, or still where the read is not asked for, and never busy", () => {
	const drawn = { painted: true, value: undefined };
	assert.deepEqual(frameOf({ drawn, reads: [root(pending)] }), {
		form: "waiting",
		count: undefined,
		busy: false,
		stale: false,
		paused: false,
	});
	assert.equal(
		frameOf({
			drawn,
			reads: [root({ ...pending, isEnabled: false, fetchStatus: "idle" })],
		}).form,
		"still",
	);
	assert.equal(frameOf({ drawn }).form, "waiting");
});

test("a real value is ready with its length, empty when it is null or holds nothing", () => {
	const real = (value: unknown) =>
		frameOf({ drawn: { painted: false, value } });
	const rest = { busy: false, stale: false, paused: false };
	assert.deepEqual(real([1, 2]), { form: "ready", count: 2, ...rest });
	assert.deepEqual(real([]), { form: "empty", count: 0, ...rest });
	assert.equal(real(null).form, "empty");
	assert.equal(real(undefined).form, "empty");
	assert.deepEqual(real({ a: 1 }), {
		form: "ready",
		count: undefined,
		...rest,
	});
	assert.equal(real(0).form, "ready");
});

test("a painted value stands still while its root is paused, and keeps the pause", () => {
	const drawn = { painted: true, value: undefined };
	const f = frameOf({
		drawn,
		reads: [root({ ...pending, fetchStatus: "paused" })],
	});
	assert.equal(f.form, "still");
	assert.equal(f.paused, true);
	assert.equal(f.busy, false);
	assert.equal(f.count, undefined);
});

test("a frame is stale when its root's refetch failed, paused when its root waits, neither for a selection", () => {
	const drawn = { painted: false, value: [1] };
	const stale = frameOf({
		drawn,
		reads: [root({ ...failure, isRefetchError: true })],
	});
	assert.equal(stale.form, "ready");
	assert.equal(stale.stale, true);
	const paused = frameOf({ drawn, reads: [root({ fetchStatus: "paused" })] });
	assert.equal(paused.form, "ready");
	assert.equal(paused.paused, true);
	const none = frameOf({ drawn });
	assert.equal(none.stale, false);
	assert.equal(none.paused, false);
});

test("an empty first page with more pages is not empty, and a list with more has no count", () => {
	assert.equal(
		frameOf({ drawn: { painted: false, value: [], more: true } }).form,
		"ready",
	);
	assert.equal(
		frameOf({ drawn: { painted: false, value: [], more: false } }).form,
		"empty",
	);
	assert.equal(
		frameOf({ drawn: { painted: false, value: null, more: true } }).form,
		"ready",
	);
	assert.equal(
		frameOf({ drawn: { painted: false, value: [1, 2], more: true } }).count,
		undefined,
	);
});

test("a next page fetching is not busy", () => {
	const fetchingMore = { fetchStatus: "fetching", fetchingMore: true } as const;
	assert.equal(readState(result(fetchingMore), never).busy, false);
	assert.equal(
		frameOf({
			drawn: { painted: false, value: [1] },
			reads: [root(fetchingMore)],
		}).busy,
		false,
	);
	assert.equal(
		readState(result({ fetchStatus: "fetching" }), never).busy,
		true,
	);
});

test("a streamed read is not busy while it writes", () => {
	const f = frameOf({
		drawn: { painted: false, value: [1] },
		reads: [root({ fetchStatus: "fetching", streamed: true })],
	});
	assert.equal(f.busy, false);
});

test("a turn waits for its first chunk, and none is drawn before it", () => {
	assert.deepEqual(turnOf({ reads: [root(pending)] }), {
		form: "waiting",
		value: undefined,
	});
	assert.equal(
		turnOf({
			drawn: { painted: true, value: undefined },
			reads: [root(pending)],
		}).form,
		"waiting",
	);
});

test("a turn writes while chunks arrive and is written once the stream settles", () => {
	const drawn = { painted: false, value: "Hel" };
	const writing = turnOf({
		drawn,
		reads: [root({ fetchStatus: "fetching", streamed: true })],
	});
	assert.deepEqual(writing, { form: "writing", value: "Hel" });
	assert.equal(
		turnOf({ drawn, reads: [root({ streamed: true })] }).form,
		"written",
	);
	assert.equal(turnOf({ drawn, reads: [root({})] }).form, "written");
});

test("a turn whose stream failed, or whose refresh did, is stopped with its partial value", () => {
	const drawn = { painted: false, value: "Hel" };
	assert.deepEqual(turnOf({ drawn, reads: [root(failure)] }), {
		form: "stopped",
		value: "Hel",
	});
	assert.equal(
		turnOf({ reads: [root({ status: "error", error: "gone" })] }).form,
		"stopped",
	);
	assert.equal(
		turnOf({ drawn, reads: [root({ ...failure, isRefetchError: true })] }).form,
		"stopped",
	);
});

test("a turn with no value, or a painted selection, is none; a real selection value is written", () => {
	assert.equal(turnOf({ drawn: { painted: false, value: null } }).form, "none");
	assert.equal(
		turnOf({ drawn: { painted: false, value: undefined }, reads: [root({})] })
			.form,
		"none",
	);
	assert.equal(turnOf({ drawn: { painted: true, value: "x" } }).form, "none");
	assert.deepEqual(turnOf({ drawn: { painted: false, value: "Hi" } }), {
		form: "written",
		value: "Hi",
	});
});

test("a frame over several reads draws the first one failed with no data", () => {
	const drawn = { painted: true, value: undefined };
	const f = frameOf({
		drawn,
		reads: [
			root({ fetchStatus: "fetching" }),
			root({ ...failure }),
			root({ status: "error", error: "gone" }),
		],
	});
	assert.equal(f.form, "failed");
	assert.equal(f.busy, true);
	const missing = frameOf({
		drawn,
		reads: [root({ status: "error", error: "gone" }), root({ ...failure })],
	});
	assert.equal(missing.form, "missing");
});

test("busy, stale and paused come from any held read", () => {
	const drawn = { painted: false, value: [1] };
	const f = frameOf({
		drawn,
		reads: [
			root({}),
			root({ fetchStatus: "fetching" }),
			root({ ...failure, isRefetchError: true }),
			root({ fetchStatus: "paused" }),
		],
	});
	assert.deepEqual(
		[f.form, f.busy, f.stale, f.paused],
		["ready", true, true, true],
	);
	const calm = frameOf({ drawn, reads: [root({}), root({})] });
	assert.deepEqual([calm.busy, calm.stale, calm.paused], [false, false, false]);
});

test("a frame over several reads stands still while any is idle or paused", () => {
	const drawn = { painted: true, value: undefined };
	assert.equal(
		frameOf({
			drawn,
			reads: [root(pending), root({ ...pending, isEnabled: false })],
		}).form,
		"still",
	);
	assert.equal(
		frameOf({ drawn, reads: [root(pending), root(pending)] }).form,
		"waiting",
	);
});

test("a frame's form comes from every read, its flags only from the held one", () => {
	const drawn = { painted: false, value: [1] };
	// Another frame holds the fetching, stale read: this frame draws neither flag.
	const above = frameOf({
		drawn,
		reads: [
			root({ fetchStatus: "fetching" }, false),
			root({ ...failure, isRefetchError: true }, false),
			root({}),
		],
	});
	assert.deepEqual(
		[above.form, above.busy, above.stale, above.paused],
		["ready", false, false, false],
	);
	// A read it does not hold still ends its form.
	const ended = frameOf({
		drawn: { painted: true, value: undefined },
		reads: [root({ ...failure }, false), root({ fetchStatus: "fetching" })],
	});
	assert.deepEqual([ended.form, ended.busy], ["failed", true]);
	assert.equal(
		frameOf({
			drawn: { painted: true, value: undefined },
			reads: [root({ ...pending, isEnabled: false }, false), root(pending)],
		}).form,
		"still",
	);
});
