import assert from "node:assert/strict";
import { test } from "node:test";
import { ORPCError } from "@orpc/client";
import {
	answer,
	asORPCError,
	channelAnswer,
	emptyOf,
	fixtureGaps,
	heldReads,
	holdCalls,
	release,
	type ScreenState,
	setStory,
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
	const tree = { flags: { get: () => "app" } };
	assert.equal(await call("flags/get", "error", tree), 500);
	assert.equal(await call("flags/get", "notFound", tree), 404);
	assert.equal(
		await call("flags/get", "error", { projects: app.projects }),
		200,
	);
});

test("the session read answers data in every forced state, whoever answers it", async () => {
	const tree = {
		auth: { session: () => ({ session: { activeOrganizationId: "o" } }) },
	};
	for (const state of ["loading", "error", "notFound", "empty"] as const) {
		assert.equal(await call("auth/session", state), 200, state);
		assert.equal(await call("auth/session", state, tree), 200, state);
	}
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

test("a record's date survives the empty answer on the wire, as a Date and as an ISO string", async () => {
	// The walker empties the record's collections and keeps the rest: a date the
	// page reads stays the date the fixture gave, never the epoch.
	const org = {
		createdAt: new Date("2026-03-04T00:00:00Z"),
		iso: "2026-03-04T00:00:00.000Z",
		members: [{ id: 1 }],
	};
	const response = await answer(
		new Request("http://x/rpc/org/get"),
		"/rpc",
		{ org: { get: () => org } },
		[],
		"empty",
	);
	const body = (await response.json()) as {
		json: { createdAt: string; iso: string; members: unknown[] };
		meta: unknown[];
	};
	assert.equal(body.json.createdAt, "2026-03-04T00:00:00.000Z");
	assert.deepEqual(body.meta, [[1, "createdAt"]]);
	assert.equal(body.json.iso, org.iso);
	assert.deepEqual(body.json.members, []);
});

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

// Another copy of `@orpc/client` (a version split in the app) is another class
// with the same fields, which `instanceof ORPCError` does not accept.
class ForeignORPCError extends Error {
	code = "NOT_FOUND";
	status = 404;
	defined = true;
	data = { id: 1 };
}

test("an ORPCError of this copy is kept as it is", () => {
	const error = new ORPCError("NOT_FOUND");
	assert.equal(asORPCError(error), error);
});

test("an ORPCError of another copy is rebuilt as this copy's", () => {
	const foreign = new ForeignORPCError("gone");
	assert.equal(foreign instanceof ORPCError, false);
	const error = asORPCError(foreign);
	assert.ok(error instanceof ORPCError);
	assert.equal(error.code, "NOT_FOUND");
	assert.equal(error.status, 404);
	assert.equal(error.defined, true);
	assert.equal(error.message, "gone");
	assert.deepEqual(error.data, { id: 1 });
});

test("an error with only a code, or no error at all, is no ORPCError", () => {
	assert.equal(
		asORPCError(Object.assign(new Error("x"), { code: "ENOENT" })),
		null,
	);
	assert.equal(asORPCError(new Error("x")), null);
	assert.equal(
		asORPCError({ code: "NOT_FOUND", status: 404, defined: true }),
		null,
	);
	assert.equal(asORPCError(null), null);
	assert.equal(asORPCError("NOT_FOUND"), null);
});

test("a fixture throwing another copy's error answers its status, not a gap", async () => {
	const tree = {
		projects: {
			get: () => {
				throw new ForeignORPCError("gone");
			},
		},
	};
	assert.equal(await call("projects/get", "data", tree), 404);
});

const kinds = {
	"projects.list": { kind: "query" },
	"projects.create": { kind: "mutation" },
} as const;
const post = async (path: string, state: ScreenState) => {
	const response = await answer(
		new Request(`http://x/rpc/${path}`, { method: "POST" }),
		"/rpc",
		{ projects: { list: () => [1], create: () => ({ id: 1 }) } },
		[],
		state,
		kinds,
	);
	return { status: response.status, body: await response.text() };
};

test("a POST to a query procedure takes the forced states", async () => {
	holdCalls();
	assert.equal((await post("projects/list", "error")).status, 500);
	assert.equal((await post("projects/list", "notFound")).status, 404);
	assert.match((await post("projects/list", "empty")).body, /\[\]/);
	const held = post("projects/list", "loading");
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.equal(heldReads(), 1);
	release();
	assert.equal((await held).status, 200);
});

test("a POST mutation always answers from its fixture", async () => {
	for (const state of ["loading", "error", "notFound", "empty"] as const) {
		const { status, body } = await post("projects/create", state);
		assert.equal(status, 200, state);
		assert.match(body, /"id"/);
	}
});

const missing = {
	projects: {
		get: () => {
			throw new ORPCError("NOT_FOUND");
		},
	},
};
const getProject = (state: ScreenState) =>
	answer(
		new Request(
			`http://x/rpc/projects/get?data=${encodeURIComponent(JSON.stringify({ json: { id: "p9" } }))}`,
		),
		"/rpc",
		missing,
		[],
		state,
	);

test("a read that lands not found in the data state is a gap naming the procedure and the param", async () => {
	holdCalls();
	setStory({
		channels: undefined,
		params: { id: "p9", other: "x" },
		state: "data",
	});
	assert.equal((await getProject("data")).status, 404);
	assert.deepEqual(fixtureGaps(), [
		'projects.get answered NOT_FOUND in the data state for the param id "p9": give the route an example value the procedure accepts, under its id in the params of src/app/fixtures.ts',
	]);
});

const refused = {
	projects: {
		get: () => {
			throw new ORPCError("CONFLICT", { message: "wrong kind" });
		},
	},
};
const getRefused = (state: ScreenState) =>
	answer(
		new Request(
			`http://x/rpc/projects/get?data=${encodeURIComponent(JSON.stringify({ json: { id: "p9" } }))}`,
		),
		"/rpc",
		refused,
		[],
		state,
	);

test("a read that is refused in the data state is a gap naming the procedure, the param and the code", async () => {
	holdCalls();
	setStory({ channels: undefined, params: { id: "p9" }, state: "data" });
	assert.equal((await getRefused("data")).status, 409);
	assert.deepEqual(fixtureGaps(), [
		'projects.get answered CONFLICT in the data state for the param id "p9": give the route an example value the procedure accepts, under its id in the params of src/app/fixtures.ts',
	]);
});

test("a refusal without a route param's value in its input, and the error state, are no gap", async () => {
	holdCalls();
	setStory({ channels: undefined, params: { id: "p1" }, state: "data" });
	assert.equal((await getRefused("data")).status, 409);
	assert.equal((await getRefused("error")).status, 500);
	assert.deepEqual(fixtureGaps(), []);
});

test("the not found state draws that form on purpose and is no gap", async () => {
	holdCalls();
	assert.equal((await getProject("notFound")).status, 404);
	assert.deepEqual(fixtureGaps(), []);
});

test("a not found read without a route param's value in its input is no gap", async () => {
	holdCalls();
	setStory({ channels: undefined, params: { id: "p1" }, state: "data" });
	assert.equal((await getProject("data")).status, 404);
	assert.deepEqual(fixtureGaps(), []);
});
