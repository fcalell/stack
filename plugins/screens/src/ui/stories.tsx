import {
	bindRouter,
	fixtures,
	handlers,
	prefixes,
	routeTree,
} from "virtual:stack-screens";
import type { StoryObj } from "@storybook/react-vite";
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";
import { fixtureHandlers, type ScreenState } from "./answer.ts";
import { routeUrl } from "./route.ts";

// The app's real router at a route's URL, in a memory history: the URL is the
// route's full path with its params filled from the fixtures. A first router
// reads the full path, which only a built route knows.
function routerAt(routeId: string) {
	const probe = createRouter({ routeTree, history: createMemoryHistory() });
	const route = (
		probe.routesById as Record<string, { fullPath: string } | undefined>
	)[routeId];
	if (!route) throw new Error(`the route tree holds no route ${routeId}`);
	const url = routeUrl(routeId, route.fullPath, fixtures?.params ?? {});
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [url] }),
	});
	bindRouter(router);
	return router;
}

function Screen({ routeId }: { routeId: string }) {
	const [router] = useState(() => routerAt(routeId));
	return <RouterProvider router={router} />;
}

// One screen of a route in one state: the app's router at the route's URL,
// while the worker answers every call to the app's procedures from the
// fixtures for that state. `globals` pins toolbar globals for the story, which
// a story file does for the combinations a test run checks.
export function screenStory(
	routeId: string,
	state: ScreenState,
	globals: Record<string, string> = {},
): StoryObj {
	return {
		globals,
		parameters: {
			layout: "fullscreen",
			msw: {
				handlers: [
					...handlers,
					...fixtureHandlers(prefixes, fixtures?.procedures, state),
				],
			},
		},
		render: () => <Screen routeId={routeId} />,
	};
}
