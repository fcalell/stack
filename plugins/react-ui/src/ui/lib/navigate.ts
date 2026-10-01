import { useSyncExternalStore } from "react";

// react-ui has no seam to the app's router: a place is a plain link, the
// current place is read off the location, and a route an act goes to is a
// document load.
function onLocation(notify: () => void): () => void {
	addEventListener("popstate", notify);
	return () => removeEventListener("popstate", notify);
}

export function usePathname(): string {
	return useSyncExternalStore(
		onLocation,
		() => location.pathname,
		() => "/",
	);
}

export function navigate(route: string): void {
	location.assign(route);
}

// A place is current at its route and below it; the root only at itself.
export function isCurrent(route: string, pathname: string): boolean {
	if (route === "/") return pathname === "/";
	return pathname === route || pathname.startsWith(`${route}/`);
}
