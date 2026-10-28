import { fallbackORPCErrorMessage, ORPCError } from "@orpc/client";
import {
	hashKey,
	type MutationCache,
	onlineManager,
	type QueryCache,
	type QueryClient,
} from "@tanstack/react-query";
import { dev, type Read } from "./read.ts";

// What an act is made of, apart from how it is drawn: the sentence a refusal
// reads as, whether an `onAct` hands back its promise so the act can hold it,
// and the run and save logic the hooks in `./tanstack-query.tsx` wrap. Pure
// (or over the caches it is given), so the tests share one core with the hooks.

// The server's own message as a sentence: capitalised, one closing stop (a
// question or an exclamation keeps its own).
function asSentence(message: string): string {
	const body = `${message.charAt(0).toUpperCase()}${message.slice(1).replace(/[.\s]*$/, "")}`;
	return /[?!]$/.test(body) ? body : `${body}.`;
}

// One thing a procedure's input schema refused: the schema's own message as a
// sentence, and the path of the value it refused (`["address", "city"]`, empty
// for the input as a whole).
export interface Issue {
	path: readonly (string | number)[];
	message: string;
}

// A standard-schema issue's path segment is a key or `{ key }`.
function segment(step: unknown): string | number {
	const key =
		typeof step === "object" && step !== null && "key" in step
			? (step as { key: unknown }).key
			: step;
	return typeof key === "number" ? key : String(key);
}

/** What the server's input schema refused: each issue's message and path from a `BAD_REQUEST` that failed validation, in the schema's order; none for any other error. A `FormField` says its own: `issues(error).find((i) => i.path[0] === "name")?.message`. */
export function issues(error: unknown): Issue[] {
	if (!(error instanceof ORPCError) || error.code !== "BAD_REQUEST") return [];
	const { data } = error;
	if (typeof data !== "object" || data === null || !("issues" in data)) {
		return [];
	}
	const listed = (data as { issues: unknown }).issues;
	if (!Array.isArray(listed)) return [];
	return listed.flatMap((item: unknown) => {
		if (typeof item !== "object" || item === null) return [];
		const { message, path } = item as { message?: unknown; path?: unknown };
		if (typeof message !== "string" || message.trim() === "") return [];
		return [
			{
				path: Array.isArray(path) ? path.map(segment) : [],
				message: asSentence(message.trim()),
			},
		];
	});
}

// A refusal the server worded for the viewer: a 4xx whose message the
// procedure chose, or, for an input its schema refused, the schema's first
// issue (its other issues are `issues`, each for its field). Sign-in,
// permission, a missing record and a rate limit have their own screens or
// words, and a code's stock text says nothing the act's own sentence does not.
export function refusal(error: unknown): string | undefined {
	if (!(error instanceof ORPCError)) return undefined;
	const { status, code, message } = error;
	if (status < 400 || status >= 500) return undefined;
	if ([401, 403, 404, 429].includes(status)) return undefined;
	const [first] = issues(error);
	if (first) return first.message;
	if (!message || message === fallbackORPCErrorMessage(code, undefined)) {
		return undefined;
	}
	return asSentence(message);
}

// Whether a failed act is worth running again as it stands: a server that
// answered with a refusal (a 4xx: the input, the record's state, sign-in or
// permission) answers the same way to the same act, so its toast offers no
// Retry; a timeout, a rate limit, a fault on the server (5xx) or a request
// that never got an answer may go through the next time. A connection known
// to be out (`Unreached`) is the offline banner's to say.
export function retries(error: unknown): boolean {
	if (error instanceof Unreached) return false;
	if (!(error instanceof ORPCError)) return true;
	const { status } = error;
	if (status === 408 || status === 429) return true;
	return status < 400 || status >= 500;
}

export function isThenable(v: unknown): v is PromiseLike<unknown> {
	return (
		(typeof v === "object" || typeof v === "function") &&
		v !== null &&
		typeof (v as { then?: unknown }).then === "function"
	);
}

// The mutation caches `watchActs` watches, which `heldAct` looks in.
const watched = new Set<MutationCache>();

// An act's `onAct`, called. In dev it names a mutation the call started
// without returning a promise: `mutate()` in place of `return mutateAsync()`,
// so the act could not hold it and would read as done at once. A mutation is
// built in the cache synchronously, so one added during the call is the act's.
export function heldAct(onAct: () => unknown): unknown {
	if (!dev() || watched.size === 0) return onAct();
	const before = [...watched].map((cache) => ({
		cache,
		seen: new Set(cache.getAll()),
	}));
	const result = onAct();
	if (isThenable(result)) return result;
	for (const { cache, seen } of before) {
		for (const mutation of cache.getAll()) {
			if (seen.has(mutation)) continue;
			console.error(
				`The act started the mutation ${nameOf(mutation)} and returned no promise. Return mutateAsync's promise so the act holds it.`,
			);
		}
	}
	return result;
}

function nameOf(mutation: { options: { mutationKey?: readonly unknown[] } }) {
	const key = mutation.options.mutationKey;
	return key ? hashKey(key) : "(no mutation key)";
}

// Rejections a host drew (a line, a toast, a field's error): the dev check
// below stays quiet for them. Only objects can be marked.
const drawn = new WeakSet<object>();

export function drew(error: unknown): void {
	if (dev() && typeof error === "object" && error !== null) drawn.add(error);
}

// A mutation that failed with no host to draw it and no `onError` of its own
// is a failure nobody sees. A host marks the rejection it drew with `drew`
// within the microtasks after it rejects, so one macrotask is the wait.
// `QueryProvider` runs this in dev, over the mutation cache.
export function watchActs(cache: MutationCache): () => void {
	if (!dev()) return () => {};
	watched.add(cache);
	const stop = cache.subscribe((event) => {
		if (event.type !== "updated" || event.action.type !== "error") return;
		if (event.mutation.options.onError !== undefined) return;
		const error = event.action.error;
		setTimeout(() => {
			if (typeof error === "object" && error !== null && drawn.has(error)) {
				return;
			}
			console.error(
				`The mutation ${nameOf(event.mutation)} failed and nothing drew its failure. Return mutateAsync's promise from an act, or give the mutation an onError.`,
			);
		}, 0);
	});
	return () => {
		watched.delete(cache);
		stop();
	};
}

export interface RunState<K> {
	pending?: K;
	failure?: { key: K; error: unknown };
}

// One act's run: pending from the press until its promise settles, its
// rejection kept as the failure until the next run. `latest` says whether this
// run is still the newest, and only the newest's outcome counts. A sync throw
// clears the state and rethrows; a result that is no promise is done at once.
export function startRun<K>(
	key: K,
	onAct: () => unknown,
	latest: () => boolean,
	set: (state: RunState<K>) => void,
): void {
	let result: unknown;
	try {
		result = heldAct(onAct);
	} catch (error) {
		set({});
		throw error;
	}
	if (!isThenable(result)) {
		set({});
		return;
	}
	set({ pending: key });
	result.then(
		() => {
			if (latest()) set({});
		},
		(error) => {
			// The host's line draws the newest failure; a superseded one is moot.
			drew(error);
			if (latest()) set({ failure: { key, error } });
		},
	);
}

// The query cache's fetches of these reads are over. A save's invalidation
// starts the refetch synchronously in the mutation's `onSuccess`, before the
// save's promise resolves, so a read idle at that moment is not being
// refreshed. A stream stays fetching while it writes and would never end.
export function whenSettled(
	cache: QueryCache,
	reads: readonly Read<unknown>[],
): Promise<void> {
	const watching = reads.filter((r) => r.kind !== "stream");
	const busy = () =>
		watching.some((r) => {
			const query = cache.find({ queryKey: r.options.queryKey, exact: true });
			return query !== undefined && query.state.fetchStatus !== "idle";
		});
	if (!busy()) return Promise.resolve();
	return new Promise((resolve) => {
		const stop = cache.subscribe(() => {
			if (busy()) return;
			stop();
			resolve();
		});
	});
}

// What happens to a control's held value when its save settles. Only the
// latest save counts: a resolved one releases once its reads' refetch is over
// (and only if nothing was edited meanwhile), a rejected one rolls back.
export function holdSave(
	save: PromiseLike<unknown>,
	reads: readonly Read<unknown>[],
	cache: QueryCache,
	to: {
		latest: () => boolean;
		release: () => void;
		rollback: (error: unknown) => void;
	},
): void {
	save.then(
		() =>
			whenSettled(cache, reads).then(() => {
				if (to.latest()) to.release();
			}),
		(error) => {
			if (to.latest()) to.rollback(error);
			else drew(error);
		},
	);
}

// What a read's `meta.reach` answers about its value: whether the server is
// out of reach.
export type Reach = (data: unknown) => boolean;

// An act refused before it was sent because the server is out of reach. The
// host draws it as any failed press, the generic sentence with no Retry; the
// connection's own sentence is the app's offline banner.
export class Unreached extends Error {
	constructor() {
		super("The server is out of reach.");
		this.name = "Unreached";
	}
}

// The mutation cache's `onMutate`: nothing queues for a connection that is not
// there. While the browser is offline, or a cached read's `meta.reach` says
// the server is out (a socket lost), the mutation fails before any fetch with
// `Unreached`, so it never pauses and never fires later. `createQueryClient`
// runs it; a caller-supplied `mutationCache` must call it too.
export function guardReach(client: QueryClient): void {
	if (!onlineManager.isOnline()) throw new Unreached();
	for (const query of client.getQueryCache().getAll()) {
		const reach = query.meta?.reach as Reach | undefined;
		if (reach === undefined || query.state.data === undefined) continue;
		if (reach(query.state.data)) throw new Unreached();
	}
}
