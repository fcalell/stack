import assert from "node:assert/strict";
import { test } from "node:test";
import {
	answer,
	channelAnswer,
	emptyOf,
	fixtureGaps,
	heldReads,
	holdCalls,
	release,
	type ScreenState,
} from "./answer.ts";

test("an array answers []", () => {
	assert.deepEqual(emptyOf([1, 2]), []);
});

test("a page keeps its envelope with no rows", () => {
	assert.deepEqual(emptyOf({ data: [1], nextCursor: "c", total: 3 }), {
		data: [],
		nextCursor: null,
		total: 3,
	});
});

test("a record has every top-level array emptied and the rest kept", () => {
	assert.deepEqual(
		emptyOf({ standardId: "s", pages: [1], conflicts: [2, 3], count: 4 }),
		{ standardId: "s", pages: [], conflicts: [], count: 4 },
	);
});

test("a nested record is walked, its arrays emptied", () => {
	const nested = { inner: { rows: [1], n: 2 }, list: [{ rows: [1] }] };
	assert.deepEqual(emptyOf(nested), { inner: { rows: [], n: 2 }, list: [] });
});

test("a JSON Schema has its properties and required emptied", () => {
	const schema = {
		type: "object",
		properties: { a: { type: "string" }, b: { type: "number" } },
		required: ["a"],
		title: "t",
	};
	assert.deepEqual(emptyOf({ id: "s", schema }), {
		id: "s",
		schema: { type: "object", properties: {}, required: [], title: "t" },
	});
});

test("a struct of records is kept", () => {
	const counts = { staging: { passing: 1 }, production: { passing: 2 } };
	assert.deepEqual(emptyOf({ counts }), { counts });
});

test("an object with properties but no type object is kept", () => {
	const loose = { properties: { a: { x: 1 } }, name: "n" };
	assert.deepEqual(emptyOf(loose), loose);
});

test("a value that is no object answers as it is", () => {
	assert.equal(emptyOf(null), null);
	assert.equal(emptyOf("x"), "x");
});

const app = {
	projects: { list: () => [1, 2] },
	auth: { session: () => "app" },
};
const plugin = { auth: { session: () => "plugin" }, flags: { get: () => "f" } };
const call = async (path: string, state: ScreenState, tree: unknown = app) => {
	const response = await answer(
		new Request(`http://x/rpc/${path}`),
		"/rpc",
		tree,
		[plugin],
		state,
	);
	return response.status;
};

test("a plugin-owned procedure answers data in every forced state", async () => {
	for (const state of ["loading", "error", "notFound", "empty"] as const)
		assert.equal(await call("flags/get", state), 200, state);
});

test("a loading query is held and counted until release, a call answered at once is not", async () => {
	holdCalls();
	const held = call("projects/list", "loading");
	const answered = await Promise.all([
		call("flags/get", "loading"),
		answer(
			new Request("http://x/rpc/projects/list", { method: "POST" }),
			"/rpc",
			app,
			[plugin],
			"loading",
		).then((response) => response.status),
	]);
	assert.deepEqual(answered, [200, 200]);
	assert.equal(heldReads(), 1);
	release();
	assert.equal(await held, 200);
	assert.equal(heldReads(), 0);
});

test("a new hold forgets the calls of the last story", async () => {
	holdCalls();
	void call("projects/list", "loading");
	await Promise.resolve();
	assert.equal(heldReads(), 1);
	holdCalls();
	assert.equal(heldReads(), 0);
	release();
});

test("an app-owned procedure follows the forced state", async () => {
	assert.equal(await call("projects/list", "data"), 200);
	assert.equal(await call("projects/list", "error"), 500);
	assert.equal(await call("projects/list", "notFound"), 404);
});

test("an app override of a plugin procedure follows the forced state", async () => {
	assert.equal(await call("auth/session", "error"), 500);
	assert.equal(await call("auth/session", "notFound"), 404);
	assert.equal(
		await call("auth/session", "error", { projects: app.projects }),
		200,
	);
});

test("the scope lookup and the org rules answer data in every forced state, from the app's tree too", async () => {
	const tree = {
		auth: {
			scope: { project: { bySlug: () => "p" } },
			orgRules: () => "r",
			organization: { list: () => [1] },
		},
	};
	for (const state of ["loading", "error", "notFound", "empty"] as const) {
		assert.equal(await call("auth/scope/project/bySlug", state, tree), 200);
		assert.equal(await call("auth/orgRules", state, tree), 200);
	}
	assert.equal(await call("auth/organization/list", "error", tree), 500);
});

test("a Date or a class instance is a value and stays", () => {
	const at = new Date(0);
	const map = new Map([[1, 2]]);
	const out = emptyOf({ at, map, rows: [1] }) as Record<string, unknown>;
	assert.equal(out.at, at);
	assert.equal(out.map, map);
	assert.deepEqual(out.rows, []);
});

const inbox = { items: [{ id: 1 }], unread: 1 };
const channels = { inbox: () => inbox };

test("a channel's subscribe answers the snapshot frame the client decodes", async () => {
	assert.deepEqual(await channelAnswer("inbox", channels, {}, "data"), {
		send: { t: "msg", ch: "inbox", type: "snapshot", payload: inbox },
	});
	assert.deepEqual(await channelAnswer("inbox", channels, {}, "notFound"), {
		send: { t: "msg", ch: "inbox", type: "snapshot", payload: inbox },
	});
});

test("a channel fixture takes the route params", async () => {
	const answered = await channelAnswer(
		"room",
		{ room: (params) => params },
		{ roomId: "r1" },
		"data",
	);
	assert.deepEqual(answered.send?.payload, { roomId: "r1" });
});

test("an empty channel snapshot is emptied by the same rule", async () => {
	const answered = await channelAnswer("inbox", channels, {}, "empty");
	assert.deepEqual(answered.send?.payload, { items: [], unread: 1 });
});

test("an error closes the socket and sends no frame", async () => {
	assert.deepEqual(await channelAnswer("inbox", channels, {}, "error"), {
		close: true,
	});
});

test("loading holds the frame until release", async () => {
	holdCalls();
	let settled = false;
	const held = channelAnswer("inbox", channels, {}, "loading").then((a) => {
		settled = true;
		return a;
	});
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.equal(settled, false);
	release();
	assert.deepEqual((await held).send?.payload, inbox);
});

test("a channel with no fixture sends nothing and is a gap", async () => {
	holdCalls();
	const errors: unknown[] = [];
	const log = console.error;
	console.error = (...args: unknown[]) => errors.push(args);
	try {
		assert.deepEqual(await channelAnswer("chat", channels, {}, "data"), {
			close: false,
		});
		await channelAnswer("chat", channels, {}, "data");
	} finally {
		console.error = log;
	}
	assert.deepEqual(fixtureGaps(), ["no fixture for channel chat"]);
	assert.deepEqual(errors, [["no fixture for channel chat"]]);
});

test("a channel fixture that throws is a gap", async () => {
	holdCalls();
	const log = console.error;
	console.error = () => {};
	try {
		const boom = {
			inbox: () => {
				throw new Error("boom");
			},
		};
		assert.deepEqual(await channelAnswer("inbox", boom, {}, "data"), {
			close: false,
		});
	} finally {
		console.error = log;
	}
	assert.deepEqual(fixtureGaps(), [
		"the fixture for channel inbox threw: boom",
	]);
});

test("a fixture naming a message sends that frame, emptied by its payload", async () => {
	const status = { sync: () => ({ type: "status", payload: { ok: [1] } }) };
	assert.deepEqual(await channelAnswer("sync", status, {}, "data"), {
		send: { t: "msg", ch: "sync", type: "status", payload: { ok: [1] } },
	});
	const emptied = await channelAnswer("sync", status, {}, "empty");
	assert.deepEqual(emptied.send, {
		t: "msg",
		ch: "sync",
		type: "status",
		payload: { ok: [] },
	});
});

test("a bare payload still sends snapshot", async () => {
	const answered = await channelAnswer("inbox", channels, {}, "data");
	assert.equal(answered.send?.type, "snapshot");
});
