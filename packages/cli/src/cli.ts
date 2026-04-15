#!/usr/bin/env tsx
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { log } from "@clack/prompts";

const { positionals, values } = parseArgs({
	allowPositionals: true,
	options: {
		studio: { type: "boolean", default: false },
		config: { type: "string", default: "stack.config.ts" },
	},
});

const command = positionals[0];
const subcommand = positionals[1];
const configPath = values.config ?? "stack.config.ts";

const COMMANDS: Record<string, string[]> = {
	init: [],
	add: ["db", "auth", "org", "api", "ui"],
	dev: [],
	deploy: [],
	db: ["reset"],
};

function usage(): never {
	log.info(`Usage:
  stack init [dir]                 Scaffold a new project
  stack add <db|auth|org|api|ui>   Add a feature
  stack dev [--studio]             Start development
  stack deploy                     Deploy to production
  stack db reset                   Reset local database`);
	process.exit(1);
}

if (!command || !COMMANDS[command]) usage();

if (command === "init") {
	const dir = subcommand ? resolve(subcommand) : process.cwd();
	const { init } = await import("#commands/init");
	await init(dir);
} else if (command === "add") {
	if (!subcommand || !COMMANDS.add?.includes(subcommand)) {
		log.error(`Unknown feature: ${subcommand}`);
		log.info("Available: db, auth, org, api, ui");
		process.exit(1);
	}
	const mod = await import(`#commands/add/${subcommand}`);
	await mod.add();
} else if (command === "dev") {
	const { dev } = await import("#commands/dev");
	await dev({ studio: values.studio ?? false, config: configPath });
} else if (command === "deploy") {
	const { deploy } = await import("#commands/deploy");
	await deploy({ config: configPath });
} else if (command === "db") {
	if (subcommand !== "reset") {
		log.error("Usage: stack db reset");
		process.exit(1);
	}
	const { reset } = await import("#commands/db/reset");
	await reset({ config: configPath });
}
