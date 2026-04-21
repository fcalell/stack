import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { AppConfig, StackConfig } from "#config";
import type { DiscoveredPluginInfo, RegisterContext } from "#lib/create-plugin";
import type { DiscoveredPlugin } from "#lib/discovery";
import { StackError } from "#lib/errors";
import { createEventBus, type EventBus } from "#lib/event-bus";
import { createLogContext, createPromptContext } from "#lib/prompt";

interface ContextOptions {
	cwd: string;
	options: unknown;
	app: AppConfig;
	hasPlugin: (name: string) => boolean;
	discoveredPlugins?: DiscoveredPluginInfo[];
	nonInteractive?: boolean;
}

// `plugin`, `template`, and `scaffold` are overwritten by `createPlugin`'s
// register wrapper before the plugin's user code runs. The placeholders here
// exist solely to satisfy the RegisterContext type at this construction site.
const placeholderTemplate = (_name: string): URL => {
	throw new StackError(
		"ctx.template() called before createPlugin stamped its resolver",
		"PLUGIN_CONFIG_INVALID",
	);
};

export function createRegisterContext(
	opts: ContextOptions,
): RegisterContext<unknown> {
	return {
		cwd: opts.cwd,
		options: opts.options,
		app: opts.app,
		plugin: "",
		discoveredPlugins: opts.discoveredPlugins ?? [],
		hasPlugin: opts.hasPlugin,
		template: placeholderTemplate,
		scaffold: (_name: string, _target: string) => {
			throw new StackError(
				"ctx.scaffold() called before createPlugin stamped its resolver",
				"PLUGIN_CONFIG_INVALID",
			);
		},
		readFile: async (path: string) => readFile(join(opts.cwd, path), "utf-8"),
		fileExists: async (path: string) => {
			try {
				await access(join(opts.cwd, path));
				return true;
			} catch {
				return false;
			}
		},
		runtime: () => {
			throw new StackError(
				"ctx.runtime() called before createPlugin stamped its helper",
				"PLUGIN_CONFIG_INVALID",
			);
		},
		log: createLogContext(),
		prompt: createPromptContext({ nonInteractive: opts.nonInteractive }),
	};
}

// Synthetic AppConfig used by `init` / `add` flows where the stack config isn't
// yet fully loaded. `name` tracks the target directory. Plugins rarely rely on
// `ctx.app` during init/add.
export function syntheticAppConfig(cwd: string): AppConfig {
	return {
		name: basename(cwd),
		domain: "example.com",
	};
}

export function registerPlugins(
	sorted: DiscoveredPlugin[],
	config: StackConfig,
	cwd: string,
): EventBus {
	const bus = createEventBus();
	const discoveredPlugins: DiscoveredPluginInfo[] = sorted.map((p) => ({
		name: p.cli.name,
		package: p.cli.package,
		callbacks: p.cli.callbacks,
	}));
	for (const p of sorted) {
		const ctx = createRegisterContext({
			cwd,
			options: p.options,
			app: config.app,
			discoveredPlugins,
			hasPlugin: (name) => config.plugins.some((pl) => pl.__plugin === name),
		});
		p.cli.register(ctx, bus, p.events);
	}
	return bus;
}
