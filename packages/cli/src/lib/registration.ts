import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	cancel,
	multiselect as clackMultiselect,
	select as clackSelect,
	isCancel,
	log,
} from "@clack/prompts";
import type { StackConfig } from "#config";
import type { RegisterContext } from "#lib/create-plugin";
import type { DiscoveredPlugin } from "#lib/discovery";
import { createEventBus, type EventBus } from "#lib/event-bus";
import { ask, confirm } from "#lib/prompt";

interface ContextOptions {
	cwd: string;
	options: unknown;
	hasPlugin: (name: string) => boolean;
}

export function createRegisterContext(
	opts: ContextOptions,
): RegisterContext<unknown> {
	return {
		cwd: opts.cwd,
		options: opts.options,
		hasPlugin: opts.hasPlugin,
		readFile: async (path: string) =>
			readFileSync(join(opts.cwd, path), "utf-8"),
		fileExists: async (path: string) => existsSync(join(opts.cwd, path)),
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
			select: async <T>(
				msg: string,
				options: { label: string; value: T }[],
			) => {
				const value = await clackSelect({
					message: msg,
					options: options.map((o) => ({
						value: o.value,
						label: o.label,
					})) as any,
				});
				if (isCancel(value)) {
					cancel("Cancelled.");
					process.exit(0);
				}
				return value as T;
			},
			multiselect: async <T>(
				msg: string,
				options: { label: string; value: T }[],
			) => {
				const value = await clackMultiselect({
					message: msg,
					options: options.map((o) => ({
						value: o.value,
						label: o.label,
					})) as any,
				});
				if (isCancel(value)) {
					cancel("Cancelled.");
					process.exit(0);
				}
				return value as T[];
			},
		},
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
