import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { TsExpression } from "@fcalell/cli/ast";
import { Generator, getConfig } from "@tanstack/router-generator";

// Where the generated route tree lands, relative to the project root. The
// entry and `.stack/routes.d.ts` import it as `./routeTree.gen.ts`.
export const ROUTE_TREE = ".stack/routeTree.gen.ts";

// `fileURLToPath(new URL("<path>", import.meta.url))`: an absolute path
// anchored on the generated `.stack/vite.config.ts`, so it holds wherever the
// host puts Vite's `root` and no machine-specific path is written into the
// config. The plugin contributes the `node:url` import it needs.
function besideConfig(path: string): TsExpression {
	return {
		kind: "call",
		callee: { kind: "identifier", name: "fileURLToPath" },
		args: [
			{
				kind: "new",
				callee: { kind: "identifier", name: "URL" },
				args: [
					{ kind: "string", value: path },
					{
						kind: "member",
						object: { kind: "identifier", name: "import.meta" },
						property: "url",
					},
				],
			},
		],
	};
}

// TanStack's router plugin options for a routes directory given relative to
// the project root, as expressions evaluated in `.stack/vite.config.ts`.
export function routerPaths(dir: string): {
	routesDirectory: TsExpression;
	generatedRouteTree: TsExpression;
} {
	return {
		routesDirectory: besideConfig(`../${dir}`),
		generatedRouteTree: besideConfig("./routeTree.gen.ts"),
	};
}

// Writes `.stack/routeTree.gen.ts`, so the consumer's type-check sees its
// typed routes right after `stack generate`, before Vite has run. The paths
// are the ones the router plugin resolves from the config's location.
export async function generateRouteTree(
	cwd: string,
	dir: string,
): Promise<void> {
	const root = join(cwd, ".stack");
	const config = getConfig(
		{
			target: "react",
			disableLogging: true,
			routesDirectory: join(cwd, dir),
			generatedRouteTree: join(cwd, ROUTE_TREE),
		},
		root,
	);
	await new Generator({ config, root }).run();
}

// The declarations that register the app's router with TanStack Router, so
// `Link`, `useNavigate` and `useParams` are typed by the route tree. They
// live in `.stack/routes.d.ts`, the file the consumer's type-check loads;
// the entry, which builds the router itself, never enters that program (its
// providers module is Vite-only).
export const ROUTES_DTS = `import type { createRouter } from "@tanstack/react-router";
import type { routeTree } from "./routeTree.gen.ts";

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter<typeof routeTree>>;
	}
}
`;

const ROUTE_FILE = /\.(tsx|ts|jsx|js)$/;

// A path's segments under TanStack's file convention: directories and
// flat-route dots both nest, and `[.]` escapes a literal dot.
function tokens(path: string): string[] {
	const out: string[] = [];
	let current = "";
	let escaped = false;
	for (const char of path.replace(ROUTE_FILE, "")) {
		if (char === "[") escaped = true;
		else if (char === "]") escaped = false;
		else if (!escaped && (char === "/" || char === ".")) {
			out.push(current);
			current = "";
		} else current += char;
	}
	out.push(current);
	return out;
}

// The first URL segment a route file serves, or null for the root route,
// the index, a param, and an ignored file. A pathless layout (`_auth`) and a
// group (`(app)`) add no segment, so the next token decides; a trailing `_`
// only un-nests the route and is not part of its path.
function firstSegment(path: string): string | null {
	for (const token of tokens(path)) {
		if (token.startsWith("-") || token === "__root") return null;
		if (token.startsWith("_") || /^\(.*\)$/.test(token)) continue;
		if (token === "index" || token === "route" || token === "lazy") {
			return null;
		}
		if (token.startsWith("$") || token.startsWith("{")) return null;
		return token.replace(/_$/, "");
	}
	return null;
}

// The static first segments of the app's URLs (`login`, `settings`), sorted.
// Empty when the routes directory does not exist.
export function topLevelSegments(cwd: string, dir: string): string[] {
	const abs = join(cwd, dir);
	if (!existsSync(abs)) return [];
	const segments = new Set<string>();
	for (const file of readdirSync(abs, { recursive: true, encoding: "utf8" })) {
		if (!ROUTE_FILE.test(file)) continue;
		const segment = firstSegment(file.replaceAll("\\", "/"));
		if (segment) segments.add(segment);
	}
	return [...segments].sort();
}
