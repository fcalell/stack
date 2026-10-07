import type { PreviewGlobal } from "../types.ts";

// What a route's screens are, shared by the story files that declare them and
// the stories that draw them.

// The states a screen is drawn in: one story each, exported under `exportName`.
export const SCREEN_STATES = [
	{ state: "data", exportName: "Data", name: "Data" },
	{ state: "loading", exportName: "Loading", name: "Loading" },
	{ state: "error", exportName: "Error", name: "Error" },
	{ state: "empty", exportName: "Empty", name: "Empty" },
	{ state: "notFound", exportName: "NotFound", name: "Not found" },
] as const;

const FILE_ROUTE = /\bcreateFileRoute\(\s*(["'`])([^"'`]+)\1/;
const LAZY_ROUTE = /\bcreateLazyFileRoute\(\s*(["'`])([^"'`]+)\1/;

// The route id a route file declares, `createFileRoute("/projects/$id")`: the
// string TanStack's generator writes and checks against the file's place, so
// it is the file's id without redoing the generator's naming rules. Null for
// a file that declares none (the root route, a file the router ignores).
export function fileRouteId(source: string): string | null {
	return FILE_ROUTE.exec(source)?.[2] ?? null;
}

// The id a lazy route file completes, `createLazyFileRoute("/projects")`: the
// id of the route that imports it.
export function lazyRouteId(source: string): string | null {
	return LAZY_ROUTE.exec(source)?.[2] ?? null;
}

// Whether a route is a screen: a pathless layout (`/_app`) has no URL of its
// own and draws only around the routes it holds, which are screens.
export function isScreen(routeId: string): boolean {
	return !routeId.slice(routeId.lastIndexOf("/") + 1).startsWith("_");
}

// The route id of a route file that is a screen, else null.
export function routeIdOf(source: string): string | null {
	const id = fileRouteId(source);
	return id === null || !isScreen(id) ? null : id;
}

// The ids of the routes a route draws inside: its path's prefixes, each a
// layout where a file declares it (`/_app/deploys/$id/` is inside
// `/_app/deploys/$id`, `/_app/deploys` and `/_app`).
export function ancestorIds(routeId: string): string[] {
	const segments = routeId.split("/");
	return segments
		.slice(2)
		.map((_, index) => segments.slice(0, index + 2).join("/"));
}

// The sidebar title of a route's screens: its id under `Screens/` without the
// segments that add no URL (a pathless layout `_app`, a group `(auth)`), a
// trailing slash (an index route) named `index` so it never shares a title
// with the route it indexes.
export function screenTitle(routeId: string): string {
	const path = routeId
		.replace(/^\//, "")
		.split("/")
		.filter((segment) => !/^(_|\(.*\)$)/.test(segment))
		.join("/");
	if (path === "") return "Screens/index";
	return `Screens/${path.endsWith("/") ? `${path}index` : path}`;
}

// One extra story per screen state: a combination of the globals' checked
// values other than the one every story opens with (the dev story covers it).
export interface CheckVariant {
	// Every global's value in the combination.
	globals: Record<string, string>;
	// The values that differ from the defaults, which name the story.
	label: string[];
}

// Every combination of the globals' checked values, less the defaults'.
export function checkVariants(globals: PreviewGlobal[]): CheckVariant[] {
	let combinations: Array<Record<string, string>> = [{}];
	for (const global of globals) {
		combinations = combinations.flatMap((combination) =>
			(global.checked ?? [global.default]).map((value) => ({
				...combination,
				[global.name]: value,
			})),
		);
	}
	return combinations.flatMap((combination) => {
		const label = globals.flatMap((global) =>
			combination[global.name] === global.default
				? []
				: [combination[global.name] as string],
		);
		return label.length === 0 ? [] : [{ globals: combination, label }];
	});
}
