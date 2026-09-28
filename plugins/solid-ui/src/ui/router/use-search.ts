import { useSearchParams } from "@solidjs/router";
import { type Accessor, createMemo } from "solid-js";
import { parseSearch, type SearchOutput, type SearchSchema } from "./search.ts";

// The current URL's search params parsed by the page's exported `search`
// schema. Values arrive as strings, so a number or boolean key coerces
// (`z.coerce.number()`).
export function useSearch<S extends SearchSchema>(
	schema: S,
): Accessor<SearchOutput<S>> {
	const [params] = useSearchParams();
	return createMemo(() => {
		const raw: Record<string, string> = {};
		for (const [key, value] of Object.entries(params)) {
			if (typeof value === "string") raw[key] = value;
		}
		return parseSearch(schema, raw) as SearchOutput<S>;
	});
}
