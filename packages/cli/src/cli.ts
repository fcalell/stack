#!/usr/bin/env tsx
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { log } from "@clack/prompts";
import { ConfigValidationError, StackError } from "#lib/errors";

// `strict: false` lets plugin-subcommand flags (e.g. `stack db apply --remote`)
// pass through top-level parsing without an "unknown option" error; the
// command router then parses them from argv. With `strict: false`, `values`
// is typed as `{ [k: string]: undefined | string | boolean | (string|boolean)[] }`,
// so every access narrows with `typeof`.
const { positionals, values } = parseArgs({
	allowPositionals: true,
	strict: false,
	options: {
		studio: { type: "boolean", default: false },
		config: { type: "string", default: "stack.config.ts" },
		plugins: { type: "string" },
		domain: { type: "string" },
		package: { type: "string" },
		dir: { type: "string" },
		yes: { type: "boolean", short: "y", default: false },
	},
});

const command = positionals[0];
const subcommand = positionals[1];
const configPath =
	typeof values.config === "string" ? values.config : "stack.config.ts";

const CORE_COMMANDS = new Set([
	"init",
	"add",
	"remove",
	"generate",
	"dev",
	"build",
	"deploy",
]);

function usage(): never {
	log.info(`Usage:
  stack init [dir] [--plugins <csv>] [--domain <d>] [-y]
                                        Scaffold a new project
  stack add <plugin>                    Add a plugin
  stack remove <plugin>                 Remove a plugin
  stack generate                        Generate .stack/ files
  stack dev [--studio]                  Start development
  stack build                           Build for production
  stack deploy                          Deploy to production
  stack plugin init <name> [--package <npm-name>] [--dir <path>]
                                        Scaffold a third-party plugin skeleton`);
	process.exit(1);
}

async function main(): Promise<void> {
	if (!command) usage();

	// `stack plugin init <name>` — CLI-built scaffolder for third-party plugin
	// authors. Handled ahead of plugin-subcommand routing so it never collides
	// with a hypothetical user plugin literally named "plugin".
	if (command === "plugin") {
		if (subcommand !== "init") {
			log.error(
				`Unknown plugin command: "${subcommand ?? ""}". Usage: stack plugin init <name>`,
			);
			process.exit(1);
		}
		const pluginName = positionals[2];
		if (!pluginName) {
			log.error(
				"Usage: stack plugin init <name> [--package <pkg>] [--dir <dir>]",
			);
			process.exit(1);
		}
		const { initPlugin } = await import("#commands/plugin");
		await initPlugin({
			name: pluginName,
			package: typeof values.package === "string" ? values.package : undefined,
			dir: typeof values.dir === "string" ? values.dir : undefined,
		});
		return;
	}

	if (CORE_COMMANDS.has(command)) {
		if (command === "init") {
			const dir = subcommand ? resolve(subcommand) : process.cwd();
			const { init } = await import("#commands/init");
			const pluginsValue = values.plugins;
			const domainValue = values.domain;
			const yesValue = values.yes;
			const pluginsFlag =
				typeof pluginsValue === "string"
					? pluginsValue
							.split(",")
							.map((s) => s.trim())
							.filter((s) => s.length > 0)
					: undefined;
			await init(dir, {
				plugins: pluginsFlag,
				domain: typeof domainValue === "string" ? domainValue : undefined,
				yes: yesValue === true,
			});
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
			await dev({ studio: values.studio === true, config: configPath });
		} else if (command === "build") {
			const { build } = await import("#commands/build");
			await build(configPath);
		} else if (command === "deploy") {
			const { deploy } = await import("#commands/deploy");
			await deploy({ config: configPath });
		}
		return;
	}

	// Plugin subcommands (`stack <plugin> <command>`) — build the slot graph
	// once, look the command up, and hand it a CommandContext whose `resolve`
	// is wired to the graph.
	const pluginName = command;
	const commandName = subcommand;
	if (!commandName) usage();

	const { loadConfig } = await import("#lib/config");
	const { buildGraphFromConfig } = await import("#lib/build-graph");
	const { findPluginCommand, parseCommandFlags, createCommandContext } =
		await import("#lib/command-router");
	const { createLogContext, createPromptContext } = await import("#lib/prompt");

	const config = await loadConfig(configPath);
	const { graph, sorted } = await buildGraphFromConfig({
		config,
		cwd: process.cwd(),
	});

	const pluginClis = sorted.map((p) => p.cli);
	const match = findPluginCommand(pluginClis, pluginName, commandName);

	if (!match) {
		log.error(`Unknown command: stack ${pluginName} ${commandName ?? ""}`);
		usage();
	}

	const flags = parseCommandFlags(match.command, process.argv.slice(2));
	const plugin = sorted.find((p) => p.name === pluginName);

	const ctx = createCommandContext({
		options: plugin?.options ?? {},
		cwd: process.cwd(),
		resolve: (slot) => graph.resolve(slot),
		log: createLogContext(),
		prompt: createPromptContext(),
	});

	await match.command.handler(ctx, flags);
}

try {
	await main();
} catch (error) {
	if (error instanceof ConfigValidationError) {
		for (const err of error.errors) {
			log.error(
				`[${err.plugin}] ${err.message}${err.fix ? ` — ${err.fix}` : ""}`,
			);
		}
		process.exit(1);
	}
	if (error instanceof StackError) {
		log.error(error.message);
		process.exit(1);
	}
	if (error instanceof Error) {
		log.error(error.stack ?? error.message);
	} else {
		log.error(String(error));
	}
	process.exit(1);
}
