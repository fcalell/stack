import { spawnSync } from "node:child_process";

// Sentinel seeded by `stack init` when the consumer hasn't created a D1
// database yet. Single source of truth so the init prompt and the deploy guard
// agree on the placeholder.
export const D1_PLACEHOLDER_ID = "YOUR_D1_DATABASE_ID";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_ANYWHERE =
	/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function isWranglerAuthed(): boolean {
	const result = spawnSync("npx", ["wrangler", "whoami"], { stdio: "pipe" });
	return result.status === 0;
}

export type D1CreateResult =
	| { ok: true; id: string; name: string }
	| { ok: false; error: string };

// Shells `wrangler d1 create` and extracts the new database's id. Returns a
// discriminated result so the caller owns user-facing messaging (this module
// stays log-free — it's a pure node helper).
export function createD1Database(name: string): D1CreateResult {
	const result = spawnSync(
		"npx",
		["wrangler", "d1", "create", name, "--json"],
		{ stdio: "pipe" },
	);

	const stdout = result.stdout?.toString().trim() ?? "";
	const stderr = result.stderr?.toString().trim() ?? "";

	if (result.status !== 0) {
		const authFailed =
			stderr.includes("not authenticated") || stderr.includes("login");
		return {
			ok: false,
			error: authFailed
				? "Not authenticated with Cloudflare. Run `wrangler login` first."
				: stderr || "Failed to create D1 database.",
		};
	}

	try {
		const parsed = JSON.parse(stdout);
		const id = parsed.uuid ?? parsed.database_id ?? parsed.id;
		if (id) return { ok: true, id, name };
	} catch {
		// Fall back to UUID regex extraction from human-readable output.
	}

	const match = stdout.match(UUID_ANYWHERE);
	if (match) return { ok: true, id: match[0], name };

	return {
		ok: false,
		error: "Could not extract database ID from wrangler output.",
	};
}

// Fail-fast guard for `stack deploy`: a d1 deploy whose `databaseId` is still
// the placeholder (or isn't a UUID) would push migrations against a database
// that doesn't exist and fail opaquely deep inside wrangler. Throw an
// actionable error before any cloud mutation instead.
export function assertDeployableDatabaseId(
	databaseId: string | undefined,
): void {
	if (!databaseId || databaseId === D1_PLACEHOLDER_ID) {
		throw new Error(
			`db: \`databaseId\` is still the placeholder (${D1_PLACEHOLDER_ID}). ` +
				"Create a database with `stack db create` (or `wrangler d1 create <name>`) " +
				"and set its id as `databaseId` in stack.config.ts before deploying.",
		);
	}
	if (!UUID_RE.test(databaseId)) {
		throw new Error(
			`db: \`databaseId\` ("${databaseId}") is not a valid D1 database id. ` +
				"Use the `database_id` UUID from `wrangler d1 create`, not the database name.",
		);
	}
}
