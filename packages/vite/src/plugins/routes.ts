import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import fg from "fast-glob";
import type { Plugin, ViteDevServer } from "vite";

const VIRTUAL_ID = "virtual:fcalell-routes";
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;
const DTS_DIR = ".stack";
const DTS_FILE = "routes.d.ts";

export interface RoutesPluginOptions {
	pagesDir?: string;
}

interface RouteNode {
	/** URL path segment for this node (":id", "settings", "" for root). */
	segment: string;
	/** Parameter name if segment is dynamic (e.g. "id" for "[id]"). */
	paramName?: string;
	isCatchAll?: boolean;
	/** Absolute page file for this node's leaf (e.g. foo.tsx or [id].tsx). */
	leafFile?: string;
	/** Absolute index.tsx file inside this node's folder. */
	indexFile?: string;
	/** Absolute _layout.tsx file inside this node's folder. */
	layoutFile?: string;
	children: Map<string, RouteNode>;
}

function makeNode(segment: string): RouteNode {
	return { segment, children: new Map() };
}

function parseSegment(raw: string): {
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

function keyForBuilder(node: RouteNode): string {
	if (node.paramName) return node.paramName;
	return node.segment;
}

function buildTree(
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

	return { root, notFoundFile };
}

function joinUrl(parent: string, seg: string): string {
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

function emitRoutes(
	root: RouteNode,
	projectRoot: string,
	notFoundFile: string | undefined,
): RoutesOutput {
	// Emit the Solid RouteDefinition tree.
	// Each directory node with a layoutFile becomes a RouteDefinition with
	// children. Nodes without a layout collapse into their parent's children.

	function emitChildren(node: RouteNode, parentPath: string): string[] {
		const out: string[] = [];

		// Emit this node's own index (if any) at parentPath
		if (node.indexFile) {
			out.push(
				`{ path: ${JSON.stringify(parentPath || "/")}, component: ${jsonLoadGlob(node.indexFile, projectRoot)} }`,
			);
		}

		// Emit this node's leaf (if any) — the leaf file IS this node
		if (node.leafFile) {
			out.push(
				`{ path: ${JSON.stringify(parentPath || "/")}, component: ${jsonLoadGlob(node.leafFile, projectRoot)} }`,
			);
		}

		// Emit children
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

	let routesArray: string;
	if (root.layoutFile) {
		const children = emitChildren(root, "/");
		routesArray = `[{ path: "/", component: ${jsonLoadGlob(root.layoutFile, projectRoot)}, children: [${children.join(", ")}] }]`;
	} else {
		const children = emitChildren(root, "");
		routesArray = `[${children.join(", ")}]`;
	}

	// Append a catch-all 404 if a top-level _notFound exists
	if (notFoundFile) {
		const arr = routesArray.slice(0, -1); // drop trailing ]
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

function emitTypedRoutes(root: RouteNode): { runtime: string; types: string } {
	// Walk tree collecting leaves keyed by their filesystem-name path.
	// A "leaf" = node with indexFile (index of a folder) or leafFile (a page file).

	interface Leaf {
		keys: string[]; // e.g. ["projects", "id"] for routes.projects.id
		params: string[]; // e.g. ["id"]
		url: string; // e.g. "/projects/:id"
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
			// Skip pure grouping nodes in the typed builder keys (segment is "")
			// but still walk their children
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

	// Build nested runtime object
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
		// Replace :param with `${params.param}` in a template literal
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

function emitVirtualModule(
	routesArray: string,
	typedRoutesRuntime: string,
): string {
	const globPattern = "/src/app/pages/**/*.{tsx,jsx}";
	return `import { lazy } from "solid-js";
const pages = import.meta.glob(${JSON.stringify(globPattern)});
const load = (p) => lazy(() => pages[p]());
export const routes = ${routesArray};
export const typedRoutes = ${typedRoutesRuntime};
`;
}

function emitDts(typedRoutesTypes: string): string {
	return `// Generated by @fcalell/vite — do not edit.
declare module "virtual:fcalell-routes" {
\timport type { RouteDefinition } from "@solidjs/router";
\texport const routes: RouteDefinition[];
\texport const typedRoutes: ${typedRoutesTypes};
}
`;
}

export function routesPlugin(opts: RoutesPluginOptions = {}): Plugin {
	const pagesDirRel = opts.pagesDir ?? "src/app/pages";
	let projectRoot = process.cwd();
	let absPagesDir = "";
	let cachedModule = "";
	let server: ViteDevServer | null = null;

	function rebuild(): void {
		const files = fg
			.sync(["**/*.tsx", "**/*.jsx"], { cwd: absPagesDir })
			.sort();
		const { root, notFoundFile } = buildTree(files, absPagesDir);
		const { routesArray, typedRoutesRuntime, typedRoutesTypes } = emitRoutes(
			root,
			projectRoot,
			notFoundFile,
		);
		cachedModule = emitVirtualModule(routesArray, typedRoutesRuntime);

		// Write .stack/routes.d.ts
		const dtsDir = join(projectRoot, DTS_DIR);
		mkdirSync(dtsDir, { recursive: true });
		writeFileSync(join(dtsDir, DTS_FILE), emitDts(typedRoutesTypes));
	}

	return {
		name: "fcalell:routes",

		configResolved(config) {
			projectRoot = config.root;
			absPagesDir = join(projectRoot, pagesDirRel);
			rebuild();
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
			return null;
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_ID) return cachedModule;
			return null;
		},

		configureServer(devServer) {
			server = devServer;
			devServer.watcher.add(absPagesDir);

			const handler = (file: string): void => {
				if (!file.startsWith(absPagesDir)) return;
				if (!/\.(tsx|jsx)$/.test(file)) return;
				rebuild();
				const mod = devServer.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
				if (mod) devServer.moduleGraph.invalidateModule(mod);
				devServer.ws.send({ type: "full-reload" });
			};

			devServer.watcher.on("add", handler);
			devServer.watcher.on("unlink", handler);
		},

		handleHotUpdate(ctx) {
			if (!server) return;
			if (!ctx.file.startsWith(absPagesDir)) return;
			if (!/_layout\.(tsx|jsx)$/.test(ctx.file)) return;
			// Layout re-nesting isn't HMR-safe — full reload.
			server.ws.send({ type: "full-reload" });
			return [];
		},
	};
}
