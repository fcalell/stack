# @fcalell/stack

Full-stack framework for SolidJS + Hono + Cloudflare. Ships everything a consumer needs to build
and deploy a production app (database, API, UI, tooling) so they only write business logic. The
CLI orchestrates; plugins wrap their domain and coordinate exclusively through a typed slot graph,
so there is no plugin firing order to think about.

@.helm/agents/index.md

## Where things are

- **Monorepo**: pnpm workspace: `packages/` (`@fcalell/cli` core, `@fcalell/ui-core` design
  contract, tsconfig/biome presets) and `plugins/` (one `@fcalell/plugin-<name>` per domain:
  cloudflare, db, auth, api, node, vite, expo, solid, solid-ui, native-ui). Detail in
  `.helm/knowledge/architecture/` (start at `overview.md`).
- **Dev loop**: `pnpm check` (Biome lint + type-check) is the per-change gate; it must pass before
  a change is complete.
- **PRDs / analyses**: `docs/prd/` (forward-looking implementation drivers; see its README for the
  fold-into-`.helm/knowledge/`-and-retire lifecycle) and `docs/analysis/` (point-in-time audits).
