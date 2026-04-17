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
	TCallbacks extends Record<string, CallbackMarker<any>> = Record<
		string,
		never
	>,
> {
	label: string;
	implicit?: boolean;
	events?: TEvents;
	depends?: readonly Event<any>[];
	callbacks?: TCallbacks;
	commands?: Record<string, CommandDefinition<TOptions, any>>;

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
	depends: readonly Event<any>[];
	callbacks: Record<string, CallbackMarker<any>>;
	commands: Record<string, CommandDefinition<TOptions, any>>;

	register(
		ctx: RegisterContext<TOptions>,
		bus: EventBus,
		events: Record<string, Event<void>>,
	): void;
}

// ── Callback inference types ───────────────────────────────────────

type InferCallbackPayloads<T extends Record<string, CallbackMarker<any>>> = {
	[K in keyof T]: T[K] extends CallbackMarker<infer P>
		? (payload: P) => void | Promise<void>
		: never;
};

// ── Plugin export type ─────────────────────────────────────────────

export type PluginExport<
	TName extends string,
	TOptions,
	TEvents extends readonly string[],
	TCallbacks extends Record<string, CallbackMarker<any>> = Record<
		string,
		never
	>,
> = ((...args: [options: TOptions] | []) => {
	readonly __plugin: TName;
	readonly options: NonNullable<TOptions>;
}) & {
	events: ResolvedEvents<TEvents>;
	cli: InternalCliPlugin<TOptions>;
	name: TName;
} & (keyof TCallbacks extends never
		? {}
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
	TCallbacks extends Record<string, CallbackMarker<any>> = Record<
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

	const cli: InternalCliPlugin<TOptions> = {
		name,
		label: definition.label,
		implicit: definition.implicit ?? false,
		depends: definition.depends ?? [],
		callbacks: definition.callbacks ?? {},
		commands: (definition.commands ?? {}) as Record<
			string,
			CommandDefinition<TOptions, any>
		>,
		register: (ctx, bus, events) =>
			definition.register(ctx, bus, events as ResolvedEvents<TEvents>),
	};

	const configFactory = (options?: TOptions) => {
		const validated = definition.config
			? definition.config(options as TOptions)
			: (options as TOptions);
		return {
			__plugin: name as TName,
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

	return result as any;
}
