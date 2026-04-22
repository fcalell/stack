import type { ScaffoldSpec } from "#ast";
import type { AppConfig } from "#config";

// ── Slot identity and kinds ─────────────────────────────────────────

export type SlotKind<T> =
	| { type: "list"; sortBy?: (a: ItemOf<T>, b: ItemOf<T>) => number }
	| { type: "map" }
	| {
			type: "value";
			seed?: (ctx: ContributionCtx) => T | Promise<T>;
			override?: boolean;
	  }
	| {
			type: "derived";
			inputs: Record<string, Slot<unknown>>;
			compute: (
				inputs: Record<string, unknown>,
				ctx: ContributionCtx,
			) => T | Promise<T>;
	  };

export interface Slot<T> {
	readonly __brand: "slot";
	readonly id: symbol;
	readonly source: string;
	readonly name: string;
	readonly kind: SlotKind<T>;
	readonly _type?: T;
	contribute(
		fn: (
			ctx: ContributionCtx,
		) => ContributionValue<T> | Promise<ContributionValue<T>>,
	): Contribution<T>;
}

// Helper: the element type of an array slot (unused by non-list kinds).
type ItemOf<T> = T extends readonly (infer U)[] ? U : never;

// What a contribution fn may return per slot kind. undefined always skips.
export type ContributionValue<T> = T extends readonly (infer U)[]
	? U | U[] | undefined
	: T extends Record<string, infer V>
		? Record<string, V> | undefined
		: T | undefined;

// ── Contribution ────────────────────────────────────────────────────

export interface Contribution<T> {
	slot: Slot<T>;
	plugin: string;
	fn: (ctx: ContributionCtx) => unknown;
}

// ── ContributionCtx ─────────────────────────────────────────────────

export interface LogContext {
	info(msg: string): void;
	warn(msg: string): void;
	success(msg: string): void;
	error(msg: string): void;
}

export interface ContributionCtx {
	app: AppConfig;
	options: unknown;
	cwd: string;
	fileExists(path: string): Promise<boolean>;
	readFile(path: string): Promise<string>;
	log: LogContext;
	template(name: string): URL;
	scaffold(name: string, target: string): ScaffoldSpec;
	resolve<T>(slot: Slot<T>): Promise<T>;
}

// ── Errors ──────────────────────────────────────────────────────────

export class SlotError extends Error {
	constructor(
		message: string,
		public readonly code: string,
	) {
		super(message);
		this.name = "SlotError";
	}
}

export class SlotCycleError extends SlotError {
	constructor(public readonly cycle: string[]) {
		super(
			`Slot dependency cycle detected: ${cycle.join(" -> ")}. ` +
				`Break the cycle by removing one of the 'inputs' entries on a derived slot.`,
			"SLOT_CYCLE",
		);
		this.name = "SlotCycleError";
	}
}

export class SlotConflictError extends SlotError {
	constructor(
		public readonly slotName: string,
		public readonly key: string | null,
		public readonly contributors: string[],
	) {
		super(
			key === null
				? `Slot '${slotName}' received multiple contributions from ${contributors
						.map((c) => `'${c}'`)
						.join(
							", ",
						)}. value slots accept at most one contribution unless declared with override:true.`
				: `Slot '${slotName}' received duplicate key '${key}' from ${contributors
						.map((c) => `'${c}'`)
						.join(", ")}.`,
			"SLOT_CONFLICT",
		);
		this.name = "SlotConflictError";
	}
}

export class SlotResolutionError extends SlotError {
	constructor(
		message: string,
		public readonly slotName: string,
		public readonly plugin: string | null,
		public readonly cause: unknown,
	) {
		super(message, "SLOT_RESOLUTION");
		this.name = "SlotResolutionError";
		if (cause instanceof Error && cause.stack) {
			this.stack = cause.stack;
		}
	}
}

// ── Builders ────────────────────────────────────────────────────────

interface SlotIdentity {
	source: string;
	name: string;
}

interface ListOpts<T> extends SlotIdentity {
	sortBy?: (a: T, b: T) => number;
}

interface MapOpts extends SlotIdentity {}

interface ValueOpts<T> extends SlotIdentity {
	seed?: (ctx: ContributionCtx) => T | Promise<T>;
	override?: boolean;
}

type Resolved<S> = S extends Slot<infer T> ? T : never;

interface DerivedOpts<T, I extends Record<string, Slot<unknown>>>
	extends SlotIdentity {
	inputs: I;
	compute: (
		inputs: { [K in keyof I]: Resolved<I[K]> },
		ctx: ContributionCtx,
	) => T | Promise<T>;
}

function attachContribute<T>(base: Omit<Slot<T>, "contribute">): Slot<T> {
	const slot = base as Slot<T>;
	(slot as { contribute: Slot<T>["contribute"] }).contribute = (fn) => ({
		slot,
		// Plugin name is re-stamped by the plugin builder (Phase B) when the
		// contribution is attached to a plugin. For standalone use the string
		// is filled later by the graph builder from the slot's source or from
		// a plugin wrapper.
		plugin: "",
		fn: fn as (ctx: ContributionCtx) => unknown,
	});
	return slot;
}

function listSlot<T>(opts: ListOpts<T>): Slot<T[]> {
	return attachContribute<T[]>({
		__brand: "slot",
		id: Symbol(`${opts.source}:${opts.name}`),
		source: opts.source,
		name: opts.name,
		kind: {
			type: "list",
			sortBy: opts.sortBy as ((a: T, b: T) => number) | undefined,
		} as SlotKind<T[]>,
	});
}

function mapSlot<V>(opts: MapOpts): Slot<Record<string, V>> {
	return attachContribute<Record<string, V>>({
		__brand: "slot",
		id: Symbol(`${opts.source}:${opts.name}`),
		source: opts.source,
		name: opts.name,
		kind: { type: "map" },
	});
}

function valueSlot<T>(opts: ValueOpts<T>): Slot<T> {
	return attachContribute<T>({
		__brand: "slot",
		id: Symbol(`${opts.source}:${opts.name}`),
		source: opts.source,
		name: opts.name,
		kind: {
			type: "value",
			seed: opts.seed,
			override: opts.override ?? false,
		},
	});
}

function derivedSlot<T, I extends Record<string, Slot<unknown>>>(
	opts: DerivedOpts<T, I>,
): Slot<T> {
	return attachContribute<T>({
		__brand: "slot",
		id: Symbol(`${opts.source}:${opts.name}`),
		source: opts.source,
		name: opts.name,
		kind: {
			type: "derived",
			inputs: opts.inputs,
			compute: opts.compute as (
				inputs: Record<string, unknown>,
				ctx: ContributionCtx,
			) => T | Promise<T>,
		},
	});
}

export const slot = {
	list: listSlot,
	map: mapSlot,
	value: valueSlot,
	derived: derivedSlot,
};

// ── Composition ─────────────────────────────────────────────────────
//
// Compose raw contribution results into the slot's final value. Called by
// the graph resolver; kept here so slot-kind semantics live next to the
// type definitions.

interface ComposeArgs<T> {
	slot: Slot<T>;
	results: Array<{ plugin: string; value: unknown }>;
	seedValue: { present: true; value: T } | { present: false };
}

export function composeList<T>(
	s: Slot<T[]>,
	results: Array<{ plugin: string; value: unknown }>,
): T[] {
	const out: T[] = [];
	for (const { value } of results) {
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			for (const item of value) out.push(item as T);
		} else {
			out.push(value as T);
		}
	}
	const kind = s.kind as Extract<SlotKind<T[]>, { type: "list" }>;
	if (kind.sortBy) {
		// Stable sort via decorate-sort-undecorate so tie-breaking is deterministic.
		out
			.map((item, index) => ({ item, index }))
			.sort((a, b) => {
				const cmp = (kind.sortBy as unknown as (x: T, y: T) => number)(
					a.item,
					b.item,
				);
				return cmp !== 0 ? cmp : a.index - b.index;
			})
			.forEach((wrapped, i) => {
				out[i] = wrapped.item;
			});
	}
	return out;
}

export function composeMap<V>(
	s: Slot<Record<string, V>>,
	results: Array<{ plugin: string; value: unknown }>,
): Record<string, V> {
	const out: Record<string, V> = {};
	const owners = new Map<string, string>();
	for (const { plugin, value } of results) {
		if (value === undefined) continue;
		if (value === null || typeof value !== "object" || Array.isArray(value)) {
			throw new SlotError(
				`Slot '${s.source}:${s.name}' received a non-object contribution from '${plugin}'; map slots expect Record<string, V>.`,
				"SLOT_CONTRIBUTION_SHAPE",
			);
		}
		for (const [key, v] of Object.entries(value)) {
			if (key in out) {
				throw new SlotConflictError(`${s.source}:${s.name}`, key, [
					owners.get(key) ?? "(unknown)",
					plugin,
				]);
			}
			out[key] = v as V;
			owners.set(key, plugin);
		}
	}
	return out;
}

export function composeValue<T>({
	slot: s,
	results,
	seedValue,
}: ComposeArgs<T>): T {
	const kind = s.kind as Extract<SlotKind<T>, { type: "value" }>;
	const defined = results.filter((r) => r.value !== undefined);

	if (defined.length === 0) {
		if (seedValue.present) return seedValue.value;
		throw new SlotError(
			`Slot '${s.source}:${s.name}' has no seed and no contributions.`,
			"SLOT_UNSEEDED",
		);
	}

	if (defined.length > 1 && !kind.override) {
		throw new SlotConflictError(
			`${s.source}:${s.name}`,
			null,
			defined.map((d) => d.plugin),
		);
	}

	// Either single contribution, or override:true — last contribution wins.
	return defined[defined.length - 1]?.value as T;
}
