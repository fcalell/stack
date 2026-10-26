// What a `Form` is made of on both platforms: how an input key draws (`FieldSpec`),
// and what it reads of a procedure's input schema (the JSON Schema `stack
// generate` writes to `.stack/schema.ts`) to draw one field: the control, whether
// the field is required, and the values it can take. No React: each platform
// draws the controls.
import type { Option, PickedFile } from "./descriptors.ts";
import { filled, type Words } from "./tokens.ts";

/** The subset of JSON Schema (draft 2020-12) a procedure's input is made of. */
export interface JsonSchema {
	type?: string | readonly string[];
	format?: string;
	/** `base64` marks a string that carries bytes. */
	contentEncoding?: string;
	/** A string's length bounds; equal, they are a fixed length (a one-time code's digits). */
	minLength?: number;
	maxLength?: number;
	enum?: readonly unknown[];
	const?: unknown;
	anyOf?: readonly JsonSchema[];
	oneOf?: readonly JsonSchema[];
	items?: JsonSchema;
	properties?: Readonly<Record<string, JsonSchema>>;
	required?: readonly string[];
	default?: unknown;
}

/** One procedure as `.stack/schema.ts` holds it. */
export interface ProcedureSchema {
	readonly input: JsonSchema | null;
	readonly kind: "query" | "mutation";
	/** The input key the procedure's scope adds, or null. */
	readonly scope: string | null;
}

/** What a field draws: a line of text, a number, a date (a `date-time` is sent as a `Date`), a switch, a pick of one value, a pick of several, the prose and source hints' text areas, the one-time code boxes, the file pick, a list as a line per item, or an object as json source. */
export type Control =
	| "text"
	| "number"
	| "date"
	| "switch"
	| "pick"
	| "several"
	| "prose"
	| "source"
	| "code"
	| "file"
	| "lines"
	| "json";

/** A type a `lines` field's item can have. */
export type LineKind = "string" | "number" | "integer" | "boolean" | "null";

/** A field as its schema entry and its hint derive it. */
export interface Derived {
	control: Control;
	/** Not optional and not nullable: an empty field blocks the submit. */
	required: boolean;
	/** The empty field is sent as `null`. */
	nullable: boolean;
	/** The values an enum (or an array of one) allows; none where the field's spec lists the choices (a list of strings with `options`). */
	values: readonly string[] | undefined;
	/** What the schema says the field holds when the input has none. */
	fallback: unknown;
	/** The date is sent as a `Date` (a `date-time`), not the string typed. */
	instant: boolean;
	/** The picked file is sent as base64 (the schema's `contentEncoding`), not as text. */
	base64: boolean;
	/** A `code` field's digits: the schema's fixed length. */
	length: number | undefined;
	/** The types a `lines` field's items take, as the schema's `items` says them. */
	kinds: readonly LineKind[] | undefined;
}

/** A field with no control: the hint a text area, the code boxes, a date, a file pick, lines or json adds, which the schema cannot say. */
export type Hint =
	| "prose"
	| "source"
	| "code"
	| "date"
	| "file"
	| "lines"
	| "json";

// The type an option of a field's value takes: an enum's member, or an array's.
type Item<V> = Extract<
	NonNullable<V> extends readonly (infer E)[] ? E : NonNullable<V>,
	string
>;

// The keys of an input that hold a string (or may hold none).
type StringKey<I> = {
	[K in keyof I]-?: NonNullable<I[K]> extends string ? K : never;
}[keyof I];

/** How one input key draws: its label and what the schema cannot say. The control, whether it is required, its values and its issue line come from the procedure's input schema. `W` is what a platform widens `options` with (a selection of them); `I` is the input the key belongs to, which names the sibling a file's name goes to. */
export interface FieldSpec<V = unknown, W = never, I = unknown> {
	/** The field's name, over its control (a short phrase; wraps). */
	label: string;
	/** Under the control (a sentence; wraps). */
	description?: string;
	/** What the schema cannot say about a string, named as the `Input` that draws it: `prose` (many lines), `source` (many lines, mono: `Input kind="prose" source`), `code` (a one-time code's digit boxes, `Input kind="code"`: the schema's `minLength` and `maxLength` are its `length`, so they must be equal or the field throws, and the submit stays blocked until every box is filled), `date` (a day) or `file` (the file pick: the picked file is read into the string, as text, or as base64 where the schema entry has `contentEncoding: "base64"`; it takes `accept`). Two hints draw a shape the schema has no text for. `lines`: a list of strings, numbers, booleans or `null`, in a text area, one item per line; each line is trimmed and blank lines are dropped; the value sent is the array, each line read as the type the schema's `items` allows (`true` or `false` as a boolean, `null` as null, a number as a number, anything else as a string), and a line that fits none of them is the field's issue ("Line 3 isn't a value this list takes."); `values` joins the array with newlines; empty sends `null` where nullable and the key absent where optional. `json`: an object, a list of objects, or any value (`z.unknown()`), in a mono text area holding the JSON text, parsed when the form commits (the submit, or the field's commit): a parse error stands under the field as its issue, the parser's own message with its position where it gives one; the parsed value is sent; `values` pretty-prints with two-space indent; empty sends `null` where nullable and the key absent where optional. A hint the schema does not fit throws naming the key. */
	control?: Hint;
	/** The types a `control: "file"` field takes: MIME types or families (`text/csv`, `image/*`) and extensions (`.har`). JSON Schema has no form for it, so a file field says it. */
	accept?: readonly string[];
	/** The field stands inert and this is the reason, in the description's place (a sentence; wraps), as a row's `locked`. */
	locked?: string;
	/** The choices of a string field the schema does not enumerate (a read of records), or the labels of an enum's members. On a list of strings they make a pick of several. A function takes the input the fields standing before this one make (`given` included, a field with no value absent) and answers the choices, called again as that draft changes, so a pick narrows by another field, and a function may answer a read (`W`) that paints the pick while it waits; a chosen value that is no longer among them is cleared. */
	options?:
		| readonly Option<Item<V>>[]
		| W
		| ((draft: Partial<I>) => readonly Option<Item<V>>[] | W);
	/** On a `control: "file"` field: the input's string key that receives the picked file's name when the file is read (the field's own key holds the content), so an input of `{ file, fileName }` loses neither. */
	name?: StringKey<I>;
}

/** The fields of a form, keyed by the input's keys in the order they stand. */
export type FormFields<I, W = never> = {
	[K in keyof I]?: FieldSpec<I[K], W, I>;
};

/** One titled run of a form's fields. */
export interface FormGroupOf<I, W = never> {
	/** The group's name, on its band (a short phrase; wraps). */
	title: string;
	/** Under the title (a sentence; wraps). */
	description?: string;
	/** The group's fields, keyed by the input's keys in the order they stand. */
	fields: FormFields<I, W>;
}

/** What the caller must be allowed to do for a form to submit: an ability's action and subject (`["create", "request"]`), checked in the registered scope's organization. */
export type Can = readonly [action: string, subject: string];

const members = (schema: JsonSchema) => schema.anyOf ?? schema.oneOf;

// Strips the `null` branch of a union (a nullable), and folds a union of
// literals into one enum.
function unwrap(schema: JsonSchema): { schema: JsonSchema; nullable: boolean } {
	const type = schema.type;
	if (Array.isArray(type) && type.includes("null")) {
		const rest = type.filter((one) => one !== "null");
		return {
			schema: { ...schema, type: rest.length === 1 ? rest[0] : rest },
			nullable: true,
		};
	}
	const union = members(schema);
	if (!union) return { schema, nullable: false };
	const kept = union.filter((one) => one.type !== "null");
	const nullable = kept.length < union.length;
	if (kept.length === 1 && kept[0]) {
		const inner = unwrap(kept[0]);
		return { schema: inner.schema, nullable: nullable || inner.nullable };
	}
	if (kept.every((one) => one.const !== undefined || one.enum)) {
		return {
			schema: {
				type: "string",
				enum: kept.flatMap((one) =>
					one.enum ? [...one.enum] : [one.const as unknown],
				),
			},
			nullable,
		};
	}
	throw new Error("it is a union the form cannot draw");
}

const LINE_KINDS: readonly string[] = [
	"string",
	"number",
	"integer",
	"boolean",
	"null",
];

// The types an items schema allows, or undefined where one is not a line's.
function kindsOf(schema: JsonSchema | undefined): LineKind[] | undefined {
	if (!schema) return undefined;
	const union = members(schema);
	const own = schema.type === undefined ? [] : [schema.type].flat();
	const all = [...own, ...(union ?? []).flatMap((one) => kindsOf(one) ?? [""])];
	if (all.length === 0 || !all.every((one) => LINE_KINDS.includes(one))) {
		return undefined;
	}
	return all as LineKind[];
}

// Whether a schema is an object, a list of objects, or any value.
function isJson(schema: JsonSchema): boolean {
	if (schema.type === "object") return true;
	if (schema.type === "array") {
		return (
			schema.items !== undefined &&
			unwrap(schema.items).schema.type === "object"
		);
	}
	return (
		schema.type === undefined &&
		schema.enum === undefined &&
		schema.const === undefined &&
		members(schema) === undefined
	);
}

const strings = (values: readonly unknown[]): string[] => {
	if (!values.every((value) => typeof value === "string")) {
		throw new Error("it is an enum of something other than strings");
	}
	return values as string[];
};

/** Derives the field `key` of an input schema. `listed` is whether the field's spec gives `options`: they make a list of strings a pick of several. Throws, naming why, when no control draws it. */
export function derive(
	input: JsonSchema,
	key: string,
	hint: Hint | undefined,
	listed = false,
): Derived {
	const entry = input.properties?.[key];
	if (!entry) throw new Error(`the procedure's input has no "${key}"`);
	const { schema, nullable } = unwrap(entry);
	const required = (input.required?.includes(key) ?? false) && !nullable;
	const base = {
		required,
		nullable,
		values: undefined,
		instant: false,
		base64: false,
		length: undefined,
		kinds: undefined,
		fallback: entry.default,
	};
	if (hint === "lines") {
		const kinds = schema.type === "array" ? kindsOf(schema.items) : undefined;
		if (!kinds) {
			throw new Error(
				"is a lines field whose schema is not a list of strings, numbers, booleans or null",
			);
		}
		return { ...base, control: "lines", kinds };
	}
	if (hint === "json") {
		if (!isJson(schema)) {
			throw new Error(
				"is a json field whose schema is not an object, a list of objects or any value",
			);
		}
		return { ...base, control: "json" };
	}
	if (schema.const !== undefined && !schema.enum) {
		return {
			...base,
			control: "pick",
			values: strings([schema.const]),
		};
	}
	if (schema.enum) {
		return { ...base, control: "pick", values: strings(schema.enum) };
	}
	switch (schema.type) {
		case "string":
			if (schema.format === "date-time") {
				return { ...base, control: "date", instant: true };
			}
			if (hint === "prose" || hint === "source") {
				return { ...base, control: hint };
			}
			if (hint === "code") {
				if (
					schema.minLength === undefined ||
					schema.minLength !== schema.maxLength
				) {
					throw new Error(
						"is a code field whose schema is not a fixed length (`z.string().length(n)`)",
					);
				}
				return { ...base, control: "code", length: schema.minLength };
			}
			if (hint === "file") {
				return {
					...base,
					control: "file",
					base64: schema.contentEncoding === "base64",
				};
			}
			return {
				...base,
				control: hint === "date" || schema.format === "date" ? "date" : "text",
			};
		case "number":
		case "integer":
			return { ...base, control: "number" };
		case "boolean":
			return { ...base, control: "switch" };
		case "array": {
			const item = schema.items ? unwrap(schema.items).schema : undefined;
			if (item?.enum || item?.const !== undefined) {
				return {
					...base,
					control: "several",
					values: strings(item.enum ?? [item.const]),
				};
			}
			if (listed && item?.type === "string") {
				return { ...base, control: "several" };
			}
			throw new Error(
				"it is a list the form can only draw as a pick of values (a list of an enum, or of strings with `options`)",
			);
		}
		default:
			throw new Error("it is a shape the form cannot draw");
	}
}

/** The value a control holds: a string, a boolean, the picked values, or the picked file (`null` once removed). */
export type Held = string | boolean | readonly string[] | PickedFile | null;

const day = (date: Date) => date.toISOString().slice(0, 10);

/** What the control shows for the input's value (a number as typed, a date as `YYYY-MM-DD`). Nothing where the input has none. */
export function toHeld(derived: Derived, value: unknown): Held | undefined {
	if (value === undefined) value = derived.fallback;
	if (value === undefined || value === null) return undefined;
	switch (derived.control) {
		case "switch":
			return value === true;
		case "several":
			return Array.isArray(value) ? (value as string[]) : undefined;
		case "date":
			return value instanceof Date ? day(value) : String(value);
		case "file":
			return undefined;
		case "lines":
			return Array.isArray(value) ? value.map(String).join("\n") : undefined;
		case "json":
			return JSON.stringify(value, null, 2);
		default:
			return String(value);
	}
}

/** Whether the field holds nothing the procedure would take. */
export function isEmpty(derived: Derived, shown: Held | undefined): boolean {
	if (shown === undefined || shown === null) return true;
	if (derived.control === "several")
		return (shown as readonly string[]).length === 0;
	return typeof shown === "string" && shown.trim() === "";
}

// The item a line is, in the type the schema allows: a boolean, then null, then a number, then the text.
function lineOf(
	line: string,
	kinds: readonly LineKind[],
): { value: unknown } | undefined {
	if (kinds.includes("boolean") && (line === "true" || line === "false")) {
		return { value: line === "true" };
	}
	if (kinds.includes("null") && line === "null") return { value: null };
	const number = Number(line);
	if (
		Number.isFinite(number) &&
		(kinds.includes("number") ||
			(kinds.includes("integer") && Number.isInteger(number)))
	) {
		return { value: number };
	}
	return kinds.includes("string") ? { value: line } : undefined;
}

/** The input's value for what the control holds; `invalid` where it holds no value of that type (a number that is not one, a date no calendar has, a code with a box unfilled); an `issue` where the text says why (a line that fits no item type, JSON that does not parse). */
export function toInput(
	derived: Derived,
	shown: Held,
	words: Words,
): { value: unknown } | { issue: string } | "invalid" {
	switch (derived.control) {
		case "lines": {
			const items: unknown[] = [];
			const lines = (shown as string).split(/\r?\n/);
			for (const [at, text] of lines.entries()) {
				const line = text.trim();
				if (line === "") continue;
				const item = lineOf(line, derived.kinds ?? []);
				if (!item) {
					return { issue: filled(words.badLine, { at: String(at + 1) }) };
				}
				items.push(item.value);
			}
			return { value: items };
		}
		case "json":
			try {
				return { value: JSON.parse(shown as string) };
			} catch (error) {
				return {
					issue: error instanceof Error ? error.message : String(error),
				};
			}
		case "number": {
			const value = Number((shown as string).trim());
			return Number.isNaN(value) ? "invalid" : { value };
		}
		case "date": {
			const text = (shown as string).trim();
			if (!derived.instant) return { value: text };
			const value = new Date(text);
			return Number.isNaN(value.getTime()) ? "invalid" : { value };
		}
		case "code":
			return (shown as string).length === derived.length
				? { value: shown }
				: "invalid";
		case "switch":
		case "several":
			return { value: shown };
		default:
			return { value: shown };
	}
}

// Bytes as base64, in chunks the call stack takes.
function base64Of(bytes: Uint8Array): string {
	let binary = "";
	for (let at = 0; at < bytes.length; at += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
	}
	return btoa(binary);
}

/** The string a `file` field sends for the file picked: its text, or its bytes as base64. */
export async function readPicked(
	file: PickedFile,
	base64: boolean,
): Promise<string> {
	const read = new Response(await file.blob());
	return base64
		? base64Of(new Uint8Array(await read.arrayBuffer()))
		: read.text();
}

// The label as it reads inside a sentence: its first word lowered where it is
// an ordinary capitalised word ("Package directory" → "package directory"),
// a name or an initialism kept ("GitHub token", "URL").
function inSentence(label: string): string {
	const first = /^\p{Lu}\p{Ll}+(?=\s|$)/u.exec(label)?.[0];
	return first === undefined
		? label
		: `${first.toLowerCase()}${label.slice(first.length)}`;
}

/** Why a form's submit is blocked while a required field is empty, naming the field: "Give the package directory." (`words.giveField`), or for a pick or a file "Pick the region." (`words.pickField`); a label that is a question ("By when?") is its own reason. */
export function requiredReason(
	words: Words,
	label: string,
	picks: boolean,
): string {
	if (label.trimEnd().endsWith("?")) return label;
	return filled(picks ? words.pickField : words.giveField, {
		label: inSentence(label),
	});
}
