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
- **Dev loop**: `pnpm check` (type-check, every package's `node --test`, Biome lint) is the
  per-change gate; it must pass before a change is complete.

## Design system

- The contract is `packages/ui-core/DESIGN.md`, emitted from `@fcalell/ui-core`
  (`pnpm --filter @fcalell/ui-core design-md`) and shipped in the package; never edit it by hand.
- The design rules are `plugins/react-ui/guide/rules.md` (web) and `plugins/native-ui/guide/rules.md` (phone); the standard is `packages/ui-core/guide/rubric.md`,
  with its judged questions in `judging.md` and each pattern's measured range in
  `patterns/<pattern>.md` (read as `references.md` sets out). A render is judged by
  `packages/ui-core/guide/design-critique.md`, run by a session that played no part in the work.

## Guide

Each package ships "how to build on stack" as `guide/*.md` pages, and a consumer's
`stack generate` indexes them into `.stack/guide.md`, which its `CLAUDE.md` imports. This repo
is no consumer: open the pages by repo path (`packages/*/guide/`, `plugins/*/guide/`). The page
format is in `.helm/agents/plugin-authoring.md`.
