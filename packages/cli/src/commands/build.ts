import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { intro, log, outro } from "@clack/prompts";
import { Build } from "#events";
import { hasRuntimeExport } from "#lib/codegen";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { StepFailedError } from "#lib/errors";
import { sortStepsByPhase } from "#lib/executor";
import { registerPlugins } from "#lib/registration";

export async function build(configPath: string): Promise<void> {
	intro("stack build");

	// Generate
	const { generate } = await import("#commands/generate");
	await generate(configPath);

	const config = await loadConfig(configPath);
	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered);
	const cwd = process.cwd();

	const bus = registerPlugins(sorted, config, cwd);

	const configured = await bus.emit(Build.Configure, {
		vitePlugins: [],
		viteImports: [],
		vitePluginCalls: [],
	});
	await bus.emit(Build.ConfigureReady, configured);

	// Build.Start — collect steps
	const buildResult = await bus.emit(Build.Start, { steps: [] });

	// Check if any plugin has a worker runtime
	const hasWorker = sorted.some((p) => hasRuntimeExport(p.cli.package));

	// If hasWorker, add wrangler bundle step
	if (hasWorker) {
		buildResult.steps.push({
			name: "Bundle worker",
			phase: "post",
			exec: {
				command: "npx",
				args: [
					"wrangler",
					"deploy",
					"--dry-run",
					"--outdir",
					join(cwd, "dist"),
					"--config",
					join(cwd, ".stack", "wrangler.toml"),
				],
			},
		});
	}

	// Sort steps by phase and execute sequentially
	const steps = sortStepsByPhase(buildResult.steps);

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
		} else {
			const result = spawnSync(step.exec.command, step.exec.args, {
				stdio: "inherit",
				cwd: step.exec.cwd ?? cwd,
			});
			if (result.status !== 0) {
				throw new StepFailedError(step.name, result.status, step.exec.command);
			}
		}
	}

	outro("Build complete");
}
