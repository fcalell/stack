import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildRoutesDts,
	buildTree,
	emitDts,
	emitRoutes,
	emitTypedRoutes,
	emitVirtualModule,
	joinUrl,
	parseSegment,
	VIRTUAL_ROUTES_ID,
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

	it("throws when two group-prefixed files resolve to the same URL path", () => {
		expect(() =>
			buildTree(["(auth)/login.tsx", "(public)/login.tsx"], pagesDir),
		).toThrow(
			/Route collision at \/login.*\(auth\)\/login\.tsx.*\(public\)\/login\.tsx/s,
		);
	});

	it("throws when a group index collides with a sibling group index", () => {
		expect(() =>
			buildTree(["(app)/index.tsx", "(marketing)/index.tsx"], pagesDir),
		).toThrow(/Route collision at \//);
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

		// Root path "/" must carry a `children:` array and the consumer's
		// `_layout.tsx` as its component.
		expect(routesArray).toMatch(/path:\s*"\/",\s*component:.*_layout\.tsx/);
		expect(routesArray).toMatch(/children:\s*\[/);
	});

	it("wraps routes in a DefaultLayout when root has no layout", () => {
		const { root } = buildTree(["index.tsx"], pagesDir);
		const { routesArray } = emitRoutes(root, projectRoot, undefined);

		// DefaultLayout is a hard-coded identifier emitted by the virtual
		// module; it must be referenced at the component position and no
		// `_layout.tsx` reference must leak through.
		expect(routesArray).toMatch(/component:\s*DefaultLayout/);
		expect(routesArray).toMatch(/children:\s*\[/);
		expect(routesArray).not.toContain("_layout.tsx");
	});

	it("appends 404 catch-all when notFoundFile exists", () => {
		const { root } = buildTree(["index.tsx"], pagesDir);
		const notFound = `${pagesDir}/_notFound.tsx`;
		const { routesArray } = emitRoutes(root, projectRoot, notFound);

		// A literal `"*"` route entry is only emitted for notFound; must be
		// structured as `path: "*", component: ...`.
		expect(routesArray).toMatch(/path:\s*"\*",\s*component:/);
	});

	it("generates correct path for dynamic segments", () => {
		const { root } = buildTree(["projects/[id].tsx"], pagesDir);
		const { routesArray } = emitRoutes(root, projectRoot, undefined);

		expect(routesArray).toMatch(/path:\s*"\/projects\/:id"/);
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

describe("emitVirtualModule", () => {
	it("defines a DefaultLayout pass-through", () => {
		const module = emitVirtualModule("[]", "{}");
		expect(module).toContain("const DefaultLayout = (props) => props.children");
	});

	it("uses the default pages dir when none is provided", () => {
		const module = emitVirtualModule("[]", "{}");
		expect(module).toContain('"/src/app/pages/**/*.{tsx,jsx}"');
	});

	it("honors a configurable pagesDir", () => {
		const module = emitVirtualModule("[]", "{}", "app/routes");
		expect(module).toContain('"/app/routes/**/*.{tsx,jsx}"');
	});

	it("normalizes leading and trailing slashes in pagesDir", () => {
		const module = emitVirtualModule("[]", "{}", "/custom/pages/");
		expect(module).toContain('"/custom/pages/**/*.{tsx,jsx}"');
	});
});

describe("buildRoutesDts", () => {
	// REVIEW #3: the old implementation threw on a missing pagesDir, which
	// crashed `stack generate` on a fresh project that hadn't scaffolded
	// src/app/pages yet. The structural fix: return an empty but valid dts so
	// generated files that `import type { routes } from "virtual:fcalell-routes"`
	// still type-check. Never throw on a missing dir.
	it("returns an empty stub when pagesDir does not exist", () => {
		const cwd = mkdtempSync(join(tmpdir(), "plugin-solid-rdts-"));
		try {
			const dts = buildRoutesDts(cwd, "src/app/pages");
			expect(dts).toContain(VIRTUAL_ROUTES_ID);
			// The typed routes block renders as an empty `{  }` (no entries).
			expect(dts).toContain("export const typedRoutes:");
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});

	it("builds a valid dts when pagesDir exists", () => {
		const cwd = mkdtempSync(join(tmpdir(), "plugin-solid-rdts-"));
		try {
			const pagesDir = join(cwd, "src/app/pages");
			mkdirSync(pagesDir, { recursive: true });
			writeFileSync(join(pagesDir, "index.tsx"), "export default () => null;");
			const dts = buildRoutesDts(cwd, "src/app/pages");
			expect(dts).toContain(VIRTUAL_ROUTES_ID);
			expect(dts).toContain("() => string");
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});
});

describe("emitDts", () => {
	it("generates valid TypeScript declaration module", () => {
		const dts = emitDts('{ "index": () => string; }');

		expect(dts).toContain(`declare module "${VIRTUAL_ROUTES_ID}"`);
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

	it("references @fcalell/plugin-solid in the generated comment", () => {
		const dts = emitDts('{ "index": () => string; }');
		expect(dts).toContain("@fcalell/plugin-solid");
	});
});
