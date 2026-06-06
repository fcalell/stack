import { describe, expect, it } from "vitest";
import { plugin } from "#config";
import { cliSlots } from "#lib/cli-slots";
import { StepFailedError } from "#lib/errors";
import type { DeployStep } from "#specs";
import { buildTestGraphFromPlugins } from "#testing";
import { runDeploySteps } from "./deploy";

describe("deploy slot resolution", () => {
	it("sorts deploySteps by phase regardless of plugin order", async () => {
		const post = plugin("ds-post", {
			label: "post",
			contributes: [
				cliSlots.deploySteps.contribute(
					(): DeployStep => ({
						name: "notify",
						phase: "post",
						run: async () => {},
					}),
				),
			],
		});
		const main = plugin("ds-main", {
			label: "main",
			contributes: [
				cliSlots.deploySteps.contribute(
					(): DeployStep => ({
						name: "wrangler",
						phase: "main",
						run: async () => {},
					}),
				),
			],
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: post }, { factory: main }],
		});
		const steps = await graph.resolve(cliSlots.deploySteps);
		expect(steps.map((s) => s.name)).toEqual(["wrangler", "notify"]);
	});
});

describe("runDeploySteps", () => {
	it("runs each step sequentially", async () => {
		const order: string[] = [];
		const steps: DeployStep[] = [
			{
				name: "a",
				phase: "main",
				run: async () => {
					order.push("a");
				},
			},
			{
				name: "b",
				phase: "main",
				run: async () => {
					order.push("b");
				},
			},
		];
		await runDeploySteps(steps, "/tmp");
		expect(order).toEqual(["a", "b"]);
	});

	it("throws StepFailedError when exec fails", async () => {
		const steps: DeployStep[] = [
			{
				name: "bad",
				phase: "main",
				exec: { command: "false", args: [] },
			},
		];
		await expect(runDeploySteps(steps, "/tmp")).rejects.toBeInstanceOf(
			StepFailedError,
		);
	});
});
