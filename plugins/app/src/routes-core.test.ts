import { describe, expect, it } from "vitest";
import {
	buildTree,
	emitDts,
	emitRoutes,
	emitTypedRoutes,
	joinUrl,
	parseSegment,
} from "./routes-core";

describe("parseSegment", () => {
	it("returns empty segment for route groups", () => {
		expect(parseSegment("(admin)")).toEqual({ segment: "" });
		expect(parseSegment("(app)")).toEqual({ segment: "" });
	});

	it("parses catch-all segments", () => {
		expect(parseSegment("[...catchAll]")).toEqual({
			segment: "*catchAll",
			paramName: "catchAll",
			isCatchAll: true,
		});
	});

	it("parses dynamic segments", () => {
		expect(parseSegment("[id]")).toEqual({
			segment: ":id",
			paramName: "id",
		});
	});

	it("returns raw for static segments", () => {
		expect(parseSegment("projects")).toEqual({ segment: "projects" });
	});

	it("treats partial brackets as static", () => {
		expect(parseSegment("[incomplete")).toEqual({ segment: "[incomplete" });
	});
});

describe("buildTree", () => {
	const pagesDir = "/app/src/app/pages";

	it("classifies _layout.tsx as a layout file", () => {
		const { root } = buildTree(["_layout.tsx"], pagesDir);
		expect(root.layoutFile).toBe(`${pagesDir}/_layout.tsx`);
	});

	it("classifies index.tsx as an index file", () => {
		const { root } = buildTree(["index.tsx"], pagesDir);
		expect(root.indexFile).toBe(`${pagesDir}/index.tsx`);
	});

	it("classifies _notFound.tsx as the 404 handler", () => {
		const { root, notFoundFile } = buildTree(["_notFound.tsx"], pagesDir);
		expect(notFoundFile).toBe(`${pagesDir}/_notFound.tsx`);
		// Should not be in the tree
		expect(root.children.size).toBe(0);
		expect(root.indexFile).toBeUndefined();
	});

	it("creates children for nested directories", () => {
		const { root } = buildTree(
			["projects/index.tsx", "projects/[id].tsx"],
			pagesDir,
		);

		const projects = root.children.get("projects");
		expect(projects).toBeDefined();
		expect(projects?.indexFile).toBe(`${pagesDir}/projects/index.tsx`);

		const dynamic = projects?.children.get("[id]");
		expect(dynamic).toBeDefined();
		expect(dynamic?.segment).toBe(":id");
		expect(dynamic?.paramName).toBe("id");
		expect(dynamic?.leafFile).toBe(`${pagesDir}/projects/[id].tsx`);
	});

	it("handles route groups as empty-segment nodes", () => {
		const { root } = buildTree(
			["(app)/_layout.tsx", "(app)/index.tsx"],
			pagesDir,
		);

		const group = root.children.get("(app)");
		expect(group).toBeDefined();
		expect(group?.segment).toBe("");
		expect(group?.layoutFile).toBe(`${pagesDir}/(app)/_layout.tsx`);
		expect(group?.indexFile).toBe(`${pagesDir}/(app)/index.tsx`);
	});

	it("handles deeply nested routes", () => {
		const { root } = buildTree(["projects/[id]/settings.tsx"], pagesDir);

		const projects = root.children.get("projects");
		const idNode = projects?.children.get("[id]");
		const settings = idNode?.children.get("settings");
		expect(settings).toBeDefined();
		expect(settings?.leafFile).toBe(`${pagesDir}/projects/[id]/settings.tsx`);
	});
});

describe("joinUrl", () => {
	it("appends segment to root /", () => {
		expect(joinUrl("/", "projects")).toBe("/projects");
	});

	it("appends segment to existing path", () => {
		expect(joinUrl("/projects", ":id")).toBe("/projects/:id");
	});

	it("returns parent unchanged for empty segment", () => {
		expect(joinUrl("/", "")).toBe("/");
		expect(joinUrl("/projects", "")).toBe("/projects");
	});

	it("adds leading slash when parent is empty", () => {
		expect(joinUrl("", "projects")).toBe("/projects");
	});
});

describe("emitRoutes", () => {
	const projectRoot = "/app";
	const pagesDir = "/app/src/app/pages";

	it("wraps children in layout when root has layoutFile", () => {
		const { root } = buildTree(["_layout.tsx", "index.tsx"], pagesDir);
		const { routesArray } = emitRoutes(root, projectRoot, undefined);

		expect(routesArray).toContain('path: "/"');
		expect(routesArray).toContain("children:");
		expect(routesArray).toContain("_layout.tsx");
	});

	it("emits flat array when root has no layout", () => {
		const { root } = buildTree(["index.tsx"], pagesDir);
		const { routesArray } = emitRoutes(root, projectRoot, undefined);

		expect(routesArray).not.toContain("children:");
	});

	it("appends 404 catch-all when notFoundFile exists", () => {
		const { root } = buildTree(["index.tsx"], pagesDir);
		const notFound = `${pagesDir}/_notFound.tsx`;
		const { routesArray } = emitRoutes(root, projectRoot, notFound);

		expect(routesArray).toContain('path: "*"');
	});

	it("generates correct path for dynamic segments", () => {
		const { root } = buildTree(["projects/[id].tsx"], pagesDir);
		const { routesArray } = emitRoutes(root, projectRoot, undefined);

		expect(routesArray).toContain("/projects/:id");
	});
});

describe("emitTypedRoutes", () => {
	const pagesDir = "/app/src/app/pages";

	it("generates no-arg function for static routes", () => {
		const { root } = buildTree(["index.tsx"], pagesDir);
		const { runtime } = emitTypedRoutes(root);

		expect(runtime).toContain('() => "/"');
	});

	it("generates parameterized function for dynamic routes", () => {
		const { root } = buildTree(["projects/[id].tsx"], pagesDir);
		const { runtime } = emitTypedRoutes(root);

		expect(runtime).toContain("params.id");
	});

	it("skips route group names in typed builder keys", () => {
		const { root } = buildTree(["(app)/index.tsx"], pagesDir);
		const { runtime } = emitTypedRoutes(root);

		// "app" should NOT appear as a key since (app) is a group
		expect(runtime).not.toContain('"app"');
		// but the route should still exist
		expect(runtime).toContain("index");
	});
});

describe("emitDts", () => {
	it("generates valid TypeScript declaration module", () => {
		const dts = emitDts('{ "index": () => string; }');

		expect(dts).toContain('declare module "virtual:fcalell-routes"');
		expect(dts).toContain("RouteDefinition");
		expect(dts).toContain("@solidjs/router");
	});

	it("includes the typed routes type", () => {
		const typesStr =
			'{ "index": () => string; "detail": (params: { id: string | number }) => string; }';
		const dts = emitDts(typesStr);

		expect(dts).toContain("() => string");
		expect(dts).toContain("id: string | number");
	});

	it("references @fcalell/plugin-app in the generated comment", () => {
		const dts = emitDts('{ "index": () => string; }');
		expect(dts).toContain("@fcalell/plugin-app");
	});
});
