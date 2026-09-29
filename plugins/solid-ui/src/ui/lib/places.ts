// The route of the selected place: the longest route that is the address or
// one of its segment prefixes, so a place at "/" holds every address no other
// place claims. Chosen by route, never by the place's object: a consumer's
// `places` is a fresh array on every read.
export function selectedRoute(
	routes: readonly string[],
	pathname: string,
): string | undefined {
	const holds = (route: string) =>
		pathname === route ||
		pathname.startsWith(route.endsWith("/") ? route : `${route}/`);
	return routes
		.filter(holds)
		.reduce<string | undefined>(
			(best, route) =>
				best !== undefined && best.length >= route.length ? best : route,
			undefined,
		);
}

// The phone's tab bar holds at most five tabs, the system's rule: with more
// places the first four stay tabs and the rest go under a fifth, `more`.
export const TABS = 5;

export function tabsOf<T>(places: readonly T[]): {
	tabs: readonly T[];
	more: readonly T[];
} {
	if (places.length <= TABS) return { tabs: places, more: [] };
	return {
		tabs: places.slice(0, TABS - 1),
		more: places.slice(TABS - 1),
	};
}
