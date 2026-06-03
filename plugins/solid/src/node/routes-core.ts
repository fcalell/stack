import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import fg from "fast-glob";

// Virtual module id shared by the Vite routes plugin, the generated
// `routes.d.ts`, and the test assertions. Consumer-side `import` specifiers
// must stay literal (bundler constraint), so they duplicate this value.
export const VIRTUAL_ROUTES_ID = "virtual:fcalell-routes";

// What populates this node's URL. A node carries AT MOST ONE route file
// (either `index.tsx` for the directory's index URL, or a leaf file for
// the directory's parent URL — they target the same URL because of how
// the file-based router collapses `dir/index.tsx` and `dir.tsx`). The
// previous shape kept `indexFile` and `leafFile` as independent slots,
// which made it possible — and trivially common with a typo — to
// silently end up with both set on the same node, both registering to
// the same URL. Encoding "what populates this URL" as a single
// discriminated field makes the invalid state unrepresentable: the
// SECOND assignment to `routeFile` for any node throws a precise error
// naming both source paths.
//
// `layoutFile` legitimately co-exists with a `routeFile` (a layout
// wraps the URL's component), so it stays a separate field.
export type RouteFileSource = "leaf" | "index";

export interface RouteFile {
	source: RouteFileSource;
	path: string;
}

export interface RouteNode {
	segment: string;
	paramName?: string;
	isCatchAll?: boolean;
	routeFile?: RouteFile;
	layoutFile?: string;
	children: Map<string, RouteNode>;
}

export function makeNode(segment: string): RouteNode {
	return { segment, children: new Map() };
}

export function parseSegment(raw: string): {
	segment: string;
	paramName?: string;
	isCatchAll?: boolean;
} {
	// Route group - strip from URL, keep nothing (grouping is layout-only)
	if (/^\(.+\)$/.test(raw)) return { segment: "" };
	// Catch-all [...name]
	const catchAll = raw.match(/^\[\.\.\.(.+)\]$/);
	if (catchAll) {
		return {
			segment: `*${catchAll[1]}`,
			paramName: catchAll[1],
			isCatchAll: true,
		};
	}
	// Dynamic [name]
	const dynamic = raw.match(/^\[(.+)\]$/);
	if (dynamic) {
		return { segment: `:${dynamic[1]}`, paramName: dynamic[1] };
	}
	// Static segment
	return { segment: raw };
}

export function keyForBuilder(node: RouteNode): string {
	if (node.paramName) return node.paramName;
	return node.segment;
}

// Set the route file on `node`, throwing when a different file already
// occupies the slot. Caller passes both source paths so the error names
// the offenders precisely — "Route collision at /projects: both
// .../projects.tsx and .../projects/index.tsx populate the same URL".
//
// The same-path no-op case (rebuilds during dev) is silently allowed.
function setRouteFile(node: RouteNode, file: RouteFile, url: string): void {
	const existing = node.routeFile;
	if (existing) {
		if (existing.path === file.path) return;
		throw new Error(
			`Route collision at ${url || "/"}: both ${existing.path} and ${file.path} populate the same URL. ` +
				"A directory can have either an `index.tsx` (URL = directory path) " +
				"OR a sibling leaf file with the same name as the directory (e.g. `projects.tsx` next to `projects/`), " +
				"but not both.",
		);
	}
	node.routeFile = file;
}

export function buildTree(
	files: string[],
	absPagesDir: string,
): {
	root: RouteNode;
	notFoundFile?: string;
} {
	const root = makeNode("");
	let notFoundFile: string | undefined;

	for (const file of files) {
		const abs = join(absPagesDir, file);
		const parts = file.split("/");
		const filename = parts.pop();
		if (!filename) continue;
		const basename = filename.replace(/\.(tsx|jsx)$/, "");

		// Global 404 at top level
		if (parts.length === 0 && basename === "_notFound") {
			notFoundFile = abs;
			continue;
		}

		// Walk into directory tree
		let node = root;
		let urlSoFar = "";
		for (const rawDir of parts) {
			const parsed = parseSegment(rawDir);
			// Route groups produce empty segment — still create a sub-node so
			// _layout inside them can scope siblings, but the segment is ""
			const key = rawDir; // use raw (pre-parse) key for uniqueness
			let next = node.children.get(key);
			if (!next) {
				next = makeNode(parsed.segment);
				next.paramName = parsed.paramName;
				next.isCatchAll = parsed.isCatchAll;
				node.children.set(key, next);
			}
			node = next;
			urlSoFar = joinUrl(urlSoFar, parsed.segment);
		}

		if (basename === "_layout") {
			node.layoutFile = abs;
			continue;
		}
		if (basename === "index") {
			setRouteFile(node, { source: "index", path: abs }, urlSoFar);
			continue;
		}

		// Regular leaf file: create a child node keyed by the filename.
		// Setting routeFile on that child fails immediately if a sibling
		// directory already produced an `index.tsx` for the same URL —
		// e.g. `projects.tsx` clashing with `projects/index.tsx`.
		const parsed = parseSegment(basename);
		const leafKey = basename;
		let leafNode = node.children.get(leafKey);
		if (!leafNode) {
			leafNode = makeNode(parsed.segment);
			leafNode.paramName = parsed.paramName;
			leafNode.isCatchAll = parsed.isCatchAll;
			node.children.set(leafKey, leafNode);
		}
		const leafUrl = joinUrl(urlSoFar, parsed.segment);
		setRouteFile(leafNode, { source: "leaf", path: abs }, leafUrl);
	}

	// Defense-in-depth: route groups collapse `(auth)/login.tsx` and
	// `(public)/login.tsx` to two different nodes whose final URLs both
	// resolve to `/login`. The setRouteFile guard above only fires when
	// two files target the same NODE; this walk catches the cross-node
	// case that's structurally only possible via groups. With the
	// `routeFile` discriminant, every other collision is unrepresentable
	// before this walk runs, so this path's job has narrowed — but
	// keeping it makes the failure mode total instead of "structural
	// collisions only."
	assertNoRouteCollisions(root);

	return { root, notFoundFile };
}

function assertNoRouteCollisions(root: RouteNode): void {
	const seen = new Map<string, string>();

	function register(url: string, source: string): void {
		const existing = seen.get(url);
		if (existing && existing !== source) {
			throw new Error(
				`Route collision at ${url}: both ${existing} and ${source} resolve to the same path`,
			);
		}
		seen.set(url, source);
	}

	function walk(node: RouteNode, url: string): void {
		if (node.routeFile) register(url || "/", node.routeFile.path);
		for (const child of node.children.values()) {
			walk(child, joinUrl(url, child.segment));
		}
	}

	walk(root, "");
}

export function joinUrl(parent: string, seg: string): string {
	if (!seg) return parent;
	if (parent === "/" || parent === "") return `/${seg}`;
	return `${parent}/${seg}`;
}

function relForGlob(abs: string, root: string): string {
	return `/${relative(root, abs).replaceAll("\\", "/")}`;
}

interface RoutesOutput {
	routesArray: string;
	typedRoutesRuntime: string;
	typedRoutesTypes: string;
}

export function emitRoutes(
	root: RouteNode,
	projectRoot: string,
	notFoundFile: string | undefined,
): RoutesOutput {
	function emitChildren(node: RouteNode, parentPath: string): string[] {
		const out: string[] = [];

		if (node.routeFile) {
			out.push(
				`{ path: ${JSON.stringify(parentPath || "/")}, component: ${jsonLoadGlob(node.routeFile.path, projectRoot)} }`,
			);
		}

		for (const child of node.children.values()) {
			const childUrl = joinUrl(parentPath, child.segment);
			if (child.layoutFile) {
				const grandchildren = emitChildren(child, childUrl);
				out.push(
					`{ path: ${JSON.stringify(childUrl || "/")}, component: ${jsonLoadGlob(child.layoutFile, projectRoot)}, children: [${grandchildren.join(", ")}] }`,
				);
			} else {
				out.push(...emitChildren(child, childUrl));
			}
		}

		return out;
	}

	const children = emitChildren(root, "/");
	const layoutComponent = root.layoutFile
		? jsonLoadGlob(root.layoutFile, projectRoot)
		: "DefaultLayout";
	let routesArray = `[{ path: "/", component: ${layoutComponent}, children: [${children.join(", ")}] }]`;

	if (notFoundFile) {
		const arr = routesArray.slice(0, -1);
		routesArray = `${arr}${routesArray === "[]" ? "" : ", "}{ path: "*", component: ${jsonLoadGlob(notFoundFile, projectRoot)} }]`;
	}

	const { runtime, types } = emitTypedRoutes(root);
	return {
		routesArray,
		typedRoutesRuntime: runtime,
		typedRoutesTypes: types,
	};
}

function jsonLoadGlob(abs: string, projectRoot: string): string {
	const rel = relForGlob(abs, projectRoot);
	return `load(${JSON.stringify(rel)})`;
}

export function emitTypedRoutes(root: RouteNode): {
	runtime: string;
	types: string;
} {
	interface Leaf {
		keys: string[];
		params: string[];
		url: string;
	}

	const leaves: Leaf[] = [];

	function walk(
		node: RouteNode,
		keys: string[],
		params: string[],
		url: string,
	): void {
		if (node.routeFile) {
			// Index files get the `index` builder key (so consumers reach
			// `/projects` via `typedRoutes.projects.index()`); leaf files
			// already had their basename folded into `keys` when the parent
			// recursed into the leaf node.
			const builderKeys =
				node.routeFile.source === "index" ? [...keys, "index"] : [...keys];
			leaves.push({
				keys: builderKeys,
				params: [...params],
				url: url || "/",
			});
		}

		for (const child of node.children.values()) {
			if (child.segment === "" && !child.paramName) {
				walk(child, keys, params, url);
				continue;
			}
			const childKey = keyForBuilder(child);
			const childKeys = [...keys, childKey];
			const childParams = child.paramName
				? [...params, child.paramName]
				: params;
			const childUrl = joinUrl(url, child.segment);
			walk(child, childKeys, childParams, childUrl);
		}
	}

	walk(root, [], [], "");

	interface RouteTree {
		[key: string]: RouteTree | { __leaf: Leaf };
	}
	const runtimeTree: RouteTree = {};
	for (const leaf of leaves) {
		let cursor: RouteTree = runtimeTree;
		for (let i = 0; i < leaf.keys.length - 1; i++) {
			const k = leaf.keys[i] as string;
			if (!cursor[k] || typeof cursor[k] !== "object") cursor[k] = {};
			cursor = cursor[k] as RouteTree;
		}
		const lastKey = leaf.keys[leaf.keys.length - 1] as string;
		cursor[lastKey] = { __leaf: leaf };
	}

	function emitRuntime(tree: Record<string, unknown>): string {
		const parts: string[] = [];
		for (const [k, v] of Object.entries(tree)) {
			if (
				v &&
				typeof v === "object" &&
				"__leaf" in (v as Record<string, unknown>)
			) {
				const leaf = (v as { __leaf: Leaf }).__leaf;
				const fn = emitRuntimeFn(leaf);
				parts.push(`${JSON.stringify(k)}: ${fn}`);
			} else {
				parts.push(
					`${JSON.stringify(k)}: ${emitRuntime(v as Record<string, unknown>)}`,
				);
			}
		}
		return `{ ${parts.join(", ")} }`;
	}

	function emitRuntimeFn(leaf: Leaf): string {
		if (leaf.params.length === 0) {
			return `() => ${JSON.stringify(leaf.url)}`;
		}
		let templated = leaf.url;
		for (const p of leaf.params) {
			templated = templated.replaceAll(`:${p}`, `\${params.${p}}`);
			templated = templated.replaceAll(`*${p}`, `\${params.${p}}`);
		}
		return `(params) => \`${templated}\``;
	}

	function emitTypes(tree: Record<string, unknown>): string {
		const parts: string[] = [];
		for (const [k, v] of Object.entries(tree)) {
			if (
				v &&
				typeof v === "object" &&
				"__leaf" in (v as Record<string, unknown>)
			) {
				const leaf = (v as { __leaf: Leaf }).__leaf;
				if (leaf.params.length === 0) {
					parts.push(`${JSON.stringify(k)}: () => string;`);
				} else {
					const paramObj = leaf.params
						.map((p) => `${p}: string | number`)
						.join("; ");
					parts.push(
						`${JSON.stringify(k)}: (params: { ${paramObj} }) => string;`,
					);
				}
			} else {
				parts.push(
					`${JSON.stringify(k)}: ${emitTypes(v as Record<string, unknown>)};`,
				);
			}
		}
		return `{ ${parts.join(" ")} }`;
	}

	const runtime = emitRuntime(runtimeTree);
	const types = emitTypes(runtimeTree);
	return { runtime, types };
}

export function emitVirtualModule(
	routesArray: string,
	typedRoutesRuntime: string,
	pagesDirRel: string = "src/app/pages",
): string {
	const normalized = pagesDirRel.replace(/^\/+/, "").replace(/\/+$/, "");
	const globPattern = `/${normalized}/**/*.{tsx,jsx}`;
	return `import { lazy } from "solid-js";
const pages = import.meta.glob(${JSON.stringify(globPattern)});
const load = (p) => lazy(() => pages[p]());
const DefaultLayout = (props) => props.children;
export const routes = ${routesArray};
export const typedRoutes = ${typedRoutesRuntime};
`;
}

export function emitDts(typedRoutesTypes: string): string {
	return `// Generated by @fcalell/plugin-solid — do not edit.
declare module "${VIRTUAL_ROUTES_ID}" {
\timport type { RouteDefinition } from "@solidjs/router";
\texport const routes: RouteDefinition[];
\texport const typedRoutes: ${typedRoutesTypes};
}
`;
}

// Build the `.stack/routes.d.ts` source. When the pages directory doesn't
// exist yet (fresh consumer — `stack init` → `stack generate` before any
// page is scaffolded) we still emit a valid declaration module with an empty
// typed-routes shape. That keeps generated references to
// `virtual:fcalell-routes` type-checking from day one; a later `stack dev`
// re-runs `emitRoutes` for the real value. Never throws on missing dir.
export function buildRoutesDts(cwd: string, pagesDirRel: string): string {
	const absPagesDir = join(cwd, pagesDirRel);
	// `fg.sync` on a missing cwd returns `[]` — no need to shortcut, but we
	// keep the `existsSync` fast-path to avoid `fast-glob`'s directory stat.
	const files = existsSync(absPagesDir)
		? fg.sync(["**/*.tsx", "**/*.jsx"], { cwd: absPagesDir }).sort()
		: [];
	const { root } = buildTree(files, absPagesDir);
	const { typedRoutesTypes } = emitRoutes(root, cwd, undefined);
	return emitDts(typedRoutesTypes);
}

export function writeRoutesDts(cwd: string, pagesDirRel: string): void {
	const dts = buildRoutesDts(cwd, pagesDirRel);
	const dtsDir = join(cwd, ".stack");
	mkdirSync(dtsDir, { recursive: true });
	writeFileSync(join(dtsDir, "routes.d.ts"), dts);
}
