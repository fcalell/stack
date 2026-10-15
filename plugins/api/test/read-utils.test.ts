import assert from "node:assert/strict";
import { test } from "node:test";
import {
	createTanstackQueryUtils,
	OPERATION_CONTEXT_SYMBOL,
} from "@orpc/tanstack-query";
import {
	InfiniteQueryObserver,
	QueriesObserver,
	QueryClient,
	skipToken,
} from "@tanstack/react-query";
import { z } from "zod";
import { createClient, registerOperationContext } from "../src/client.ts";
import { createProcedure } from "../src/procedure.ts";
import {
	isPlaceholder,
	isSelection,
	placeholderData,
	planSelections,
	withRead,
} from "../src/read.ts";
import createWorker from "../src/worker/index.ts";

registerOperationContext(OPERATION_CONTEXT_SYMBOL);

// A result as the observer gives it, still to land or landed.
const PENDING = {
	isPlaceholderData: false,
	status: "pending" as const,
	fetchStatus: "fetching" as const,
	isEnabled: true,
	error: null,
};
const LANDED = {
	...PENDING,
	status: "success" as const,
	fetchStatus: "idle" as const,
};

const procedure = createProcedure<Record<string, unknown>>();
const routes = {
	deploys: {
		get: procedure()
			.input(z.object({ id: z.string() }))
			.query(async ({ input }) => ({ id: input.id, commit: "abc123" })),
		// A procedure named like the handle keeps its own utils.
		read: procedure().query(async () => ({ seen: true })),
		// Pages of one id each, chained by their cursor.
		list: procedure({ paginated: true })
			.input(z.object({ team: z.string() }))
			.query(async ({ input }) => {
				const n = Number(input.cursor ?? 0);
				return {
					data: [`${input.team}${n}`],
					nextCursor: n < 2 ? String(n + 1) : null,
				};
			}),
		// A procedure named like the handle keeps its own utils.
		pages: procedure().query(async () => ({ seen: true })),
		rename: procedure()
			.input(z.object({ id: z.string() }))
			.mutation(async () => ({ ok: true })),
	},
};

type Router = typeof routes;

function utils() {
	const worker = createWorker({ cors: ["https://app.test"] }).handler(routes);
	const client = createClient<Router>({
		url: "http://stack.test/rpc",
		fetch: (async (request: Request | string | URL, init?: RequestInit) =>
			worker.fetch(
				request instanceof Request ? request : new Request(request, init),
				{ STACK_QUIET: "1" },
				undefined,
			)) as typeof globalThis.fetch,
	});
	return withRead(createTanstackQueryUtils(client));
}

test("a procedure's read holds the options queryOptions builds", () => {
	const u = utils();
	const handle = u.deploys.get.read({ id: "d1" });
	const options = u.deploys.get.queryOptions({ input: { id: "d1" } });
	assert.equal(isSelection(handle), true);
	assert.deepEqual(
		Object.keys(handle.options).sort(),
		Object.keys(options).sort(),
	);
	assert.deepEqual(handle.options.queryKey, options.queryKey);
});

test("a read answers through the client", async () => {
	const u = utils();
	const data = await new QueryClient().fetchQuery(
		u.deploys.get.read({ id: "d1" }).options,
	);
	assert.deepEqual(data, { id: "d1", commit: "abc123" });
});

test("a skipToken input makes an idle read", () => {
	const handle = utils().deploys.get.read(skipToken);
	assert.equal(handle.options.enabled, false);
});

test("the rest of the utils pass through", () => {
	const u = utils();
	assert.deepEqual(
		u.deploys.get.queryKey({ input: { id: "d1" } }),
		u.deploys.get.read({ id: "d1" }).options.queryKey,
	);
	assert.equal(
		typeof u.deploys.rename.mutationOptions().mutationFn,
		"function",
	);
	assert.deepEqual(
		u.deploys.rename.mutationKey(),
		utils().deploys.rename.mutationKey(),
	);
});

test("a procedure named read keeps its own utils and its own read", async () => {
	const u = utils();
	assert.equal(typeof u.deploys.read.queryOptions, "function");
	assert.equal(typeof u.deploys.read.mutationOptions, "function");
	const handle = u.deploys.read.read();
	assert.deepEqual(handle.options.queryKey, u.deploys.read.queryKey());
	assert.deepEqual(await new QueryClient().fetchQuery(handle.options), {
		seen: true,
	});
});

// What a leaf draws for the read over this raw data.
function flat(handle: unknown, raw: unknown) {
	return planSelections([handle]).draw([{ ...LANDED, data: raw }])[0]?.value;
}

test("a pages read keys as oRPC's infinite query and is built infinite", async () => {
	const u = utils();
	const handle = u.deploys.list.pages({ team: "a" });
	assert.deepEqual(
		handle.options.queryKey,
		u.deploys.list.infiniteKey({
			input: (cursor: string | undefined) => ({ team: "a", cursor }),
			initialPageParam: undefined,
		}),
	);
	// `_type` is the TanStack internal that makes the query infinite whichever
	// observer creates it. A leaf's plain `useQueries` is a QueriesObserver.
	assert.equal(handle.options._type, "infinite");
	const client = new QueryClient();
	const observer = new QueriesObserver(client, [
		{ ...handle.options, placeholderData },
	]);
	const stop = observer.subscribe(() => {});
	await client.getQueryCache().find({ queryKey: handle.options.queryKey })
		?.promise;
	const query = client
		.getQueryCache()
		.find({ queryKey: handle.options.queryKey });
	assert.equal(query?.queryType, "infinite");
	assert.deepEqual(query?.state.data, {
		pages: [{ data: ["a0"], nextCursor: "1" }],
		pageParams: [undefined],
	});
	stop();
});

test("a pages read's value is the flat list and a next page extends it", async () => {
	const u = utils();
	const handle = u.deploys.list.pages({ team: "a" });
	const client = new QueryClient();
	const more = new InfiniteQueryObserver(client, {
		...handle.options,
		enabled: false,
	});
	const stop = more.subscribe(() => {});
	// Mounting an `enabled: false` observer fetches nothing.
	assert.equal(
		client.getQueryState(handle.options.queryKey)?.fetchStatus,
		"idle",
	);
	await client.fetchQuery(handle.options);
	await more.fetchNextPage();
	const raw = client.getQueryData(handle.options.queryKey);
	assert.deepEqual(flat(handle, raw), ["a0", "a1"]);
	await more.fetchNextPage();
	assert.equal(more.getCurrentResult().hasNextPage, false);
	stop();
});

test("a pages read over the placeholder stays painted", () => {
	const handle = utils().deploys.list.pages({ team: "a" });
	const [drawn] = planSelections([handle]).draw([
		{ ...PENDING, data: placeholderData(), isPlaceholderData: true },
	]);
	assert.equal(drawn?.painted, true);
	assert.equal(isPlaceholder(drawn?.value), true);
});

test("a skipToken pages read is idle, and a procedure named pages keeps its utils", async () => {
	const u = utils();
	assert.equal(u.deploys.list.pages(skipToken).options.enabled, false);
	assert.equal(typeof u.deploys.pages.queryOptions, "function");
	assert.deepEqual(
		await new QueryClient().fetchQuery(u.deploys.pages.read().options),
		{ seen: true },
	);
});
