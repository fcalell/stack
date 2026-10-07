import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createClient,
	registerOperationContext,
} from "@fcalell/plugin-api/client";
import { ORPCError } from "@orpc/client";
import {
	answer,
	emptyOf,
	findFixture,
	mustBeMocked,
	procedurePath,
	type ScreenState,
} from "../src/ui/answer.ts";

const projects = [
	{ id: "p1", name: "Acme" },
	{ id: "p2", name: "Beta" },
];

const tree = {
	projects: {
		list: () => projects,
		get: (input: { id: string }) => projects.find((p) => p.id === input.id),
		page: () => ({ data: projects, nextCursor: "c1" }),
		create: (input: { name: string }) => ({ id: "p3", name: input.name }),
		boom: () => {
			throw new Error("the fixture broke");
		},
		gone: () => {
			throw new ORPCError("NOT_FOUND");
		},
	},
	session: () => ({ user: null }),
};

// The real stack client on the real wire, its `fetch` answered by the fixtures.
// oRPC's TanStack Query utils tag each call's context with its operation type
// under a symbol; a call here is tagged the same way under one the client is
// told of, as `createApiQueryUtils` tells it, and plugin-api's own tests drive
// the real utils.
const OPERATION = Symbol("operation context");
registerOperationContext(OPERATION);
type Options = { context: object };
const operation = (type: "query" | "mutation"): Options => ({
	context: { [OPERATION]: { type, key: [] } },
});
const asQuery = operation("query");
const asMutation = operation("mutation");

type Client = {
	projects: {
		list: (input?: unknown, options?: Options) => Promise<unknown>;
		get: (input: { id: string }, options?: Options) => Promise<unknown>;
		page: (input?: unknown, options?: Options) => Promise<unknown>;
		create: (input: { name: string }, options?: Options) => Promise<unknown>;
		boom: (input?: unknown, options?: Options) => Promise<unknown>;
		gone: (input?: unknown, options?: Options) => Promise<unknown>;
		missing: (input?: unknown, options?: Options) => Promise<unknown>;
	};
};
function client(state: ScreenState): Client {
	return createClient<unknown>({
		url: "http://localhost:6006/rpc",
		fetch: (input, init) =>
			answer(new Request(input, init), "/rpc", tree, state),
	}) as unknown as Client;
}

async function failure(
	call: Promise<unknown>,
): Promise<ORPCError<string, unknown>> {
	try {
		await call;
	} catch (error) {
		assert.ok(error instanceof ORPCError, String(error));
		return error;
	}
	throw new Error("the call answered");
}

test("data answers the fixture's value, called with the input", async () => {
	const api = client("data");
	assert.deepEqual(await api.projects.list(undefined, asQuery), projects);
	assert.deepEqual(await api.projects.get({ id: "p2" }, asQuery), projects[1]);
	assert.deepEqual(await api.projects.create({ name: "Gamma" }, asMutation), {
		id: "p3",
		name: "Gamma",
	});
});

test("error answers an internal server error", async () => {
	const error = await failure(
		client("error").projects.list(undefined, asQuery),
	);
	assert.equal(error.code, "INTERNAL_SERVER_ERROR");
	assert.equal(error.status, 500);
});

test("not found answers stack's NOT_FOUND", async () => {
	const error = await failure(
		client("notFound").projects.list(undefined, asQuery),
	);
	assert.equal(error.code, "NOT_FOUND");
	assert.equal(error.status, 404);
});

test("a forced state applies to a query and never to a mutation", async () => {
	for (const state of ["error", "notFound", "empty"] as const) {
		const api = client(state);
		const created = { id: "p3", name: "Gamma" };
		if (state !== "empty") await failure(api.projects.list(undefined, asQuery));
		assert.deepEqual(
			await api.projects.create({ name: "Gamma" }, asMutation),
			created,
			state,
		);
		// A call outside TanStack Query is a POST too.
		assert.deepEqual(await api.projects.create({ name: "Gamma" }), created);
	}
});

test("a mutation under a forced state with no fixture answers which one is missing", async () => {
	const link = client("error");
	const error = await failure(link.projects.missing(undefined, asMutation));
	assert.equal(error.code, "NOT_IMPLEMENTED");
	assert.equal(error.message, "no fixture for projects.missing");
});

test("loading never settles a query, and a mutation still settles", async () => {
	const settled = Symbol("settled");
	const race = (method: string) =>
		Promise.race([
			answer(
				new Request("http://localhost:6006/rpc/projects/list", { method }),
				"/rpc",
				tree,
				"loading",
			),
			new Promise((resolve) => setTimeout(() => resolve(settled), 50)),
		]);
	assert.equal(await race("GET"), settled);
	assert.notEqual(await race("POST"), settled);
});

test("empty answers a collection with none, a page with no rows, and a record as it is", async () => {
	const api = client("empty");
	assert.deepEqual(await api.projects.list(undefined, asQuery), []);
	assert.deepEqual(await api.projects.page(undefined, asQuery), {
		data: [],
		nextCursor: null,
	});
	assert.deepEqual(await api.projects.get({ id: "p1" }, asQuery), projects[0]);
});

test("a procedure without a fixture answers which one is missing", async () => {
	const error = await failure(
		client("data").projects.missing(undefined, asQuery),
	);
	assert.equal(error.code, "NOT_IMPLEMENTED");
	assert.equal(error.message, "no fixture for projects.missing");
});

test("a fixture that throws answers its own error, or an internal one", async () => {
	const api = client("data");
	assert.equal(
		(await failure(api.projects.gone(undefined, asQuery))).code,
		"NOT_FOUND",
	);
	const error = await failure(api.projects.boom(undefined, asQuery));
	assert.equal(error.code, "INTERNAL_SERVER_ERROR");
	assert.equal(error.message, "the fixture broke");
});

test("a query's input rides the query string, a mutation's the body", async () => {
	const seen: string[] = [];
	const api = createClient<unknown>({
		url: "http://localhost:6006/rpc",
		fetch: (input, init) => {
			const request = new Request(input, init);
			seen.push(`${request.method} ${new URL(request.url).search.slice(0, 6)}`);
			return answer(request, "/rpc", tree, "data");
		},
	}) as unknown as Client;
	await api.projects.get({ id: "p1" }, asQuery);
	await api.projects.create({ name: "Gamma" }, asMutation);
	assert.deepEqual(seen, ["GET ?data=", "POST "]);
});

test("a fixture is found by its path under the router", () => {
	assert.equal(findFixture(tree, ["projects", "list"]), tree.projects.list);
	assert.equal(findFixture(tree, ["session"]), tree.session);
	assert.equal(findFixture(tree, ["projects"]), undefined);
	assert.equal(findFixture(tree, ["projects", "nope"]), undefined);
	assert.equal(findFixture(tree, ["a", "b"]), undefined);
	assert.equal(findFixture(undefined, ["projects", "list"]), undefined);
});

test("empty is derived from the value alone", () => {
	assert.deepEqual(emptyOf([1, 2]), []);
	assert.deepEqual(emptyOf({ data: [1], nextCursor: null }), {
		data: [],
		nextCursor: null,
	});
	assert.deepEqual(emptyOf({ data: [1], total: 1, nextCursor: "x" }), {
		data: [],
		total: 1,
		nextCursor: null,
	});
	// A record has no empty form, and neither has `{ data }` that is no page.
	assert.deepEqual(emptyOf({ id: "p1" }), { id: "p1" });
	assert.deepEqual(emptyOf({ data: [1] }), { data: [1] });
	assert.equal(emptyOf(null), null);
	assert.equal(emptyOf("text"), "text");
});

test("the procedure is the path after the prefix", () => {
	assert.deepEqual(
		procedurePath("http://localhost:6006/rpc/projects/list", "/rpc"),
		["projects", "list"],
	);
	assert.deepEqual(
		procedurePath("http://localhost:6006/rpc/projects/list?data=1", "/rpc"),
		["projects", "list"],
	);
	assert.deepEqual(procedurePath("http://x.test/app/rpc/a%20b/c", "/rpc"), [
		"a b",
		"c",
	]);
});

test("only a request that must be mocked is refused", () => {
	const origin = "http://localhost:6006";
	const prefixes = ["/rpc", "/api/auth"];
	assert.equal(
		mustBeMocked("https://example.com/x.json", origin, prefixes),
		true,
	);
	assert.equal(
		mustBeMocked(`${origin}/rpc/projects/list`, origin, prefixes),
		true,
	);
	assert.equal(
		mustBeMocked(`${origin}/api/auth/get-session`, origin, prefixes),
		true,
	);
	assert.equal(mustBeMocked(`${origin}/rpc`, origin, prefixes), true);
	assert.equal(
		mustBeMocked(`${origin}/src/app/x.tsx`, origin, prefixes),
		false,
	);
	assert.equal(mustBeMocked(`${origin}/rpcs/x`, origin, prefixes), false);
});
