import { describe, expect, it } from "vitest";
import {
	type Contribution,
	composeList,
	composeMap,
	composeValue,
	SlotConflictError,
	SlotError,
	slot,
} from "#lib/slots";

describe("slot builders", () => {
	it("list slot: constructs a Slot<T[]> with a contribute helper", () => {
		const s = slot.list<number>({ source: "p", name: "nums" });
		expect(s.__brand).toBe("slot");
		expect(s.source).toBe("p");
		expect(s.name).toBe("nums");
		expect(s.kind.type).toBe("list");
		const contribution: Contribution<number[]> = s.contribute(() => 1);
		expect(contribution.slot).toBe(s);
		expect(typeof contribution.fn).toBe("function");
	});

	it("map slot: builds with correct kind", () => {
		const s = slot.map<string>({ source: "p", name: "things" });
		expect(s.kind.type).toBe("map");
	});

	it("value slot: preserves seed + override flags", () => {
		const seed = () => "hi";
		const s = slot.value<string>({
			source: "p",
			name: "v",
			seed,
			override: true,
		});
		expect(s.kind.type).toBe("value");
		if (s.kind.type === "value") {
			expect(s.kind.seed).toBe(seed);
			expect(s.kind.override).toBe(true);
		}
	});

	it("derived slot: captures inputs and compute", () => {
		const a = slot.value<number>({ source: "p", name: "a", seed: () => 1 });
		const s = slot.derived({
			source: "p",
			name: "d",
			inputs: { a },
			compute: (inp) => inp.a * 2,
		});
		expect(s.kind.type).toBe("derived");
		if (s.kind.type === "derived") {
			expect(s.kind.inputs.a).toBe(a);
		}
	});
});

describe("composeList", () => {
	it("flattens mix of single + array + undefined contributions", () => {
		const s = slot.list<number>({ source: "p", name: "nums" });
		const result = composeList(s, [
			{ plugin: "a", value: 1 },
			{ plugin: "b", value: [2, 3] },
			{ plugin: "c", value: undefined },
			{ plugin: "d", value: 4 },
		]);
		expect(result).toEqual([1, 2, 3, 4]);
	});

	it("applies sortBy with stable tie-breaking", () => {
		type Item = { order: number; label: string };
		const s = slot.list<Item>({
			source: "p",
			name: "items",
			sortBy: (a, b) => a.order - b.order,
		});
		const result = composeList(s, [
			{ plugin: "a", value: { order: 1, label: "a1" } },
			{ plugin: "b", value: { order: 0, label: "b0" } },
			{ plugin: "c", value: { order: 1, label: "c1" } },
			{ plugin: "d", value: { order: 0, label: "d0" } },
		]);
		// ties retain insertion order: b0, d0 then a1, c1
		expect(result.map((x) => x.label)).toEqual(["b0", "d0", "a1", "c1"]);
	});
});

describe("composeMap", () => {
	it("merges multiple records", () => {
		const s = slot.map<number>({ source: "p", name: "m" });
		const result = composeMap(s, [
			{ plugin: "a", value: { x: 1, y: 2 } },
			{ plugin: "b", value: { z: 3 } },
		]);
		expect(result).toEqual({ x: 1, y: 2, z: 3 });
	});

	it("throws SlotConflictError on duplicate key", () => {
		const s = slot.map<number>({ source: "p", name: "m" });
		expect(() =>
			composeMap(s, [
				{ plugin: "a", value: { x: 1 } },
				{ plugin: "b", value: { x: 2 } },
			]),
		).toThrow(SlotConflictError);
	});

	it("skips undefined contributions", () => {
		const s = slot.map<number>({ source: "p", name: "m" });
		const result = composeMap(s, [
			{ plugin: "a", value: undefined },
			{ plugin: "b", value: { x: 1 } },
		]);
		expect(result).toEqual({ x: 1 });
	});

	it("rejects non-object contributions with a clear error", () => {
		const s = slot.map<number>({ source: "p", name: "m" });
		expect(() =>
			composeMap(s, [{ plugin: "a", value: "nope" as unknown }]),
		).toThrow(SlotError);
	});
});

describe("composeValue", () => {
	it("returns seed when there are no contributions", () => {
		const s = slot.value<string>({
			source: "p",
			name: "v",
			seed: () => "seeded",
		});
		const result = composeValue({
			slot: s,
			results: [],
			seedValue: { present: true, value: "seeded" },
		});
		expect(result).toBe("seeded");
	});

	it("throws when there is no seed and no contribution", () => {
		const s = slot.value<string>({ source: "p", name: "v" });
		expect(() =>
			composeValue({
				slot: s,
				results: [],
				seedValue: { present: false },
			}),
		).toThrow(SlotError);
	});

	it("single contribution replaces seed", () => {
		const s = slot.value<string>({
			source: "p",
			name: "v",
			seed: () => "seeded",
		});
		const result = composeValue({
			slot: s,
			results: [{ plugin: "a", value: "chosen" }],
			seedValue: { present: true, value: "seeded" },
		});
		expect(result).toBe("chosen");
	});

	it("two contributions without override throw SlotConflictError", () => {
		const s = slot.value<string>({ source: "p", name: "v" });
		expect(() =>
			composeValue({
				slot: s,
				results: [
					{ plugin: "a", value: "one" },
					{ plugin: "b", value: "two" },
				],
				seedValue: { present: false },
			}),
		).toThrow(SlotConflictError);
	});

	it("override:true picks the last contribution", () => {
		const s = slot.value<string>({
			source: "p",
			name: "v",
			override: true,
		});
		const result = composeValue({
			slot: s,
			results: [
				{ plugin: "a", value: "first" },
				{ plugin: "b", value: "second" },
			],
			seedValue: { present: false },
		});
		expect(result).toBe("second");
	});
});
