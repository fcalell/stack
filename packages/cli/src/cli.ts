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

const CORE_COMMANDS = new Set([
	"init",
	"add",
	"remove",
	"generate",
	"dev",
	"build",
	"deploy",
]);

async function _pluginCommandUsage(): Promise<string> {
	try {
		const { loadConfig } = await import("#lib/config");
		const { discoverPlugins, sortByDependencies } = await import(
			"#lib/discovery"
		);
		const { formatPluginCommands } = await import("#lib/command-router");

		const config = await loadConfig(configPath);
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);
		const pluginClis = sorted.map((p) => p.cli);
		const pluginHelp = formatPluginCommands(pluginClis);
		return pluginHelp ? `\n\nPlugin commands:\n${pluginHelp}` : "";
	} catch {
		return "";
	}
}

function usage(): never {
	log.info(`Usage:
  stack init [dir]             Scaffold a new project
  stack add <plugin>           Add a plugin
  stack remove <plugin>        Remove a plugin
  stack generate               Generate .stack/ files
  stack dev [--studio]         Start development
  stack build                  Build for production
  stack deploy                 Deploy to production`);
	process.exit(1);
}

if (!command) usage();

if (CORE_COMMANDS.has(command)) {
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
	}
} else {
	// Try to match `stack <plugin> <command>`
	const pluginName = command;
	const commandName = subcommand;

	if (!commandName) {
		usage();
	}

	try {
		const { loadConfig } = await import("#lib/config");
		const { discoverPlugins, sortByDependencies } = await import(
			"#lib/discovery"
		);
		const { findPluginCommand, parseCommandFlags, createCommandContext } =
			await import("#lib/command-router");
		const { registerPlugins } = await import("#lib/registration");
		const { ask, confirm } = await import("#lib/prompt");

		const config = await loadConfig(configPath);
		const discovered = await discoverPlugins(config);
		const sorted = sortByDependencies(discovered);

		// Register plugins to set up the event bus
		registerPlugins(sorted, config, process.cwd());

		const pluginClis = sorted.map((p) => p.cli);
		const match = findPluginCommand(pluginClis, pluginName, commandName);

		if (!match) {
			log.error(`Unknown command: stack ${pluginName} ${commandName}`);
			usage();
		}

		const flags = parseCommandFlags(match.command, positionals.slice(2));
		const plugin = sorted.find((p) => p.name === pluginName);

		const ctx = createCommandContext({
			options: plugin?.options ?? {},
			cwd: process.cwd(),
			log: {
				info: (msg: string) => log.info(msg),
				warn: (msg: string) => log.warn(msg),
				success: (msg: string) => log.success(msg),
				error: (msg: string) => log.error(msg),
			},
			prompt: {
				text: async (msg: string, opts?: { default?: string }) =>
					ask(msg, opts?.default),
				confirm: async (msg: string) => confirm(msg),
				select: async () => undefined as any,
				multiselect: async () => [],
			},
		});

		await match.command.handler(ctx, flags);
	} catch {
		usage();
	}
}
