// Wire contract for entity-based cache invalidation and org rules, shared
// between `./procedure.ts` (server, pulls in `@orpc/server` + zod + the whole
// procedure builder) and the client bundles that read the
// same headers/path (`./query-invalidation.ts`, `./ability-client.ts`,
// `./tanstack-query.tsx`). Import-free by construction — mirrors
// `plugins/expo/src/version-gate-shared.ts` — so a client bundle depending
// only on these constants doesn't drag the server builder along with
// it. `./procedure.ts` re-exports them from here, so `@fcalell/plugin-api/procedure`
// consumers (generated code, `plugins/auth`'s worker) see no change.
export const STACK_READS_HEADER = "x-stack-reads";
export const STACK_WRITES_HEADER = "x-stack-writes";

// Marks a read whose answer is "not found", sent with a success status because
// a browser prints every 404 fetch response as a console error before any code
// reads it. The client puts the 404 back before oRPC decodes the body.
export const STACK_NOT_FOUND_HEADER = "x-stack-not-found";

// Every header the client reads off an answer. A browser hides a response header
// from a client on another origin unless `Access-Control-Expose-Headers` names
// it, so the worker's `cors()` exposes this list and a header added above joins it.
export const STACK_EXPOSED_HEADERS = [
	STACK_READS_HEADER,
	STACK_WRITES_HEADER,
	STACK_NOT_FOUND_HEADER,
] as const;

// What an entity name may contain. Names reach `Headers.set` comma-joined, and
// comma is the client-side split delimiter, so `procedure()` and the
// `api({ entities })` config parse share this one pattern.
export const ENTITY_NAME_RE = /^[A-Za-z0-9_.-]+$/;

// Router path of the framework-owned org-rules procedure. plugin-auth's
// runtime registers it via `RuntimePlugin.routes()` when organization support
// is enabled; the `useAbility` client hook queries it. Owned here (not in
// plugin-auth) so the dependency direction stays auth -> api.
export const ORG_RULES_PATH = ["auth", "orgRules"] as const;

// Router prefix of the framework-owned scope lookups: plugin-auth registers
// `[...SCOPE_ROUTES_PATH, <scope name>, "bySlug"]` per scope with a slug, and
// the web plugin's `ScopeBoundary` calls it. Owned here for the same reason.
export const SCOPE_ROUTES_PATH = ["auth", "scope"] as const;

// The listener contract between a deploy target and the runtimes. A target that
// serves further listeners sets these on the env it hands the worker, from the
// server, never from a request header: `STACK_LISTENER` names the listener and
// `STACK_ORIGIN` the one origin it serves. Unset on the main listener.
export const LISTENER_ENV = "STACK_LISTENER";
export const ORIGIN_ENV = "STACK_ORIGIN";

// The origin the request's listener serves, or null when the env names none.
export function listenerOrigin(env: unknown): string | null {
	const value = (env as Record<string, unknown> | null | undefined)?.[
		ORIGIN_ENV
	];
	return typeof value === "string" && value !== "" ? value : null;
}
