// Where an address stands among a shell's places. Both platforms' Shells and
// rows read it: plain string parsing, since React Native's `URL` is partial.

interface Parts {
	path: string;
	params: Array<[string, string]>;
	hash: string;
}

function decode(text: string): string {
	try {
		return decodeURIComponent(text.replaceAll("+", " "));
	} catch {
		return text;
	}
}

function parts(route: string): Parts {
	const [beforeHash = "", ...afterHash] = route.split("#");
	const hash = afterHash.join("#");
	const [path = "", ...afterPath] = beforeHash.split("?");
	const params = afterPath
		.join("?")
		.split("&")
		.filter((pair) => pair !== "")
		.map((pair): [string, string] => {
			const at = pair.indexOf("=");
			return at < 0
				? [decode(pair), ""]
				: [decode(pair.slice(0, at)), decode(pair.slice(at + 1))];
		});
	return { path, params, hash };
}

// The route's query and hash hold at the address: each of its parameters is
// among the address's, and its hash is the address's.
function narrows(want: Parts, here: Parts): boolean {
	if (want.hash !== "" && here.hash !== want.hash) return false;
	return want.params.every(([key, value]) =>
		here.params.some(([k, v]) => k === key && v === value),
	);
}

function below(want: string, here: string): boolean {
	return here === want || here.startsWith(`${want}/`);
}

// A row's route is current at itself and below it, the root only at itself; a
// route's query narrows it to the addresses carrying each of its parameters,
// and its hash to the address carrying that hash (a bare `#id` names a spot on
// the current page, so only the hash is compared).
export function isCurrent(route: string, at: string): boolean {
	const want = parts(route);
	const here = parts(at);
	if (route.startsWith("#")) return here.hash === want.hash;
	if (!narrows(want, here)) return false;
	if (want.path === "/") return here.path === "/";
	return below(want.path, here.path);
}

// The route of the place that owns the address: of the places that hold it,
// the one with the longest pathname, then the most query parameters, the
// earlier on a tie. The root `/` holds every address, so it owns what no other
// place claims; `undefined` when no place holds it.
export function placeAt<Route extends string>(
	places: readonly { route: Route }[],
	at: string,
): Route | undefined {
	const here = parts(at);
	let owner: { route: Route; path: number; params: number } | undefined;
	for (const { route } of places) {
		const want = parts(route);
		if (route.startsWith("#") || !narrows(want, here)) continue;
		if (want.path !== "/" && !below(want.path, here.path)) continue;
		const path = want.path.length;
		const params = want.params.length;
		if (
			owner === undefined ||
			path > owner.path ||
			(path === owner.path && params > owner.params)
		)
			owner = { route, path, params };
	}
	return owner?.route;
}

// A place that may hold places under it (`PlaceSpec.children`), reduced to
// what the tree walks read.
export interface PlaceNode<Route extends string = string> {
	route: Route;
	children?: readonly PlaceNode<Route>[];
}

// Every place of a tree, each before its children: the list `placeAt` selects
// from when places nest.
export function flatPlaces<P extends PlaceNode<string>>(
	places: readonly P[],
): P[] {
	const out: P[] = [];
	const walk = (level: readonly PlaceNode<string>[]) => {
		for (const place of level) {
			out.push(place as P);
			if (place.children) walk(place.children);
		}
	};
	walk(places);
	return out;
}

// The routes from a top-level place down to the one that owns the address,
// the owner last: the places "on the path", which a folded branch draws as
// the current place's ancestor. Empty when no place owns the address.
export function placeTrail<P extends PlaceNode<string>>(
	places: readonly P[],
	at: string,
): string[] {
	const owner = placeAt(flatPlaces(places), at);
	if (owner === undefined) return [];
	const down = (level: readonly PlaceNode<string>[]): string[] | undefined => {
		for (const place of level) {
			if (place.route === owner) return [place.route];
			const below = place.children ? down(place.children) : undefined;
			if (below) return [place.route, ...below];
		}
		return undefined;
	};
	return down(places) ?? [];
}

// The keys (routes) of the branches a sidebar draws folded: a branch is open
// by the viewer's choice (`chosen`, by route) and, with none, when the current
// place is at or under it (`trail`, from `placeTrail`). Every other branch
// starts folded, so a long tree draws only what the viewer opened.
export function placesFolded(
	places: readonly PlaceNode<string>[],
	chosen: Readonly<Record<string, boolean>>,
	trail: readonly string[],
): string[] {
	return flatPlaces(places)
		.filter((place) => (place.children?.length ?? 0) > 0)
		.filter((place) => !(chosen[place.route] ?? trail.includes(place.route)))
		.map((place) => place.route);
}
