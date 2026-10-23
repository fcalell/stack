import type { QueryClient } from "@tanstack/react-query";

// The parts of expo-router's store a press-in reads: the route tree (a node per
// route file, loaded on demand) and the router's own match of an href against
// it, a nested state that names a route at each layout level.
export interface Matches {
	routeNode: Node | null;
	getStateForHref(href: string): Matched | undefined;
}

interface Node {
	route: string;
	children: Node[];
	loadRoute(): object;
}

interface Matched {
	routes: readonly Step[];
}

interface Step {
	name: string;
	params?: object;
	state?: Matched;
}

// expo-router names the tree's root `__root` in a matched state.
const ROOT = "__root";

// The route file an href opens, and the params the router read from the href
// along the way (a layout's dynamic segments belong to the routes under it).
function moduleOf(
	matches: Matches,
	href: string,
): { module: object; params: object } | undefined {
	let node = matches.routeNode;
	let step = matches.getStateForHref(href)?.routes.at(-1);
	let params = {};
	while (node && step) {
		params = { ...params, ...step.params };
		const next: Node | undefined =
			step.name === ROOT
				? node
				: node.children.find((child) => child.route === step?.name);
		if (!next) return undefined;
		node = next;
		step = step.state?.routes.at(-1);
	}
	return node ? { module: node.loadRoute(), params } : undefined;
}

// A press-in on a route starts the reads its screen is about to make: the route
// file's `preload` export, called with the app's client and the href's params,
// as a web route's `loader` is. A route with no `preload` has nothing to start.
// Navigation never waits on it, and one that fails to start must not stop it.
export function warm(
	client: QueryClient,
	matches: Matches,
	href: string,
): void {
	try {
		const found = moduleOf(matches, href);
		if (found && "preload" in found.module) {
			const { preload } = found.module;
			if (typeof preload === "function") preload(client, found.params);
		}
	} catch (error) {
		console.error(error);
	}
}
