import { spawnSync } from "node:child_process";
import { intro, log, outro, spinner } from "@clack/prompts";
import { ensureAuthSchema, generate, migrate } from "#drizzle/run";
import { loadConfig } from "#lib/config";
import { detect } from "#lib/detect";
import { requireFeature } from "#lib/scaffold";
import { ensureWranglerAuth } from "#lib/wrangler";

interface DeployOptions {
	config: string;
}

export async function deploy(options: DeployOptions): Promise<void> {
	const state = detect();
	requireFeature("Database", state.hasConfig, "Run `stack init` first.");

	intro("stack deploy");

	const config = await loadConfig(options.config);

	if (state.hasApi || config.db.dialect === "d1") {
		if (!ensureWranglerAuth()) process.exit(1);
	}

	const s = spinner();

	s.start("Running database migrations...");
	if (!ensureAuthSchema(config)) process.exit(1);
	if (!generate(config)) process.exit(1);
	if (!migrate(config)) process.exit(1);
	s.stop("Migrations applied");

	if (state.hasApi) {
		log.step("Deploying API worker...");
		const result = spawnSync("npx", ["wrangler", "deploy"], {
			stdio: "inherit",
		});
		if (result.error || result.status !== 0) {
			log.error(result.error?.message ?? "Wrangler deploy failed");
			process.exit(1);
		}
		log.success("API deployed");
	}

	if (state.hasApp) {
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

	outro("Deployed");
}
