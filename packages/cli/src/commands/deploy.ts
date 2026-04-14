import { ensureAuthSchema, generate, migrate } from "#drizzle/run";
import { loadConfig } from "#lib/config";
import { detect } from "#lib/detect";
import { requireFeature } from "#lib/scaffold";

interface DeployOptions {
	config: string;
}

export async function deploy(options: DeployOptions): Promise<void> {
	requireFeature("Database", detect().hasConfig, "Run `stack init` first.");

	const config = await loadConfig(options.config);

	if (!ensureAuthSchema(config)) process.exit(1);
	if (!generate(config)) process.exit(1);
	if (!migrate(config)) process.exit(1);
}
