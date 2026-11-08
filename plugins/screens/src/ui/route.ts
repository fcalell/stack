// A route's `$param`s: `$id`, `{$id}` between literal text, `{-$id}` optional,
// and a bare `$` for the splat (named `_splat`, as TanStack names it).
const PARAM = /\{(-?)\$(\w*)\}|\$(\w*)/g;

// The example values the fixtures give: a name holds a value for every route,
// a route id (it starts with `/`) holds the values of that route and every
// route under it.
type Given = Readonly<
	Record<string, string | Readonly<Record<string, string>>>
>;

// The route ids whose entry applies to a route: its own and each ancestor's,
// least specific first.
function scopesOf(routeId: string, params: Given): string[] {
	return Object.keys(params)
		.filter(
			(key) =>
				key.startsWith("/") &&
				(routeId === key ||
					routeId.startsWith(key.endsWith("/") ? key : `${key}/`)),
		)
		.sort((a, b) => a.length - b.length);
}

// The values a route is drawn with: the plain ones, then each scope's over
// them, the most specific last so it wins.
export function paramsFor(
	routeId: string,
	params: Given,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [name, value] of Object.entries(params))
		if (typeof value === "string") out[name] = value;
	for (const scope of scopesOf(routeId, params)) {
		const values = params[scope];
		if (typeof values === "object") Object.assign(out, values);
	}
	return out;
}

// The URL a route is drawn at: its full path with each param filled from the
// example values the fixtures give it. A required param without one throws,
// naming the route, the param and where it looked, so the gap is the story's
// error and never a path with `$id` in it.
export function routeUrl(
	routeId: string,
	fullPath: string,
	given: Given,
): string {
	const params = paramsFor(routeId, given);
	const url = fullPath.replace(
		PARAM,
		(_match, optional: string | undefined, braced: string, bare: string) => {
			const name = (braced ?? bare) || "_splat";
			const value = params[name];
			if (value !== undefined) return value;
			if (optional) return "";
			const searched = [
				"the plain params",
				...scopesOf(routeId, given).map((scope) => `the entry ${scope}`),
			].join(", ");
			throw new Error(
				`no example value for the param "${name}" of the route ${routeId} (searched ${searched}): add { ${name}: "…" } to the params in src/app/fixtures.ts, or under the key "${routeId}"`,
			);
		},
	);
	return url.replace(/\/{2,}/g, "/") || "/";
}

// The URL a screen is drawn at: the route's URL and the fixtures' example
// search, which a route that reads its search (the router's `location.searchStr`)
// finds in the story's memory history. The search may come with or without its
// `?`; an empty one adds nothing.
export function withSearch(url: string, search = ""): string {
	const bare = search.replace(/^\?/, "");
	return bare === "" ? url : `${url}?${bare}`;
}
