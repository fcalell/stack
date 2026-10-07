// What a route's screens are, shared by the indexer, the virtual module that
// serves them and the stories that draw them.

// The states a screen is drawn in: one story each, named and exported alike by
// the indexer's entries and the virtual module's exports.
export const SCREEN_STATES = [
	{ state: "data", exportName: "Data", name: "Data" },
	{ state: "loading", exportName: "Loading", name: "Loading" },
	{ state: "error", exportName: "Error", name: "Error" },
	{ state: "empty", exportName: "Empty", name: "Empty" },
	{ state: "notFound", exportName: "NotFound", name: "Not found" },
] as const;

const FILE_ROUTE = /\bcreateFileRoute\(\s*(["'`])([^"'`]+)\1/;

// The route id a route file declares, `createFileRoute("/projects/$id")`: the
// string TanStack's generator writes and checks against the file's place, so
// it is the file's id without redoing the generator's naming rules. Null for
// a file that declares none (the root route, a file the router ignores) and
// for a pathless layout (`/_app`, no URL of its own: it draws only around the
// routes it holds, which are screens).
export function routeIdOf(source: string): string | null {
	const id = FILE_ROUTE.exec(source)?.[2] ?? null;
	return id === null || id.slice(id.lastIndexOf("/") + 1).startsWith("_")
		? null
		: id;
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

const VIRTUAL_PREFIX = "virtual:stack-screen--";

// The module id a route's stories import, which the Vite plugin serves.
export function screenModuleId(routeId: string): string {
	return `${VIRTUAL_PREFIX}${encodeURIComponent(routeId)}`;
}

// The route a screen module id names, or null for any other id.
export function routeOfModuleId(id: string): string | null {
	return id.startsWith(VIRTUAL_PREFIX)
		? decodeURIComponent(id.slice(VIRTUAL_PREFIX.length))
		: null;
}

// The CSF module of a route's screens: its title, and one story per state.
export function screenModule(routeId: string): string {
	return [
		'import { screenStory } from "@fcalell/plugin-screens/stories";',
		"",
		`export default { title: ${JSON.stringify(screenTitle(routeId))} };`,
		"",
		...SCREEN_STATES.map(
			({ state, exportName, name }) =>
				`export const ${exportName} = screenStory(${JSON.stringify(routeId)}, ${JSON.stringify(state)}, ${JSON.stringify(name)});`,
		),
		"",
	].join("\n");
}
