import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import { hashKey, skipToken } from "@tanstack/react-query";
import { isNotFound } from "./not-found.ts";

// The read handle: the options of one query plus how its failure reads as
// "not found", and `Selection`s that pick from one or several reads. Pure, so
// the hooks in `./tanstack-query.tsx` and the tests share one core. A leaf
// subscribes to a selection, paints it while its reads wait, and draws it once
// they land (`states.md` §2).

const SELECTION = Symbol.for("@fcalell/plugin-api/selection");
const PLACEHOLDER = Symbol.for("@fcalell/plugin-api/placeholder");

// One private-use character: a placeholder run through a template literal
// keeps a mark that `isPlaceholder` finds, where a bare string would be lost.
const WAITING_CHAR = "\uE000";

export interface Selection<T> {
	/** @internal */ readonly [SELECTION]: {
		readonly reads: readonly Read<unknown>[];
		// Per read, in order: used only through `or`, so it never paints, holds
		// or fails a frame.
		readonly quiet: readonly boolean[];
		// One datum and one "is real data" per read, in order.
		readonly pick: (data: readonly unknown[], real: readonly boolean[]) => T;
	};
	at<U>(fn: (value: T) => U): Selection<U>;
	/** Real data when its reads have it, `fallback` in every other state (waiting, idle, paused, failed, missing). It never paints, holds or fails a frame, and a read used only through it is quiet. For enrichments only (a name, a badge, a lane order, a link): a read whose rows, options, facts or text a component draws is never `or`. */
	or<F>(fallback: F): Selection<T | F>;
}

// How a read's query behaves: a plain `query`, an infinite one of stack's
// paginated envelope (`pages`), or one that stays fetching while it writes
// (`stream`: fetching with data is writing, not busy).
export type ReadKind = "query" | "pages" | "stream";

// A read is its own identity selection, so `List items={deploys}` takes a root.
export interface Read<T> extends Selection<T> {
	// No `select` and no `placeholderData`: a leaf adds its own.
	// biome-ignore lint/suspicious/noExplicitAny: a read of any output is one options type (variance)
	readonly options: UseQueryOptions<any, any, any, any>;
	readonly missing: (error: unknown) => boolean;
	readonly kind: ReadKind;
}

export interface ReadHow {
	missing?: (error: unknown) => boolean;
	kind?: ReadKind;
}

// A data prop's type: a constant, or a selection the leaf subscribes to.
export type Datum<T> = T | Selection<T>;

// What a leaf draws for one value: a constant or real data as given, or a
// selection with a read still to land, whose `value` is the placeholder's and
// whose `phase` says why. waiting: asked for, no answer. still: not asked for,
// or paused with no data, so nothing is coming (paints still, no sentence).
// failed, missing: the read ended (the failed sentence, `words.missing`).
export type DrawnPhase = "waiting" | "still" | "failed" | "missing";
export type Drawn<T> =
	| { readonly painted: false; readonly value: T }
	| {
			readonly painted: true;
			readonly value: unknown;
			readonly phase: DrawnPhase;
	  };

// The placeholder: the stand-in for data not yet there, shaped by nothing. It
// is every key of itself and callable, so a selector walks it to a value and
// takes its default branch (comparisons are false, lookups miss, `new Date`
// is the epoch, a number formats as 0, `map` and `filter` give it back).
// Nothing is frozen on the target (a frozen function would pin `name` and
// `length` against the traps); the traps refuse every write instead.
const NO_KEYS = new Set(["then", "toJSON", "$$typeof"]);
const emptyIterator = function* () {};
const toPrimitive = (hint: string) => (hint === "string" ? WAITING_CHAR : 0);

// biome-ignore lint/suspicious/noExplicitAny: the placeholder stands in for every type
const P: any = new Proxy(() => P, {
	get(_, key) {
		if (key === PLACEHOLDER) return true;
		if (key === Symbol.toPrimitive) return toPrimitive;
		if (key === Symbol.iterator) return emptyIterator;
		if (typeof key === "symbol" || NO_KEYS.has(key)) return undefined;
		return P;
	},
	apply: () => P,
	has: () => true,
	ownKeys: () => [],
	set: () => false,
	defineProperty: () => false,
	deleteProperty: () => false,
});

export function isPlaceholder(v: unknown): boolean {
	return v === P || (typeof v === "string" && v.includes(WAITING_CHAR));
}

// One constant function: TanStack compares a function `placeholderData` by
// identity between option sets.
export const placeholderData = (): unknown => P;

export function isSelection(v: unknown): v is Selection<unknown> {
	return typeof v === "object" && v !== null && SELECTION in v;
}

// A selector or `combine` function runs over the placeholder (a waiting slot
// picks over it, an idle or failed read's missing data included), so one that
// throws there is not a bug in the data: its slot is the placeholder, silently.
// Over real data the throw is the app's.
function guarded<T>(data: readonly unknown[], run: () => T): T {
	try {
		return run();
	} catch (error) {
		if (!data.some(isPlaceholder)) throw error;
		return P;
	}
}

function selection<T>(
	reads: readonly Read<unknown>[],
	quiet: readonly boolean[],
	pick: (data: readonly unknown[], real: readonly boolean[]) => T,
): Selection<T> {
	return {
		[SELECTION]: { reads, quiet, pick },
		at: (fn) =>
			selection(reads, quiet, (data, real) =>
				guarded(data, () => fn(pick(data, real))),
			),
		or: (fallback) =>
			selection(
				reads,
				reads.map(() => true),
				(data, real) => (real.every(Boolean) ? pick(data, real) : fallback),
			),
	};
}

// stack's paginated envelope, the one output a `pages` read is made over.
type Page = { data: unknown[]; nextCursor: string | null };
type Pages = { pages: readonly Page[] };

// More pages remain when the last one names a cursor. False over the
// placeholder and over no data.
export function moreOf(data: unknown): boolean {
	if (data === undefined || isPlaceholder(data)) return false;
	const last = (data as Pages).pages.at(-1);
	return last !== undefined && last.nextCursor != null;
}

// A pages read's value is the flat list, so `Pane read={deploys}` with
// `List items={deploys}` is the same idiom as a plain read. The placeholder
// stays itself, painted.
function flatten(data: unknown): unknown {
	if (data === undefined || isPlaceholder(data)) return data;
	return (data as Pages).pages.flatMap((page) => page.data);
}

export function read<T>(
	options: UseQueryOptions<T, unknown, T, QueryKey>,
	how: ReadHow = {},
): Read<T> {
	const kind = how.kind ?? "query";
	// A pages read's options are infinite ones. `_type` makes the query infinite
	// whichever observer creates it, a leaf's plain `useQueries` included (a
	// TanStack internal, since 5.100.2; `read.test.ts` pins it).
	// The identity selection holds the read itself, so its reads list closes the
	// loop once the read exists.
	const reads: Read<unknown>[] = [];
	const self: Read<T> = {
		...selection<T>(
			reads,
			[false],
			(data) => (kind === "pages" ? flatten(data[0]) : data[0]) as T,
		),
		options: kind === "pages" ? { ...options, _type: "infinite" } : options,
		missing: how.missing ?? isNotFound,
		kind,
	};
	reads.push(self);
	return self;
}

export function combine<const S extends readonly Selection<unknown>[], R>(
	selections: S,
	fn: (
		...values: {
			-readonly [K in keyof S]: S[K] extends Selection<infer T> ? T : never;
		}
	) => R,
): Selection<R> {
	const parts = selections.map((s) => s[SELECTION]);
	return selection(
		parts.flatMap((p) => p.reads),
		parts.flatMap((p) => p.quiet),
		(data, real) =>
			guarded(data, () => {
				let from = 0;
				const values = parts.map((p) => {
					const to = from + p.reads.length;
					const value = p.pick(data.slice(from, to), real.slice(from, to));
					from = to;
					return value;
				});
				return fn(...(values as never));
			}),
	);
}

// oRPC's utils are a proxy that makes a child on every string key, and a
// procedure's `queryOptions` is a function whose own keys are the child's. The
// wrapper follows the same shape: `read` and `pages` are functions that forward
// their keys to the child of that name, so a procedure called `read` or `pages`
// keeps its utils.
// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
export function withRead(target: any): any {
	// The cursor is the page param; the first page has none.
	const make = (key: "read" | "pages") => (input?: unknown) =>
		key === "read"
			? read(target.queryOptions({ input }))
			: read(
					target.infiniteOptions({
						input:
							input === skipToken
								? skipToken
								: (cursor: string | undefined) => ({
										...(input as object),
										cursor,
									}),
						initialPageParam: undefined,
						getNextPageParam: (last: Page) => last.nextCursor,
					}),
					{ kind: "pages" },
				);
	return new Proxy(target, {
		get(_, key) {
			if (key === "read" || key === "pages") {
				const child = withRead(Reflect.get(target, key));
				return new Proxy(make(key), { get: (_, k) => Reflect.get(child, k) });
			}
			const value = Reflect.get(target, key);
			if (typeof key !== "string") return value;
			return value !== null &&
				(typeof value === "object" || typeof value === "function")
				? withRead(value)
				: value;
		},
	});
}

// The pure core of both hooks. `reads` are the distinct queries the values
// need, deduped by key (two observers of one key in one `QueriesObserver` warn);
// `painted` are those some value uses plainly (the quiet ones are subscribed and
// nothing more); `draw` maps their results back onto the values, in order.
type SelectionResult = {
	data: unknown;
	isPlaceholderData: boolean;
	status: "pending" | "success" | "error";
	fetchStatus: "fetching" | "paused" | "idle";
	isEnabled: boolean;
	error: unknown;
};

const isReal = (r: SelectionResult) =>
	!r.isPlaceholderData && r.data !== undefined;

// Why a read has no data: it ended, nothing is coming, or the answer is.
function phaseOf(r: SelectionResult, read: Read<unknown>): DrawnPhase {
	if (r.status === "error") return read.missing(r.error) ? "missing" : "failed";
	return !r.isEnabled || r.fetchStatus === "paused" ? "still" : "waiting";
}

export function planSelections(values: readonly unknown[]): {
	reads: readonly Read<unknown>[];
	painted: readonly Read<unknown>[];
	draw: (results: readonly SelectionResult[]) => readonly Drawn<unknown>[];
} {
	const reads: Read<unknown>[] = [];
	const slots = new Map<string, number>();
	const slotOf = (r: Read<unknown>) => {
		const key = hashKey(r.options.queryKey);
		let slot = slots.get(key);
		if (slot === undefined) slot = reads.push(r) - 1;
		slots.set(key, slot);
		return slot;
	};
	const plan = values.map((v) =>
		isSelection(v)
			? { ...v[SELECTION], at: v[SELECTION].reads.map(slotOf) }
			: null,
	);
	const plain = new Set(
		plan.flatMap((p) => p?.at.filter((_, k) => !p.quiet[k]) ?? []),
	);

	return {
		reads,
		painted: reads.filter((_, slot) => plain.has(slot)),
		draw: (results) =>
			values.map((value, i) => {
				const p = plan[i];
				if (!p) return { painted: false, value };
				const inputs = p.at.map((slot) => results[slot] as SelectionResult);
				const real = inputs.map(isReal);
				// Only a read the selection uses plainly holds it back: a quiet one
				// that has no data gives its `or` fallback.
				const open = inputs.flatMap((_, k) =>
					p.quiet[k] || real[k] ? [] : [k],
				);
				if (open.length === 0) {
					return {
						painted: false,
						value: p.pick(
							inputs.map((r) => r.data),
							real,
						),
					};
				}
				const phases = open.map((k) =>
					phaseOf(inputs[k] as SelectionResult, p.reads[k] as Read<unknown>),
				);
				const ended = phases.find((x) => x === "failed" || x === "missing");
				// A waiting slot picks over the placeholder where a read has no data,
				// so a selector walks P and never meets `undefined`; a combine keeps
				// the real data of its other reads.
				return {
					painted: true,
					phase: ended ?? (phases.includes("still") ? "still" : "waiting"),
					value:
						p.pick(
							inputs.map((r) => r.data ?? P),
							real,
						) ?? P,
				};
			}),
	};
}

// `createQueryClient`'s default `retry`: one retry of a failure that may pass,
// none of a not-found, which is an answer and only delays the missing form.
export function retryOnce(failures: number, error: unknown): boolean {
	return !isNotFound(error) && failures < 1;
}

// A read, as against a selection of it.
export function isRead(v: unknown): v is Read<unknown> {
	return isSelection(v) && v[SELECTION].reads[0] === v;
}

// What a frame sees of its reads: ui-core's `Held`, written out structurally
// because plugin-api imports nothing from ui-core. `reads` are the frame's
// non-quiet reads, each with the fields of its result that `readState` reads:
// the frame's form comes from all of them, its busy, stale and paused flags
// only from the `held` one.
export interface HeldResult {
	status: "pending" | "success" | "error";
	fetchStatus: "fetching" | "paused" | "idle";
	isEnabled: boolean;
	isPlaceholderData: boolean;
	isRefetchError: boolean;
	error: unknown;
	hasNextPage?: boolean;
	// From the read's kind: it is written by a stream.
	streamed?: boolean;
	// An infinite read fetching its next page: not busy.
	fetchingMore?: boolean;
}

export interface Held {
	drawn?: { painted: boolean; value: unknown; more?: boolean };
	reads?: {
		result: HeldResult;
		missing: (error: unknown) => boolean;
		held: boolean;
	}[];
}

// The pure core of `useFrameRead`: the frame's selection planned like a leaf's,
// and `combine` deriving the frame's state from its reads. The form comes from
// every non-quiet read of the selection, held or not (a frame never reads its
// form off a context). `enclosing` is the query hashes the frames above it
// hold: the frame holds the first other non-quiet read, which draws its busy
// mark and its stale and paused line, so a nested frame draws those only for
// what its ancestors do not (a `combine` under a read-less Pane holds its read;
// an `x.at()` under a holder of `x` holds none). A frame holds at most one:
// `extra` are the further unheld ones, a mistake `holdReads` names in dev.
// `query` looks up a read's query in the cache: a plain observer's result says
// nothing of a next page being fetched, but the query's `fetchMeta` does.
export function planFrame<S>(
	selection: Selection<unknown> | undefined,
	derive: (held: Held) => S,
	query: (read: Read<unknown>) => { fetchMore?: boolean } | undefined,
	enclosing: Holds = NO_HOLDS,
): {
	reads: readonly Read<unknown>[];
	held: Read<unknown> | undefined;
	extra: readonly Read<unknown>[];
	combine: (results: readonly (SelectionResult & HeldResult)[]) => S;
} {
	const plan = planSelections(selection === undefined ? [] : [selection]);
	const [held, ...extra] = plan.painted.filter(
		(r) => !enclosing.has(hashKey(r.options.queryKey)),
	);
	return {
		reads: plan.reads,
		held,
		extra,
		combine: (results) => {
			const reads = plan.reads.flatMap((r, i) => {
				const result = results[i];
				if (!plan.painted.includes(r) || !result) return [];
				const forward = r.kind === "pages" && query(r)?.fetchMore === true;
				// A next page that failed is the collection's line (its more row), not
				// the read's: the frame holds the pages it has, so it is not stale.
				const nextFailed =
					forward && result.status === "error" && result.isRefetchError;
				return [
					{
						result: {
							...result,
							...(nextFailed && {
								status: "success" as const,
								isRefetchError: false,
								error: null,
							}),
							streamed: r.kind === "stream",
							hasNextPage: r.kind === "pages" && moreOf(result.data),
							fetchingMore: forward && result.fetchStatus === "fetching",
						},
						missing: r.missing,
						held: r === held,
					},
				];
			});
			return derive({
				...(selection !== undefined && {
					drawn: {
						...(plan.draw(results)[0] as Drawn<unknown>),
						more: plan.painted.some(
							(r) =>
								r.kind === "pages" &&
								moreOf(results[plan.reads.indexOf(r)]?.data),
						),
					},
				}),
				reads,
			});
		},
	};
}

// The datum's one read, when it is a pages read: the collection's more row
// fetches through it.
export function pagesOf(v: unknown): Read<unknown> | undefined {
	if (!isSelection(v)) return undefined;
	const reads = v[SELECTION].reads;
	return reads.length === 1 && reads[0]?.kind === "pages"
		? reads[0]
		: undefined;
}

// A draft's value follows its selection until the viewer edits it. `key` names
// the selection's reads, so an edit belongs to the data it was made over: a
// different read key drops it. A constant has no key, and its draft stays.
export interface Draft<T> {
	key: string | undefined;
	value: T;
}

// The reads a value draws from: none for a constant.
export function readsOf(v: unknown): readonly Read<unknown>[] {
	return isSelection(v) ? v[SELECTION].reads : [];
}

export function readKey(v: unknown): string | undefined {
	return isSelection(v)
		? v[SELECTION].reads.map((r) => hashKey(r.options.queryKey)).join("|")
		: undefined;
}

export function draftFor<T>(
	draft: Draft<T> | null,
	key: string | undefined,
): Draft<T> | null {
	return draft && draft.key === key ? draft : null;
}

// Dev-only counts, by query hash, of the frames that hold a read and the
// leaves that paint it. They exist to name one mistake at the moment it is
// made: a leaf painting a read that no frame holds, so its failure draws
// nowhere. A holder or painter registers in an effect and returns its release.
const holders = new Map<string, number>();
const painters = new Map<string, number>();
export const dev = () => process.env.NODE_ENV !== "production";

// What a frame publishes to its body: the hashes it and the frames around it
// hold. It places flags only (which frame draws a read's busy mark and its
// stale and paused line); no frame's form reads it.
export type Holds = ReadonlySet<string>;

// What a frame outside every frame sees: nothing held.
export const NO_HOLDS: Holds = new Set();

// Holds are interned by their joined keys, so frames over the same keys
// publish one identity and a context change re-renders nothing for them. The
// table is bounded: a clear only costs one re-render.
const interned = new Map<string, Holds>();
const INTERNED_MAX = 256;

export function holdsOf(
	enclosing: Holds,
	held: Read<unknown> | undefined,
): Holds {
	if (!held) return enclosing;
	const keys = [...enclosing, hashKey(held.options.queryKey)];
	const id = keys.join("|");
	let holds = interned.get(id);
	if (!holds) {
		if (interned.size >= INTERNED_MAX) interned.clear();
		holds = new Set(keys);
		interned.set(id, holds);
	}
	return holds;
}

function count(counts: Map<string, number>, keys: readonly string[]) {
	for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
	return () => {
		for (const key of keys) counts.set(key, (counts.get(key) ?? 1) - 1);
	};
}

// A frame holds one read. Given the frame's unheld non-quiet reads, the first is
// the one it holds, so each further one is a mistake named by both keys: its
// failure still draws (the form comes from every read) but its flags do not.
// Sibling frames over one read are no mistake; each holds and fails.
export function holdReads(reads: readonly Read<unknown>[]): () => void {
	if (!dev()) return () => {};
	const keys = reads.map((r) => hashKey(r.options.queryKey));
	for (const key of keys.slice(1)) {
		console.error(
			`A frame holds one read, and this one has a second: ${keys[0]} and ${key}. Give each read its own Pane, Section, Sheet or Form, or use \`or\` for a read that only names or orders.`,
		);
	}
	return count(holders, keys);
}

export function paintReads(reads: readonly Read<unknown>[]): () => void {
	if (!dev()) return () => {};
	return count(
		painters,
		reads.map((r) => hashKey(r.options.queryKey)),
	);
}

// A read that fails with no data while a leaf paints it and no frame holds it.
// `QueryProvider` runs this in dev, over the query cache. An ambient read
// (`meta: { ambient: true }`, the org rules) has no frame by design: its
// failure leaves what it gates painted and inert.
export function watchUnheld(cache: {
	subscribe: (
		listener: (event: {
			type: string;
			action?: { type: string };
			query: {
				queryHash: string;
				meta?: Record<string, unknown>;
				state: { data: unknown };
			};
		}) => void,
	) => () => void;
}): () => void {
	if (!dev()) return () => {};
	return cache.subscribe((event) => {
		const key = event.query.queryHash;
		if (
			event.type === "updated" &&
			event.action?.type === "error" &&
			event.query.meta?.["ambient"] !== true &&
			event.query.state.data === undefined &&
			(painters.get(key) ?? 0) > 0 &&
			(holders.get(key) ?? 0) === 0
		) {
			console.error(
				`The read ${key} failed and no frame holds it, so its failure draws nowhere. Give its Pane, Section, Sheet or Form \`read\`.`,
			);
		}
	});
}
