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
