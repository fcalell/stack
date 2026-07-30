---
id: 001-03
status: backlog
depends: [001-01, 001-02]
---
# plugin-solid-ui adoption

## Goal

`plugin-solid-ui` renders its tokens from ui-core through a new `theme` option, `globals.css`
shrinks to the web wrapper, every component speaks the new vocabulary, and button, text, pill,
card, and field rebuild on the shared matrices.

Driver: `docs/prd/ui-core.md` M3. Refine before running.

## Refinement notes

- **Blocking prerequisite discovered in 001-01:** `aggregateAppCss`
  (`plugins/solid-ui/src/node/codegen.ts:20-44`) emits only `@import`, one fixed `@source`, and
  `@layer` blocks. Tailwind v4 needs `@theme` and `@utility` at top level, so this story must add a
  top-level-block slot before it can place ui-core's tokens at all. Scope it explicitly.
- The eight web-only tokens at `plugins/solid-ui/src/ui/globals.css:21-22` and `:73-80`
  (`--color-white`, `--color-black`, `--ease-ui`, two `--duration-*`, three `--animate-*`) are
  outside the contract and must keep being declared after `--color-*: initial`, or white and black
  disappear.
- ui-core returns records; this plugin escapes at its own emit, as native-ui already does.
- The shadcn axis names retire for `emphasis` and `tone`. `badge` renames to `pill`.
- Class props stay open through this story. 001-05 closes them across both plugins at once.
