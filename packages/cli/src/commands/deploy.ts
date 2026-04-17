import { spawnSync } from "node:child_process";
import { intro, log, outro } from "@clack/prompts";
import { Deploy } from "#events";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { StepFailedError } from "#lib/errors";
import { sortStepsByPhase } from "#lib/executor";
import { confirm } from "#lib/prompt";
import { registerPlugins } from "#lib/registration";

interface DeployOptions {
	config: string;
}

export async function deploy(options: DeployOptions): Promise<void> {
	intro("stack deploy");

	// Build first (includes generate)
	const { build } = await import("#commands/build");
	await build(options.config);

	const config = await loadConfig(options.config);
	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered);
	const cwd = process.cwd();

	const bus = registerPlugins(sorted, config, cwd);

	// Deploy.Plan — collect checks
	const planResult = await bus.emit(Deploy.Plan, { checks: [] });

	if (planResult.checks.length > 0) {
		log.info("Deploy plan:");
		for (const check of planResult.checks) {
			log.info(`  ${check.plugin}: ${check.description}`);
			for (const item of check.items) {
				log.info(
					`    - ${item.label}${item.detail ? ` (${item.detail})` : ""}`,
				);
			}
		}

		if (process.stdin.isTTY) {
			const ok = await confirm("Proceed with deployment?");
			if (!ok) {
				outro("Aborted.");
				return;
			}
		}
	}

	// Deploy.Execute — collect steps
	const deployResult = await bus.emit(Deploy.Execute, { steps: [] });

	const steps = sortStepsByPhase(deployResult.steps);

	for (const step of steps) {
		log.step(`Deploying: ${step.name}`);
		if ("run" in step) {
			await step.run();
		} else {
			const result = spawnSync(step.exec.command, step.exec.args, {
				stdio: "inherit",
				cwd: step.exec.cwd ?? cwd,
			});
			if (result.status !== 0) {
				throw new StepFailedError(step.name, result.status, step.exec.command);
			}
		}
		log.success(`${step.name} deployed`);
	}

	// Deploy.Complete
	await bus.emit(Deploy.Complete);

	outro("Deployed");
}
