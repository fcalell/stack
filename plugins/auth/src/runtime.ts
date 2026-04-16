import type { PluginConfig } from "@fcalell/config";
import type { AuthCallbacks } from "./callbacks";
import type { AuthOptions } from "./index";

interface RuntimePlugin<TName extends string, TDeps, TProvides> {
	name: TName;
	validateEnv?(env: unknown): void;
	context(env: unknown, upstream: TDeps): TProvides | Promise<TProvides>;
	routes?(procedure: unknown): Record<string, unknown>;
}

export function authRuntime(
	pluginConfig: PluginConfig<"auth", AuthOptions>,
	callbacks?: AuthCallbacks,
): RuntimePlugin<"auth", { db: unknown }, { auth: unknown }> {
	const opts = pluginConfig.options;
	return {
		name: "auth",
		validateEnv(env: unknown) {
			const e = env as Record<string, unknown>;
			const secretVar = opts.secretVar ?? "AUTH_SECRET";
			if (!e[secretVar]) {
				throw new Error(`Missing env var: ${secretVar}`);
			}
		},
		context(env, upstream) {
			return { auth: { env, db: upstream.db, callbacks } };
		},
	};
}
