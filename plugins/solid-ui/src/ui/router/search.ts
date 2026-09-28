// Search params parsed by a page's `search` schema, a Standard Schema (zod
// implements it). Read through the spec so the router names no validation
// library.
export interface SearchSchema<O = unknown> {
	readonly "~standard": {
		readonly validate: (value: unknown) => SearchResult<O> | Promise<unknown>;
		readonly types?: { readonly input: unknown; readonly output: O };
	};
}

type SearchResult<O> =
	| { readonly value: O; readonly issues?: undefined }
	| {
			readonly issues: ReadonlyArray<{
				readonly path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
			}>;
	  };

export type SearchOutput<S extends SearchSchema> = NonNullable<
	S["~standard"]["types"]
>["output"];

function validate<O>(schema: SearchSchema<O>, raw: unknown): SearchResult<O> {
	const result = schema["~standard"].validate(raw);
	if (result instanceof Promise) {
		throw new Error(
			"useSearch: the page's search schema must validate synchronously.",
		);
	}
	return result as SearchResult<O>;
}

function issueKey(
	path: ReadonlyArray<PropertyKey | { key: PropertyKey }> | undefined,
): PropertyKey | undefined {
	const first = path?.[0];
	return typeof first === "object" && first !== null ? first.key : first;
}

// A URL is typed by hand and shared, so a bad value never throws: the keys
// the schema rejects are dropped and the rest parsed again, and failing that
// the schema's defaults stand. A schema whose defaults cannot stand (a
// required key) throws, since no URL could satisfy it on arrival.
export function parseSearch<O>(
	schema: SearchSchema<O>,
	raw: Record<string, string>,
): O {
	const first = validate(schema, raw);
	if (!first.issues) return first.value;
	const rejected = new Set(first.issues.map((issue) => issueKey(issue.path)));
	const kept = Object.fromEntries(
		Object.entries(raw).filter(([key]) => !rejected.has(key)),
	);
	const second = validate(schema, kept);
	if (!second.issues) return second.value;
	const defaults = validate(schema, {});
	if (!defaults.issues) return defaults.value;
	throw new Error(
		"useSearch: the page's search schema has a required key, so no URL without it can load the page.",
	);
}
