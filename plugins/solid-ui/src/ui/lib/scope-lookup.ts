import {
	type ScopeLookupInput,
	scopeQueryKey,
} from "@fcalell/plugin-api/ability-client";
import { keepPreviousData } from "@tanstack/solid-query";
import { isUnauthorized } from "#lib/session-gate.ts";

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

// The address of a resolved scope: the address up to the segment that names
// its slug, searched after the address of the boundary above, so a project
// named like its organization is found at its own segment. Null when the
// address holds no such segment.
export function scopePath(
	pathname: string,
	above: string | undefined,
	slug: string,
): string | null {
	const segments = pathname.split("/").filter((s) => s !== "");
	const start = above ? above.split("/").filter((s) => s !== "").length : 0;
	for (let i = start; i < segments.length; i++) {
		const segment = segments[i] ?? "";
		let decoded = segment;
		try {
			decoded = decodeURIComponent(segment);
		} catch {
			// a malformed escape is compared as written
		}
		if (decoded === slug) return `/${segments.slice(0, i + 1).join("/")}`;
	}
	return null;
}

// A boundary's lookup. While the next lookup of the same scope is pending (a
// slug changed under it) the previous answer stands in as placeholder data,
// so the children redraw in place with the new chain once it answers and
// nothing under the boundary is torn down by the change.
export function scopeQueryOptions(
	scope: string,
	input: ScopeLookupInput,
	fetch: (scope: string, input: ScopeLookupInput) => Promise<unknown>,
) {
	return {
		queryKey: scopeQueryKey(scope, input),
		queryFn: () => fetch(scope, input),
		retry: (count: number, error: Error) =>
			!isNotFound(error) && !isUnauthorized(error) && count < 3,
		throwOnError: (error: Error) => !isNotFound(error),
		placeholderData: keepPreviousData,
	};
}

// What a boundary draws for its lookup's state: the children while it holds
// a chain (the answer, or the previous one while the next is pending), the
// consumer's not-found screen on NOT_FOUND, and nothing before the first
// answer.
export type BoundaryView = "children" | "notFound" | "nothing";

export function boundaryView(state: {
	data: unknown;
	error: unknown;
}): BoundaryView {
	if (state.data !== undefined) return "children";
	return isNotFound(state.error) ? "notFound" : "nothing";
}

// A viewer's last resolved address, for the "open where I left off"
// redirect. Kept in browser storage under the signed-in user's id, so two
// people on one browser never read each other's, and forgotten when that
// user signs out; never in the session. Storage can be absent (private
// windows) and then there is simply none.
const LAST_SCOPE_KEY = "stack:last-scope";

function keyOf(viewer: string): string {
	return `${LAST_SCOPE_KEY}:${viewer}`;
}

// What a boundary records, if anything: its own address for the signed-in
// viewer, once its lookup answered (never a placeholder), only while no
// resolved boundary is drawn under it, and only when its route is a place to
// return to (`remember` is not false). An onboarding step resolves a scope
// without being where `/` leads back to.
export function addressToRemember(state: {
	remember: boolean | undefined;
	answered: boolean;
	deeper: number;
	path: string | null;
	viewer: string | null | undefined;
}): { viewer: string; path: string } | null {
	const { remember, answered, deeper, path, viewer } = state;
	if (remember === false || !answered || deeper > 0) return null;
	if (path === null || !viewer) return null;
	return { viewer, path };
}

export function rememberScope(viewer: string, path: string): void {
	try {
		localStorage.setItem(keyOf(viewer), path);
	} catch {
		// no storage: nothing to remember
	}
}

export function lastScope(viewer: string): string | null {
	try {
		return localStorage.getItem(keyOf(viewer));
	} catch {
		return null;
	}
}

// Forgets the viewer's last address: they removed or left that scope, or
// signed out.
export function forgetScope(viewer: string): void {
	try {
		localStorage.removeItem(keyOf(viewer));
	} catch {
		// no storage: nothing remembered
	}
}

// A boundary whose address resolves to NOT_FOUND forgets the viewer's last
// address when it is that address or one under it, so the next redirect does
// not lead back there; a last address elsewhere stays.
export function forgetScopeAt(viewer: string, path: string | null): void {
	const last = lastScope(viewer);
	if (path === null || last === null) return;
	if (last === path || last.startsWith(`${path}/`)) forgetScope(viewer);
}
