import { join } from "node:path";
import type { StackConfig } from "@fcalell/config";
import { loadConfig } from "#lib/config";
import { editConfig } from "#lib/config-writer";
import { detect } from "#lib/detect";
import { ask } from "#lib/prompt";
import {
	announceCreated,
	ensureGitignore,
	requireFeature,
	scaffoldFiles,
	skipIfConfigured,
} from "#lib/scaffold";
import { envDtsTemplate } from "#templates/env-dts";
import { routesTemplate } from "#templates/routes";
import { workerTemplate } from "#templates/worker";
import { wranglerTemplate } from "#templates/wrangler";

const CONFIG_PATH = "stack.config.ts";

export async function add(): Promise<void> {
	const state = detect();
	requireFeature("Database", state.hasConfig, "Run `stack add db` first.");
	if (skipIfConfigured("API worker (src/worker/index.ts)", state.hasApi))
		return;

	const config = await loadConfig(CONFIG_PATH);
	const hasAuth = !!config.auth;
	const isD1 = config.db.dialect === "d1";
	const databaseId =
		config.db.dialect === "d1" ? config.db.databaseId : undefined;

	const entries: Array<[string, string]> = [
		[join("src", "worker", "index.ts"), workerTemplate({ auth: hasAuth })],
		[join("src", "worker", "routes", "index.ts"), routesTemplate()],
		[
			join("src", "worker", "env.d.ts"),
			envDtsTemplate({ d1: isD1, auth: hasAuth }),
		],
	];

	if (isD1) {
		const name = process.stdin.isTTY
			? await ask("Worker name", "my-app")
			: "my-app";
		entries.push([
			"wrangler.toml",
			wranglerTemplate({
				name,
				databaseId: databaseId ?? "YOUR_D1_DATABASE_ID",
			}),
		]);
	}

	const created = scaffoldFiles(entries);
	if (ensureGitignore(".wrangler")) created.push(".gitignore");
	announceCreated(created);

	await addApiConfigSection(config);
}

async function addApiConfigSection(config: StackConfig): Promise<void> {
	if (config.api) return;

	try {
		await editConfig(CONFIG_PATH, ({ config: ast }) => {
			ast.api = { cors: ["http://localhost:3000"] };
		});
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}
}
