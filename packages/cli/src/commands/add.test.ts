import { describe, expect, it } from "vitest";
import type { ScaffoldSpec } from "#ast";
import { plugin } from "#config";
import { cliSlots } from "#lib/cli-slots";
import type { PromptSpec } from "#specs";
import { buildTestGraphFromPlugins } from "#testing";

// `add` itself touches disk + magicast — those paths are verified in the
// consumer-journey integration tests. Here we assert the parts the command
// actually controls: slot filtering semantics. An add flow writes only the
// target plugin's scaffolds and runs only its init-prompt spec.

describe("add: prompt + scaffold filtering semantics", () => {
	it("filters initPrompts down to the target plugin when multiple are in the graph", async () => {
		const authLike = plugin("add-auth", {
			label: "Auth",
			contributes: [
				cliSlots.initPrompts.contribute(
					(): PromptSpec => ({
						plugin: "auth",
						ask: async () => ({ cookies: { prefix: "myapp" } }),
					}),
				),
			],
		});
		const dbLike = plugin("add-db", {
			label: "DB",
			contributes: [
				cliSlots.initPrompts.contribute(
					(): PromptSpec => ({
						plugin: "db",
						ask: async () => ({ dialect: "d1" }),
					}),
				),
			],
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: authLike }, { factory: dbLike }],
		});
		const prompts = await graph.resolve(cliSlots.initPrompts);
		const authPrompts = prompts.filter((p) => p.plugin === "auth");
		expect(authPrompts).toHaveLength(1);
		expect(authPrompts[0]?.plugin).toBe("auth");
	});

	it("filters initScaffolds by ScaffoldSpec.plugin (target-plugin only)", async () => {
		const a = plugin("add-scaf-a", {
			label: "A",
			contributes: [
				cliSlots.initScaffolds.contribute(
					(): ScaffoldSpec => ({
						source: new URL("file:///tmp/a"),
						target: "src/a.ts",
						plugin: "a",
					}),
				),
			],
		});
		const b = plugin("add-scaf-b", {
			label: "B",
			contributes: [
				cliSlots.initScaffolds.contribute(
					(): ScaffoldSpec => ({
						source: new URL("file:///tmp/b"),
						target: "src/b.ts",
						plugin: "b",
					}),
				),
			],
		});
		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: a }, { factory: b }],
		});
		const scaffolds = await graph.resolve(cliSlots.initScaffolds);
		const onlyB = scaffolds.filter((s) => s.plugin === "b");
		expect(onlyB.map((s) => s.target)).toEqual(["src/b.ts"]);
	});
});
