import { describe, expect, it } from "vitest";
import { literalToProps } from "#ast/build";

// `literalToProps` is the only authoring helper the AST layer ships: it inlines
// consumer options (from stack.config.ts) into generated code. These tests guard
// that boundary — the recursive value→TsExpression conversion and the fail-fast
// on values it cannot faithfully represent.

describe("literalToProps", () => {
	it("converts nested objects and arrays", () => {
		expect(
			literalToProps({ name: "x", nested: { items: [1, "two"] } }),
		).toEqual({
			name: { kind: "string", value: "x" },
			nested: {
				kind: "object",
				properties: [
					{
						key: "items",
						value: {
							kind: "array",
							items: [
								{ kind: "number", value: 1 },
								{ kind: "string", value: "two" },
							],
						},
					},
				],
			},
		});
	});

	it("handles null and undefined values", () => {
		expect(literalToProps({ a: null, b: undefined })).toEqual({
			a: { kind: "null" },
			b: { kind: "undefined" },
		});
	});

	it("accepts null-prototype plain objects", () => {
		const inner = Object.create(null) as Record<string, unknown>;
		inner.a = 1;
		expect(literalToProps({ inner })).toEqual({
			inner: {
				kind: "object",
				properties: [{ key: "a", value: { kind: "number", value: 1 } }],
			},
		});
	});

	it("throws for Date values", () => {
		expect(() => literalToProps({ d: new Date() })).toThrow(/Date/);
	});

	it("throws for functions", () => {
		expect(() => literalToProps({ f: () => {} })).toThrow(/function/);
	});

	it("throws for bigint", () => {
		expect(() => literalToProps({ n: 123n })).toThrow(/bigint/);
	});

	it("throws for symbol", () => {
		expect(() => literalToProps({ s: Symbol("x") })).toThrow(/symbol/);
	});

	it("throws for Map values", () => {
		expect(() => literalToProps({ m: new Map() })).toThrow(/Map/);
	});

	it("throws when a deeply nested value is non-plain", () => {
		expect(() => literalToProps({ outer: { d: new Date() } })).toThrow(/Date/);
	});
});
