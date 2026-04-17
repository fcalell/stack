// ── Plugin config type ──────────────────────────────────────────────

export interface PluginConfig<
	TName extends string = string,
	TOptions = unknown,
> {
	readonly __plugin: TName;
	readonly options: TOptions;
}

// ── Binding declarations ────────────────────────────────────────────

export interface BindingDeclaration {
	name: string;
	type:
		| "d1"
		| "r2"
		| "kv"
		| "queue"
		| "rate_limiter"
		| "durable_object"
		| "service"
		| "var"
		| "secret";
	databaseId?: string;
	databaseName?: string;
	bucketName?: string;
	kvNamespaceId?: string;
	className?: string;
	rateLimit?: { limit: number; period: number };
	devDefault?: string;
}

// ── Validation types ────────────────────────────────────────────────

export interface ValidationError {
	plugin: string;
	message: string;
	fix?: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

// ── Stack config ────────────────────────────────────────────────────

export interface StackConfig<
	T extends readonly PluginConfig[] = readonly PluginConfig[],
> {
	domain?: string;
	plugins: T;
	validate(): ValidationResult;
}

// ── Plugin extraction ───────────────────────────────────────────────

export type ExtractPlugin<
	T extends readonly PluginConfig[],
	N extends string,
> = Extract<T[number], { __plugin: N }>;

export function getPlugin<T extends readonly PluginConfig[], N extends string>(
	config: StackConfig<T>,
	name: N,
): ExtractPlugin<T, N> {
	const found = config.plugins.find((p) => p.__plugin === name);
	if (!found) throw new Error(`Plugin "${name}" not found in config`);
	return found as ExtractPlugin<T, N>;
}

// ── defineConfig ────────────────────────────────────────────────────

export function defineConfig<const T extends readonly PluginConfig[]>(input: {
	domain?: string;
	plugins: T;
}): StackConfig<T> {
	return {
		...input,
		validate() {
			const errors: ValidationError[] = [];
			const seen = new Set<string>();

			for (const plugin of input.plugins) {
				if (seen.has(plugin.__plugin)) {
					errors.push({
						plugin: plugin.__plugin,
						message: `Duplicate plugin: "${plugin.__plugin}" appears more than once.`,
					});
				}
				seen.add(plugin.__plugin);
			}

			return { valid: errors.length === 0, errors };
		},
	};
}

// ── New event-driven plugin system ──────────────────────────────────

export type {
	CallbackMarker,
	CommandContext,
	CommandDefinition,
	FlagDefinition,
	InternalCliPlugin,
	PluginExport,
	RegisterContext,
} from "#lib/create-plugin";
export { callback, createPlugin } from "#lib/create-plugin";
