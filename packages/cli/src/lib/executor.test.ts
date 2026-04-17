import { describe, expect, it, vi } from "vitest";
import {
	deduplicateFiles,
	deduplicateGitignore,
	mergeDependencies,
	processBuildPayload,
	processDeployPayload,
	processDevPayloads,
	processGenerateFiles,
	processScaffoldPayload,
	sortStepsByPhase,
} from "#lib/executor";

describe("deduplicateFiles", () => {
	it("keeps the last file when paths collide (last writer wins)", () => {
		const files = [
			{ path: "a.ts", content: "first" },
			{ path: "b.ts", content: "only" },
			{ path: "a.ts", content: "second" },
		];
		const result = deduplicateFiles(files);
		expect(result).toHaveLength(2);
		expect(result.find((f) => f.path === "a.ts")?.content).toBe("second");
		expect(result.find((f) => f.path === "b.ts")?.content).toBe("only");
	});

	it("preserves order (first occurrence position, last content)", () => {
		const files = [
			{ path: "z.ts", content: "1" },
			{ path: "a.ts", content: "2" },
			{ path: "z.ts", content: "3" },
		];
		const result = deduplicateFiles(files);
		// Map preserves insertion order but overwrites values
		// So z.ts appears first with content "3", a.ts second
		expect(result[0]?.path).toBe("z.ts");
		expect(result[0]?.content).toBe("3");
		expect(result[1]?.path).toBe("a.ts");
	});

	it("handles empty input", () => {
		expect(deduplicateFiles([])).toEqual([]);
	});

	it("handles no duplicates", () => {
		const files = [
			{ path: "a.ts", content: "a" },
			{ path: "b.ts", content: "b" },
		];
		expect(deduplicateFiles(files)).toEqual(files);
	});
});

describe("mergeDependencies", () => {
	it("merges multiple dependency objects", () => {
		const result = mergeDependencies(
			{ a: "1.0.0" },
			{ b: "2.0.0" },
			{ c: "3.0.0" },
		);
		expect(result).toEqual({ a: "1.0.0", b: "2.0.0", c: "3.0.0" });
	});

	it("later sources override earlier ones", () => {
		const result = mergeDependencies({ a: "1.0.0" }, { a: "2.0.0" });
		expect(result.a).toBe("2.0.0");
	});

	it("handles empty input", () => {
		expect(mergeDependencies()).toEqual({});
	});
});

describe("deduplicateGitignore", () => {
	it("removes duplicates", () => {
		expect(deduplicateGitignore([".stack", ".wrangler", ".stack"])).toEqual([
			".stack",
			".wrangler",
		]);
	});

	it("handles empty input", () => {
		expect(deduplicateGitignore([])).toEqual([]);
	});
});

describe("sortStepsByPhase", () => {
	it("sorts pre → main → post", () => {
		const steps = [
			{ name: "c", phase: "post" as const },
			{ name: "a", phase: "pre" as const },
			{ name: "b", phase: "main" as const },
		];
		const sorted = sortStepsByPhase(steps);
		expect(sorted.map((s) => s.name)).toEqual(["a", "b", "c"]);
	});

	it("preserves order within same phase", () => {
		const steps = [
			{ name: "a", phase: "main" as const },
			{ name: "b", phase: "main" as const },
		];
		const sorted = sortStepsByPhase(steps);
		expect(sorted.map((s) => s.name)).toEqual(["a", "b"]);
	});

	it("does not mutate original array", () => {
		const steps = [
			{ name: "b", phase: "post" as const },
			{ name: "a", phase: "pre" as const },
		];
		const original = [...steps];
		sortStepsByPhase(steps);
		expect(steps).toEqual(original);
	});
});

describe("processScaffoldPayload", () => {
	it("deduplicates files, preserves deps and gitignore", () => {
		const payload = {
			files: [
				{ path: "a.ts", content: "first" },
				{ path: "a.ts", content: "second" },
				{ path: "b.ts", content: "only" },
			],
			dependencies: { foo: "1.0.0" },
			devDependencies: { bar: "2.0.0" },
			gitignore: [".stack", ".wrangler", ".stack"],
		};

		const result = processScaffoldPayload(payload);
		expect(result.files).toHaveLength(2);
		expect(result.files.find((f) => f.path === "a.ts")?.content).toBe("second");
		expect(result.gitignore).toEqual([".stack", ".wrangler"]);
	});
});

describe("processDevPayloads", () => {
	it("combines start and ready payloads", () => {
		const start = {
			processes: [
				{
					name: "vite",
					command: "npx",
					args: ["vite"],
				},
			],
			watchers: [
				{
					name: "routes",
					paths: "src/routes/**",
					handler: vi.fn(),
				},
			],
		};

		const ready = {
			url: "http://localhost:8787",
			port: 8787,
			setup: [{ name: "schema-push", run: vi.fn() }],
			watchers: [
				{
					name: "schema",
					paths: "src/schema/**",
					handler: vi.fn(),
				},
			],
		};

		const plan = processDevPayloads(start, ready);
		expect(plan.processes).toHaveLength(1);
		expect(plan.watchers).toHaveLength(2);
		expect(plan.setupTasks).toHaveLength(1);
	});

	it("works without ready payload", () => {
		const start = {
			processes: [],
			watchers: [],
		};
		const plan = processDevPayloads(start);
		expect(plan.processes).toEqual([]);
		expect(plan.watchers).toEqual([]);
		expect(plan.setupTasks).toEqual([]);
	});
});

describe("processBuildPayload", () => {
	it("sorts build steps by phase", () => {
		const payload = {
			steps: [
				{
					name: "bundle",
					phase: "post" as const,
					run: vi.fn(),
				},
				{
					name: "generate",
					phase: "pre" as const,
					run: vi.fn(),
				},
				{
					name: "vite",
					phase: "main" as const,
					exec: { command: "npx", args: ["vite", "build"] },
				},
			],
		};

		const steps = processBuildPayload(payload);
		expect(steps.map((s) => s.name)).toEqual(["generate", "vite", "bundle"]);
	});
});

describe("processDeployPayload", () => {
	it("sorts deploy steps by phase", () => {
		const payload = {
			steps: [
				{
					name: "worker",
					phase: "main" as const,
					exec: { command: "wrangler", args: ["deploy"] },
				},
				{
					name: "migrations",
					phase: "pre" as const,
					run: vi.fn(),
				},
			],
		};

		const steps = processDeployPayload(payload);
		expect(steps.map((s) => s.name)).toEqual(["migrations", "worker"]);
	});
});

describe("processGenerateFiles", () => {
	it("deduplicates generated files", () => {
		const files = [
			{ path: ".stack/env.d.ts", content: "v1" },
			{ path: ".stack/env.d.ts", content: "v2" },
			{ path: ".stack/worker.ts", content: "worker" },
		];
		const result = processGenerateFiles(files);
		expect(result).toHaveLength(2);
		expect(result.find((f) => f.path === ".stack/env.d.ts")?.content).toBe(
			"v2",
		);
	});
});
