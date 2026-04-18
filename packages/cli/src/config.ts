// ── Plugin config type ──────────────────────────────────────────────

export interface PluginConfig<
	TName extends string = string,
	TOptions = unknown,
> {
	readonly __plugin: TName;
	// Explicit npm package name used for runtime discovery. Optional for
	// backward compatibility: when absent, discovery falls back to
	// `@fcalell/plugin-${__plugin}`. Third-party plugins published under a
	// different namespace must set this via `createPlugin(..., { package })`.
	readonly __package?: string;
	readonly options: TOptions;
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

// ── App config ──────────────────────────────────────────────────────

// AppConfig is the top-level identity / HTML metadata surface. Introduced in
// Phase 5 (replaces top-level `domain`). `name` and `domain` are required;
// everything else has a sensible default that lands during `defineConfig`.
export interface AppConfig {
	name: string;
	domain: string;
	title?: string;
	description?: string;
	icon?: string;
	themeColor?: string;
	lang?: string;
}

// ── Stack config ────────────────────────────────────────────────────

export interface StackConfig<
	T extends readonly PluginConfig[] = readonly PluginConfig[],
> {
	app: AppConfig;
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
	app: AppConfig;
	plugins: T;
}): StackConfig<T> {
	// Apply defaults once here so the rest of the pipeline (and plugin
	// registers) can rely on `ctx.app.title` / `ctx.app.lang` being populated.
	const app: AppConfig = {
		...input.app,
		title: input.app.title ?? input.app.name,
		lang: input.app.lang ?? "en",
	};

	return {
		app,
		plugins: input.plugins,
		validate() {
			const errors: ValidationError[] = [];

			if (!input.app || typeof input.app !== "object") {
				errors.push({
					plugin: "app",
					message: "app is required (expected { name, domain })",
				});
			} else {
				if (
					typeof input.app.name !== "string" ||
					input.app.name.trim() === ""
				) {
					errors.push({ plugin: "app", message: "app.name is required" });
				}
				if (
					typeof input.app.domain !== "string" ||
					input.app.domain.trim() === ""
				) {
					errors.push({ plugin: "app", message: "app.domain is required" });
				}
			}

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
export { fromSchema } from "#lib/plugin-config";
