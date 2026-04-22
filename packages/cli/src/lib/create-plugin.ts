import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { z } from "zod";
import type { ScaffoldSpec } from "#ast";
import type { AppConfig } from "#config";
import { cliSlots } from "#lib/cli-slots";
import { StackError } from "#lib/errors";
import type { Contribution, Slot } from "#lib/slots";

// ── Callback marker ────────────────────────────────────────────────
//
// `__optional` discriminates required vs optional at the type level — when
// the literal `true`, the callback is dropped from required handlers and
// added to the optional map in `InferCallbackPayloads`.

export interface CallbackMarker<T> {
	readonly __type?: T;
	readonly __optional?: boolean;
}

export type OptionalCallbackMarker<T> = CallbackMarker<T> & {
	readonly __optional: true;
};

interface CallbackFactory {
	<T extends Record<string, unknown>>(): CallbackMarker<T>;
	optional: <T extends Record<string, unknown>>() => OptionalCallbackMarker<T>;
}

const callbackImpl = <
	T extends Record<string, unknown>,
>(): CallbackMarker<T> => ({});
(callbackImpl as CallbackFactory).optional = <
	T extends Record<string, unknown>,
>(): OptionalCallbackMarker<T> => ({ __optional: true });

export const callback = callbackImpl as CallbackFactory;

// ── CommandContext ─────────────────────────────────────────────────
//
// Plugin subcommands (`stack <plugin> <command>`) run after the slot graph
// has been built. They receive a `resolve` helper so handlers can read
// slot values without hand-wiring anything.

export interface LogContext {
	info(msg: string): void;
	warn(msg: string): void;
	success(msg: string): void;
	error(msg: string): void;
}

export interface PromptContext {
	text(msg: string, opts?: { default?: string }): Promise<string>;
	confirm(msg: string): Promise<boolean>;
	select<T>(msg: string, options: { label: string; value: T }[]): Promise<T>;
	multiselect<T>(
		msg: string,
		options: { label: string; value: T }[],
	): Promise<T[]>;
}

export interface CommandContext<TOptions> {
	options: TOptions;
	cwd: string;
	resolve<T>(slot: Slot<T>): Promise<T>;
	log: LogContext;
	prompt: PromptContext;
}

// ── Command definition ─────────────────────────────────────────────

export interface FlagDefinition {
	type: "boolean" | "string" | "number";
	description: string;
	default?: unknown;
	alias?: string;
}

export interface CommandDefinition<TOptions, TFlags = Record<string, never>> {
	description: string;
	options?: { [K in keyof TFlags]: FlagDefinition };
	handler(ctx: CommandContext<TOptions>, flags: TFlags): Promise<void>;
}

// ── Plugin definition ──────────────────────────────────────────────

// The `self` helper passed to a function-form `contributes` array lets a
// plugin reference its own slots without stamping the plugin name on every
// slot declaration. Also carries the validated options so factories that
// need to read options when building contributions can do so eagerly (rare —
// most plugins read `ctx.options` inside the contribution fn).
export interface PluginSelf<TSlots, TOptions> {
	slots: TSlots;
	options: TOptions;
	app: AppConfig;
}

type ContributionsInput<TSlots, TOptions> =
	| Contribution<unknown>[]
	| ((self: PluginSelf<TSlots, TOptions>) => Contribution<unknown>[]);

export interface PluginDefinition<
	TOptions,
	TSlots extends Record<string, Slot<unknown>>,
	TCallbacks extends Record<
		string,
		CallbackMarker<unknown> | OptionalCallbackMarker<unknown>
	>,
> {
	label: string;
	// Explicit npm package name. When omitted, defaults to
	// `@fcalell/plugin-${name}`. Third-party plugins published under a
	// different namespace must set this so discovery can import them.
	package?: string;

	// Zod schema for plugin options. `createPlugin` parses the caller's
	// options through it (applying defaults and surfacing errors as
	// `StackError("PLUGIN_CONFIG_INVALID")`). The schema pins `TOptions` to
	// the schema's *input* type (i.e. `z.input<typeof schema>`), so users
	// don't redeclare the option shape — ctx.options picks it up
	// automatically.
	schema?: z.ZodType<unknown, TOptions>;

	// Presence-only dependency. Used for nicer error messages; ordering is
	// derived entirely from slot inputs, not from `requires`.
	requires?: string[];

	// Slots owned by this plugin. Exposed on the returned factory as
	// `.slots` so other plugins can contribute to them.
	slots?: TSlots;

	// Contributions to any plugin's (own or otherwise) slots. Accepts either
	// an array directly or a function that receives `self` so the plugin
	// can reference its own slots without a circular reference problem.
	contributes?: ContributionsInput<TSlots, TOptions>;

	commands?: Record<
		string,
		CommandDefinition<TOptions, Record<string, unknown>>
	>;

	callbacks?: TCallbacks;

	// Symmetric footprint declarations — auto-wired into `cliSlots.initDeps`
	// / `cliSlots.initDevDeps` / `cliSlots.gitignore` / `cliSlots.removeDeps`
	// / `cliSlots.removeDevDeps` by the plugin builder.
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	gitignore?: readonly string[];
}

// ── Internal CLI-facing descriptor ─────────────────────────────────

// Everything the CLI needs to route subcommands and drive discovery. The
// factory exposes this as `.cli` so existing call sites that read
// `plugin.cli.name` / `plugin.cli.commands` keep working; `collect(ctx)` is
// the new entry point for Phase D command code that builds the slot graph.
export interface InternalCliPlugin<TOptions, TSlots> {
	name: string;
	label: string;
	package: string;
	requires: readonly string[];
	callbacks: Record<
		string,
		CallbackMarker<unknown> | OptionalCallbackMarker<unknown>
	>;
	commands: Record<
		string,
		CommandDefinition<TOptions, Record<string, unknown>>
	>;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	gitignore: readonly string[];
	schema?: z.ZodType<unknown, TOptions>;
	// Plugin-scoped template / scaffold resolvers closed over the plugin's
	// on-disk `templates/` dir. Commands wire these through `ctxForPlugin`
	// so contributions can call `ctx.template("foo.tsx")` and get a URL
	// pointing at the owning plugin's package, not the consumer's cwd.
	template(name: string): URL;
	scaffold(name: string, target: string): ScaffoldSpec;
	// Per-config invocation: resolve the plugin's slots + contributions
	// against the validated options carried by the plugin's `PluginConfig`.
	// Returns the shape `buildGraph` consumes.
	collect(ctx: CollectCtx<TOptions>): {
		slots: TSlots;
		contributes: Contribution<unknown>[];
	};
}

// Arguments `collect()` needs to stamp the right `options` / `app` onto the
// `self` helper passed to a function-form `contributes`.
export interface CollectCtx<TOptions> {
	app: AppConfig;
	options: TOptions;
}

// ── Plugin factory type ────────────────────────────────────────────
//
// The returned factory is callable (`db({ dialect: "d1" })` → PluginConfig)
// and exposes the plugin's metadata. `defineCallbacks` is only present when
// callbacks were declared — narrowed via the same conditional intersection
// pattern used before.

type InferCallbackPayloads<
	T extends Record<
		string,
		CallbackMarker<unknown> | OptionalCallbackMarker<unknown>
	>,
> = {
	[K in keyof T as T[K] extends { readonly __optional: true }
		? never
		: K]: T[K] extends CallbackMarker<infer P>
		? (payload: P) => void | Promise<void>
		: never;
} & {
	[K in keyof T as T[K] extends { readonly __optional: true }
		? K
		: never]?: T[K] extends CallbackMarker<infer P>
		? (payload: P) => void | Promise<void>
		: never;
};

export type PluginFactory<
	TName extends string,
	TOptions,
	TSlots extends Record<string, Slot<unknown>>,
	TCallbacks extends Record<
		string,
		CallbackMarker<unknown> | OptionalCallbackMarker<unknown>
	>,
> = ((...args: [options: TOptions] | []) => {
	readonly __plugin: TName;
	readonly __package: string;
	readonly options: NonNullable<TOptions>;
}) & {
	name: TName;
	package: string;
	requires: readonly string[];
	slots: TSlots;
	cli: InternalCliPlugin<TOptions, TSlots>;
} & (keyof TCallbacks extends never
		? // biome-ignore lint/complexity/noBannedTypes: `{}` is a non-restrictive intersection that preserves the LHS; `Record<string, never>` would destroy it and `object` adds an unwanted constraint
			{}
		: {
				defineCallbacks: (
					impl: InferCallbackPayloads<TCallbacks>,
				) => InferCallbackPayloads<TCallbacks>;
			});

// ── plugin() ───────────────────────────────────────────────────────

export function plugin<
	TName extends string,
	TOptions,
	const TSlots extends Record<string, Slot<unknown>> = Record<string, never>,
	TCallbacks extends Record<
		string,
		CallbackMarker<unknown> | OptionalCallbackMarker<unknown>
	> = Record<string, never>,
>(
	name: TName,
	definition: PluginDefinition<TOptions, TSlots, TCallbacks>,
): PluginFactory<TName, TOptions, TSlots, TCallbacks> {
	const pkg = definition.package ?? `@fcalell/plugin-${name}`;
	const packageInfo = findPackageInfo(pkg);
	const packageRoot = packageInfo?.root ?? null;
	const templatesRoot = packageRoot
		? pathToFileURL(`${join(packageRoot, "templates")}/`)
		: null;

	const hasRuntimeExport = Boolean(
		packageInfo?.pkgJson?.exports?.["./runtime"],
	);
	const hasCallbacks =
		definition.callbacks !== undefined &&
		Object.keys(definition.callbacks).length > 0;
	const callbackTarget = `src/worker/plugins/${name}.ts`;

	const template = (templateName: string): URL => {
		if (!templatesRoot) {
			throw new StackError(
				`Plugin "${name}" attempted to resolve template ${JSON.stringify(templateName)} but its package "${pkg}" could not be located. Ensure it is installed in the consumer workspace.`,
				"PLUGIN_CONFIG_INVALID",
			);
		}
		return new URL(templateName, templatesRoot);
	};

	const _scaffold = (templateName: string, target: string): ScaffoldSpec => ({
		source: template(templateName),
		target,
		plugin: name,
	});

	const slots = (definition.slots ?? {}) as TSlots;

	function autoContributions(): Contribution<unknown>[] {
		const auto: Contribution<unknown>[] = [];

		// Auto-wire dependency declarations into the CLI's init/remove slots.
		// Plugins can still add extra contributions in `contributes` — nothing
		// here is exclusive.
		if (definition.dependencies) {
			const deps = definition.dependencies;
			auto.push(cliSlots.initDeps.contribute(() => ({ ...deps })));
			auto.push(cliSlots.removeDeps.contribute(() => Object.keys(deps)));
		}
		if (definition.devDependencies) {
			const devDeps = definition.devDependencies;
			auto.push(cliSlots.initDevDeps.contribute(() => ({ ...devDeps })));
			auto.push(cliSlots.removeDevDeps.contribute(() => Object.keys(devDeps)));
		}
		if (definition.gitignore && definition.gitignore.length > 0) {
			const entries = [...definition.gitignore];
			auto.push(cliSlots.gitignore.contribute(() => entries));
		}

		// Auto-scaffold the callback file when the plugin declares both
		// callbacks AND a `./runtime` subpath export. Callback → runtime
		// wiring for the worker chain itself is performed by plugin-api in a
		// separate contribution; this hook only ensures the callback file
		// exists on disk after `stack init` / `stack add`.
		if (hasCallbacks && hasRuntimeExport) {
			auto.push(
				cliSlots.initScaffolds.contribute(
					(): ScaffoldSpec => ({
						source: template("callbacks.ts"),
						target: callbackTarget,
						plugin: name,
					}),
				),
			);
			auto.push(cliSlots.removeFiles.contribute(() => callbackTarget));
		}

		return auto;
	}

	function collect(ctx: CollectCtx<TOptions>): {
		slots: TSlots;
		contributes: Contribution<unknown>[];
	} {
		const userContribs: Contribution<unknown>[] =
			typeof definition.contributes === "function"
				? definition.contributes({
						slots,
						options: ctx.options,
						app: ctx.app,
					})
				: (definition.contributes ?? []);

		return {
			slots,
			contributes: [...userContribs, ...autoContributions()],
		};
	}

	const cli: InternalCliPlugin<TOptions, TSlots> = {
		name,
		label: definition.label,
		package: pkg,
		requires: definition.requires ?? [],
		callbacks: (definition.callbacks ?? {}) as Record<
			string,
			CallbackMarker<unknown> | OptionalCallbackMarker<unknown>
		>,
		commands: (definition.commands ?? {}) as Record<
			string,
			CommandDefinition<TOptions, Record<string, unknown>>
		>,
		dependencies: definition.dependencies ?? {},
		devDependencies: definition.devDependencies ?? {},
		gitignore: definition.gitignore ?? [],
		schema: definition.schema,
		template,
		scaffold: _scaffold,
		collect,
	};

	const configFactory = (options?: TOptions) => {
		let validated: TOptions;
		if (definition.schema) {
			const result = definition.schema.safeParse(options ?? {});
			if (!result.success) {
				const summary = result.error.issues
					.map((issue) => {
						const path = issue.path.length ? issue.path.join(".") : "(root)";
						return `${path}: ${issue.message}`;
					})
					.join("; ");
				throw new StackError(
					`Invalid options for plugin "${name}": ${summary}`,
					"PLUGIN_CONFIG_INVALID",
				);
			}
			validated = result.data as TOptions;
		} else {
			validated = (options ?? {}) as TOptions;
		}
		return {
			__plugin: name as TName,
			__package: pkg,
			options: validated,
		};
	};

	Object.defineProperty(configFactory, "name", {
		value: name,
		writable: false,
		configurable: true,
	});

	const result = Object.assign(configFactory, {
		package: pkg,
		requires: (definition.requires ?? []) as readonly string[],
		slots,
		cli,
	});

	if (hasCallbacks) {
		Object.assign(result, {
			defineCallbacks: <T>(impl: T): T => impl,
		});
	}

	return result as unknown as PluginFactory<
		TName,
		TOptions,
		TSlots,
		TCallbacks
	>;
}

// ── ContributionCtx re-export ──────────────────────────────────────
//
// The slot-based contract uses `ContributionCtx` (declared in `#lib/slots`)
// everywhere `RegisterContext` used to appear. Re-export it so callers that
// import from `#lib/create-plugin` for a ctx type keep working.
export type { ContributionCtx } from "#lib/slots";

// ── Package-info resolution ────────────────────────────────────────
//
// Locate the on-disk directory and package.json of `pkg`. First try
// require.resolve scoped to the consumer's cwd (production and integration
// tests); fall back to the CLI's own resolution scope (workspace dev where
// a plugin depends on another plugin via a symlinked node_modules). Returns
// null when the package can't be located — `template()` throws clearly if
// it's then called, and runtime auto-detection degrades silently.
interface PackageInfo {
	root: string;
	pkgJson: {
		exports?: Record<string, unknown>;
	};
}

function findPackageInfo(pkg: string): PackageInfo | null {
	for (const make of [
		() => createRequire(join(process.cwd(), "package.json")),
		() => createRequire(import.meta.url),
	]) {
		try {
			const req = make();
			const mainPath = req.resolve(pkg);
			const info = walkUpToPackageJson(mainPath, pkg);
			if (info) return info;
		} catch {}
	}
	return null;
}

function walkUpToPackageJson(
	startPath: string,
	pkg: string,
): PackageInfo | null {
	let dir = dirname(startPath);
	for (let i = 0; i < 15; i++) {
		const candidate = join(dir, "package.json");
		if (existsSync(candidate)) {
			try {
				const parsed = JSON.parse(readFileSync(candidate, "utf-8")) as {
					name?: string;
					exports?: Record<string, unknown>;
				};
				if (parsed.name === pkg) return { root: dir, pkgJson: parsed };
			} catch {}
		}
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
	return null;
}
