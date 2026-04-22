import { describe, expect, it } from "vitest";
import { cliSlots } from "#lib/cli-slots";

describe("cliSlots inventory", () => {
	const expected = [
		["initPrompts", "list"],
		["initScaffolds", "list"],
		["initDeps", "map"],
		["initDevDeps", "map"],
		["gitignore", "list"],
		["artifactFiles", "list"],
		["postWrite", "list"],
		["devProcesses", "list"],
		["devWatchers", "list"],
		["devReadySetup", "list"],
		["buildSteps", "list"],
		["deployChecks", "list"],
		["deploySteps", "list"],
		["removeFiles", "list"],
		["removeDeps", "list"],
		["removeDevDeps", "list"],
	] as const;

	for (const [name, kindType] of expected) {
		it(`exposes ${name} with kind ${kindType} and source="cli"`, () => {
			const token = cliSlots[name as keyof typeof cliSlots];
			expect(token.source).toBe("cli");
			expect(token.name).toBe(name);
			expect(token.kind.type).toBe(kindType);
		});
	}

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
