import { spawnSync } from "node:child_process";
import { intro, log, outro } from "@clack/prompts";
import { build as runBuild } from "#commands/build";
import type { StackConfig } from "#config";
import { buildGraphFromConfig } from "#lib/build-graph";
import { cliSlots } from "#lib/cli-slots";
import { loadConfig } from "#lib/config";
import { StepFailedError } from "#lib/errors";
import { confirm } from "#lib/prompt";
import type { DeployCheck, DeployStep } from "#specs";

interface DeployOptions {
	config: string;
}

export async function deployPlanFromConfig(
	config: StackConfig,
	cwd: string,
): Promise<{ checks: DeployCheck[]; steps: DeployStep[] }> {
	const { graph } = await buildGraphFromConfig({ config, cwd });
	const [checks, steps] = await Promise.all([
		graph.resolve(cliSlots.deployChecks),
		graph.resolve(cliSlots.deploySteps),
	]);
	return { checks, steps };
}

export async function runDeploySteps(
	steps: DeployStep[],
	cwd: string,
): Promise<void> {
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
}

export async function deploy(options: DeployOptions): Promise<void> {
	intro("stack deploy");

	await runBuild(options.config);

	const cwd = process.cwd();
	const config = await loadConfig(options.config);
	const { checks, steps } = await deployPlanFromConfig(config, cwd);

	if (checks.length > 0) {
		log.info("Deploy plan:");
		for (const check of checks) {
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

		// Checks have an `action` hook — run any that plugins supplied before
		// the deploy steps (migrations typically land here).
		for (const check of checks) {
			await check.action();
		}
	}

	await runDeploySteps(steps, cwd);

	outro("Deployed");
}
