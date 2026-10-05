import { router, usePathname } from "expo-router";
import type { Route } from "./route";

// A route on a row or a back circle navigates through expo-router; the shell
// reads the pathname to mark the selected place.
export function navigate(route: Route): void {
	router.navigate(route);
}

export { usePathname };

// A place is current at its route and below it; the root only at itself.
export function isCurrent(route: string, pathname: string): boolean {
	if (route === "/") return pathname === "/";
	return pathname === route || pathname.startsWith(`${route}/`);
}
