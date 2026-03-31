import type { DatabaseConfig } from "#kit/config";
import { ensureAuthSchema, generate, migrate } from "#kit/run";

export function deploy(config: DatabaseConfig): void {
	if (!ensureAuthSchema(config)) process.exit(1);
	if (!generate(config)) process.exit(1);
	if (!migrate(config)) process.exit(1);
}
