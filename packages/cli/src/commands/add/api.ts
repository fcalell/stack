import { join } from "node:path";
import { log } from "@clack/prompts";
import type { StackConfig } from "@fcalell/config";
import { loadConfig } from "#lib/config";
import { editConfig } from "#lib/config-writer";
import { detect } from "#lib/detect";
import { generateApiRouteBarrel, generateEnvDts } from "#lib/generate";
import { ask } from "#lib/prompt";
import {
	announceCreated,
	ensureDir,
	ensureGitignore,
	requireFeature,
	scaffoldFiles,
	skipIfConfigured,
} from "#lib/scaffold";
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
	ensureDir(join("src", "worker", "routes"));
	generateApiRouteBarrel();
	generateEnvDts(config);
	if (ensureGitignore(".wrangler", ".stack")) created.push(".gitignore");
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
		log.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
