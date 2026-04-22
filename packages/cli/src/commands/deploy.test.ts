import { describe, expect, it } from "vitest";
import { plugin } from "#config";
import { cliSlots } from "#lib/cli-slots";
import { StepFailedError } from "#lib/errors";
import type { DeployCheck, DeployStep } from "#specs";
import { buildTestGraphFromPlugins } from "#testing";
import { runDeploySteps } from "./deploy";

describe("deploy slot resolution", () => {
	it("aggregates deployChecks from every plugin", async () => {
		const db = plugin("dc-db", {
			label: "DB",
			contributes: [
				cliSlots.deployChecks.contribute(
					(): DeployCheck => ({
						plugin: "db",
						description: "Apply migrations",
						items: [{ label: "0001_init" }],
						action: async () => {},
					}),
				),
			],
		});
		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: db }],
		});
		const checks = await graph.resolve(cliSlots.deployChecks);
		expect(checks).toHaveLength(1);
		expect(checks[0]?.plugin).toBe("db");
	});

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
