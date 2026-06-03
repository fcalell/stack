import { describe, expect, it } from "vitest";
import {
	cssIdent,
	cssString,
	cssSupportsExpression,
	cssUrl,
	isCssIdent,
	isCssSupportsExpression,
} from "./css-escape";

// Table-driven tests. The four primitives have small, well-defined
// contracts; pinning the canonical happy and sad cases per primitive
// catches both regressions in escaping AND silent loosening of the
// validators.

describe("cssString", () => {
	const cases: Array<[string, string]> = [
		["Inter Variable", '"Inter Variable"'],
		["Foo's Font", '"Foo\'s Font"'],
		['has"quote', '"has\\"quote"'],
		["back\\slash", '"back\\\\slash"'],
		["new\nline", '"new\\A line"'],
		["car\rriage", '"car\\D riage"'],
		["", '""'],
	];
	for (const [input, expected] of cases) {
		it(`escapes ${JSON.stringify(input)} → ${expected}`, () => {
			expect(cssString(input)).toBe(expected);
		});
	}
});

describe("cssUrl", () => {
	const ok: Array<[string, string]> = [
		["/foo.woff2", 'url("/foo.woff2")'],
		["/has space.woff2", 'url("/has space.woff2")'],
		["https://cdn/font.woff2?v=1", 'url("https://cdn/font.woff2?v=1")'],
		['/has"break.woff2', 'url("/has\\"break.woff2")'],
		["/has\\back.woff2", 'url("/has\\\\back.woff2")'],
	];
	for (const [input, expected] of ok) {
		it(`renders ${JSON.stringify(input)} → ${expected}`, () => {
			expect(cssUrl(input)).toBe(expected);
		});
	}

	it("throws on empty URL", () => {
		expect(() => cssUrl("")).toThrow(/empty URL/);
	});

	it("throws when URL contains a newline", () => {
		expect(() => cssUrl("/foo\nbar.woff2")).toThrow(/control characters/);
	});

	it("throws when URL contains a carriage return", () => {
		expect(() => cssUrl("/foo\rbar.woff2")).toThrow(/control characters/);
	});
});

describe("cssIdent / isCssIdent", () => {
	const valid = ["base", "components", "my-layer", "_private", "-vendor", "x1"];
	for (const v of valid) {
		it(`accepts ${JSON.stringify(v)}`, () => {
			expect(isCssIdent(v)).toBe(true);
			expect(cssIdent(v)).toBe(v);
		});
	}

	const invalid: Array<[unknown, RegExp]> = [
		["", /invalid CSS identifier/],
		["1bad", /invalid CSS identifier/],
		["has space", /invalid CSS identifier/],
		["a;b", /invalid CSS identifier/],
		["a{b", /invalid CSS identifier/],
		["a}b", /invalid CSS identifier/],
		["a/b", /invalid CSS identifier/],
		["-", /invalid CSS identifier/],
		[":root", /invalid CSS identifier/],
		// Non-ASCII rejected by design.
		["café", /invalid CSS identifier/],
		[123, /invalid CSS identifier/],
		[null, /invalid CSS identifier/],
		[undefined, /invalid CSS identifier/],
	];
	for (const [v, re] of invalid) {
		it(`rejects ${JSON.stringify(v)}`, () => {
			expect(isCssIdent(v)).toBe(false);
			expect(() => cssIdent(v as string)).toThrow(re);
		});
	}
});

describe("cssSupportsExpression / isCssSupportsExpression", () => {
	const valid = [
		"(display: grid)",
		"(color: red) and (display: flex)",
		"not (color: red)",
		"selector(:has(> p))",
		"(display: grid) or ((display: flex) and (color: red))",
	];
	for (const v of valid) {
		it(`accepts ${JSON.stringify(v)}`, () => {
			expect(isCssSupportsExpression(v)).toBe(true);
			expect(cssSupportsExpression(v)).toBe(v.trim());
		});
	}

	const invalid: Array<[unknown, RegExp]> = [
		["", /invalid @supports expression/],
		["   ", /invalid @supports expression/],
		["(display: grid", /invalid @supports expression/], // unbalanced
		["display: grid)", /invalid @supports expression/], // unbalanced
		["(display: grid); evil", /invalid @supports expression/],
		["(display: grid) { evil", /invalid @supports expression/],
		["(display: grid) } evil", /invalid @supports expression/],
		[123, /invalid @supports expression/],
		[null, /invalid @supports expression/],
	];
	for (const [v, re] of invalid) {
		it(`rejects ${JSON.stringify(v)}`, () => {
			expect(isCssSupportsExpression(v)).toBe(false);
			expect(() => cssSupportsExpression(v as string)).toThrow(re);
		});
	}
});
