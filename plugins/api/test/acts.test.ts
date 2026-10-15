import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { ORPCError } from "@orpc/client";
import {
	MutationCache,
	MutationObserver,
	QueryClient,
	QueryObserver,
} from "@tanstack/react-query";
import { drew, heldAct, isThenable, refusal, watchActs } from "../src/acts.ts";

const tick = () => new Promise<void>((r) => setTimeout(r, 5));

test("refusal is the procedure's own message as a sentence", () => {
	const cases: [ConstructorParameters<typeof ORPCError>, string | undefined][] =
		[
			[["BAD_REQUEST", { message: "name is taken" }], "Name is taken."],
			[["CONFLICT", { message: "Already running." }], "Already running."],
			[["UNPROCESSABLE_CONTENT", { message: "Why not?" }], "Why not?"],
			// Custom code: no stock text to compare to.
			[["OUT_OF_STOCK", { message: "sold out", status: 409 }], "Sold out."],
			// The code's stock text says nothing the act's own sentence does not.
			[["BAD_REQUEST"], undefined],
			[["BAD_REQUEST", { message: "Bad Request" }], undefined],
			// Screens and words of their own.
			[["UNAUTHORIZED", { message: "sign in" }], undefined],
			[["FORBIDDEN", { message: "not yours" }], undefined],
			[["NOT_FOUND", { message: "no such deploy" }], undefined],
			[["TOO_MANY_REQUESTS", { message: "slow down" }], undefined],
			// Not a refusal of the viewer's.
			[["INTERNAL_SERVER_ERROR", { message: "db down" }], undefined],
			[["SERVICE_UNAVAILABLE", { message: "later" }], undefined],
		];
	for (const [args, sentence] of cases) {
		assert.equal(refusal(new ORPCError(...args)), sentence, String(args[0]));
	}
	assert.equal(refusal(new Error("boom")), undefined);
	assert.equal(refusal("text"), undefined);
	assert.equal(refusal(undefined), undefined);
});

test("isThenable", () => {
	assert.equal(isThenable(Promise.resolve()), true);
	// biome-ignore lint/suspicious/noThenProperty: a thenable that is no promise
	assert.equal(isThenable({ then() {} }), true);
	assert.equal(isThenable({}), false);
	assert.equal(isThenable(null), false);
	assert.equal(isThenable(undefined), false);
	assert.equal(
		isThenable(() => {}),
		false,
	);
});

function client() {
	return new QueryClient({
		mutationCache: new MutationCache(),
		defaultOptions: { mutations: { retry: false } },
	});
}

test("TanStack: a mutation is in the cache as soon as mutate is called", () => {
	const c = client();
	const observer = new MutationObserver(c, {
		mutationKey: ["probe"],
		mutationFn: async () => 1,
	});
	assert.equal(c.getMutationCache().getAll().length, 0);
	void observer.mutate().catch(() => {});
	assert.equal(c.getMutationCache().getAll().length, 1);
});

test("an act that starts a mutation and returns no promise is named", async () => {
	const error = mock.method(console, "error", () => {});
	const c = client();
	const stop = watchActs(c.getMutationCache());
	const start = (key: string) =>
		new MutationObserver(c, {
			mutationKey: [key],
			mutationFn: async () => 1,
		});

	// mutate() returns a promise the act does not return.
	heldAct(() => void start("stop-job").mutate());
	assert.equal(error.mock.callCount(), 1);
	assert.match(String(error.mock.calls[0]?.arguments[0]), /stop-job/);
	assert.match(String(error.mock.calls[0]?.arguments[0]), /mutateAsync/);

	// Returned, it is held; no mutation, nothing to name.
	const returned = heldAct(() => start("kept").mutate());
	assert.equal(isThenable(returned), true);
	assert.equal(
		heldAct(() => "plain"),
		"plain",
	);
	assert.equal(error.mock.callCount(), 1);
	await tick();
	stop();
	// Unwatched, nothing is looked for.
	heldAct(() => void start("after").mutate());
	assert.equal(error.mock.callCount(), 1);
	error.mock.restore();
});

test("TanStack: a failed mutation is announced as an error action with its error", async () => {
	const c = client();
	const events: { type: string; action?: string; error?: unknown }[] = [];
	const stop = c.getMutationCache().subscribe((event) => {
		events.push({
			type: event.type,
			...(event.type === "updated"
				? {
						action: event.action.type,
						error:
							event.action.type === "error" ? event.action.error : undefined,
					}
				: {}),
		});
	});
	const boom = new Error("boom");
	await new MutationObserver(c, {
		mutationFn: async () => {
			throw boom;
		},
	})
		.mutate()
		.catch(() => {});
	await tick();
	stop();
	assert.ok(events.some((e) => e.action === "error" && e.error === boom));
});

test("a failure nothing drew is reported; drawn, or with onError, it is not", async () => {
	const error = mock.method(console, "error", () => {});
	const c = client();
	const stop = watchActs(c.getMutationCache());
	const fail = (options: { mutationKey: string[]; onError?: () => void }) => {
		const e = new Error(options.mutationKey[0]);
		const result = new MutationObserver(c, {
			...options,
			mutationFn: async () => {
				throw e;
			},
		}).mutate();
		return { e, result };
	};

	const undrawn = fail({ mutationKey: ["undrawn"] });
	await undrawn.result.catch(() => {});
	await tick();
	assert.equal(error.mock.callCount(), 1);
	assert.match(String(error.mock.calls[0]?.arguments[0]), /undrawn/);

	// A host marks the rejection in the microtasks after it rejects.
	const marked = fail({ mutationKey: ["drawn"] });
	await marked.result.catch((e) => drew(e));
	await tick();

	// A mutation that handles its own failure.
	await fail({ mutationKey: ["handled"], onError: () => {} }).result.catch(
		() => {},
	);
	await tick();
	assert.equal(error.mock.callCount(), 1);
	stop();
	error.mock.restore();
});

test("TanStack: invalidation in the cache's onSuccess has started the refetch when mutateAsync resolves", async () => {
	let fetches = 0;
	const c = new QueryClient({
		mutationCache: new MutationCache({
			onSuccess: () => {
				void c.invalidateQueries({ queryKey: ["list"] });
			},
		}),
	});
	// Invalidation refetches the queries something observes, and only those.
	const observer = new QueryObserver(c, {
		queryKey: ["list"],
		queryFn: async () => {
			fetches += 1;
			await tick();
			return fetches;
		},
	});
	const stop = observer.subscribe(() => {});
	await tick();
	await tick();
	const query = c.getQueryCache().find({ queryKey: ["list"] });
	assert.equal(query?.state.fetchStatus, "idle");
	await new MutationObserver(c, { mutationFn: async () => 1 }).mutate();
	assert.equal(query?.state.fetchStatus, "fetching");
	await tick();
	await tick();
	assert.equal(query?.state.fetchStatus, "idle");
	stop();
	assert.equal(fetches, 2);
});
