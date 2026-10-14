import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";
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
const WAITING_CHAR = "";

export interface Selection<T> {
	/** @internal */ readonly [SELECTION]: {
		readonly reads: readonly Read<unknown>[];
		// One datum per read, in order.
		readonly pick: (data: readonly unknown[]) => T;
	};
	at<U>(fn: (value: T) => U): Selection<U>;
}

// A read is its own identity selection, so `List items={deploys}` takes a root.
export interface Read<T> extends Selection<T> {
	// No `select` and no `placeholderData`: a leaf adds its own.
	// biome-ignore lint/suspicious/noExplicitAny: a read of any output is one options type (variance)
	readonly options: UseQueryOptions<any, any, any, any>;
	readonly missing: (error: unknown) => boolean;
}

// A data prop's type: a constant, or a selection the leaf subscribes to.
export type Datum<T> = T | Selection<T>;

// What a leaf draws for one value: a constant or real data as given, or a
// selection with a read still to land, whose `value` is the placeholder's.
export type Drawn<T> =
	| { readonly painted: false; readonly value: T }
	| { readonly painted: true; readonly value: unknown };

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

// A selector or `combine` function runs over the placeholder (and over an idle
// or failed read's `undefined`), so one that throws there is not a bug in the
// data: its slot is the placeholder, with a dev warning. Over real data the
// throw is the app's.
function guarded<T>(data: readonly unknown[], run: () => T): T {
	try {
		return run();
	} catch (error) {
		if (!data.some((d) => d === undefined || isPlaceholder(d))) throw error;
		if (process.env.NODE_ENV !== "production") {
			console.warn("A selector threw over a read that has no data yet", error);
		}
		return P;
	}
}

function selection<T>(
	reads: readonly Read<unknown>[],
	pick: (data: readonly unknown[]) => T,
): Selection<T> {
	return {
		[SELECTION]: { reads, pick },
		at: (fn) => selection(reads, (data) => guarded(data, () => fn(pick(data)))),
	};
}

export function read<T>(
	options: UseQueryOptions<T, unknown, T, QueryKey>,
	missing: (error: unknown) => boolean = isNotFound,
): Read<T> {
	// The identity selection holds the read itself, so its reads list closes the
	// loop once the read exists.
	const reads: Read<unknown>[] = [];
	const self: Read<T> = {
		...selection<T>(reads, (data) => data[0] as T),
		options,
		missing,
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
		(data) =>
			guarded(data, () => {
				let from = 0;
				const values = parts.map((p) => {
					const to = from + p.reads.length;
					const value = p.pick(data.slice(from, to));
					from = to;
					return value;
				});
				return fn(...(values as never));
			}),
	);
}

// oRPC's utils are a proxy that makes a child on every string key, and a
// procedure's `queryOptions` is a function whose own keys are the child's. The
// wrapper follows the same shape: `read` is a function that forwards its keys
// to the child named `read`, so a procedure called `read` keeps its utils.
// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
export function withRead(target: any): any {
	return new Proxy(target, {
		get(_, key) {
			if (key === "read") {
				const child = withRead(Reflect.get(target, key));
				return new Proxy(
					(input?: unknown) => read(target.queryOptions({ input })),
					{ get: (_, k) => Reflect.get(child, k) },
				);
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
// `draw` maps their results back onto the values, in order.
type Result = { data: unknown; isPlaceholderData: boolean };

export function planSelections(values: readonly unknown[]): {
	reads: readonly Read<unknown>[];
	draw: (results: readonly Result[]) => readonly Drawn<unknown>[];
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
			? { pick: v[SELECTION].pick, at: v[SELECTION].reads.map(slotOf) }
			: null,
	);

	return {
		reads,
		draw: (results) =>
			values.map((value, i) => {
				const p = plan[i];
				if (!p) return { painted: false, value };
				const inputs = p.at.map((slot) => results[slot] as Result);
				const data = inputs.map((r) => r.data);
				const waiting = inputs.some(
					(r) => r.isPlaceholderData || r.data === undefined,
				);
				return waiting
					? { painted: true, value: p.pick(data) ?? P }
					: { painted: false, value: p.pick(data) };
			}),
	};
}
