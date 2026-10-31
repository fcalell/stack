# @fcalell/stack

Full-stack framework: Hono + Cloudflare on the server, React on the web, React Native on the
phone. Plugins wrap their domain and coordinate only through a typed slot graph. Docs live in
`docs/`: `product.md` (philosophy), `architecture/` (start at `overview.md`).

## Rules

- Gate: `pnpm check` (type-check, Biome lint). It must pass before a change is complete.
- Before editing TypeScript, read `docs/architecture/conventions.md`; before writing a plugin,
  `docs/architecture/plugin-authoring.md` and `docs/architecture/slot-catalog.md`. A slot added,
  renamed, removed or reshaped updates the catalog in the same commit.
- A new consumer-facing option or public surface is the last resort (`docs/product.md`).
- A manifest's `files`, `exports`, dependencies or peers: read `docs/architecture/releasing.md`
  (one copy of each stack package, the version rule); `pnpm release:check` proves the tarballs. The
  owner publishes; never run `publish` without `--dry-run`.
- Editing a ui component: read `packages/ui-core/guide/structure.md` first. A roster fix carries
  the story that draws the edge it fixes (a long word, 320 px, empty and full) in the showcase's
  `stories/`, so `test-screens` holds it.
- Commit scope is the package, like `plugin-auth`.
- Monorepo: `packages/` (`@fcalell/cli`, `@fcalell/ui-core`, tsconfig and biome presets),
  `plugins/` (one `@fcalell/plugin-<name>` per domain) and `apps/` (`showcase` and `phone`, private
  stack consumers). `pnpm stories` opens the roster's Storybook; the screen run is the showcase's
  `test-screens`.

## Design system

- The contract is `packages/ui-core/DESIGN.md`, emitted from `@fcalell/ui-core`
  (`pnpm --filter @fcalell/ui-core design-md`) and shipped in the package; never edit it by hand.
- The look is decided in `packages/ui-core/guide/voice.md`: one anchor (Linear), its pinned
  screens, the decisions and the floors. The design rules are `plugins/react-ui/guide/rules.md`
  (web) and `plugins/native-ui/guide/rules.md` (phone). A screen is judged by standing its render
  beside the anchor screen and asking which looks better (`packages/ui-core/guide/screen.md`).

## Guide

Each package ships "how to build on stack" as `guide/*.md` pages, and a consumer's `stack generate`
indexes them into `.stack/guide.md`, which its `CLAUDE.md` imports. This repo is no consumer: open
the pages by repo path (`packages/*/guide/`, `plugins/*/guide/`). The page format is in
`docs/architecture/plugin-authoring.md` (`guide`).
