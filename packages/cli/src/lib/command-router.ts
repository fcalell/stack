import type {
	CommandContext,
	CommandDefinition,
	FlagDefinition,
	InternalCliPlugin,
	LogContext,
	PromptContext,
} from "#lib/create-plugin";
import { StackError } from "#lib/errors";
import type { Slot } from "#lib/slots";

type AnyCliPlugin = InternalCliPlugin<unknown, Record<string, Slot<unknown>>>;

export interface PluginCommandMatch {
	plugin: AnyCliPlugin;
	command: CommandDefinition<unknown, Record<string, unknown>>;
	commandName: string;
}

export function findPluginCommand(
	plugins: AnyCliPlugin[],
	pluginName: string,
	commandName: string,
): PluginCommandMatch | null {
	const plugin = plugins.find((p) => p.name === pluginName);
	if (!plugin) return null;

	const command = plugin.commands[commandName];
	if (!command) return null;

	return { plugin, command, commandName };
}

export function parseCommandFlags(
	command: CommandDefinition<unknown, Record<string, unknown>>,
	argv: string[],
): Record<string, unknown> {
	const flags: Record<string, unknown> = {};
	const defs = (command.options ?? {}) as Record<string, FlagDefinition>;

	// Build lookup maps for canonical names and aliases.
	const longLookup = new Map<string, string>();
	const shortLookup = new Map<string, string>();
	for (const [key, def] of Object.entries(defs)) {
		longLookup.set(key, key);
		if (def.alias) {
			longLookup.set(def.alias, key);
			if (def.alias.length === 1) {
				shortLookup.set(def.alias, key);
			}
		}
	}

	// Set defaults
	for (const [key, def] of Object.entries(defs)) {
		if (def.default !== undefined) {
			flags[key] = def.default;
		} else if (def.type === "boolean") {
			flags[key] = false;
		}
	}

	const availableList = () =>
		Object.entries(defs)
			.map(([k, d]) => (d.alias ? `--${k} (-${d.alias})` : `--${k}`))
			.join(", ") || "(none)";

	// Parse argv
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		// Positional — silently passed through (unchanged behavior).
		if (!arg.startsWith("-")) continue;

		let canonical: string | undefined;
		if (arg.startsWith("--")) {
			const token = arg.slice(2);
			canonical = longLookup.get(token);
			if (!canonical) {
				throw new StackError(
					`Unknown flag "${arg}" for command "${command.description}". Available: ${availableList()}`,
					"UNKNOWN_FLAG",
				);
			}
		} else {
			const token = arg.slice(1);
			canonical = shortLookup.get(token);
			if (!canonical) {
				throw new StackError(
					`Unknown flag "${arg}" for command "${command.description}". Available: ${availableList()}`,
					"UNKNOWN_FLAG",
				);
			}
		}

		const def = defs[canonical];
		if (!def) continue;

		if (def.type === "boolean") {
			flags[canonical] = true;
		} else {
			const next = argv[i + 1];
			if (next === undefined || next.startsWith("-")) {
				throw new StackError(
					`Flag "${arg}" requires a ${def.type} value.`,
					"MISSING_FLAG_VALUE",
				);
			}
			if (def.type === "number") {
				const parsed = Number(next);
				if (Number.isNaN(parsed)) {
					throw new StackError(
						`Flag "${arg}" expects a number, got "${next}".`,
						"INVALID_FLAG_VALUE",
					);
				}
				flags[canonical] = parsed;
			} else {
				flags[canonical] = next;
			}
			i++;
		}
	}

	return flags;
}

export function createCommandContext<TOptions>(opts: {
	options: TOptions;
	cwd: string;
	resolve: <T>(slot: Slot<T>) => Promise<T>;
	log: LogContext;
	prompt: PromptContext;
}): CommandContext<TOptions> {
	return opts;
}

export function formatPluginCommands(plugins: AnyCliPlugin[]): string {
	const lines: string[] = [];
	for (const plugin of plugins) {
		const entries = Object.entries(plugin.commands);
		if (entries.length === 0) continue;

		for (const [cmdName, cmd] of entries) {
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
