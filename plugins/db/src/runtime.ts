import type { PluginConfig } from "@fcalell/config";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { createClient } from "./d1/client";
import { type DbOptions, getSchemaModule } from "./index";

export interface RuntimePlugin<TName extends string, TDeps, TProvides> {
	name: TName;
	validateEnv?(env: unknown): void;
	context(env: unknown, upstream: TDeps): TProvides | Promise<TProvides>;
}

interface D1Database {
	prepare(query: string): unknown;
	batch<T = unknown>(statements: unknown[]): Promise<T[]>;
	exec(query: string): Promise<unknown>;
	dump(): Promise<ArrayBuffer>;
}

export function dbRuntime<TSchema extends Record<string, unknown>>(
	pluginConfig: PluginConfig<"db", DbOptions<TSchema>>,
): RuntimePlugin<"db", object, { db: DrizzleD1Database<TSchema> }> {
	const binding = pluginConfig.options.binding ?? "DB_MAIN";

	return {
		name: "db",

		validateEnv(env: unknown) {
			if (!(env as Record<string, unknown>)[binding]) {
				throw new Error(`Missing binding: ${binding}`);
			}
		},

		context(env) {
			const d1 = (env as Record<string, unknown>)[binding] as D1Database;
			const schema = getSchemaModule(pluginConfig.options) as TSchema;
			return { db: createClient(d1, schema) };
		},
	};
}
