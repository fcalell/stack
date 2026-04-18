import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { AppConfig, StackConfig } from "#config";
import type { RegisterContext } from "#lib/create-plugin";
import type { DiscoveredPlugin } from "#lib/discovery";
import { createEventBus, type EventBus } from "#lib/event-bus";
import { createLogContext, createPromptContext } from "#lib/prompt";

interface ContextOptions {
	cwd: string;
	options: unknown;
	app: AppConfig;
	hasPlugin: (name: string) => boolean;
	nonInteractive?: boolean;
}

export function createRegisterContext(
	opts: ContextOptions,
): RegisterContext<unknown> {
	return {
		cwd: opts.cwd,
		options: opts.options,
		app: opts.app,
		hasPlugin: opts.hasPlugin,
		readFile: async (path: string) => readFile(join(opts.cwd, path), "utf-8"),
		fileExists: async (path: string) => {
			try {
				await access(join(opts.cwd, path));
				return true;
			} catch {
				return false;
			}
		},
		log: createLogContext(),
		prompt: createPromptContext({ nonInteractive: opts.nonInteractive }),
	};
}

// Synthetic AppConfig used by `init` / `add` flows where the stack config isn't
// yet fully loaded. `name` tracks the target directory; other fields fall back
// to pragmatic defaults. Plugins rarely rely on `ctx.app` during init/add.
export function syntheticAppConfig(cwd: string): AppConfig {
	return {
		name: basename(cwd),
		domain: "example.com",
		title: basename(cwd),
		lang: "en",
	};
}

export function registerPlugins(
	sorted: DiscoveredPlugin[],
	config: StackConfig,
	cwd: string,
): EventBus {
	const bus = createEventBus();
	for (const p of sorted) {
		const ctx = createRegisterContext({
			cwd,
			options: p.options,
			app: config.app,
			hasPlugin: (name) => config.plugins.some((pl) => pl.__plugin === name),
		});
		p.cli.register(ctx, bus, p.events);
	}
	return bus;
}
