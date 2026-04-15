import { log } from "@clack/prompts";
import { loadConfig } from "#lib/config";
import { editConfig } from "#lib/config-writer";
import { detect } from "#lib/detect";
import { requireFeature, skipIfConfigured } from "#lib/scaffold";

const CONFIG_PATH = "stack.config.ts";

export async function add(): Promise<void> {
	const state = detect();
	requireFeature("Database", state.hasConfig, "Run `stack add db` first.");

	const config = await loadConfig(CONFIG_PATH);
	if (skipIfConfigured("Authentication", !!config.auth)) return;

	try {
		await editConfig(CONFIG_PATH, ({ config: ast }) => {
			ast.auth = { cookies: { prefix: "app" } };
		});
	} catch (error) {
		log.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}

	log.success("Added authentication to stack.config.ts");

	if (state.hasApi) {
		log.info(
			"Reminder: Add sendOTP and sendInvitation callbacks to defineApp() in src/worker/index.ts",
		);
	}
}
