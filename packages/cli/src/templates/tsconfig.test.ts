import { describe, expect, it } from "vitest";
import { tsconfigTemplate } from "./tsconfig";

interface Tsconfig {
	extends?: string;
	files?: unknown[];
	references?: Array<{ path: string }>;
	include?: string[];
	compilerOptions?: Record<string, unknown>;
}

function render(opts: {
	solid: boolean;
	native: boolean;
	worker: boolean;
}): Map<string, Tsconfig> {
	return new Map(
		tsconfigTemplate(opts).map(([name, content]) => [
			name,
			JSON.parse(content) as Tsconfig,
		]),
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

		// Worker env: node-tsx base, composite with incremental re-enabled, and
		// the wrangler-generated runtime types included.
		const worker = get(files, "tsconfig.worker.json");
		expect(worker.extends).toBe("@fcalell/typescript-config/node-tsx.json");
		expect(worker.compilerOptions?.composite).toBe(true);
		expect(worker.compilerOptions?.incremental).toBe(true);
		expect(worker.include).toContain(".stack/worker-configuration.d.ts");
	});

	it("emits a single Expo project for a native consumer without a worker", () => {
		const files = render({ solid: false, native: true, worker: false });
		expect([...files.keys()]).toEqual(["tsconfig.json"]);
		const root = get(files, "tsconfig.json");
		expect(root.extends).toBe("expo/tsconfig.base");
		// No composite/references when there's only one project.
		expect(root.compilerOptions?.composite).toBeUndefined();
		expect(root.include).toContain("src");
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
	});
});
