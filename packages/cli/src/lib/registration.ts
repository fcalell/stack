import { access, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { ScaffoldSpec } from "#ast";
import type { AppConfig } from "#config";
import { StackError } from "#lib/errors";
import { createLogContext } from "#lib/prompt";
import type { ContributionCtx, LogContext, Slot } from "#lib/slots";

// Context factory shared between the CLI commands (which build a real
// contribution ctx per plugin to feed `buildGraph`) and test helpers.
//
// Historically this module also wired plugins onto a shared event bus —
// that's now the graph engine's job. What remains is the per-plugin ctx
// shape: `options`, `cwd`, filesystem helpers, log/prompt adapters, and
// the graph-provided `resolve` helper.

export interface RegisterContextOptions {
	cwd: string;
	options: unknown;
	app: AppConfig;
	log?: LogContext;
	// Provided by the graph engine when a contribution actually runs. During
	// non-graph flows (e.g. `stack add` collecting prompt answers before
	// writing the config file), commands may pass a stub that throws.
	resolve?: <T>(slot: Slot<T>) => Promise<T>;
	// Plugin-specific template & scaffold resolvers. When the caller already
	// has a plugin factory in hand, forward its resolvers here; otherwise
	// the ContributionCtx falls back to throw-on-use stubs.
	template?(name: string): URL;
	scaffold?(name: string, target: string): ScaffoldSpec;
}

const stubResolve = <T>(_slot: Slot<T>): Promise<T> => {
	throw new StackError(
		"ctx.resolve() called outside of a slot-graph resolution. " +
			"Use buildGraph(...).resolve(...) to drive slot contributions.",
		"CONTRIBUTION_CTX_NO_RESOLVE",
	);
};

const stubTemplate = (templateName: string): URL => {
	throw new StackError(
		`ctx.template(${JSON.stringify(templateName)}) has no resolver stamped onto this ContributionCtx. ` +
			"Use the plugin factory's collect() or buildGraph() to wire template resolution.",
		"CONTRIBUTION_CTX_NO_TEMPLATE",
	);
};

const stubScaffold = (templateName: string, _target: string): ScaffoldSpec => {
	throw new StackError(
		`ctx.scaffold(${JSON.stringify(templateName)}, …) has no resolver stamped onto this ContributionCtx. ` +
			"Use the plugin factory's collect() or buildGraph() to wire scaffold resolution.",
		"CONTRIBUTION_CTX_NO_SCAFFOLD",
	);
};

export function createRegisterContext(
	opts: RegisterContextOptions,
): ContributionCtx {
	return {
		cwd: opts.cwd,
		options: opts.options,
		app: opts.app,
		log: opts.log ?? createLogContext(),
		readFile: async (path: string) => readFile(join(opts.cwd, path), "utf-8"),
		fileExists: async (path: string) => {
			try {
				await access(join(opts.cwd, path));
				return true;
			} catch {
				return false;
			}
		},
		template: opts.template ?? stubTemplate,
		scaffold: opts.scaffold ?? stubScaffold,
		resolve: opts.resolve ?? stubResolve,
	};
}

// Synthetic AppConfig used by `init` / `add` flows where the stack config
// isn't yet fully loaded. `name` tracks the target directory.
export function syntheticAppConfig(cwd: string): AppConfig {
	return {
		name: basename(cwd),
		domain: "example.com",
	};
}
