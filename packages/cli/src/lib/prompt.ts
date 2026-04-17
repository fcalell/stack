import {
	cancel,
	confirm as clackConfirm,
	isCancel,
	log,
	multiselect,
	select,
	text,
} from "@clack/prompts";
import type { CommandContext } from "#lib/create-plugin";

function unwrap<T>(value: T | symbol): T {
	if (isCancel(value)) {
		cancel("Cancelled.");
		process.exit(0);
	}
	return value as T;
}

export async function ask(
	message: string,
	defaultValue?: string,
): Promise<string> {
	return unwrap(await text({ message, defaultValue }));
}

export async function confirm(message: string): Promise<boolean> {
	return unwrap(await clackConfirm({ message, initialValue: false }));
}

export async function choose<T extends string>(
	message: string,
	options: readonly [T, ...T[]],
): Promise<T> {
	const value = await select({
		message,
		// biome-ignore lint/suspicious/noExplicitAny: Option<T> conditional type is unresolvable with generics
		options: options.map((v) => ({ value: v, label: v })) as any,
	});
	return unwrap(value) as T;
}

export interface MultiOption<T extends string> {
	label: string;
	value: T;
	default?: boolean;
}

export async function multi<T extends string>(
	message: string,
	options: readonly MultiOption<T>[],
): Promise<T[]> {
	const value = await multiselect({
		message,
		// biome-ignore lint/suspicious/noExplicitAny: Option<T> conditional type is unresolvable with generics
		options: options.map((o) => ({ value: o.value, label: o.label })) as any,
		initialValues: options.filter((o) => o.default).map((o) => o.value),
	});
	return unwrap(value) as T[];
}

/**
 * Shared `log` adapter that wraps `@clack/prompts`'s log functions to match
 * the `RegisterContext`/`CommandContext` shape consumed by plugins.
 */
export function createLogContext(): CommandContext<unknown>["log"] {
	return {
		info: (msg: string) => log.info(msg),
		warn: (msg: string) => log.warn(msg),
		success: (msg: string) => log.success(msg),
		error: (msg: string) => log.error(msg),
	};
}

export interface PromptContextOptions {
	/**
	 * When true, prompt methods resolve immediately with sensible defaults
	 * instead of rendering an interactive prompt. Used for CI and scripted
	 * scaffolding where no stdin is available.
	 *
	 * - `text(msg, { default })` returns the default (or empty string)
	 * - `confirm(msg)` returns false
	 * - `select(msg, options)` returns the first option's value
	 * - `multiselect(msg, options)` returns an empty array
	 */
	nonInteractive?: boolean;
}

/**
 * Shared `prompt` adapter backed by `@clack/prompts`. Cancels exit the
 * process via `unwrap` so plugin handlers don't need to check for cancel
 * sentinels.
 *
 * Pass `{ nonInteractive: true }` to skip rendering and resolve with
 * defaults — for CI and `stack init --plugins ...` flows.
 */
export function createPromptContext(
	options: PromptContextOptions = {},
): CommandContext<unknown>["prompt"] {
	if (options.nonInteractive) {
		return {
			text: async (_msg: string, opts?: { default?: string }) =>
				opts?.default ?? "",
			confirm: async () => false,
			select: async <T>(
				_msg: string,
				opts: { label: string; value: T }[],
			): Promise<T> => {
				const first = opts[0];
				if (!first) {
					throw new Error(
						"select() called with no options in non-interactive mode",
					);
				}
				return first.value;
			},
			multiselect: async <T>(): Promise<T[]> => [],
		};
	}

	return {
		text: async (msg: string, opts?: { default?: string }) =>
			ask(msg, opts?.default),
		confirm: async (msg: string) => confirm(msg),
		select: async <T>(
			msg: string,
			options: { label: string; value: T }[],
		): Promise<T> => {
			const value = await select({
				message: msg,
				options: options.map((o) => ({
					value: o.value,
					label: o.label,
					// biome-ignore lint/suspicious/noExplicitAny: Option<T> conditional type is unresolvable with generics
				})) as any,
			});
			return unwrap(value) as T;
		},
		multiselect: async <T>(
			msg: string,
			options: { label: string; value: T }[],
		): Promise<T[]> => {
			const value = await multiselect({
				message: msg,
				options: options.map((o) => ({
					value: o.value,
					label: o.label,
					// biome-ignore lint/suspicious/noExplicitAny: Option<T> conditional type is unresolvable with generics
				})) as any,
			});
			return unwrap(value) as T[];
		},
	};
}
