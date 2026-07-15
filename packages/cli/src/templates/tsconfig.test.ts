import { describe, expect, it } from "vitest";
import { tsconfigTemplate } from "./tsconfig";

interface Tsconfig {
	extends?: string;
	files?: unknown[];
	references?: Array<{ path: string }>;
	include?: string[];
	compilerOptions?: Record<string, unknown>;
}

// `procedurePaths`/`nativeTypes` mirror what `cliSlots.tsconfigPaths` /
// `cliSlots.tsconfigTypes` resolve to in the real graph when plugin-api /
// plugin-native-ui are present — see `plugins/api/src/index.test.ts` and
// `plugins/native-ui/src/index.test.ts` for the real-graph contribution
// tests. This is a pure-function unit test of the template's own rendering
// logic, so the resolved slot values are fed in directly rather than routed
// through a graph (consistent with how `aggregateWorker`/`aggregateProcedure`
// are tested elsewhere).
const PROCEDURE_PATHS = {
	"virtual:stack-procedure": ["./.stack/procedure.ts"],
};
const UNIWIND_TYPES = ["uniwind/types"];

function render(opts: {
	solid: boolean;
	native: boolean;
	worker: boolean;
	procedurePaths?: Record<string, string[]>;
	nativeTypes?: string[];
}): Map<string, Tsconfig> {
	return new Map(
		tsconfigTemplate({
			procedurePaths: opts.worker ? PROCEDURE_PATHS : {},
			nativeTypes: opts.native ? UNIWIND_TYPES : [],
			...opts,
		}).map(([name, content]) => [name, JSON.parse(content) as Tsconfig]),
	);
}

function get(files: Map<string, Tsconfig>, name: string): Tsconfig {
	const file = files.get(name);
	if (!file) throw new Error(`expected ${name} to be emitted`);
	return file;
}

describe("tsconfigTemplate", () => {
	it("splits a native+worker consumer into a solution + app + worker", () => {
		const files = render({ solid: false, native: true, worker: true });
		expect([...files.keys()].sort()).toEqual([
			"tsconfig.app.json",
			"tsconfig.json",
			"tsconfig.worker.json",
		]);

		// The root is a references-only solution so `tsc -b` walks both envs.
		const solution = get(files, "tsconfig.json");
		expect(solution.files).toEqual([]);
		expect(solution.references).toEqual([
			{ path: "./tsconfig.app.json" },
			{ path: "./tsconfig.worker.json" },
		]);

		// App env: Expo base, composite, JSX.
		const app = get(files, "tsconfig.app.json");
		expect(app.extends).toBe("expo/tsconfig.base");
		expect(app.compilerOptions?.composite).toBe(true);
		expect(app.compilerOptions?.jsxImportSource).toBe("react");
		// uniwind's global className augmentation must load where native-ui source
		// is type-checked (the plugin ships `.tsx`, not declarations).
		expect(app.compilerOptions?.types).toContain("uniwind/types");

		// Worker env: node-tsx base, composite with incremental re-enabled, and
		// the wrangler-generated runtime types included.
		const worker = get(files, "tsconfig.worker.json");
		expect(worker.extends).toBe("@fcalell/typescript-config/node-tsx.json");
		expect(worker.compilerOptions?.composite).toBe(true);
		expect(worker.compilerOptions?.incremental).toBe(true);
		expect(worker.include).toContain(".stack/worker-configuration.d.ts");
		// `virtual:stack-procedure` resolves to the generated procedure.ts —
		// route files (also under `src/worker`, already included above) import
		// it by that specifier.
		expect(worker.include).toContain(".stack/procedure.ts");
		expect(worker.compilerOptions?.paths).toEqual({
			"virtual:stack-procedure": ["./.stack/procedure.ts"],
		});
	});

	it("emits a single Expo project for a native consumer without a worker", () => {
		const files = render({ solid: false, native: true, worker: false });
		expect([...files.keys()]).toEqual(["tsconfig.json"]);
		const root = get(files, "tsconfig.json");
		expect(root.extends).toBe("expo/tsconfig.base");
		// No composite/references when there's only one project.
		expect(root.compilerOptions?.composite).toBeUndefined();
		expect(root.include).toContain("src");
		expect(root.compilerOptions?.types).toContain("uniwind/types");
	});

	it("keeps a single config for solid and node consumers", () => {
		const solid = get(
			render({ solid: true, native: false, worker: false }),
			"tsconfig.json",
		);
		expect(solid.extends).toBe("@fcalell/typescript-config/solid-vite.json");
		const node = get(
			render({ solid: false, native: false, worker: false }),
			"tsconfig.json",
		);
		expect(node.extends).toBe("@fcalell/typescript-config/node-tsx.json");
		// No worker (no api/db picked) — no reason to alias a specifier for a
		// generated file that will never exist.
		expect(node.compilerOptions).toBeUndefined();
	});

	// L2 fix: `types` used to be hardcoded to `["uniwind/types"]` for every
	// native consumer, even one without `nativeUi()` in the config — a
	// dangling type reference to a package that isn't installed. `nativeTypes`
	// now flows from `cliSlots.tsconfigTypes` (empty when native-ui isn't
	// present), so a plain Expo consumer gets no `types` entry at all.
	it("emits an empty types list for a native consumer without native-ui", () => {
		const files = render({
			solid: false,
			native: true,
			worker: false,
			nativeTypes: [],
		});
		const root = get(files, "tsconfig.json");
		expect(root.compilerOptions?.types).toEqual([]);
	});

	it("maps virtual:stack-procedure to .stack/procedure.ts when a worker is present (single config)", () => {
		const fullstack = get(
			render({ solid: true, native: false, worker: true }),
			"tsconfig.json",
		);
		expect(fullstack.compilerOptions?.paths).toEqual({
			"virtual:stack-procedure": ["./.stack/procedure.ts"],
		});

		const workerOnly = get(
			render({ solid: false, native: false, worker: true }),
			"tsconfig.json",
		);
		expect(workerOnly.compilerOptions?.paths).toEqual({
			"virtual:stack-procedure": ["./.stack/procedure.ts"],
		});
	});
});
