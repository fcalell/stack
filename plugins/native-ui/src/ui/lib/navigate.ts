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

// Whether expo-router serves a route of its own at `href`: its state for the
// path ends in a screen, not the `+not-found` one.
function served(href: string): boolean {
	let state = store.getStateForHref(href as Route) as
		| { routes?: { name: string; state?: unknown }[] }
		| undefined;
	let name: string | undefined;
	while (state?.routes?.length) {
		const last = state.routes[state.routes.length - 1];
		name = last?.name;
		state = last?.state as typeof state;
	}
	return name !== undefined && name !== "+not-found";
}

// The route the page above this one is at: the nearest path above the pathname
// (its last segment dropped, then the next, up to `/`) that expo-router
// serves a screen at. Groups (`(tabs)`) are not in the pathname, so they are
// never a step. Where nothing above is served (the pathname is `/`), it
// cannot be known.
export function useParentRoute(): Route | undefined {
	const segments = usePathname().split("/").filter(Boolean);
	while (segments.length > 0) {
		segments.pop();
		const above = `/${segments.join("/")}`;
		if (served(above)) return above as Route;
	}
	return undefined;
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
