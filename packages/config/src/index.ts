// ── Plugin config type ──────────────────────────────────────────────

export interface PluginConfig<
	TName extends string = string,
	TOptions = unknown,
> {
	readonly __plugin: TName;
	readonly requires?: readonly string[];
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

// ── Dev config ──────────────────────────────────────────────────────

export interface DevConfig {
	studioPort?: number;
}

// ── Stack config ────────────────────────────────────────────────────

export interface StackConfig<
	T extends readonly PluginConfig[] = readonly PluginConfig[],
> {
	domain?: string;
	plugins: T;
	dev?: DevConfig;
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
	dev?: DevConfig;
}): StackConfig<T> {
	if (input.dev?.studioPort !== undefined) {
		if (
			typeof input.dev.studioPort !== "number" ||
			!Number.isInteger(input.dev.studioPort) ||
			input.dev.studioPort <= 0
		) {
			throw new Error(
				"defineConfig: dev.studioPort must be a positive integer",
			);
		}
	}

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

			const names = new Set(input.plugins.map((p) => p.__plugin));
			for (const plugin of input.plugins) {
				for (const req of plugin.requires ?? []) {
					if (!names.has(req)) {
						errors.push({
							plugin: plugin.__plugin,
							message: `Requires "${req}", but it is not in the plugins array.`,
							fix: `Run: stack add ${req}`,
						});
					}
				}
			}

			return { valid: errors.length === 0, errors };
		},
	};
}
