// Wire contract for WS3 (entity-based cache invalidation) and WS6.2 (org
// rules), shared between `./procedure.ts` (server, pulls in `@orpc/server` +
// zod + the whole procedure builder) and the client bundles that read the
// same headers/path (`./query-invalidation.ts`, `./ability-client.ts`,
// `./tanstack-query.tsx`). Import-free by construction — mirrors
// `plugins/expo/src/version-gate-shared.ts` — so a client bundle depending
// only on these three constants doesn't drag the server builder along with
// it. `./procedure.ts` re-exports them from here, so `@fcalell/plugin-api/procedure`
// consumers (generated code, `plugins/auth`'s worker) see no change.
export const STACK_READS_HEADER = "x-stack-reads";
export const STACK_WRITES_HEADER = "x-stack-writes";

// Router path of the framework-owned org-rules procedure (WS6). plugin-auth's
// runtime registers it via `RuntimePlugin.routes()` when organization support
// is enabled; the `useAbility` client hook queries it. Owned here (not in
// plugin-auth) so the dependency direction stays auth -> api.
export const ORG_RULES_PATH = ["auth", "orgRules"] as const;
