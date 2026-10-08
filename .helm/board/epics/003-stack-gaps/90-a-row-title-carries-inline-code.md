---
id: 003-90
status: done
sessions: {}
---
# ui-core: a row title carries inline code

## Goal
Stead's criteria name flags and paths in inline code ("`--strict` turns strict mode on.") in the review's Criteria rows and the Brief item (github.com/fcalell/stead, packages/server/src/app/ui/review.tsx). The app now drops the backticks, so the code reads as plain text while Concerns, drawn by Prose, shows it as code.

## Approach
A ListRow title takes `string | Quoted` only; nothing marks a span as code. Seen at stack f6563f6.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.

## Built
A span of code is an explicit part, never parsed from backticks: `Coded` (`{ code: string }`) in `packages/ui-core/src/descriptors.ts` beside `Quoted`, with `RowPart` (a `meta` part) and `RowTitle` (a `Part`, one `Coded`, or an array of string and `Coded` runs). The same `{ code }` run joins the `Sentence` vocabulary, so a `Gate` description takes it. Both platforms draw it in `PROSE_CODESPAN`, the cell `Prose` uses for a backtick span (`plugins/*/src/ui/lib/code.tsx`: `Runs` for runs, `CodeCut` for a whole value). A title of runs truncates at its end. `List`'s `row` map takes `RowTitle` and `RowPart`.

Evidence: `pnpm check` turbo part, the three `verify` scripts, Biome, `behaviour/row-meta.stories.tsx` (`CodeRuns`, `CodeRunsTouch`), the `ListRow` and `Gate` state stories.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/rows/report.md`).
