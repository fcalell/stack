# @fcalell/stack

Full-stack framework: Hono + Cloudflare on the server, React on the web, React Native on the
phone. Ships everything a consumer needs to build and deploy a production app (database, API, UI,
tooling) so they only write business logic. The CLI orchestrates; plugins wrap their domain and
coordinate exclusively through a typed slot graph, so there is no plugin firing order to think
about.

@.helm/agents/index.md

## Where things are

- **Monorepo**: pnpm workspace: `packages/` (`@fcalell/cli` core, `@fcalell/ui-core` design
  contract, tsconfig/biome presets, `@fcalell/auth-testing` private test support), `plugins/`
  (one `@fcalell/plugin-<name>` per domain: cloudflare, db, auth, api, node, vite, react,
  react-ui, expo, native-ui) and `apps/` (`showcase`, a private stack consumer). Detail in `.helm/knowledge/architecture/` (start at `overview.md`).
- **Dev loop**: `pnpm check` (build, type-check, every package's `node --test`, Biome lint) is the
  per-change gate; it must pass before a change is complete.

## Design system

- The contract is the root `DESIGN.md`, emitted from `@fcalell/ui-core`
  (`pnpm --filter @fcalell/ui-core design-md`); never edit it by hand.
- The design rules are `~/.claude/rules/ui.md`; the standard is `.helm/research/design-system/rubric.md`.
