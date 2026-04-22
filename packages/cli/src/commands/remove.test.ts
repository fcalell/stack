import { describe, expect, it } from "vitest";
import { plugin } from "#config";
import { cliSlots } from "#lib/cli-slots";
import { buildTestGraphFromPlugins } from "#testing";

describe("remove: single-plugin graph resolution", () => {
	it("resolves removeFiles / removeDeps / removeDevDeps from the target plugin alone", async () => {
		const target = plugin("rm-target", {
			label: "Target",
			contributes: [cliSlots.removeFiles.contribute(() => "src/feature/")],
			dependencies: { "@target/pkg": "^1.0.0" },
			devDependencies: { "target-cli": "^2.0.0" },
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: target }],
		});
		const [files, deps, devDeps] = await Promise.all([
			graph.resolve(cliSlots.removeFiles),
			graph.resolve(cliSlots.removeDeps),
			graph.resolve(cliSlots.removeDevDeps),
		]);

		expect(files).toContain("src/feature/");
		expect(deps).toContain("@target/pkg");
		expect(devDeps).toContain("target-cli");
	});

	it("auto-contributes `removeDeps` from plugin-declared dependencies without the consumer repeating them", async () => {
		const fake = plugin("rm-auto", {
			label: "Auto",
			dependencies: { foo: "^1.0.0", bar: "^2.0.0" },
		});
		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: fake }],
		});
		const deps = await graph.resolve(cliSlots.removeDeps);
		expect(deps.sort()).toEqual(["bar", "foo"]);
	});
});
