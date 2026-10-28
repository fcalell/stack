import type {
	Query,
	QueryCache,
	QueryClient,
	QueryFunctionContext,
	QueryKey,
	UseQueryOptions,
} from "@tanstack/react-query";
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

// Whether a leaf draws its paint: while its read waits (or stands still). A
// leaf whose read ended draws its loaded-empty form instead, no line for a
// text and nothing for a mark; the frame that holds the read says why, once.
export function paints(drawn: Drawn<unknown>): boolean {
	return (
		drawn.painted && (drawn.phase === "waiting" || drawn.phase === "still")
	);
}

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

// Two constant functions: TanStack compares a function `placeholderData` by
// identity between option sets, and the dev check reads them back off a
// query's observers. `placeholderData` marks an observer as a painter (a leaf
// that draws the read), `heldPlaceholder` as a holder (a frame, or a leaf that
// draws the failure itself). Both return the placeholder.
export const placeholderData = (): unknown => P;
export const heldPlaceholder = (): unknown => P;

// The sample: the placeholder, except that a list's search finds its one
// record (`find`, `filter`, a copy or a sort gives the sample back), mapping
// it maps that record once (`map`, `flatMap`) and iterating it yields it, so a
// selector that finds a group and maps its rows reaches one row. It stands
// only inside `sampleOf`, which hands out no part of it.
type Each = (value: unknown, index: number, list: unknown) => unknown;
const SAMPLE_LIST: Record<string, (fn?: unknown) => unknown> = {
	map: (fn) => [(fn as Each)(S, 0, S)],
	flatMap: (fn) => [(fn as Each)(S, 0, S)].flat(),
	find: () => S,
	filter: () => S,
	slice: () => S,
	sort: () => S,
	toSorted: () => S,
	reverse: () => S,
	concat: () => S,
};
const sampleIterator = function* () {
	yield S;
};
// biome-ignore lint/suspicious/noExplicitAny: the sample stands in for every type
const S: any = new Proxy(() => S, {
	get(_, key) {
		if (key === PLACEHOLDER) return true;
		if (key === Symbol.toPrimitive) return toPrimitive;
		if (key === Symbol.iterator) return sampleIterator;
		if (typeof key === "symbol" || NO_KEYS.has(key)) return undefined;
		return SAMPLE_LIST[key] ?? S;
	},
	apply: () => S,
	has: () => true,
	ownKeys: () => [],
	set: () => false,
	defineProperty: () => false,
	deleteProperty: () => false,
});

// One item as a list selection draws it, for the waiting form's shape: the
// selection's pick run over the sample, a record whose lists hold one record,
// so a selector that maps each record (`list.map(toRow)`, a group's rows found
// first or not) gives the slots a loaded item fills (a leading mark, a
// trailing value), each value it took from the record the empty string.
// Undefined where the selection reads more than one read, its selector throws
// over the sample, or it gives no list of one item.
export function sampleOf<T>(
	v: Selection<readonly T[]>,
): Exclude<T, undefined> | undefined {
	const { reads, pick } = v[SELECTION];
	if (reads.length !== 1) return undefined;
	try {
		const value: unknown = pick([S], [false]);
		if (!Array.isArray(value) || value.length !== 1) return undefined;
		const [one] = value;
		if (one === undefined || one === null || one === S || isPlaceholder(one))
			return undefined;
		return slotted(one) as Exclude<T, undefined>;
	} catch {
		return undefined;
	}
}

// A sample's placeholder values as the empty string, through its plain objects
// and arrays: a slot that is there, with nothing in it.
function slotted(v: unknown): unknown {
	if (v === S || isPlaceholder(v)) return "";
	if (Array.isArray(v)) return v.map(slotted);
	if (
		typeof v === "object" &&
		v !== null &&
		Object.getPrototypeOf(v) === Object.prototype
	)
		return Object.fromEntries(
			Object.entries(v).map(([key, value]) => [key, slotted(value)]),
		);
	return v;
}

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

// A selection is never a plain object: TanStack's structural sharing
// (`replaceEqualDeep`, run over every `combine` result) rebuilds a changed
// plain object from its string keys, which drops `SELECTION`; an object on a
// prototype of its own passes through whole.
const SELECTION_PROTOTYPE = {};

function selection<T>(
	reads: readonly Read<unknown>[],
	quiet: readonly boolean[],
	pick: (data: readonly unknown[], real: readonly boolean[]) => T,
): Selection<T> {
	return Object.assign(Object.create(SELECTION_PROTOTYPE) as Selection<T>, {
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
	} satisfies Partial<Selection<T>>);
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

// What a first load's data waits for (ms), from the client's default query
// `meta.hold` that `QueryProvider` sets; 0 with none set.
export function holdOf(client: QueryClient, elapsed: number): number {
	const hold = client.getDefaultOptions().queries?.meta?.hold;
	return typeof hold === "function"
		? (hold as (e: number) => number)(elapsed)
		: 0;
}

// A client the app supplied takes the hold beside its own defaults, merged by
// hand: `setDefaultOptions` replaces them all.
export function withHold(
	client: QueryClient,
	hold: ((elapsed: number) => number) | undefined,
): QueryClient {
	const defaults = client.getDefaultOptions();
	if (hold && defaults.queries?.meta?.hold !== hold) {
		client.setDefaultOptions({
			...defaults,
			queries: {
				...defaults.queries,
				meta: { ...defaults.queries?.meta, hold },
			},
		});
	}
	return client;
}

// A first load's data resolves no earlier than the minimum hold allows. Only
// this read's own write waits (never TanStack's scheduler), a refetch or a
// later page is not held, and a cancelled fetch is let go at once: TanStack
// ignores what it settles.
function held<F extends (...args: never[]) => unknown>(queryFn: F): F {
	return (async (ctx: QueryFunctionContext) => {
		const first = ctx.client.getQueryData(ctx.queryKey) === undefined;
		const start = Date.now();
		const data = await queryFn(ctx as never);
		if (!first) return data;
		const wait = holdOf(ctx.client, Date.now() - start);
		if (wait <= 0 || ctx.signal.aborted) return data;
		await new Promise<void>((done) => {
			const timer = setTimeout(finish, wait);
			function finish(): void {
				clearTimeout(timer);
				ctx.signal.removeEventListener("abort", finish);
				done();
			}
			ctx.signal.addEventListener("abort", finish);
		});
		return data;
	}) as unknown as F;
}

// Whether a query belongs to a stream read (a channel read, the connection):
// it stays fetching for as long as it is subscribed, so it is not a load.
export const isStreamQuery = (query: { meta?: Record<string, unknown> }) =>
	query.meta?.stream === true;

// The error type is the options' own: oRPC's `queryOptions` names its `Error`,
// and a `refetchInterval` callback typed on it would not fit `unknown`.
export function read<T, E = unknown>(
	options: UseQueryOptions<T, E, T, QueryKey>,
	how: ReadHow = {},
): Read<T> {
	const kind = how.kind ?? "query";
	// A stream is not a load: its first write is the channel's own to hold.
	const queryFn = options.queryFn;
	// Its query carries `meta.stream`, the one marker of a read that stays
	// fetching while it is subscribed (`isStreamQuery`).
	const own =
		kind === "stream"
			? { ...options, meta: { ...options.meta, stream: true } }
			: typeof queryFn === "function"
				? { ...options, queryFn: held(queryFn) }
				: options;
	// A pages read's options are infinite ones. `_type` makes the query infinite
	// whichever observer creates it, a leaf's plain `useQueries` included (a
	// TanStack internal, since 5.100.2).
	// The identity selection holds the read itself, so its reads list closes the
	// loop once the read exists.
	const reads: Read<unknown>[] = [];
	const queryOptions: Read<T>["options"] =
		kind === "pages" ? { ...own, _type: "infinite" } : own;
	// Assigned onto the selection, so the read keeps its prototype.
	const self: Read<T> = Object.assign(
		selection<T>(
			reads,
			[false],
			(data) => (kind === "pages" ? flatten(data[0]) : data[0]) as T,
		),
		{ options: queryOptions, missing: how.missing ?? isNotFound, kind },
	);
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
// nothing more); `queries` are the observers' options, the painted ones given
// `placeholder` (a quiet read carries none, so the dev check never counts it);
// `draw` maps their results back onto the values, in order.
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

type ObserverOptions = Read<unknown>["options"];

export function planSelections(values: readonly unknown[]): {
	reads: readonly Read<unknown>[];
	painted: readonly Read<unknown>[];
	queries: (placeholder: () => unknown) => ObserverOptions[];
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
		queries: (placeholder) =>
			reads.map((r, slot) =>
				plain.has(slot)
					? { ...r.options, placeholderData: placeholder }
					: r.options,
			),
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
	// The observers' options: every painted read carries `heldPlaceholder`, so
	// the frame is a holder of each in the dev check, not a painter.
	queries: ObserverOptions[];
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
		queries: plan.queries(heldPlaceholder),
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

// Dev checks read the query cache's own observers: a leaf that draws a read is
// an observer whose `placeholderData` is `placeholderData`, a frame (or a leaf
// that draws the failure itself) one whose is `heldPlaceholder`.
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

// A frame holds one read. Given the frame's unheld non-quiet reads, the first is
// the one it holds, so each further one is a mistake named by both keys: its
// failure still draws (the form comes from every read) but its flags do not.
// Sibling frames over one read are no mistake; each holds and fails.
export function holdReads(reads: readonly Read<unknown>[]): void {
	if (!dev()) return;
	const keys = reads.map((r) => hashKey(r.options.queryKey));
	for (const key of keys.slice(1)) {
		console.error(
			`A frame holds one read, and this one has a second: ${keys[0]} and ${key}. Give each read its own Pane, Section, Sheet or Form, or use \`or\` for a read that only names or orders.`,
		);
	}
}

// A read that fails with no data while a leaf paints it and no frame holds it.
// `QueryProvider` runs this in dev, over the query cache. Level-triggered: the
// cache's error event says it, and so do its observer events over a read
// already failed (a painter arriving, a holder leaving), judged against the
// query's own observers one tick later so the holders that mount in the same
// commit count. A failure is named once. An ambient read (`meta: { ambient:
// true }`, the org rules) has no frame by design: its failure leaves what it
// gates painted and inert.
export function watchUnheld(cache: QueryCache): () => void {
	if (!dev()) return () => {};
	const named = new Map<string, number>();
	const tagged = (query: Query, tag: () => unknown) =>
		query.observers.some((o) => o.options.placeholderData === tag);
	const report = (query: Query) => {
		const key = query.queryHash;
		if (
			query.state.status !== "error" ||
			query.meta?.ambient === true ||
			query.state.data !== undefined ||
			!tagged(query, placeholderData) ||
			tagged(query, heldPlaceholder) ||
			named.get(key) === query.state.errorUpdatedAt
		) {
			return;
		}
		named.set(key, query.state.errorUpdatedAt);
		console.error(
			`The read ${key} failed and no frame holds it, so its failure draws nowhere. Give its Pane, Section, Sheet or Form \`read\`.`,
		);
	};
	let stopped = false;
	const unsubscribe = cache.subscribe((event) => {
		if (event.type === "updated" && event.action.type === "error") {
			report(event.query);
		} else if (
			event.type === "observerAdded" ||
			event.type === "observerRemoved"
		) {
			const hash = event.query.queryHash;
			setTimeout(() => {
				const query = stopped ? undefined : cache.get(hash);
				if (query) report(query);
			}, 0);
		}
	});
	return () => {
		stopped = true;
		unsubscribe();
	};
}
