import { readdirSync } from "node:fs";
import { join } from "node:path";

// expo-router reads the route for an address nothing serves from a
// `+not-found` file at the root of the routes directory, whichever extension;
// without one it draws its own "Unmatched Route". It reads no other place, so
// a page stack draws is a file the app's routes directory holds.
const OWN = /^\+not-found\.[cm]?[jt]sx?$/;

export const NOT_FOUND_FILE = "+not-found.tsx";

// Whether the app has a route of its own for an unmatched address, which a
// generated one never replaces.
export function hasNotFoundRoute(root: string, appDir: string): boolean {
	try {
		return readdirSync(join(root, appDir)).some((name) => OWN.test(name));
	} catch {
		return false;
	}
}

// The route as a re-export of the page a design system draws, so the app's
// copy holds no markup and follows the package.
export function notFoundRouteSource(module: string): string {
	return [
		"// Stack's page for an address no route serves, written once while this file is absent.",
		"// Replace it with your own route to draw another page; delete it and `stack generate` writes it again.",
		`export { default } from ${JSON.stringify(module)};`,
		"",
	].join("\n");
}
