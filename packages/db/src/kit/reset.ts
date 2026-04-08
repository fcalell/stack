import { existsSync, unlinkSync } from "node:fs";
import type { DatabaseConfig } from "#kit/config";
import { ensureAuthSchema, localDbUrl, push } from "#kit/run";

export function reset(config: DatabaseConfig): void {
	const dbPath = localDbUrl(config);

	if (existsSync(dbPath)) {
		unlinkSync(dbPath);
		console.log(`Deleted ${dbPath}`);

		// SQLite WAL/SHM files
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
