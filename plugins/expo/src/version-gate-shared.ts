// Wire contract for the client version gate (docs/prd/backend-hardening.md
// WS4), shared between `src/worker/version-gate.ts` (Cloudflare Worker) and
// `src/client/index.ts` (React Native client). Neither of those directories
// may import the other (see the node/worker/client split in
// `.claude/playbooks/conventions.md`), so the two header names live here,
// outside both.
export const CLIENT_BUILD_HEADER = "x-stack-client-build";
export const CLIENT_PLATFORM_HEADER = "x-stack-client-platform";
