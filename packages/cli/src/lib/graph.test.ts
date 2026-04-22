import { describe, expect, it, vi } from "vitest";
import type { ScaffoldSpec } from "#ast";
import type { AppConfig } from "#config";
import { buildGraph, type GraphCtxFactory, type GraphPlugin } from "#lib/graph";
import {
	type Slot,
	SlotConflictError,
	SlotCycleError,
	SlotError,
	SlotResolutionError,
	slot,
} from "#lib/slots";

// ── Shared harness ──────────────────────────────────────────────────

const app: AppConfig = { name: "test-app", domain: "example.com" };

const noopLog = {
	info: () => {},
	warn: () => {},
	success: () => {},
	error: () => {},
};

function makeCtxFactory(
	perPlugin: Record<string, unknown> = {},
): GraphCtxFactory {
	return {
		app,
		cwd: "/tmp",
		log: noopLog,
		ctxForPlugin: (name) => ({
			options: perPlugin[name] ?? {},
			fileExists: async () => false,
			readFile: async () => "",
			template: (n: string) => new URL(`file:///templates/${name}/${n}`),
			scaffold: (n: string, target: string): ScaffoldSpec => ({
				source: new URL(`file:///templates/${name}/${n}`),
				target,
				plugin: name,
			}),
		}),
	};
}

function plugin(name: string, def: Omit<GraphPlugin, "name">): GraphPlugin {
	return { name, ...def };
}

// ── list slot: multi-plugin contribution ────────────────────────────

describe("buildGraph: list slots", () => {
	it("concats contributions from multiple plugins independent of order", async () => {
		const nums = slot.list<number>({ source: "owner", name: "nums" });
		const owner = plugin("owner", { slots: { nums } });

		const a = plugin("a", { contributes: [nums.contribute(() => 1)] });
		const b = plugin("b", { contributes: [nums.contribute(() => [2, 3])] });
		const c = plugin("c", { contributes: [nums.contribute(() => undefined)] });

		const g1 = buildGraph([owner, a, b, c], makeCtxFactory());
		const g2 = buildGraph([owner, c, b, a], makeCtxFactory());
		const r1 = await g1.resolve(nums);
		const r2 = await g2.resolve(nums);
		expect(new Set(r1)).toEqual(new Set([1, 2, 3]));
		expect(new Set(r2)).toEqual(new Set([1, 2, 3]));
	});

	it("respects sortBy (phase+order shape)", async () => {
		type MW = { phase: "a" | "b"; order: number; id: string };
		const phaseRank = { a: 0, b: 1 };
		const mw = slot.list<MW>({
			source: "api",
			name: "middleware",
			sortBy: (x, y) =>
				phaseRank[x.phase] - phaseRank[y.phase] || x.order - y.order,
		});
		const owner = plugin("api", { slots: { mw } });
		const p1 = plugin("p1", {
			contributes: [
				mw.contribute(() => ({
					phase: "b" as const,
					order: 10,
					id: "b10",
				})),
			],
		});
		const p2 = plugin("p2", {
			contributes: [
				mw.contribute(() => ({ phase: "a" as const, order: 0, id: "a0" })),
				mw.contribute(() => ({ phase: "a" as const, order: 5, id: "a5" })),
			],
		});

		const g = buildGraph([owner, p1, p2], makeCtxFactory());
		const result = await g.resolve(mw);
		expect(result.map((m) => m.id)).toEqual(["a0", "a5", "b10"]);
	});
});

// ── map slot: duplicate key ─────────────────────────────────────────

describe("buildGraph: map slots", () => {
	it("aggregates keys from a single plugin", async () => {
		const m = slot.map<number>({ source: "owner", name: "m" });
		const owner = plugin("owner", { slots: { m } });
		const a = plugin("a", {
			contributes: [m.contribute(() => ({ x: 1, y: 2, z: 3 }))],
		});
		const g = buildGraph([owner, a], makeCtxFactory());
		expect(await g.resolve(m)).toEqual({ x: 1, y: 2, z: 3 });
	});

	it("throws SlotConflictError with both plugin names on duplicate key", async () => {
		const m = slot.map<number>({ source: "owner", name: "m" });
		const owner = plugin("owner", { slots: { m } });
		const a = plugin("a", { contributes: [m.contribute(() => ({ k: 1 }))] });
		const b = plugin("b", { contributes: [m.contribute(() => ({ k: 2 }))] });
		const g = buildGraph([owner, a, b], makeCtxFactory());
		await expect(g.resolve(m)).rejects.toThrow(SlotConflictError);
		await expect(g.resolve(m)).rejects.toThrow(/'a'.*'b'|'b'.*'a'/);
	});
});

// ── value slot: seed + override ─────────────────────────────────────

describe("buildGraph: value slots", () => {
	it("returns seed when there is no contribution", async () => {
		const v = slot.value<string>({
			source: "owner",
			name: "v",
			seed: () => "seeded",
		});
		const owner = plugin("owner", { slots: { v } });
		const g = buildGraph([owner], makeCtxFactory());
		expect(await g.resolve(v)).toBe("seeded");
	});

	it("async seed is awaited", async () => {
		const v = slot.value<string>({
			source: "owner",
			name: "v",
			seed: async () => {
				await new Promise((r) => setTimeout(r, 5));
				return "late";
			},
		});
		const owner = plugin("owner", { slots: { v } });
		const g = buildGraph([owner], makeCtxFactory());
		expect(await g.resolve(v)).toBe("late");
	});

	it("seed + one contribution → contribution wins", async () => {
		const v = slot.value<string>({
			source: "owner",
			name: "v",
			seed: () => "seeded",
		});
		const owner = plugin("owner", { slots: { v } });
		const a = plugin("a", { contributes: [v.contribute(() => "chosen")] });
		const g = buildGraph([owner, a], makeCtxFactory());
		expect(await g.resolve(v)).toBe("chosen");
	});

	it("two contributions without override throw SlotConflictError", async () => {
		const v = slot.value<string>({ source: "owner", name: "v" });
		const owner = plugin("owner", { slots: { v } });
		const a = plugin("a", { contributes: [v.contribute(() => "one")] });
		const b = plugin("b", { contributes: [v.contribute(() => "two")] });
		const g = buildGraph([owner, a, b], makeCtxFactory());
		await expect(g.resolve(v)).rejects.toThrow(SlotConflictError);
	});

	it("override:true lets the last contribution win (seed remains replaceable)", async () => {
		const v = slot.value<string>({
			source: "owner",
			name: "v",
			seed: () => "seeded",
			override: true,
		});
		const owner = plugin("owner", { slots: { v } });
		const a = plugin("a", { contributes: [v.contribute(() => "one")] });
		const b = plugin("b", { contributes: [v.contribute(() => "two")] });
		const g = buildGraph([owner, a, b], makeCtxFactory());
		expect(await g.resolve(v)).toBe("two");
	});

	it("throws when a value slot has no seed and no contribution", async () => {
		const v = slot.value<string>({ source: "owner", name: "v" });
		const owner = plugin("owner", { slots: { v } });
		const g = buildGraph([owner], makeCtxFactory());
		await expect(g.resolve(v)).rejects.toThrow(SlotError);
	});
});

// ── derived slot behaviours ─────────────────────────────────────────

describe("buildGraph: derived slots", () => {
	it("resolves inputs before compute; async compute awaited", async () => {
		const a = slot.value<number>({
			source: "owner",
			name: "a",
			seed: () => 2,
		});
		const b = slot.value<number>({
			source: "owner",
			name: "b",
			seed: async () => 3,
		});
		const sum = slot.derived({
			source: "owner",
			name: "sum",
			inputs: { a, b },
			compute: async (inp) => (inp.a as number) + (inp.b as number),
		});
		const owner = plugin("owner", { slots: { a, b, sum } });
		const g = buildGraph([owner], makeCtxFactory());
		expect(await g.resolve(sum)).toBe(5);
	});

	it("cycle (A -> B -> A) throws SlotCycleError at buildGraph time", () => {
		const a: Slot<number> = slot.derived<number, { b: Slot<number> }>({
			source: "owner",
			name: "a",
			// Forward declaration: we replace b below after we construct a.
			inputs: {} as unknown as { b: Slot<number> },
			compute: (inp) => (inp.b as number) + 1,
		});
		const b: Slot<number> = slot.derived<number, { a: Slot<number> }>({
			source: "owner",
			name: "b",
			inputs: { a },
			compute: (inp) => (inp.a as number) + 1,
		});
		// Manually re-assign the derived inputs to form the cycle.
		(
			a.kind as { type: "derived"; inputs: Record<string, Slot<unknown>> }
		).inputs = { b };
		const owner = plugin("owner", { slots: { a, b } });
		expect(() => buildGraph([owner], makeCtxFactory())).toThrow(SlotCycleError);
	});

	it("missing input slot not declared on any plugin → clear error at buildGraph", () => {
		const ghost = slot.value<number>({ source: "ghost", name: "ghost" });
		const d = slot.derived({
			source: "owner",
			name: "d",
			inputs: { ghost },
			compute: (inp) => inp.ghost as number,
		});
		const owner = plugin("owner", { slots: { d } });
		// ghost is never registered on any plugin.
		expect(() => buildGraph([owner], makeCtxFactory())).toThrow(SlotError);
	});

	it("contributing to a derived slot throws", () => {
		const a = slot.value<number>({
			source: "owner",
			name: "a",
			seed: () => 1,
		});
		const d = slot.derived({
			source: "owner",
			name: "d",
			inputs: { a },
			compute: (inp) => inp.a as number,
		});
		const owner = plugin("owner", { slots: { a, d } });
		const bad = plugin("bad", {
			contributes: [(d as unknown as Slot<number>).contribute(() => 9)],
		});
		expect(() => buildGraph([owner, bad], makeCtxFactory())).toThrow(
			/derived slot/,
		);
	});
});

// ── Memoization + parallelism ───────────────────────────────────────

describe("buildGraph: memoization + resolveMany", () => {
	it("resolve(s) twice runs contributions once", async () => {
		const v = slot.value<number>({
			source: "owner",
			name: "v",
			seed: () => 0,
		});
		const contribFn = vi.fn(() => 42);
		const owner = plugin("owner", { slots: { v } });
		const a = plugin("a", { contributes: [v.contribute(contribFn)] });
		const g = buildGraph([owner, a], makeCtxFactory());
		const [r1, r2] = await Promise.all([g.resolve(v), g.resolve(v)]);
		expect(r1).toBe(42);
		expect(r2).toBe(42);
		expect(contribFn).toHaveBeenCalledTimes(1);
	});

	it("derived slot memoization: compute called once across multiple dependents", async () => {
		const a = slot.value<number>({
			source: "owner",
			name: "a",
			seed: () => 1,
		});
		const computeFn = vi.fn(
			(inp: Record<string, unknown>) => (inp.a as number) * 10,
		);
		const d = slot.derived({
			source: "owner",
			name: "d",
			inputs: { a },
			compute: computeFn,
		});
		const owner = plugin("owner", { slots: { a, d } });
		const g = buildGraph([owner], makeCtxFactory());
		await g.resolveMany([d, d, d] as const);
		expect(computeFn).toHaveBeenCalledTimes(1);
	});

	it("resolveMany resolves independent slots in parallel", async () => {
		const started = { a: 0, b: 0 };
		let aResolve: (v: number) => void = () => {};
		let bResolve: (v: number) => void = () => {};
		const a = slot.value<number>({
			source: "owner",
			name: "a",
			seed: () =>
				new Promise<number>((res) => {
					started.a = Date.now();
					aResolve = res;
				}),
		});
		const b = slot.value<number>({
			source: "owner",
			name: "b",
			seed: () =>
				new Promise<number>((res) => {
					started.b = Date.now();
					bResolve = res;
				}),
		});
		const owner = plugin("owner", { slots: { a, b } });
		const g = buildGraph([owner], makeCtxFactory());
		const pending = g.resolveMany([a, b] as const);
		// Give the microtask queue a nudge so both seeds have started.
		await new Promise((r) => setTimeout(r, 5));
		expect(started.a).toBeGreaterThan(0);
		expect(started.b).toBeGreaterThan(0);
		aResolve(1);
		bResolve(2);
		const [ra, rb] = await pending;
		expect(ra).toBe(1);
		expect(rb).toBe(2);
	});
});

// ── ctx.resolve() escape hatch ──────────────────────────────────────

describe("buildGraph: ctx.resolve escape hatch", () => {
	it("a contribution may read another slot via ctx.resolve", async () => {
		const upstream = slot.value<number>({
			source: "x",
			name: "upstream",
			seed: () => 10,
		});
		const target = slot.list<number>({ source: "y", name: "target" });
		const ownerX = plugin("x", { slots: { upstream } });
		const ownerY = plugin("y", { slots: { target } });
		const contributor = plugin("contributor", {
			contributes: [
				target.contribute(async (ctx) => {
					const v = await ctx.resolve(upstream);
					return v + 1;
				}),
			],
		});
		const g = buildGraph([ownerX, ownerY, contributor], makeCtxFactory());
		const result = await g.resolve(target);
		expect(result).toEqual([11]);
	});
});

// ── Error propagation ──────────────────────────────────────────────

describe("buildGraph: error propagation", () => {
	it("a contribution that throws surfaces with slot + plugin name in the message", async () => {
		const v = slot.value<number>({ source: "owner", name: "v" });
		const owner = plugin("owner", { slots: { v } });
		const broken = plugin("broken", {
			contributes: [
				v.contribute(() => {
					throw new Error("kaboom");
				}),
			],
		});
		const g = buildGraph([owner, broken], makeCtxFactory());
		await expect(g.resolve(v)).rejects.toThrow(SlotResolutionError);
		await expect(g.resolve(v)).rejects.toThrow(/owner:v/);
		await expect(g.resolve(v)).rejects.toThrow(/broken/);
		await expect(g.resolve(v)).rejects.toThrow(/kaboom/);
	});

	it("contribution sees its own plugin's options via ctx", async () => {
		const v = slot.value<string>({ source: "owner", name: "v" });
		const owner = plugin("owner", { slots: { v } });
		const a = plugin("a", {
			options: { label: "from-a" },
			contributes: [
				v.contribute((ctx) => (ctx.options as { label: string }).label),
			],
		});
		const factory = makeCtxFactory({ a: { label: "from-a" } });
		const g = buildGraph([owner, a], factory);
		expect(await g.resolve(v)).toBe("from-a");
	});
});
