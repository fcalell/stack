import { loadConfig } from "#lib/config";
import { createAccessControlExpression, editConfig } from "#lib/config-writer";
import { detect } from "#lib/detect";
import { requireFeature, skipIfConfigured } from "#lib/scaffold";

const CONFIG_PATH = "stack.config.ts";

const DEFAULT_STATEMENTS = {
	organization: ["update", "delete"],
	member: ["create", "update", "delete"],
	invitation: ["create", "cancel"],
} as const;

export async function add(): Promise<void> {
	requireFeature("Database", detect().hasConfig, "Run `stack add db` first.");
	const config = await loadConfig(CONFIG_PATH);
	requireFeature(
		"Authentication",
		!!config.auth,
		"Run `stack add auth` first.",
	);
	if (skipIfConfigured("Organizations", !!config.auth?.organization)) return;

	try {
		await editConfig(CONFIG_PATH, ({ mod, config: ast }) => {
			if (!ast.auth) {
				ast.auth = {};
			}
			ast.auth.organization = {
				ac: createAccessControlExpression(DEFAULT_STATEMENTS),
			};
			mod.imports.$append({
				from: "@fcalell/db/auth/access",
				imported: "createAccessControl",
				local: "createAccessControl",
			});
		});
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}

	console.log("Added organizations to stack.config.ts");
}
