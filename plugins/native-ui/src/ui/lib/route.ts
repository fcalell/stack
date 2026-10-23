import type { Href } from "expo-router";

// A route on the phone is one of the app's expo-router paths: with the app's
// route types (`.stack/routes.d.ts`) in its program, a path no route file
// serves fails the type-check wherever a route is a prop or a descriptor's.
declare module "@fcalell/ui-core/descriptors" {
	interface RouteRegistry {
		route: Extract<Href, string>;
	}
}

export type { Route } from "@fcalell/ui-core/descriptors";
