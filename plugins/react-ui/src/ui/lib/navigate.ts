import {
	createContext,
	type MouseEvent,
	use,
	useSyncExternalStore,
} from "react";

// The slice of the app's router that routing in place needs, typed
// structurally so react-ui imports no router. The generated entry hands the
// app's router to `bindRouter` right after creating it.
export interface InPlaceRouter {
	navigate(options: { href: string }): unknown;
	subscribe(event: "onResolved", listener: () => void): unknown;
	state: {
		location: { href: string };
		resolvedLocation?: { href: string };
	};
}

// The page holds one router and one location listener, whatever reads the
// route: every reader hears it through the set. Unbound (routes off, a
// render outside the app's router) the location is read from the document
// and an act loads it.
let bound: InPlaceRouter | undefined;
const readers = new Set<() => void>();
const hear = () => {
	for (const reader of readers) reader();
};

export function bindRouter(router: InPlaceRouter): void {
	bound = router;
	router.subscribe("onResolved", hear);
	hear();
}

function onLocation(notify: () => void): () => void {
	if (readers.size === 0) {
		addEventListener("popstate", hear);
		addEventListener("hashchange", hear);
	}
	readers.add(notify);
	return () => {
		readers.delete(notify);
		if (readers.size === 0) {
			removeEventListener("popstate", hear);
			removeEventListener("hashchange", hear);
		}
	};
}

const unheard = () => () => {};

// Set by a List around its rows: the route it read once, which each row
// reads instead of subscribing on its own.
export const ListedRoute = createContext<string | undefined>(undefined);

// The route drawn: the router's resolved location, so a place's selection
// flips with the page; unbound, the location's path, query and hash.
function drawn(): string {
	if (bound) return (bound.state.resolvedLocation ?? bound.state.location).href;
	return location.pathname + location.search + location.hash;
}

// The current route: the location's path, its query and its hash.
export function useRoute(): string {
	const listed = use(ListedRoute);
	const own = useSyncExternalStore(
		listed === undefined ? onLocation : unheard,
		drawn,
		() => "/",
	);
	return listed ?? own;
}

// An href from the app's root is a route; a scheme (`https:`, `mailto:`), a
// protocol-relative `//` or a bare `#hash` is somewhere else.
export function isRoute(href: string): boolean {
	return /^\/(?!\/)/.test(href);
}

// Bound, a route opens in the router with no document load.
export function navigate(route: string): void {
	if (bound && isRoute(route)) bound.navigate({ href: route });
	else location.assign(route);
}

// An anchor's click: a plain primary click on a route of the app opens it in
// place; every other click (modifier, middle, external, unbound) is the
// browser's, so a new tab and a copied link keep working.
export function follow(event: MouseEvent<HTMLAnchorElement>): void {
	if (!bound || event.defaultPrevented) return;
	if (event.button !== 0) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
	const href = event.currentTarget.getAttribute("href");
	if (href === null || !isRoute(href)) return;
	event.preventDefault();
	navigate(href);
}
