import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { intro, log, outro } from "@clack/prompts";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import {
	createBuildContext,
	createPluginContext,
} from "#lib/plugin-context";

export async function build(configPath: string): Promise<void> {
	intro("stack build");

	const { generate } = await import("#commands/generate");
	await generate(configPath);

	const config = await loadConfig(configPath);
	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered, config);
	const cwd = process.cwd();
	const baseCtx = createPluginContext({ cwd, config });
	const ctx = createBuildContext(baseCtx, join(cwd, "dist"));

	const preBuildFns: Array<() => Promise<void>> = [];
	const postBuildFns: Array<() => Promise<void>> = [];

	for (const p of sorted) {
		if (!p.cli.build) continue;
		const contribution = await p.cli.build(ctx);
		if (contribution.preBuild) preBuildFns.push(contribution.preBuild);
		if (contribution.postBuild) postBuildFns.push(contribution.postBuild);
	}

	for (const fn of preBuildFns) {
		await fn();
	}

	const hasApp = existsSync(join(cwd, "src", "app", "pages"));
	if (hasApp) {
		log.step("Building app...");
		const result = spawnSync("npx", ["stack-vite", "build"], {
			stdio: "inherit",
		});
		if (result.error || result.status !== 0) {
			log.error(result.error?.message ?? "App build failed");
			process.exit(1);
		}
		log.success("App built");
	}

	for (const fn of postBuildFns) {
		await fn();
	}

	outro("Build complete");
}
