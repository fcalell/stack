// A route's `$param`s: `$id`, `{$id}` between literal text, `{-$id}` optional,
// and a bare `$` for the splat (named `_splat`, as TanStack names it).
const PARAM = /\{(-?)\$(\w*)\}|\$(\w*)/g;

// The URL a route is drawn at: its full path with each param filled from the
// example values the fixtures give. A required param without one throws,
// naming the route and the param, so the gap is the story's error and never a
// path with `$id` in it.
export function routeUrl(
	routeId: string,
	fullPath: string,
	params: Readonly<Record<string, string>>,
): string {
	const url = fullPath.replace(
		PARAM,
		(_match, optional: string | undefined, braced: string, bare: string) => {
			const name = (braced ?? bare) || "_splat";
			const value = params[name];
			if (value !== undefined) return value;
			if (optional) return "";
			throw new Error(
				`no example value for the param "${name}" of the route ${routeId}: add { ${name}: "…" } to the params in src/app/fixtures.ts`,
			);
		},
	);
	return url.replace(/\/{2,}/g, "/") || "/";
}
