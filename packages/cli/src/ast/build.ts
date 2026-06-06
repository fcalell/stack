// Converts arbitrary JS values from `stack.config.ts` options into TsExpression
// nodes so plugins can inline consumer options into generated code. This is the
// only authoring helper the AST layer ships — for everything else plugins write
// the raw `TsExpression` discriminated union directly (see @fcalell/cli/ast).

import type { TsExpression } from "#ast/specs";

// Converts an arbitrary JS value (plain object/array/primitive) into a
// TsExpression. Used when plugins need to inline user-provided options
// (from stack.config.ts) into generated code. Non-plain objects (Date,
// Map, Set, class instances) and non-JSON primitives (function, bigint,
// symbol) throw a TypeError — callers must produce a structured
// TsExpression node for those cases.
function literal(value: unknown): TsExpression {
	if (value === null) return { kind: "null" };
	if (value === undefined) return { kind: "undefined" };
	if (typeof value === "string") return { kind: "string", value };
	if (typeof value === "number") return { kind: "number", value };
	if (typeof value === "boolean") return { kind: "boolean", value };
	if (Array.isArray(value)) {
		return { kind: "array", items: value.map(literal) };
	}
	if (typeof value === "object") {
		const proto = Object.getPrototypeOf(value);
		if (proto !== null && proto !== Object.prototype) {
			const name =
				(value as { constructor?: { name?: string } }).constructor?.name ??
				"object";
			throw new TypeError(
				`literal(): cannot convert non-plain object of type \`${name}\` to a TsExpression. Build a structured TsExpression node instead (e.g. \`{ kind: "new", callee: { kind: "identifier", name: "Date" }, args: [...] }\` for Dates, \`{ kind: "identifier", name }\` for identifiers).`,
			);
		}
		const properties: Array<{ key: string; value: TsExpression }> = [];
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			properties.push({ key: k, value: literal(v) });
		}
		return { kind: "object", properties };
	}
	throw new TypeError(
		`literal(): cannot convert value of type \`${typeof value}\` to a TsExpression. Build a structured TsExpression node instead (e.g. \`{ kind: "identifier", name }\` for identifiers, \`{ kind: "string", value }\` for strings).`,
	);
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
