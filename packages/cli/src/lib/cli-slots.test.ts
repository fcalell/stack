import { describe, expect, it } from "vitest";
import { plugin } from "#config";
import { cliSlots, emitArtifact } from "#lib/cli-slots";
import { slot } from "#lib/slots";
import { buildTestGraphFromPlugins } from "#testing";

describe("cliSlots inventory", () => {
	it("buildSteps and deploySteps declare a sortBy comparator", () => {
		const build = cliSlots.buildSteps.kind;
		const deploy = cliSlots.deploySteps.kind;
		if (build.type !== "list") throw new Error("buildSteps must be a list");
		if (deploy.type !== "list") throw new Error("deploySteps must be a list");
		expect(typeof build.sortBy).toBe("function");
		expect(typeof deploy.sortBy).toBe("function");

		const cmp = build.sortBy;
		if (!cmp) throw new Error("sortBy missing");
		// pre < main < post
		expect(
			cmp(
				{ name: "a", phase: "pre", run: async () => {} },
				{ name: "b", phase: "main", run: async () => {} },
			),
		).toBeLessThan(0);
		expect(
			cmp(
				{ name: "c", phase: "post", run: async () => {} },
				{ name: "d", phase: "main", run: async () => {} },
			),
		).toBeGreaterThan(0);
	});

	it("slot ids are unique across the namespace", () => {
		const ids = Object.values(cliSlots).map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("emitArtifact", () => {
	it("produces a GeneratedFile when the source slot resolves to a string", async () => {
		const sourceSlot = slot.value<string | null>({
			source: "test-emit",
			name: "source-some",
			seed: () => "hello world",
		});
		const fake = plugin("test-emit-some", {
			label: "Emit (some)",
			contributes: [emitArtifact(".stack/sample.txt", sourceSlot)],
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: fake }],
		});
		const files = await graph.resolve(cliSlots.artifactFiles);

		expect(files).toEqual([
			{ path: ".stack/sample.txt", content: "hello world" },
		]);
	});

	it("skips emission when the source slot resolves to null", async () => {
		const sourceSlot = slot.value<string | null>({
			source: "test-emit",
			name: "source-none",
			seed: () => null,
		});
		const fake = plugin("test-emit-none", {
			label: "Emit (none)",
			contributes: [emitArtifact(".stack/skipped.txt", sourceSlot)],
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: fake }],
		});
		const files = await graph.resolve(cliSlots.artifactFiles);

		expect(files).toEqual([]);
	});
});
