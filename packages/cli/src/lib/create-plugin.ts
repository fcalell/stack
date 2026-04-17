import { StackError } from "#lib/errors";
import type { Event, EventBus } from "#lib/event-bus";
import { defineEvent } from "#lib/event-bus";

// ── Callback marker ────────────────────────────────────────────────

export interface CallbackMarker<T> {
	readonly _type?: T;
}

export function callback<
	T extends Record<string, unknown>,
>(): CallbackMarker<T> {
	return {};
}

// ── RegisterContext ────────────────────────────────────────────────

export interface RegisterContext<TOptions> {
	options: TOptions;
	cwd: string;

	hasPlugin(name: string): boolean;

	readFile(path: string): Promise<string>;
	fileExists(path: string): Promise<boolean>;

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

type ResolvedEvents<TEvents extends readonly string[]> = {
	[K in TEvents[number]]: Event<void>;
};

// ── Plugin definition ──────────────────────────────────────────────

export interface PluginDefinition<
	_TName extends string,
	TOptions,
	TEvents extends readonly string[],
	TCallbacks extends Record<string, CallbackMarker<unknown>> = Record<
		string,
		never
	>,
> {
	label: string;
	implicit?: boolean;
	// Explicit npm package name. When omitted, defaults to
	// `@fcalell/plugin-${name}`. Third-party plugins published under a
	// different namespace (e.g. `@acme/stack-plugin-foo`) must set this so
	// discovery can import them.
	package?: string;
	events?: TEvents;
	depends?: readonly Event<unknown>[];
	callbacks?: TCallbacks;
	commands?: Record<
		string,
		CommandDefinition<TOptions, Record<string, unknown>>
	>;

	config?(options: TOptions): TOptions;

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
	implicit: boolean;
	// Resolved npm package name. Always set — either the explicit `package`
	// from the definition or the `@fcalell/plugin-${name}` fallback.
	package: string;
	depends: readonly Event<unknown>[];
	callbacks: Record<string, CallbackMarker<unknown>>;
	commands: Record<
		string,
		CommandDefinition<TOptions, Record<string, unknown>>
	>;

	register(
		ctx: RegisterContext<TOptions>,
		bus: EventBus,
		events: Record<string, Event<void>>,
	): void;
}

// ── Callback inference types ───────────────────────────────────────

type InferCallbackPayloads<T extends Record<string, CallbackMarker<unknown>>> =
	{
		[K in keyof T]: T[K] extends CallbackMarker<infer P>
			? (payload: P) => void | Promise<void>
			: never;
	};

// ── Plugin export type ─────────────────────────────────────────────

export type PluginExport<
	TName extends string,
	TOptions,
	TEvents extends readonly string[],
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
	const TEvents extends readonly string[] = readonly [],
	TCallbacks extends Record<string, CallbackMarker<unknown>> = Record<
		string,
		never
	>,
>(
	name: TName,
	definition: PluginDefinition<TName, TOptions, TEvents, TCallbacks>,
): PluginExport<TName, TOptions, TEvents, TCallbacks> {
	const resolvedEvents = {} as Record<string, Event<void>>;
	if (definition.events) {
		for (const eventName of definition.events) {
			resolvedEvents[eventName] = defineEvent<void>(name, eventName);
		}
	}

	const pkg = definition.package ?? `@fcalell/plugin-${name}`;

	const cli: InternalCliPlugin<TOptions> = {
		name,
		label: definition.label,
		implicit: definition.implicit ?? false,
		package: pkg,
		depends: definition.depends ?? [],
		callbacks: definition.callbacks ?? {},
		commands: (definition.commands ?? {}) as Record<
			string,
			CommandDefinition<TOptions, Record<string, unknown>>
		>,
		register: (ctx, bus, events) =>
			definition.register(ctx, bus, events as ResolvedEvents<TEvents>),
	};

	const configFactory = (options?: TOptions) => {
		let validated: TOptions;
		if (definition.config) {
			validated = definition.config(options as TOptions);
		} else {
			if (options === undefined) {
				throw new StackError(
					`Plugin "${name}" requires options. Either pass options or define a config() function in createPlugin().`,
					"PLUGIN_MISSING_OPTIONS",
				);
			}
			validated = options;
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
