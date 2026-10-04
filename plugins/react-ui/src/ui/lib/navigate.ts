import { useSyncExternalStore } from "react";

// react-ui has no seam to the app's router: a place is a plain link, the
// current place is read off the location, and a route an act goes to is a
// document load.
function onLocation(notify: () => void): () => void {
	addEventListener("popstate", notify);
	return () => removeEventListener("popstate", notify);
}

// The current route: the location's path and its query.
export function useRoute(): string {
	return useSyncExternalStore(
		onLocation,
		() => location.pathname + location.search,
		() => "/",
	);
}

export function navigate(route: string): void {
	location.assign(route);
}

// A place is current at its route and below it, the root only at itself; a
// route's query narrows it to the routes carrying each of its parameters.
export function isCurrent(route: string, current: string): boolean {
	const want = new URL(route, "https://route.invalid");
	const here = new URL(current, "https://route.invalid");
	for (const [key, value] of want.searchParams)
		if (!here.searchParams.getAll(key).includes(value)) return false;
	if (want.pathname === "/") return here.pathname === "/";
	return (
		here.pathname === want.pathname ||
		here.pathname.startsWith(`${want.pathname}/`)
	);
}
