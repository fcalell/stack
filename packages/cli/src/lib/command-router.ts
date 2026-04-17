import type {
	CommandContext,
	CommandDefinition,
	FlagDefinition,
	InternalCliPlugin,
} from "#lib/create-plugin";

export interface PluginCommandMatch {
	plugin: InternalCliPlugin<any>;
	command: CommandDefinition<any, any>;
	commandName: string;
	flags: Record<string, unknown>;
}

export function findPluginCommand(
	plugins: InternalCliPlugin<any>[],
	pluginName: string,
	commandName: string,
): PluginCommandMatch | null {
	const plugin = plugins.find((p) => p.name === pluginName);
	if (!plugin) return null;

	const command = plugin.commands[commandName];
	if (!command) return null;

	return { plugin, command, commandName, flags: {} };
}

export function parseCommandFlags(
	command: CommandDefinition<any, any>,
	argv: string[],
): Record<string, unknown> {
	const flags: Record<string, unknown> = {};
	const defs = (command.options ?? {}) as Record<string, FlagDefinition>;

	// Set defaults
	for (const [key, def] of Object.entries(defs)) {
		if (def.default !== undefined) {
			flags[key] = def.default;
		} else if (def.type === "boolean") {
			flags[key] = false;
		}
	}

	// Parse argv
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		if (!arg.startsWith("--")) continue;

		const name = arg.slice(2);
		const def = defs[name];
		if (!def) continue;

		if (def.type === "boolean") {
			flags[name] = true;
		} else {
			const next = argv[i + 1];
			if (next !== undefined) {
				flags[name] = def.type === "number" ? Number(next) : next;
				i++;
			}
		}
	}

	return flags;
}

export function createCommandContext<TOptions>(opts: {
	options: TOptions;
	cwd: string;
	log: CommandContext<TOptions>["log"];
	prompt: CommandContext<TOptions>["prompt"];
}): CommandContext<TOptions> {
	return opts;
}

export function formatPluginCommands(
	plugins: InternalCliPlugin<any>[],
): string {
	const lines: string[] = [];
	for (const plugin of plugins) {
		const commandNames = Object.keys(plugin.commands);
		if (commandNames.length === 0) continue;

		for (const cmdName of commandNames) {
			const cmd = plugin.commands[cmdName]!;
			const flagStr = cmd.options
				? Object.entries(cmd.options as Record<string, FlagDefinition>)
						.map(([k, _v]) => `--${k}`)
						.join(" ")
				: "";

			const full = `${plugin.name} ${cmdName}${flagStr ? ` [${flagStr}]` : ""}`;
			lines.push(`  ${full.padEnd(28)} ${cmd.description}`);
		}
	}
	return lines.join("\n");
}
