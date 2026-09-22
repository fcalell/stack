import type { RuntimePlugin } from "@fcalell/cli/runtime";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { createClient } from "../sqlite/client.ts";

// The sqlite dialect's runtime, for the node target. The file path comes from
// the env var `fileVar` names, so the installation decides where it lives;
// `createClient` opens each path once per process.
export default function dbRuntime<
	TSchema extends Record<string, unknown> = Record<string, unknown>,
>(options: {
	fileVar: string;
	schema?: TSchema;
}): RuntimePlugin<"db", object, { db: BetterSQLite3Database<TSchema> }> {
	const schema = (options.schema ?? {}) as TSchema;
	// `context` checks too: better-sqlite3 opens an anonymous temporary
	// database for an undefined path instead of failing.
	const file = (env: unknown): string => {
		const value = (env as Record<string, unknown>)[options.fileVar];
		if (typeof value !== "string" || value === "") {
			throw new Error(`Missing env var: ${options.fileVar}`);
		}
		return value;
	};
	return {
		name: "db",
		validateEnv(env: unknown) {
			file(env);
		},
		context(env) {
			return { db: createClient(file(env), schema) };
		},
	};
}
