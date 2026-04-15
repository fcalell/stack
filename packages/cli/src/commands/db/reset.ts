import { existsSync, unlinkSync } from "node:fs";
import { intro, log, outro } from "@clack/prompts";
import { ensureAuthSchema, localDbUrl, push } from "#drizzle/run";
import { loadConfig } from "#lib/config";
import { detect } from "#lib/detect";
import { confirm } from "#lib/prompt";
import { requireFeature } from "#lib/scaffold";

interface ResetOptions {
	config: string;
}

export async function reset(options: ResetOptions): Promise<void> {
	requireFeature("Database", detect().hasConfig, "Run `stack init` first.");

	intro("stack db reset");

	if (process.stdin.isTTY) {
		const ok = await confirm("Reset local database? All data will be lost.");
		if (!ok) {
			outro("Aborted.");
			return;
		}
	}

	const config = await loadConfig(options.config);
	const dbPath = localDbUrl(config);

	if (existsSync(dbPath)) {
		unlinkSync(dbPath);
		log.info(`Deleted ${dbPath}`);

		for (const suffix of ["-wal", "-shm"]) {
			const walPath = `${dbPath}${suffix}`;
			if (existsSync(walPath)) unlinkSync(walPath);
		}
	} else {
		log.info("No local database found, creating fresh");
	}

	if (!ensureAuthSchema(config)) process.exit(1);
	if (!push(config)) process.exit(1);

	outro("Database reset complete");
}
