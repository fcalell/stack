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
