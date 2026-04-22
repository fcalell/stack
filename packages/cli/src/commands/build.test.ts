import { describe, expect, it } from "vitest";
import { plugin } from "#config";
import { cliSlots } from "#lib/cli-slots";
import { StepFailedError } from "#lib/errors";
import type { BuildStep } from "#specs";
import { buildTestGraphFromPlugins } from "#testing";
import { runBuildSteps } from "./build";

describe("build slot resolution", () => {
	it("collects buildSteps contributions from every plugin", async () => {
		const vitePlugin = plugin("bs-vite", {
			label: "Vite",
			contributes: [
				cliSlots.buildSteps.contribute(
					(): BuildStep => ({
						name: "vite build",
						phase: "main",
						run: async () => {},
					}),
				),
			],
		});
		const cloudflarePlugin = plugin("bs-cloudflare", {
			label: "CF",
			contributes: [
				cliSlots.buildSteps.contribute(
					(): BuildStep => ({
						name: "worker bundle",
						phase: "post",
						run: async () => {},
					}),
				),
			],
		});

		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: vitePlugin }, { factory: cloudflarePlugin }],
		});
		const steps = await graph.resolve(cliSlots.buildSteps);
		expect(steps.map((s) => s.name)).toEqual(["vite build", "worker bundle"]);
	});

	it("sorts steps by phase regardless of plugin order", async () => {
		const postPlugin = plugin("bs-post", {
			label: "P",
			contributes: [
				cliSlots.buildSteps.contribute(
					(): BuildStep => ({
						name: "post",
						phase: "post",
						run: async () => {},
					}),
				),
			],
		});
		const prePlugin = plugin("bs-pre", {
			label: "Pre",
			contributes: [
				cliSlots.buildSteps.contribute(
					(): BuildStep => ({
						name: "pre",
						phase: "pre",
						run: async () => {},
					}),
				),
			],
		});

		// Contribute "post" first, "pre" second — phase sort must still yield
		// [pre, post]. Demonstrates ordering is derived from data, not config.
		const { graph } = buildTestGraphFromPlugins({
			plugins: [{ factory: postPlugin }, { factory: prePlugin }],
		});
		const steps = await graph.resolve(cliSlots.buildSteps);
		expect(steps.map((s) => s.name)).toEqual(["pre", "post"]);
	});
});

describe("runBuildSteps", () => {
	it("runs each step sequentially in the supplied order", async () => {
		const calls: string[] = [];
		const steps: BuildStep[] = [
			{
				name: "one",
				phase: "pre",
				run: async () => {
					calls.push("one");
				},
			},
			{
				name: "two",
				phase: "main",
				run: async () => {
					calls.push("two");
				},
			},
		];
		await runBuildSteps(steps, "/tmp");
		expect(calls).toEqual(["one", "two"]);
	});

	it("throws StepFailedError when an exec step exits non-zero", async () => {
		const steps: BuildStep[] = [
			{
				name: "bad",
				phase: "main",
				exec: { command: "false", args: [] },
			},
		];
		await expect(runBuildSteps(steps, "/tmp")).rejects.toBeInstanceOf(
			StepFailedError,
		);
	});
});
