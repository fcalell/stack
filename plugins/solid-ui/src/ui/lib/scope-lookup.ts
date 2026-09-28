import type { ScopeLookupInput } from "@fcalell/plugin-api/ability-client";

// The part of a scope descriptor a boundary reads.
export interface ScopeShape {
	readonly name: string;
	readonly parent: readonly [{ readonly name: string }, unknown] | null;
}

// What a `ScopeBoundary` sends to resolve its slug. Below the organization a
// slug is unique only within its parent, whose id comes from the boundary
// above; null when no boundary above holds that parent.
export function scopeLookup(
	scope: ScopeShape,
	slug: string,
	above: Record<string, unknown> | undefined,
): ScopeLookupInput | null {
	if (scope.parent === null) return { slug };
	const parent = above?.[scope.parent[0].name] as { id?: unknown } | undefined;
	return typeof parent?.id === "string" ? { slug, parentId: parent.id } : null;
}

// NOT_FOUND is the one lookup failure a boundary draws; anything else is an
// error for the app's error boundary.
export function isNotFound(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "NOT_FOUND"
	);
}
