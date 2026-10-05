import { router, usePathname } from "expo-router";
import type { Route } from "./route";

// A route on a row or a back circle navigates through expo-router; the shell
// reads the pathname to mark the selected place.
export function navigate(route: Route): void {
	router.navigate(route);
}

export { usePathname };

// An href from the app's root is a route; a scheme (`https:`, `mailto:`) or a
// protocol-relative `//` is somewhere else, which the OS opens.
export function isRoute(href: string): href is Route {
	return /^\/(?!\/)/.test(href);
}

// A place is current at its route and below it; the root only at itself.
export function isCurrent(route: string, pathname: string): boolean {
	if (route === "/") return pathname === "/";
	return pathname === route || pathname.startsWith(`${route}/`);
}
