import { z } from "zod";

export type { ZodObject, ZodRawShape, ZodType } from "zod";
export { z } from "zod";

/** A JSON Schema (draft 2020-12) object. */
export type JsonSchema = { type?: string } & Record<string, unknown>;

/** One procedure as the client reads it: its input as JSON Schema (`null` when the input is not an object), whether it reads or writes, and the input key its scope adds (`organizationId`, null when it has none), which the client fills from the route's scope. */
export interface ProcedureSchema {
	input: JsonSchema | null;
	kind: "query" | "mutation";
	scope: string | null;
}

// The kinds of schema JSON Schema cannot hold, which `toJSONSchema` would
// turn into `{}` under `unrepresentable: "any"`. A `z.date()` is the one
// exception, a `date-time` string.
const UNREPRESENTABLE = new Set([
	"bigint",
	"symbol",
	"undefined",
	"void",
	"nan",
	"map",
	"set",
	"custom",
	"function",
	"promise",
]);

function jsonSchema(schema: z.ZodType): JsonSchema {
	return z.toJSONSchema(schema, {
		target: "draft-2020-12",
		io: "input",
		unrepresentable: "any",
		override: ({ zodSchema, jsonSchema }) => {
			const type = zodSchema._zod.def.type;
			if (type === "date") {
				jsonSchema.type = "string";
				jsonSchema.format = "date-time";
			} else if (UNREPRESENTABLE.has(type)) {
				throw new Error(`a ${type} has no JSON Schema form`);
			}
		},
	}) as JsonSchema;
}

// A procedure declared with no `.input`, or with `.input(z.undefined())` or
// `.input(z.void())`, takes no input: the empty object.
function takesNoInput(schema: z.ZodType | undefined): schema is undefined {
	if (schema === undefined) return true;
	const type = schema._zod.def.type;
	return type === "undefined" || type === "void";
}

/** A procedure's zod input as the JSON Schema of an object, dates as `date-time` strings; an input of `undefined` or `void`, or none, is the empty object. Throws when a part has no JSON Schema form or the input is not an object. */
export function inputJsonSchema(schema: z.ZodType | undefined): JsonSchema {
	if (takesNoInput(schema)) return { type: "object" };
	const json = jsonSchema(schema);
	if (json.type !== "object") {
		throw new Error("its input is not an object schema");
	}
	return json;
}

// A built procedure carries its definition under `~orpc`. Read by shape so this
// module, which route files import for `z`, pulls nothing of the server into a
// client bundle.
interface Built {
	"~orpc": { inputSchema?: unknown; meta?: unknown };
}

function isProcedure(node: unknown): node is Built {
	return (
		typeof node === "object" &&
		node !== null &&
		typeof (node as Built)["~orpc"] === "object" &&
		(node as Built)["~orpc"] !== null
	);
}

/** Every procedure of a router, by dotted path: what `stack generate` writes to `.stack/schema.ts`. An input of `undefined` or `void`, or none, is the empty object; an input that is not an object (a union) is `null`; a procedure that cannot be converted throws, naming its path. */
export function routerSchema(routes: unknown): Record<string, ProcedureSchema> {
	const out: Record<string, ProcedureSchema> = {};
	const walk = (node: unknown, path: string[]) => {
		const name = path.join(".");
		if (isProcedure(node)) {
			const def = node["~orpc"];
			const schema = def.inputSchema as z.ZodType | undefined;
			try {
				const json = takesNoInput(schema)
					? { type: "object" }
					: jsonSchema(schema);
				const { kind, scope } = (def.meta ?? {}) as {
					kind?: string;
					scope?: string;
				};
				if (kind !== "query" && kind !== "mutation") {
					throw new Error("it has no kind (not built by `procedure`)");
				}
				const { $schema: _, ...input } = json;
				out[name] = {
					input: input.type === "object" ? input : null,
					kind,
					scope: scope ?? null,
				};
			} catch (error) {
				const reason = error instanceof Error ? error.message : String(error);
				throw new Error(`${name}: ${reason}`);
			}
			return;
		}
		if (typeof node === "object" && node !== null) {
			for (const [key, child] of Object.entries(node)) {
				walk(child, [...path, key]);
			}
		}
	};
	walk(routes, []);
	return out;
}
