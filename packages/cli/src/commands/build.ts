import { spawnSync } from "node:child_process";
import { intro, log, outro } from "@clack/prompts";
import { generateFromConfig } from "#commands/generate";
import type { StackConfig } from "#config";
import { buildGraphFromConfig } from "#lib/build-graph";
import { cliSlots } from "#lib/cli-slots";
import { loadConfig } from "#lib/config";
import { StepFailedError } from "#lib/errors";
import type { BuildStep } from "#specs";

export async function buildStepsFromConfig(
	config: StackConfig,
	cwd: string,
): Promise<BuildStep[]> {
	const { graph } = await buildGraphFromConfig({ config, cwd });
	// Slot's own sortBy returns phase-sorted already.
	return graph.resolve(cliSlots.buildSteps);
}

export async function runBuildSteps(
	steps: BuildStep[],
	cwd: string,
): Promise<void> {
	for (const step of steps) {
		const phaseLabel =
			step.phase === "pre"
				? "Pre-build"
				: step.phase === "post"
					? "Post-build"
					: "Building";
		log.step(`${phaseLabel}: ${step.name}`);

		if ("run" in step) {
			await step.run();
			continue;
		}
		const result = spawnSync(step.exec.command, step.exec.args, {
			stdio: "inherit",
			cwd: step.exec.cwd ?? cwd,
		});
		if (result.status !== 0) {
			throw new StepFailedError(step.name, result.status, step.exec.command);
		}
	}
}

export async function build(configPath: string): Promise<void> {
	intro("stack build");
	const cwd = process.cwd();
	const config = await loadConfig(configPath);

	await generateFromConfig(config, cwd, { writeToDisk: true });

	const steps = await buildStepsFromConfig(config, cwd);
	await runBuildSteps(steps, cwd);

	outro("Build complete");
}
