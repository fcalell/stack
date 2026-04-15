import { spawnSync } from "node:child_process";
import { log } from "@clack/prompts";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function ensureWranglerAuth(): boolean {
	const result = spawnSync("npx", ["wrangler", "whoami"], {
		stdio: "pipe",
	});
	if (result.status === 0) return true;

	log.error("Not authenticated with Cloudflare. Run `wrangler login` first.");
	return false;
}

export function createD1Database(
	name: string,
): { id: string; name: string } | null {
	const result = spawnSync(
		"npx",
		["wrangler", "d1", "create", name, "--json"],
		{
			stdio: "pipe",
		},
	);

	const stdout = result.stdout?.toString().trim() ?? "";
	const stderr = result.stderr?.toString().trim() ?? "";

	if (result.status !== 0) {
		if (stderr.includes("not authenticated") || stderr.includes("login")) {
			log.error(
				"Not authenticated with Cloudflare. Run `wrangler login` first.",
			);
		} else {
			log.error(stderr || "Failed to create D1 database.");
		}
		return null;
	}

	// Try JSON parsing first (wrangler v4 --json flag)
	try {
		const parsed = JSON.parse(stdout);
		const id = parsed.uuid ?? parsed.database_id ?? parsed.id;
		if (id) return { id, name };
	} catch {
		// Fall back to UUID regex extraction
	}

	const match = stdout.match(UUID_RE);
	if (match) return { id: match[0], name };

	log.error("Could not extract database ID from wrangler output.");
	return null;
}
