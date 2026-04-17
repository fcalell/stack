import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { StackConfig } from "#config";
import type { RegisterContext } from "#lib/create-plugin";
import type { DiscoveredPlugin } from "#lib/discovery";
import { createEventBus, type EventBus } from "#lib/event-bus";
import { createLogContext, createPromptContext } from "#lib/prompt";

interface ContextOptions {
	cwd: string;
	options: unknown;
	hasPlugin: (name: string) => boolean;
	nonInteractive?: boolean;
}

export function createRegisterContext(
	opts: ContextOptions,
): RegisterContext<unknown> {
	return {
		cwd: opts.cwd,
		options: opts.options,
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
			hasPlugin: (name) => config.plugins.some((pl) => pl.__plugin === name),
		});
		p.cli.register(ctx, bus, p.events);
	}
	return bus;
}
