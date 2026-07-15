import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Entity vocabulary extraction (WS3.2, docs/prd/backend-hardening.md) — reads
// the consumer's `src/schema/index.ts` and returns its exported VALUE names,
// sorted, for `api.slots.entities`.
//
// Boundary (mirrors `../../../api/src/node/barrel.ts`'s "read the file
// layout, don't type-check it" approach — no `typescript`/`ts-morph`
// compiler-API dependency, just a regex sweep over the export syntax Drizzle
// schema files actually use):
//   - Matches: `export const foo = ...`, `export function foo`,
//     `export class Foo`; `export { foo, bar }` and named re-exports
//     `export { foo, bar } from "./other"` (an alias `export { foo as bar }`
//     counts as `bar` — the name a consumer would reference in `reads`/
//     `writes`).
//   - Skips (by construction, not a bug): `export type`/`export interface`,
//     type-only specifiers in an export list (`export type { Foo }`,
//     `export { type Foo, bar }`), `export default ...`, and namespace
//     re-exports (`export * from "..."`) — resolving those would require
//     following the module graph, which the barrel mechanism this mirrors
//     also declines to do statically.
//   - Comma-separated multi-declarations (`export const a = 1, b = 2`) and
//     destructuring exports aren't supported — Drizzle schema files declare
//     one table per `const`, so this doesn't arise in practice.
const VALUE_DECL_RE =
	/export\s+(?:declare\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
const EXPORT_LIST_RE =
	/export\s+(type\s+)?\{([^}]*)\}(?:\s*from\s*["'][^"']+["'])?/g;

function parseExportList(body: string): string[] {
	const names: string[] = [];
	for (const rawItem of body.split(",")) {
		const item = rawItem.trim();
		if (!item || item.startsWith("type ")) continue; // `export { type Foo, bar }`
		const asMatch = item.match(
			/^[A-Za-z_$][A-Za-z0-9_$]*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/,
		);
		if (asMatch?.[1]) {
			names.push(asMatch[1]);
			continue;
		}
		if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(item) && item !== "default") {
			names.push(item);
		}
	}
	return names;
}

// Returns `null` when the schema file doesn't exist or has no value exports
// — the caller treats `null` as "skip contribution, leave the seed".
export function extractSchemaEntities(cwd: string): readonly string[] | null {
	const schemaPath = join(cwd, "src", "schema", "index.ts");
	if (!existsSync(schemaPath)) return null;
	const content = readFileSync(schemaPath, "utf-8");

	const names = new Set<string>();
	for (const match of content.matchAll(VALUE_DECL_RE)) {
		if (match[1]) names.add(match[1]);
	}
	for (const match of content.matchAll(EXPORT_LIST_RE)) {
		const isTypeOnly = match[1] !== undefined;
		if (isTypeOnly || !match[2]) continue;
		for (const name of parseExportList(match[2])) names.add(name);
	}

	if (names.size === 0) return null;
	return [...names].sort((a, b) => a.localeCompare(b));
}
