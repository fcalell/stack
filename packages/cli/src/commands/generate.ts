import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Generate } from "#events";
import { loadConfig } from "#lib/config";
import { discoverPlugins, sortByDependencies } from "#lib/discovery";
import { ConfigValidationError } from "#lib/errors";
import { registerPlugins } from "#lib/registration";

const STACK_DIR = ".stack";

export async function generate(configPath: string): Promise<void> {
	const config = await loadConfig(configPath);

	const validation = config.validate();
	if (!validation.valid) {
		throw new ConfigValidationError(validation.errors);
	}

	const discovered = await discoverPlugins(config);
	const sorted = sortByDependencies(discovered);
	const cwd = process.cwd();

	const stackDir = join(cwd, STACK_DIR);
	mkdirSync(stackDir, { recursive: true });

	const bus = registerPlugins(sorted, config, cwd);

	// Generate is the single fan-out event. Plugins that emit their own
	// codegen events (e.g. plugin-cloudflare → Wrangler; plugin-api →
	// Worker + Middleware) do so inside their own Generate handler,
	// collect the result, and push the aggregated file into `p.files`.
	const genResult = await bus.emit(Generate, { files: [], postWrite: [] });

	for (const f of genResult.files) {
		const fullPath = join(cwd, f.path);
		mkdirSync(join(fullPath, ".."), { recursive: true });
		writeFileSync(fullPath, f.content);
	}

	for (const hook of genResult.postWrite) {
		await hook();
	}
}
