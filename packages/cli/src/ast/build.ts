// Terse builders for TsExpression. Plugin authors write `obj({ port: 3000 })`
// instead of `{ kind: "object", properties: [{ key: "port", value: { kind:
// "number", value: 3000 } }] }`. Builders always produce the raw
// discriminated-union spec, so they compose with hand-written specs.

import type { TsExpression, TsImportSpec, TsTypeRef } from "#ast/specs";

// ── Primitives ─────────────────────────────────────────────────────

export const str = (value: string): TsExpression => ({ kind: "string", value });
export const num = (value: number): TsExpression => ({ kind: "number", value });
export const bool = (value: boolean): TsExpression => ({
	kind: "boolean",
	value,
});
export const nul = (): TsExpression => ({ kind: "null" });
export const undef = (): TsExpression => ({ kind: "undefined" });

// ── References ─────────────────────────────────────────────────────

export const id = (name: string): TsExpression => ({
	kind: "identifier",
	name,
});

export const mem = (object: TsExpression, property: string): TsExpression => ({
	kind: "member",
	object,
	property,
});

// ── Invocation ─────────────────────────────────────────────────────

export const call = (
	callee: TsExpression,
	args: TsExpression[] = [],
	typeArgs?: TsTypeRef[],
): TsExpression => ({ kind: "call", callee, args, typeArgs });

export const newExpr = (
	callee: TsExpression,
	args: TsExpression[] = [],
): TsExpression => ({ kind: "new", callee, args });

// ── Structures ─────────────────────────────────────────────────────

type ObjectProperty =
	| { key: string; value: TsExpression; shorthand?: boolean }
	| [key: string, value: TsExpression, shorthand?: boolean];

type BuilderValue =
	| TsExpression
	| Primitive
	| BuilderValue[]
	| { [key: string]: BuilderValue };

// Accepts either a record (values become expressions via `literal`) or an
// explicit property list (when you need `shorthand` or values that should
// be left as raw expressions). Records are the common case.
export function obj(
	input: Record<string, BuilderValue> | ObjectProperty[],
): TsExpression {
	if (Array.isArray(input)) {
		return {
			kind: "object",
			properties: input.map((p) =>
				Array.isArray(p) ? { key: p[0], value: p[1], shorthand: p[2] } : p,
			),
		};
	}
	const properties: Array<{
		key: string;
		value: TsExpression;
		shorthand?: boolean;
	}> = [];
	for (const [key, value] of Object.entries(input)) {
		properties.push({ key, value: coerce(value) });
	}
	return { kind: "object", properties };
}

export const arr = (items: BuilderValue[]): TsExpression => ({
	kind: "array",
	items: items.map(coerce),
});

// ── Arrow / as / JSX ───────────────────────────────────────────────

export const arrow = (
	params: Array<string | { name: string; type?: TsTypeRef }>,
	body: TsExpression,
	opts: { async?: boolean } = {},
): TsExpression => ({
	kind: "arrow",
	params: params.map((p) => (typeof p === "string" ? { name: p } : p)),
	body,
	async: opts.async,
});

export const asExpr = (
	expression: TsExpression,
	type: TsTypeRef,
): TsExpression => ({ kind: "as", expression, type });

export function jsx(
	tag: string,
	opts: {
		props?: Array<{ name: string; value?: TsExpression }>;
		children?: Array<TsExpression | { kind: "text"; value: string }>;
		selfClosing?: boolean;
	} = {},
): TsExpression {
	return {
		kind: "jsx",
		tag,
		props: opts.props ?? [],
		children: opts.children ?? [],
		selfClosing: opts.selfClosing,
	};
}

// ── literal: arbitrary JS value → TsExpression ─────────────────────

type Primitive = string | number | boolean | null | undefined;

// Converts an arbitrary JS value (plain object/array/primitive) into a
// TsExpression. Used when plugins need to inline user-provided options
// (from stack.config.ts) into generated code. Functions, classes, and
// other non-serializable values are stringified as a fallback.
export function literal(value: unknown): TsExpression {
	if (value === null) return { kind: "null" };
	if (value === undefined) return { kind: "undefined" };
	if (typeof value === "string") return { kind: "string", value };
	if (typeof value === "number") return { kind: "number", value };
	if (typeof value === "boolean") return { kind: "boolean", value };
	if (Array.isArray(value)) {
		return { kind: "array", items: value.map(literal) };
	}
	if (typeof value === "object") {
		const properties: Array<{ key: string; value: TsExpression }> = [];
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			properties.push({ key: k, value: literal(v) });
		}
		return { kind: "object", properties };
	}
	return { kind: "string", value: String(value) };
}

// Converts a record of arbitrary JS values into a key→TsExpression map,
// preserving insertion order. The shape matches `PluginRuntimeEntry.options`
// so plugins can auto-seed from `ctx.options` and then mutate individual
// keys (`rt.options.trustedOrigins = …`) without re-literalising the whole
// object every time.
export function literalToProps(
	value: Record<string, unknown>,
): Record<string, TsExpression> {
	const out: Record<string, TsExpression> = {};
	for (const [k, v] of Object.entries(value)) {
		out[k] = literal(v);
	}
	return out;
}

// Coerces primitives to TsExpression via `literal`; passes through
// expressions unchanged. Used internally by obj/arr.
function coerce(value: BuilderValue): TsExpression {
	if (value === null || value === undefined || typeof value !== "object") {
		return literal(value);
	}
	// Objects with a `kind` string are TsExpressions; anything else is
	// a plain object that should be converted via literal.
	if (
		!Array.isArray(value) &&
		"kind" in value &&
		typeof value.kind === "string"
	) {
		return value as TsExpression;
	}
	return literal(value);
}

// ── Imports (sugar over the union) ─────────────────────────────────

export const importDefault = (
	source: string,
	name: string,
	opts: { typeOnly?: boolean } = {},
): TsImportSpec => ({ source, default: name, typeOnly: opts.typeOnly });

export const importNamed = (
	source: string,
	names: Array<string | { name: string; alias: string }>,
	opts: { typeOnly?: boolean } = {},
): TsImportSpec => ({ source, named: names, typeOnly: opts.typeOnly });

export const importNamespace = (
	source: string,
	name: string,
): TsImportSpec => ({ source, namespace: name });

export const importSideEffect = (source: string): TsImportSpec => ({
	source,
	sideEffect: true,
});
