import type { DrizzleD1Database } from "drizzle-orm/d1";
import { type AnyD1Database, drizzle } from "drizzle-orm/d1";

const cache = new WeakMap<object, unknown>();

/**
 * Creates a Drizzle ORM client for Cloudflare D1 with isolate-safe caching.
 *
 * Clients are cached per D1 binding via WeakMap — safe for Cloudflare Workers
 * where isolates persist across requests but bindings may differ.
 *
 * @param d1 - D1 database binding from the Worker environment
 * @param schema - Drizzle schema object with table definitions
 */
export function createClient<TSchema extends Record<string, unknown>>(
	d1: AnyD1Database,
	schema: TSchema,
): DrizzleD1Database<TSchema> {
	if (cache.has(d1)) return cache.get(d1) as DrizzleD1Database<TSchema>;

	const client = drizzle(d1, { schema });
	cache.set(d1, client);
	return client;
}
