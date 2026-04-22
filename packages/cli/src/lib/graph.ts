import type { ScaffoldSpec } from "#ast";
import type { AppConfig } from "#config";
import {
	type Contribution,
	type ContributionCtx,
	composeList,
	composeMap,
	composeValue,
	type LogContext,
	type Slot,
	SlotCycleError,
	SlotError,
	SlotResolutionError,
} from "#lib/slots";

// ── Plugin shape consumed by buildGraph ─────────────────────────────
//
// Minimal structural slice; the Phase B `plugin()` factory produces a
// richer object — buildGraph only needs name + slots + contributions.

export interface GraphPlugin {
	name: string;
	options?: unknown;
	slots?: Record<string, Slot<unknown>>;
	contributes?: Contribution<unknown>[];
}

// ── Context injected by the caller ──────────────────────────────────
//
// Everything on ContributionCtx except `resolve` (the graph provides that).
// The caller returns a per-plugin ctx so each contribution sees its own
// plugin's `options`, `fileExists`, etc.

export interface GraphCtxFactory {
	app: AppConfig;
	cwd: string;
	log: LogContext;
	ctxForPlugin(pluginName: string): {
		options: unknown;
		fileExists(path: string): Promise<boolean>;
		readFile(path: string): Promise<string>;
		template(name: string): URL;
		scaffold(name: string, target: string): ScaffoldSpec;
	};
}

export interface Graph {
	resolve<T>(slot: Slot<T>): Promise<T>;
	resolveMany<S extends readonly Slot<unknown>[]>(
		slots: S,
	): Promise<{ [K in keyof S]: S[K] extends Slot<infer T> ? T : never }>;
}

// ── buildGraph ──────────────────────────────────────────────────────

export function buildGraph(
	plugins: readonly GraphPlugin[],
	ctxFactory: GraphCtxFactory,
): Graph {
	// Collect every slot declared by any plugin.
	const slotById = new Map<symbol, Slot<unknown>>();
	const slotOwner = new Map<symbol, string>();
	for (const plugin of plugins) {
		if (!plugin.slots) continue;
		for (const s of Object.values(plugin.slots)) {
			if (slotById.has(s.id)) continue;
			slotById.set(s.id, s);
			slotOwner.set(s.id, plugin.name);
		}
	}

	// Collect contributions keyed by slot id. Auto-stamp plugin name from the
	// contributing plugin (overrides whatever the builder put there).
	const contributions = new Map<symbol, Contribution<unknown>[]>();
	for (const plugin of plugins) {
		const list = plugin.contributes ?? [];
		for (const raw of list) {
			const slot = raw.slot;
			if (slot.kind.type === "derived") {
				throw new SlotError(
					`Plugin '${plugin.name}' contributed to derived slot '${slot.source}:${slot.name}'; derived slots compute from inputs and cannot receive contributions.`,
					"SLOT_DERIVED_CONTRIBUTION",
				);
			}
			if (!slotById.has(slot.id)) {
				slotById.set(slot.id, slot);
				slotOwner.set(slot.id, slot.source);
			}
			const stamped: Contribution<unknown> = {
				slot,
				plugin: plugin.name,
				fn: raw.fn,
			};
			const bucket = contributions.get(slot.id) ?? [];
			bucket.push(stamped);
			contributions.set(slot.id, bucket);
		}
	}

	// Validate derived slot inputs and detect cycles up-front via 3-color DFS.
	// This mirrors the pattern in discovery.ts:132-174.
	detectCycles(slotById);

	// Memoized resolve. Stored as the Promise so parallel callers share it
	// and each slot's compute/contributions fire exactly once.
	const cache = new Map<symbol, Promise<unknown>>();

	const graph: Graph = {
		resolve<T>(target: Slot<T>): Promise<T> {
			return resolveSlot(target) as Promise<T>;
		},
		resolveMany: (async (slots) =>
			Promise.all(slots.map((s) => resolveSlot(s)))) as Graph["resolveMany"],
	};

	function makeCtx(pluginName: string): ContributionCtx {
		const plug = ctxFactory.ctxForPlugin(pluginName);
		return {
			app: ctxFactory.app,
			options: plug.options,
			cwd: ctxFactory.cwd,
			log: ctxFactory.log,
			fileExists: plug.fileExists,
			readFile: plug.readFile,
			template: plug.template,
			scaffold: plug.scaffold,
			resolve: <U>(s: Slot<U>) => graph.resolve(s),
		};
	}

	function resolveSlot<T>(s: Slot<T>): Promise<T> {
		const hit = cache.get(s.id) as Promise<T> | undefined;
		if (hit) return hit;
		// Register the slot if a contribution referenced one that no plugin
		// declared — still fine, it's just owned by its `source`.
		if (!slotById.has(s.id)) {
			slotById.set(s.id, s);
			if (!slotOwner.has(s.id)) slotOwner.set(s.id, s.source);
		}
		const promise = computeSlot(s);
		cache.set(s.id, promise);
		return promise;
	}

	async function computeSlot<T>(s: Slot<T>): Promise<T> {
		const kind = s.kind;
		if (kind.type === "derived") {
			const entries = Object.entries(kind.inputs);
			const values = await Promise.all(
				entries.map(([, input]) => resolveSlot(input)),
			);
			const inputs: Record<string, unknown> = {};
			entries.forEach(([key], i) => {
				inputs[key] = values[i];
			});
			const ownerName = slotOwner.get(s.id) ?? s.source;
			const ctx = makeCtx(ownerName);
			try {
				return (await kind.compute(inputs, ctx)) as T;
			} catch (err) {
				throw wrapResolutionError(s, ownerName, err);
			}
		}

		const contribs = contributions.get(s.id) ?? [];
		const results = await Promise.all(
			contribs.map(async (c) => {
				try {
					const value = await c.fn(makeCtx(c.plugin));
					return { plugin: c.plugin, value };
				} catch (err) {
					throw wrapResolutionError(s, c.plugin, err);
				}
			}),
		);

		if (kind.type === "list") {
			return composeList(s as Slot<unknown[]>, results) as T;
		}
		if (kind.type === "map") {
			return composeMap(s as Slot<Record<string, unknown>>, results) as T;
		}
		// value
		let seedValue: { present: true; value: T } | { present: false } = {
			present: false,
		};
		if (kind.seed) {
			const ownerName = slotOwner.get(s.id) ?? s.source;
			const ctx = makeCtx(ownerName);
			try {
				seedValue = { present: true, value: (await kind.seed(ctx)) as T };
			} catch (err) {
				throw wrapResolutionError(s, ownerName, err);
			}
		}
		return composeValue({ slot: s, results, seedValue });
	}

	return graph;
}

function wrapResolutionError(
	s: Slot<unknown>,
	plugin: string,
	err: unknown,
): Error {
	if (err instanceof SlotError) return err;
	const detail = err instanceof Error ? err.message : String(err);
	return new SlotResolutionError(
		`Slot '${s.source}:${s.name}' failed while resolving contribution from '${plugin}': ${detail}`,
		`${s.source}:${s.name}`,
		plugin,
		err,
	);
}

// 3-color DFS over derived-input edges. Throws SlotCycleError with the cycle
// path; throws a clear error if a derived slot references an input that was
// not declared on any plugin.
function detectCycles(slotById: Map<symbol, Slot<unknown>>): void {
	const WHITE = 0;
	const GRAY = 1;
	const BLACK = 2;
	const color = new Map<symbol, number>();
	for (const id of slotById.keys()) color.set(id, WHITE);

	const labelOf = (s: Slot<unknown>) => `${s.source}:${s.name}`;

	function visit(s: Slot<unknown>, path: Slot<unknown>[]): void {
		const state = color.get(s.id) ?? WHITE;
		if (state === BLACK) return;
		if (state === GRAY) {
			const start = path.findIndex((p) => p.id === s.id);
			const cycle = [...path.slice(start), s].map(labelOf);
			throw new SlotCycleError(cycle);
		}
		color.set(s.id, GRAY);
		if (s.kind.type === "derived") {
			for (const [inputKey, input] of Object.entries(s.kind.inputs)) {
				if (!slotById.has(input.id)) {
					// Register the referenced slot so further traversal works — but
					// warn the user by throwing a clear error for unknown derived
					// inputs. This catches the "input slot not in graph" case.
					throw new SlotError(
						`Derived slot '${labelOf(s)}' references input '${inputKey}' -> '${labelOf(input)}' which is not declared by any plugin.`,
						"SLOT_UNKNOWN_INPUT",
					);
				}
				visit(input, [...path, s]);
			}
		}
		color.set(s.id, BLACK);
	}

	for (const s of slotById.values()) visit(s, []);
}
