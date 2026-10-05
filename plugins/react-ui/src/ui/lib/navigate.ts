import { createContext, use, useSyncExternalStore } from "react";

// react-ui has no seam to the app's router: a place is a plain link, the
// current place is read off the location, and a route an act goes to is a
// document load. The page holds one location listener, whatever reads the
// route: every reader hears it through the set.
const readers = new Set<() => void>();
const hear = () => {
	for (const reader of readers) reader();
};

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

// The current route: the location's path, its query and its hash.
export function useRoute(): string {
	const listed = use(ListedRoute);
	const own = useSyncExternalStore(
		listed === undefined ? onLocation : unheard,
		() => location.pathname + location.search + location.hash,
		() => "/",
	);
	return listed ?? own;
}

export function navigate(route: string): void {
	location.assign(route);
}

// A place is current at its route and below it, the root only at itself; a
// route's query narrows it to the routes carrying each of its parameters, and
// its hash to the route carrying that hash (a bare `#id` names a spot on the
// current page, so only the hash is compared).
export function isCurrent(route: string, current: string): boolean {
	const want = new URL(route, "https://route.invalid");
	const here = new URL(current, "https://route.invalid");
	if (route.startsWith("#")) return here.hash === want.hash;
	if (want.hash !== "" && here.hash !== want.hash) return false;
	for (const [key, value] of want.searchParams)
		if (!here.searchParams.getAll(key).includes(value)) return false;
	if (want.pathname === "/") return here.pathname === "/";
	return (
		here.pathname === want.pathname ||
		here.pathname.startsWith(`${want.pathname}/`)
	);
}
