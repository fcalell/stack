import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateRouteBarrel } from "./barrel";

// Filesystem-driven tests: barrel reads a real directory tree. We stand up a
// scratch cwd per test, write the route files we want to assert on, and let
// the production function walk it. Anything we'd patch with a mock would
// hide the bug we're testing for.

let cwd: string;

function makeRoutes(files: Record<string, string>) {
	const routesDir = join(cwd, "src", "worker", "routes");
	mkdirSync(routesDir, { recursive: true });
	for (const [path, content] of Object.entries(files)) {
		const full = join(routesDir, path);
		mkdirSync(join(full, ".."), { recursive: true });
		writeFileSync(full, content);
	}
}

beforeEach(() => {
	cwd = mkdtempSync(join(tmpdir(), "barrel-test-"));
});

afterEach(() => {
	rmSync(cwd, { recursive: true, force: true });
});

describe("generateRouteBarrel", () => {
	// Bug regression: previously the filter was `.endsWith(".ts")` which
	// silently dropped `.tsx` route files (legal SolidJS-style JSX procedure
	// modules). Both extensions must be picked up, with the `.tsx`/`.ts`
	// suffix stripped from the export specifier.
	it("includes .ts and .tsx files in the barrel", () => {
		makeRoutes({
			"users.ts": "export const list = () => {};",
			"posts.tsx": "export const list = () => {};",
		});

		const result = generateRouteBarrel(cwd);

		expect(result).toContain('export * from "./users";');
		expect(result).toContain('export * from "./posts";');
	});

	it("returns header-only output when the directory does not exist", () => {
		const result = generateRouteBarrel(cwd);
		// No routes dir at all — header lands, no exports.
		expect(result).toContain("// Generated");
		expect(result).not.toContain("export * from");
	});

	it("returns header-only output when the directory is empty", () => {
		mkdirSync(join(cwd, "src", "worker", "routes"), { recursive: true });
		const result = generateRouteBarrel(cwd);
		expect(result).toContain("// Generated");
		expect(result).not.toContain("export * from");
	});

	// `index.ts` / `index.tsx` IS the barrel — re-exporting it from itself
	// would create a circular self-reference (TS can resolve it but it's a
	// confusing, useless export). Exclude both.
	it("excludes the barrel file itself (index.ts and index.tsx)", () => {
		makeRoutes({
			"users.ts": "export const list = () => {};",
			"index.ts": "// stale generated barrel",
			"index.tsx": "// JSX index — also excluded",
		});

		const result = generateRouteBarrel(cwd);

		expect(result).toContain('export * from "./users";');
		expect(result).not.toContain('export * from "./index"');
	});

	// Test files are not routes; declaration files are types-only outputs.
	// Both must be excluded so a `users.test.ts` doesn't poison the runtime
	// barrel with vitest references.
	it("excludes test files (.test.ts, .test.tsx) and declaration files (.d.ts)", () => {
		makeRoutes({
			"users.ts": "export const list = () => {};",
			"users.test.ts": "// test",
			"posts.test.tsx": "// jsx test",
			"types.d.ts": "// declarations",
		});

		const result = generateRouteBarrel(cwd);

		expect(result).toContain('export * from "./users";');
		expect(result).not.toContain('export * from "./users.test"');
		expect(result).not.toContain('export * from "./posts.test"');
		expect(result).not.toContain('export * from "./types"');
		// Lock down by counting export statements.
		const exports = result.match(/export \* from/g) ?? [];
		expect(exports).toHaveLength(1);
	});

	// Ambiguity rule: if both `users.ts` and `users.tsx` exist, the basename
	// would collide on the export specifier (`./users`) and emit the same
	// `export * from "./users"` twice — which is also a real problem,
	// because TS module resolution would arbitrarily pick one over the
	// other. Fail loud at codegen time so the consumer fixes the conflict.
	it("throws when two files share the same basename across .ts and .tsx", () => {
		makeRoutes({
			"users.ts": "// .ts variant",
			"users.tsx": "// .tsx variant",
		});

		expect(() => generateRouteBarrel(cwd)).toThrow(/users/);
	});

	// Nested route directories. The current convention is a flat
	// `routes/<name>.ts(x)` layout — an oRPC procedure file per name.
	// Subdirectories are intentionally ignored: there's no implicit
	// recursion contract, and a consumer who wants nested namespaces can
	// emit their own barrel from a subdirectory and import it explicitly.
	// Lock that in so we don't quietly grow a recursion contract.
	it("ignores nested directories (flat routes/ layout only)", () => {
		makeRoutes({
			"users.ts": "export const list = () => {};",
			"admin/users.ts": "export const list = () => {};",
		});

		const result = generateRouteBarrel(cwd);

		expect(result).toContain('export * from "./users";');
		expect(result).not.toContain('export * from "./admin/users"');
		expect(result).not.toContain('export * from "./admin"');
	});

	it("emits exports in deterministic sorted order", () => {
		makeRoutes({
			"zebra.ts": "",
			"alpha.tsx": "",
			"mango.ts": "",
		});

		const result = generateRouteBarrel(cwd);
		const order = (result.match(/export \* from "\.\/(\w+)";/g) ?? []).map(
			(m) => m.replace(/.*"\.\/(\w+)";/, "$1"),
		);

		expect(order).toEqual(["alpha", "mango", "zebra"]);
	});

	// Non-source files (e.g. README.md, fixtures/, .DS_Store) must be
	// invisible to the barrel.
	it("ignores files with unrelated extensions", () => {
		makeRoutes({
			"users.ts": "export const list = () => {};",
			"README.md": "# notes",
			"data.json": "{}",
		});

		const result = generateRouteBarrel(cwd);
		const exports = result.match(/export \* from/g) ?? [];
		expect(exports).toHaveLength(1);
		expect(result).toContain('export * from "./users";');
	});
});
