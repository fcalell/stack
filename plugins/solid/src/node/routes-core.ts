import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import fg from "fast-glob";

// Virtual module id shared by the Vite routes plugin, the generated
// `routes.d.ts`, and the test assertions. Consumer-side `import` specifiers
// must stay literal (bundler constraint), so they duplicate this value.
export const VIRTUAL_ROUTES_ID = "virtual:fcalell-routes";

export interface RouteNode {
	segment: string;
	paramName?: string;
	isCatchAll?: boolean;
	leafFile?: string;
	indexFile?: string;
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
		}

		if (basename === "_layout") {
			node.layoutFile = abs;
			continue;
		}
		if (basename === "index") {
			node.indexFile = abs;
			continue;
		}

		// Regular leaf file: create a child node keyed by the filename
		const parsed = parseSegment(basename);
		const leafKey = basename;
		let leafNode = node.children.get(leafKey);
		if (!leafNode) {
			leafNode = makeNode(parsed.segment);
			leafNode.paramName = parsed.paramName;
			leafNode.isCatchAll = parsed.isCatchAll;
			node.children.set(leafKey, leafNode);
		}
		leafNode.leafFile = abs;
	}

	// Group segments collapse to "" in URLs, so `(auth)/login.tsx` and
	// `(public)/login.tsx` both resolve to `/login`. Detect by walking the
	// tree and mapping each leaf/index source to its final URL path.
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
		if (node.indexFile) register(url || "/", node.indexFile);
		if (node.leafFile) register(url || "/", node.leafFile);
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

		if (node.indexFile) {
			out.push(
				`{ path: ${JSON.stringify(parentPath || "/")}, component: ${jsonLoadGlob(node.indexFile, projectRoot)} }`,
			);
		}

		if (node.leafFile) {
			out.push(
				`{ path: ${JSON.stringify(parentPath || "/")}, component: ${jsonLoadGlob(node.leafFile, projectRoot)} }`,
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
		if (node.indexFile) {
			leaves.push({
				keys: [...keys, "index"],
				params: [...params],
				url: url || "/",
			});
		}
		if (node.leafFile) {
			leaves.push({
				keys: [...keys],
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

export function buildRoutesDts(cwd: string, pagesDirRel: string): string {
	const absPagesDir = join(cwd, pagesDirRel);
	if (!existsSync(absPagesDir)) {
		throw new Error(
			`plugin-solid: pages directory not found at "${pagesDirRel}". ` +
				`Create the directory or set solid({ routes: { pagesDir: "..." } }) ` +
				`to point at an existing directory.`,
		);
	}
	const files = fg.sync(["**/*.tsx", "**/*.jsx"], { cwd: absPagesDir }).sort();
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
