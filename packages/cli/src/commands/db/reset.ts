import { existsSync, unlinkSync } from "node:fs";
import { ensureAuthSchema, localDbUrl, push } from "#drizzle/run";
import { loadConfig } from "#lib/config";
import { detect } from "#lib/detect";
import { requireFeature } from "#lib/scaffold";

interface ResetOptions {
	config: string;
}

export async function reset(options: ResetOptions): Promise<void> {
	requireFeature("Database", detect().hasConfig, "Run `stack init` first.");

	const config = await loadConfig(options.config);
	const dbPath = localDbUrl(config);

	if (existsSync(dbPath)) {
		unlinkSync(dbPath);
		console.log(`Deleted ${dbPath}`);

		for (const suffix of ["-wal", "-shm"]) {
			const walPath = `${dbPath}${suffix}`;
			if (existsSync(walPath)) unlinkSync(walPath);
		}
	} else {
		console.log("No local database found, creating fresh");
	}

	if (!ensureAuthSchema(config)) process.exit(1);
	if (!push(config)) process.exit(1);

	console.log("Database reset complete");
}
