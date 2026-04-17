import type { DrizzleD1Database } from "drizzle-orm/d1";
import { createClient } from "../d1/client";

export interface RuntimePlugin<TName extends string, TDeps, TProvides> {
	name: TName;
	validateEnv?(env: unknown): void;
	context(env: unknown, upstream: TDeps): TProvides | Promise<TProvides>;
}

export default function dbRuntime<
	TSchema extends Record<string, unknown>,
>(options: {
	binding: string;
	schema: TSchema;
}): RuntimePlugin<"db", object, { db: DrizzleD1Database<TSchema> }> {
	return {
		name: "db",
		validateEnv(env: unknown) {
			if (!(env as Record<string, unknown>)[options.binding]) {
				throw new Error(`Missing binding: ${options.binding}`);
			}
		},
		context(env) {
			const d1 = (env as Record<string, unknown>)[options.binding];
			return { db: createClient(d1 as any, options.schema) };
		},
	};
}
