import { existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import { intro, log, note, outro, spinner } from "@clack/prompts";
import { ask, choose, confirm, multi } from "#lib/prompt";
import { announceCreated, scaffoldFiles } from "#lib/scaffold";
import { createD1Database } from "#lib/wrangler";
import { biomeTemplate } from "#templates/biome";
import { gitignoreTemplate } from "#templates/gitignore";
import { packageJsonTemplate } from "#templates/package-json";
import { tsconfigTemplate } from "#templates/tsconfig";

export async function init(dir: string): Promise<void> {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const original = process.cwd();
	process.chdir(dir);

	try {
		await run(dir);
	} finally {
		process.chdir(original);
	}
}

async function run(dir: string): Promise<void> {
	intro(`stack init ${basename(dir)}`);

	let layers: string[];
	let dbDialect: "d1" | "sqlite" | undefined;
	let databaseId: string | undefined;
	let sqlitePath: string | undefined;
	let auth = false;
	let org = false;

	if (process.stdin.isTTY) {
		layers = await multi("Which layers do you want?", [
			{ label: "Database  (@fcalell/db)", value: "db" },
			{ label: "API       (@fcalell/api)", value: "api" },
			{ label: "App       (@fcalell/ui + @fcalell/vite)", value: "app" },
		]);

		// API requires db
		if (layers.includes("api") && !layers.includes("db")) {
			log.warn("API requires database — adding database layer.");
			layers.unshift("db");
		}

		if (layers.includes("db")) {
			log.step("Database");
			dbDialect = await choose<"d1" | "sqlite">("Dialect:", ["d1", "sqlite"]);

			if (dbDialect === "d1") {
				const createNew = await confirm("Create a new D1 database?");
				if (createNew) {
					const dbName = await ask("Database name", `${basename(dir)}-db`);
					const s = spinner();
					s.start("Creating D1 database...");
					const result = createD1Database(dbName);
					if (result) {
						s.stop(`Created D1 database: ${result.name} (${result.id})`);
						databaseId = result.id;
					} else {
						s.stop("Failed to create D1 database.");
						databaseId = await ask("D1 database ID (enter manually)");
					}
				} else {
					databaseId = await ask("D1 database ID");
				}
			} else {
				sqlitePath = await ask("SQLite file path", "./data/app.sqlite");
			}

			auth = await confirm("Include authentication?");
			org = auth ? await confirm("Include organizations?") : false;
		}
	} else {
		layers = [];
	}

	const hasDb = layers.includes("db");
	const hasApi = layers.includes("api");
	const hasApp = layers.includes("app");
	const name = basename(dir);

	const created = scaffoldFiles([
		[
			"package.json",
			packageJsonTemplate({ name, db: hasDb, api: hasApi, app: hasApp }),
		],
		["tsconfig.json", tsconfigTemplate({ app: hasApp })],
		["biome.json", biomeTemplate()],
		[".gitignore", gitignoreTemplate({ db: hasDb, api: hasApi, app: hasApp })],
	]);
	announceCreated(created);

	// Delegate to add commands for each layer
	if (hasDb) {
		const { add: addDb } = await import("#commands/add/db");
		await addDb({
			dialect: dbDialect,
			databaseId,
			sqlitePath,
			auth,
			org,
		});
	}

	if (hasApi) {
		const { add: addApi } = await import("#commands/add/api");
		await addApi();
	}

	if (hasApp) {
		const { add: addUi } = await import("#commands/add/ui");
		await addUi();
	}

	const nextSteps = ["pnpm install"];

	if (
		hasDb &&
		dbDialect === "d1" &&
		(!databaseId || databaseId.includes("YOUR"))
	) {
		nextSteps.push(
			"npx wrangler d1 create <name>  # then update databaseId in stack.config.ts",
		);
	}

	nextSteps.push("stack dev");

	const devExplain: string[] = [];
	if (hasDb) devExplain.push("push schema");
	if (hasApi) devExplain.push("start API on :8787");
	if (hasApp) devExplain.push("start app on :5173");
	if (devExplain.length > 0) {
		nextSteps.push(`  → will ${devExplain.join(", ")}`);
	}

	note(nextSteps.join("\n"), "Next steps");
	outro("Done!");
}
