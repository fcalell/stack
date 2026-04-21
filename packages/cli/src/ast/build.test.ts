import { describe, expect, it } from "vitest";
import {
	arr,
	arrow,
	call,
	id,
	importDefault,
	importNamed,
	jsx,
	literal,
	mem,
	num,
	obj,
	str,
} from "#ast/build";

describe("primitive builders", () => {
	it("str / num / id", () => {
		expect(str("hi")).toEqual({ kind: "string", value: "hi" });
		expect(num(42)).toEqual({ kind: "number", value: 42 });
		expect(id("foo")).toEqual({ kind: "identifier", name: "foo" });
	});
});

describe("obj", () => {
	it("coerces primitives in a record", () => {
		const result = obj({ port: 3000, host: "localhost", secure: true });
		expect(result).toEqual({
			kind: "object",
			properties: [
				{ key: "port", value: { kind: "number", value: 3000 } },
				{ key: "host", value: { kind: "string", value: "localhost" } },
				{ key: "secure", value: { kind: "boolean", value: true } },
			],
		});
	});

	it("passes TsExpression values through unchanged", () => {
		const expr = call(id("foo"));
		const result = obj({ handler: expr });
		expect(result).toEqual({
			kind: "object",
			properties: [{ key: "handler", value: expr }],
		});
	});

	it("supports shorthand via property tuples", () => {
		const result = obj([["schema", id("schema"), true]]);
		expect(result).toEqual({
			kind: "object",
			properties: [
				{
					key: "schema",
					value: { kind: "identifier", name: "schema" },
					shorthand: true,
				},
			],
		});
	});

	it("recurses into plain nested objects", () => {
		const result = obj({ fallback: { family: "Inter" } });
		expect(result).toEqual({
			kind: "object",
			properties: [
				{
					key: "fallback",
					value: {
						kind: "object",
						properties: [
							{ key: "family", value: { kind: "string", value: "Inter" } },
						],
					},
				},
			],
		});
	});
});

describe("arr", () => {
	it("coerces primitives and expressions", () => {
		const result = arr([1, "two", id("three")]);
		expect(result).toEqual({
			kind: "array",
			items: [
				{ kind: "number", value: 1 },
				{ kind: "string", value: "two" },
				{ kind: "identifier", name: "three" },
			],
		});
	});
});

describe("call / mem / arrow / jsx", () => {
	it("builds a call expression", () => {
		expect(call(id("fn"), [num(1)])).toEqual({
			kind: "call",
			callee: { kind: "identifier", name: "fn" },
			args: [{ kind: "number", value: 1 }],
			typeArgs: undefined,
		});
	});

	it("builds a member access", () => {
		expect(mem(id("obj"), "prop")).toEqual({
			kind: "member",
			object: { kind: "identifier", name: "obj" },
			property: "prop",
		});
	});

	it("accepts string params in arrow()", () => {
		const result = arrow(["a", "b"], id("a"));
		expect(result).toEqual({
			kind: "arrow",
			params: [{ name: "a" }, { name: "b" }],
			body: { kind: "identifier", name: "a" },
			async: undefined,
		});
	});

	it("jsx() sets sensible defaults", () => {
		expect(jsx("Toaster")).toEqual({
			kind: "jsx",
			tag: "Toaster",
			props: [],
			children: [],
			selfClosing: undefined,
		});
	});
});

describe("literal", () => {
	it("converts nested objects and arrays", () => {
		const result = literal({ name: "x", nested: { items: [1, "two"] } });
		expect(result).toEqual({
			kind: "object",
			properties: [
				{ key: "name", value: { kind: "string", value: "x" } },
				{
					key: "nested",
					value: {
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
				},
			],
		});
	});

	it("handles null and undefined", () => {
		expect(literal(null)).toEqual({ kind: "null" });
		expect(literal(undefined)).toEqual({ kind: "undefined" });
	});
});

describe("import builders", () => {
	it("importDefault + importNamed", () => {
		expect(importDefault("pkg", "Foo")).toEqual({
			source: "pkg",
			default: "Foo",
			typeOnly: undefined,
		});
		expect(importNamed("pkg", ["Bar"], { typeOnly: true })).toEqual({
			source: "pkg",
			named: ["Bar"],
			typeOnly: true,
		});
	});
});
