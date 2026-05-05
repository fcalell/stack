import { describe, expect, it } from "vitest";
import { dedupeImports } from "#ast/imports";

describe("dedupeImports — happy paths", () => {
	it("collapses identical default imports into one", () => {
		const out = dedupeImports([
			{ source: "foo", default: "A" },
			{ source: "foo", default: "A" },
		]);
		expect(out).toEqual([{ source: "foo", default: "A" }]);
	});

	it("merges named bindings across contributions", () => {
		const out = dedupeImports([
			{ source: "foo", named: ["a"] },
			{ source: "foo", named: ["b"] },
		]);
		expect(out).toEqual([{ source: "foo", named: ["a", "b"] }]);
	});

	it("preserves aliased named imports and dedupes identical ones", () => {
		const out = dedupeImports([
			{ source: "foo", named: [{ name: "a", alias: "localA" }] },
			{ source: "foo", named: [{ name: "a", alias: "localA" }] },
		]);
		expect(out).toEqual([
			{
				source: "foo",
				named: [{ name: "a", alias: "localA" }],
			},
		]);
	});

	it("emits separate statements for default, namespace, named, and side-effect from the same source", () => {
		const out = dedupeImports([
			{ source: "foo", default: "D" },
			{ source: "foo", namespace: "NS" },
			{ source: "foo", named: ["n"] },
			{ source: "foo", sideEffect: true },
		]);
		// Every statement for `foo` should be present exactly once.
		expect(out).toHaveLength(4);
		expect(out).toContainEqual({ source: "foo", default: "D" });
		expect(out).toContainEqual({ source: "foo", namespace: "NS" });
		expect(out).toContainEqual({ source: "foo", named: ["n"] });
		expect(out).toContainEqual({ source: "foo", sideEffect: true });
	});

	it("keeps default typeOnly only when every default contributor agrees", () => {
		const out = dedupeImports([
			{ source: "foo", default: "T", typeOnly: true },
			{ source: "foo", default: "T", typeOnly: true },
		]);
		expect(out).toEqual([{ source: "foo", default: "T", typeOnly: true }]);
	});

	it("preserves independent typeOnly state for default vs named when they happen to co-exist", () => {
		// Default is typeOnly; named bindings are runtime. The printer emits
		// them as separate statements so each retains its own intent.
		const out = dedupeImports([
			{ source: "foo", default: "T", typeOnly: true },
			{ source: "foo", named: ["runtime"] },
		]);
		expect(out).toContainEqual({
			source: "foo",
			default: "T",
			typeOnly: true,
		});
		expect(out).toContainEqual({ source: "foo", named: ["runtime"] });
	});
});

describe("dedupeImports — conflict detection", () => {
	it("throws when two contributions provide different default imports from the same source", () => {
		expect(() =>
			dedupeImports([
				{ source: "foo", default: "A" },
				{ source: "foo", default: "B" },
			]),
		).toThrow(/conflicting default imports for "foo"/);
	});

	it("throws when two contributions bind the same local name to different imported names", () => {
		expect(() =>
			dedupeImports([
				{ source: "foo", named: [{ name: "x", alias: "local" }] },
				{ source: "foo", named: [{ name: "y", alias: "local" }] },
			]),
		).toThrow(/local name "local"/);
	});

	it("throws when the same string name appears with an aliased conflicting meaning", () => {
		// `foo` as raw string -> imported+local `foo`.
		// `{ name: "bar", alias: "foo" }` also lands `foo` locally, but imports `bar`.
		expect(() =>
			dedupeImports([
				{ source: "pkg", named: ["foo"] },
				{ source: "pkg", named: [{ name: "bar", alias: "foo" }] },
			]),
		).toThrow(/local name "foo"/);
	});

	it("throws when the same namespace alias is declared against different sources", () => {
		expect(() =>
			dedupeImports([
				{ source: "a", namespace: "ns" },
				{ source: "b", namespace: "ns" },
			]),
		).toThrow(/namespace alias "ns"/);
	});

	it("does not throw when the same namespace alias is declared against the same source twice", () => {
		expect(() =>
			dedupeImports([
				{ source: "a", namespace: "ns" },
				{ source: "a", namespace: "ns" },
			]),
		).not.toThrow();
	});

	it("throws when default-import contributors disagree on typeOnly", () => {
		expect(() =>
			dedupeImports([
				{ source: "foo", default: "T", typeOnly: true },
				{ source: "foo", default: "T" },
			]),
		).toThrow(/conflicting `typeOnly` for the default import/);
	});

	it("throws when named-import contributors disagree on typeOnly", () => {
		expect(() =>
			dedupeImports([
				{ source: "foo", named: ["a"], typeOnly: true },
				{ source: "foo", named: ["b"] },
			]),
		).toThrow(/conflicting `typeOnly` for the named import/);
	});
});
