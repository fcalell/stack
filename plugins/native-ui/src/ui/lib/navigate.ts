import { useQueryClient } from "@tanstack/react-query";
import { router, usePathname } from "expo-router";
import { store } from "expo-router/build/global-state/router-store";
import { useCallback } from "react";
import { Linking } from "react-native";
import type { Route } from "./route";
import { warm } from "./warm";

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

// A link's destination: a route navigates, anything else the OS opens.
export function open(href: string): void {
	if (isRoute(href)) navigate(href);
	else Linking.openURL(href);
}

// What a press on a route does first: its press-in starts the reads the screen
// is about to make (the route file's `preload` export), so the push finds them
// under way. One function serves every press, since each route's `preload` is
// read from its file; an external URL has no route to warm.
export function useWarm(): (href: string) => void {
	const client = useQueryClient();
	return useCallback(
		(href) => {
			if (!isRoute(href)) return;
			warm(
				client,
				{
					routeNode: store.routeNode,
					getStateForHref: (at) => store.getStateForHref(at as Route),
				},
				href,
			);
		},
		[client],
	);
}
