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

const COMMANDS: Record<string, string[] | null> = {
	init: null,
	add: null,
	remove: null,
	generate: null,
	dev: null,
	build: null,
	deploy: null,
	db: ["reset"],
};

function usage(): never {
	log.info(`Usage:
  stack init [dir]                 Scaffold a new project
  stack add <plugin>               Add a plugin
  stack remove <plugin>            Remove a plugin
  stack generate                   Generate .stack/ files
  stack dev [--studio]             Start development
  stack build                      Build for production
  stack deploy                     Deploy to production
  stack db reset                   Reset local database`);
	process.exit(1);
}

if (!command || !(command in COMMANDS)) usage();

if (command === "init") {
	const dir = subcommand ? resolve(subcommand) : process.cwd();
	const { init } = await import("#commands/init");
	await init(dir);
} else if (command === "add") {
	if (!subcommand) {
		log.error("Usage: stack add <plugin>");
		process.exit(1);
	}
	const { add } = await import("#commands/add");
	await add(subcommand, configPath);
} else if (command === "remove") {
	if (!subcommand) {
		log.error("Usage: stack remove <plugin>");
		process.exit(1);
	}
	const { remove } = await import("#commands/remove");
	await remove(subcommand, configPath);
} else if (command === "generate") {
	const { generate } = await import("#commands/generate");
	await generate(configPath);
} else if (command === "dev") {
	const { dev } = await import("#commands/dev");
	await dev({ studio: values.studio ?? false, config: configPath });
} else if (command === "build") {
	const { build } = await import("#commands/build");
	await build(configPath);
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
