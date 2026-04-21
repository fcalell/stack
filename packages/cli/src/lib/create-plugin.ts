import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { z } from "zod";
import type { ScaffoldSpec, TsExpression, TsImportSpec } from "#ast";
import { literalToProps } from "#ast";
import type { AppConfig } from "#config";
import { Init, Remove } from "#events";
import { StackError } from "#lib/errors";
import type { Event, EventBus, EventTypeMarker } from "#lib/event-bus";
import { defineEvent } from "#lib/event-bus";

// ── Plugin-runtime primitives (structural) ─────────────────────────
//
// `ctx.runtime(p)` finds-or-creates the current plugin's entry on a worker
// codegen payload so handlers can stamp `options` / `callbacks` without
// rebuilding opaque AST literals. The payload itself lives in
// `@fcalell/plugin-api/node`; core only knows the structural shape it
// operates on — enough to read/write `pluginRuntimes` and its fields.

export interface PluginRuntimeEntry {
	plugin: string;
	import: TsImportSpec;
	identifier: string;
	options: Record<string, TsExpression>;
	callbacks?: { import: TsImportSpec; identifier: string };
}

export interface RuntimePayload {
	imports: TsImportSpec[];
	pluginRuntimes: PluginRuntimeEntry[];
}

export { type } from "#lib/event-bus";

// ── Callback marker ────────────────────────────────────────────────

// `__optional` discriminates required vs optional at the type level — when
// the literal `true`, the callback is dropped from required handlers and
// added to the optional map in `InferCallbackPayloads`.
export interface CallbackMarker<T> {
	readonly __type?: T;
	readonly __optional?: boolean;
}

type OptionalCallbackMarker<T> = CallbackMarker<T> & {
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

// ── RegisterContext ────────────────────────────────────────────────

// Structural descriptor of a sibling plugin — visible to every plugin's
// register function via `ctx.discoveredPlugins`. Used by plugin-api to
// auto-wire `src/worker/plugins/<name>.ts` callback files into the worker
// chain without importing any peer plugin at CLI time. Only carries the
// name and its declared callbacks; no handlers, no options.
export interface DiscoveredPluginInfo {
	name: string;
	package: string;
	callbacks: Record<string, CallbackMarker<unknown>>;
}

export interface RegisterContext<TOptions> {
	options: TOptions;
	cwd: string;
	app: AppConfig;

	// Name of the plugin owning this context. Auto-populated by `createPlugin`;
	// available for plugins that need to tag payload entries (e.g. scaffolds).
	plugin: string;

	// Every plugin in the resolved config — `{ name, package, callbacks }` per
	// plugin. Populated before any `register` runs so late-binding wiring
	// (e.g. plugin-api auto-wiring callback files) can loop over it.
	discoveredPlugins: DiscoveredPluginInfo[];

	hasPlugin(name: string): boolean;

	// Resolve a template under the plugin's own `templates/` directory.
	// Works as long as the plugin's npm package is installed in the consumer's
	// workspace (via the `@fcalell/plugin-${name}` convention or an explicit
	// `package` field on the definition).
	template(name: string): URL;

	// One-shot scaffold builder: `ctx.scaffold("home.tsx", "src/app/pages/index.tsx")`
	// produces a fully-tagged ScaffoldSpec (source, target, plugin).
	scaffold(template: string, target: string): ScaffoldSpec;

	readFile(path: string): Promise<string>;
	fileExists(path: string): Promise<boolean>;

	// Look up (or create) this plugin's entry on the Worker payload (owned by
	// `plugin-api`). First call per payload seeds `options` from a literalised
	// copy of `ctx.options`, so subsequent access looks like
	// `ctx.runtime(p).options.trustedOrigins = …`. The aggregator emits the
	// runtime's import itself — no need to push it into `p.imports`.
	//
	// Auto-detected: if the plugin's package.json declares a `./runtime`
	// subpath export, `ctx.runtime(p)` returns a `PluginRuntimeEntry` wired to
	// import `${pkg}/runtime` as `${camelCase(name)}Runtime`. Plugins without
	// the export (e.g. solid, vite) should reach for `p.middlewareChain` or
	// `p.base` directly if they need a bespoke `.use(...)` expression.
	runtime(p: RuntimePayload): PluginRuntimeEntry;

	log: {
		info(msg: string): void;
		warn(msg: string): void;
		success(msg: string): void;
		error(msg: string): void;
	};

	prompt: {
		text(msg: string, opts?: { default?: string }): Promise<string>;
		confirm(msg: string): Promise<boolean>;
		select<T>(msg: string, options: { label: string; value: T }[]): Promise<T>;
		multiselect<T>(
			msg: string,
			options: { label: string; value: T }[],
		): Promise<T[]>;
	};
}

// ── CommandContext ──────────────────────────────────────────────────

export interface CommandContext<TOptions> {
	options: TOptions;
	cwd: string;
	bus: EventBus;
	log: RegisterContext<TOptions>["log"];
	prompt: RegisterContext<TOptions>["prompt"];
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

// ── ResolvedEvents type ────────────────────────────────────────────
//
// The `events` field on a plugin definition now accepts two shapes:
//   1. string[]            — legacy form, every event is Event<void>
//   2. Record<string, EventTypeMarker<T>>  — typed form, payload per event
//
// Both resolve to the same runtime object shape (`{ [name]: Event<T> }`).

type EventMap = Record<string, EventTypeMarker<unknown>>;

type ResolvedEventsFromArray<TEvents extends readonly string[]> = {
	[K in TEvents[number]]: Event<void>;
};

type ResolvedEventsFromMap<T extends EventMap> = {
	[K in keyof T]: T[K] extends EventTypeMarker<infer P> ? Event<P> : never;
};

type ResolvedEvents<TEvents> = TEvents extends readonly string[]
	? ResolvedEventsFromArray<TEvents>
	: TEvents extends EventMap
		? ResolvedEventsFromMap<TEvents>
		: Record<string, Event<unknown>>;

// ── Plugin definition ──────────────────────────────────────────────

export interface PluginDefinition<
	_TName extends string,
	TOptions,
	TEvents extends readonly string[] | EventMap,
	TCallbacks extends Record<string, CallbackMarker<unknown>> = Record<
		string,
		never
	>,
> {
	label: string;
	// Explicit npm package name. When omitted, defaults to
	// `@fcalell/plugin-${name}`. Third-party plugins published under a
	// different namespace (e.g. `@acme/stack-plugin-foo`) must set this so
	// discovery can import them.
	package?: string;
	// Accepts either the legacy `string[]` form (every event resolves to
	// `Event<void>`) or a typed-payload map built with `type<T>()` helpers:
	//   events: { Worker: type<WorkerPayload>(), SchemaReady: type<void>() }
	events?: TEvents;
	after?: readonly Event<unknown>[];
	callbacks?: TCallbacks;
	commands?: Record<
		string,
		CommandDefinition<TOptions, Record<string, unknown>>
	>;

	// Symmetric footprint declarations — auto-wired into Init.Scaffold (add)
	// and Remove (strip). Plugins that need conditional behaviour still drop
	// into the register function as before.
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	gitignore?: readonly string[];

	// Zod schema for plugin options. When provided, `createPlugin` parses the
	// caller's options through it (applying defaults and surfacing errors as
	// `StackError("PLUGIN_CONFIG_INVALID")`). The schema also pins `TOptions`
	// to the schema's *input* type (i.e. `z.input<typeof schema>`), so users
	// don't have to redeclare the option shape — `ctx.options` and command
	// handlers pick it up automatically.
	schema?: z.ZodType<unknown, TOptions>;

	register(
		ctx: RegisterContext<TOptions>,
		bus: EventBus,
		events: ResolvedEvents<TEvents>,
	): void;
}

// ── Internal CLI plugin (used by CLI discovery) ────────────────────

export interface InternalCliPlugin<TOptions> {
	name: string;
	label: string;
	// Resolved npm package name. Always set — either the explicit `package`
	// from the definition or the `@fcalell/plugin-${name}` fallback.
	package: string;
	after: readonly Event<unknown>[];
	callbacks: Record<string, CallbackMarker<unknown>>;
	commands: Record<
		string,
		CommandDefinition<TOptions, Record<string, unknown>>
	>;

	register(
		ctx: RegisterContext<TOptions>,
		bus: EventBus,
		events: Record<string, Event<unknown>>,
	): void;
}

// ── Callback inference types ───────────────────────────────────────

type InferCallbackPayloads<T extends Record<string, CallbackMarker<unknown>>> =
	{
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

// ── Plugin export type ─────────────────────────────────────────────

export type PluginExport<
	TName extends string,
	TOptions,
	TEvents extends readonly string[] | EventMap,
	TCallbacks extends Record<string, CallbackMarker<unknown>> = Record<
		string,
		never
	>,
> = ((...args: [options: TOptions] | []) => {
	readonly __plugin: TName;
	readonly __package: string;
	readonly options: NonNullable<TOptions>;
}) & {
	events: ResolvedEvents<TEvents>;
	cli: InternalCliPlugin<TOptions>;
	name: TName;
} & (keyof TCallbacks extends never
		? // biome-ignore lint/complexity/noBannedTypes: `{}` is a non-restrictive intersection that preserves the LHS; `Record<string, never>` would destroy it and `object` adds an unwanted constraint
			{}
		: {
				defineCallbacks: (
					impl: InferCallbackPayloads<TCallbacks>,
				) => InferCallbackPayloads<TCallbacks>;
			});

// ── createPlugin ───────────────────────────────────────────────────

export function createPlugin<
	TName extends string,
	TOptions,
	const TEvents extends readonly string[] | EventMap = readonly [],
	TCallbacks extends Record<string, CallbackMarker<unknown>> = Record<
		string,
		never
	>,
>(
	name: TName,
	definition: PluginDefinition<TName, TOptions, TEvents, TCallbacks>,
): PluginExport<TName, TOptions, TEvents, TCallbacks> {
	const resolvedEvents = {} as Record<string, Event<unknown>>;
	if (definition.events) {
		if (Array.isArray(definition.events)) {
			for (const eventName of definition.events) {
				resolvedEvents[eventName] = defineEvent<void>(name, eventName);
			}
		} else {
			// Typed-payload map. The marker carries only a phantom type — no
			// runtime shape — so we call defineEvent<unknown>() and rely on the
			// declared types of `plugin.events` to narrow consumer code.
			for (const eventName of Object.keys(definition.events)) {
				resolvedEvents[eventName] = defineEvent<unknown>(name, eventName);
			}
		}
	}

	const pkg = definition.package ?? `@fcalell/plugin-${name}`;

	const packageInfo = findPackageInfo(pkg);
	const packageRoot = packageInfo?.root ?? null;
	const templatesRoot = packageRoot
		? pathToFileURL(`${join(packageRoot, "templates")}/`)
		: null;

	// Auto-detect the plugin's worker-side factory by convention: if the
	// package declares a `./runtime` subpath export, synthesize a default
	// import from `${pkg}/runtime` as `${camelCase(name)}Runtime`. Plugins
	// published without a runtime (e.g. solid, vite) simply omit the export.
	const runtimeSpec: { import: TsImportSpec & { default: string } } | null =
		packageInfo?.pkgJson?.exports?.["./runtime"]
			? {
					import: {
						source: `${pkg}/runtime`,
						default: `${toCamelCase(name)}Runtime`,
					},
				}
			: null;

	const template = (templateName: string): URL => {
		if (!templatesRoot) {
			throw new StackError(
				`Plugin "${name}" called ctx.template(${JSON.stringify(templateName)}) but its package "${pkg}" could not be located. Ensure it is installed in the consumer workspace.`,
				"PLUGIN_CONFIG_INVALID",
			);
		}
		return new URL(templateName, templatesRoot);
	};

	const scaffold = (templateName: string, target: string): ScaffoldSpec => ({
		source: template(templateName),
		target,
		plugin: name,
	});

	const hasCallbacks =
		definition.callbacks !== undefined &&
		Object.keys(definition.callbacks).length > 0;
	const callbackTarget = `src/worker/plugins/${name}.ts`;

	const makeRuntimeHelper = (
		ctx: RegisterContext<TOptions>,
	): ((p: RuntimePayload) => PluginRuntimeEntry) => {
		return (p: RuntimePayload) => {
			if (!runtimeSpec) {
				throw new StackError(
					`Plugin "${name}" called ctx.runtime(p) but "${pkg}" does not declare a "./runtime" subpath export. Add it to the plugin's package.json exports.`,
					"PLUGIN_CONFIG_INVALID",
				);
			}
			const existing = p.pluginRuntimes.find((r) => r.plugin === name);
			if (existing) return existing;
			const entry: PluginRuntimeEntry = {
				plugin: name,
				import: runtimeSpec.import,
				identifier: runtimeSpec.import.default,
				options: literalToProps((ctx.options ?? {}) as Record<string, unknown>),
			};
			p.pluginRuntimes.push(entry);
			return entry;
		};
	};

	const decoratedRegister = (
		ctx: RegisterContext<TOptions>,
		bus: EventBus,
		events: ResolvedEvents<TEvents>,
	): void => {
		const deps = definition.dependencies;
		const devDeps = definition.devDependencies;
		const gitignore = definition.gitignore;

		if (deps || devDeps || gitignore) {
			bus.on(Init.Scaffold, (p) => {
				if (deps) Object.assign(p.dependencies, deps);
				if (devDeps) Object.assign(p.devDependencies, devDeps);
				if (gitignore) p.gitignore.push(...gitignore);
			});
			bus.on(Remove, (p) => {
				if (deps) p.dependencies.push(...Object.keys(deps));
				if (devDeps) p.devDependencies.push(...Object.keys(devDeps));
			});
		}

		// Auto-scaffold the callback file when both `callbacks` and `runtime`
		// are declared. Runs BEFORE definition.register() so the user can't
		// accidentally push a duplicate ScaffoldSpec with the same target.
		// Callback → runtime wiring for the worker chain itself is performed
		// by plugin-api's `api.events.Worker` handler, which walks
		// `ctx.discoveredPlugins` and attaches each plugin's callback file if
		// it exists on disk.
		if (hasCallbacks && runtimeSpec) {
			bus.on(Init.Scaffold, (p) => {
				p.files.push(ctx.scaffold("callbacks.ts", callbackTarget));
			});
			bus.on(Remove, (p) => {
				p.files.push(callbackTarget);
			});
		}

		definition.register(ctx, bus, events);
	};

	const cli: InternalCliPlugin<TOptions> = {
		name,
		label: definition.label,
		package: pkg,
		after: definition.after ?? [],
		callbacks: definition.callbacks ?? {},
		commands: (definition.commands ?? {}) as Record<
			string,
			CommandDefinition<TOptions, Record<string, unknown>>
		>,
		register: (ctx, bus, events) => {
			// Stamp plugin-level helpers onto the ctx so user register functions
			// can call them uniformly, regardless of how the caller built ctx.
			// `runtime` closes over the user-supplied `ctx` so auto-seeding reads
			// the right options; wiring it here (rather than in decoratedRegister)
			// keeps the helper available to the user's register body too.
			const augmented = {
				...ctx,
				plugin: name,
				template,
				scaffold,
			} as RegisterContext<TOptions>;
			augmented.runtime = makeRuntimeHelper(augmented);
			decoratedRegister(augmented, bus, events as ResolvedEvents<TEvents>);
		},
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
		events: resolvedEvents as ResolvedEvents<TEvents>,
		cli,
	});

	if (definition.callbacks && Object.keys(definition.callbacks).length > 0) {
		Object.assign(result, {
			defineCallbacks: <T>(impl: T): T => impl,
		});
	}

	return result as unknown as PluginExport<
		TName,
		TOptions,
		TEvents,
		TCallbacks
	>;
}

// ── Package-info resolution ────────────────────────────────────────
//
// Locate the on-disk directory and package.json of `pkg`. First try
// require.resolve scoped to the consumer's cwd (production and
// integration tests); fall back to the CLI's own resolution scope
// (workspace dev where a plugin depends on another plugin via a
// symlinked node_modules). Returns null when the package can't be
// located — `ctx.template()` throws clearly if it's then called, and
// runtime auto-detection degrades silently (no runtime is wired).
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

function toCamelCase(s: string): string {
	return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
