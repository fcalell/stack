---
id: 003-115
status: review
sessions: {}
---
# react-ui: a Split's `wide` stands at a 1440 px viewport beside the shell's sidebar

## Goal
Stead sets three screens from `wide` (design/07-interface.md, 1440 px): the review's file stands beside the review, the knowledge page's Details stands as a pane and not an act, and the card's job stands beside the card (github.com/fcalell/stead, `packages/server/src/app/routes/_now/route.tsx` passes the review as `main` and the file as `beside`; the knowledge page passes `pane`; the card passes its job as `pane`, and its Stage row opens the job as `beside`). At a 1440 px viewport none of them stands: with biome.json open the review's headings measure 0 x 0 and the file's header stands at 660 px beside Now's list, so the file takes the review's place; the knowledge page's Details is a 28 x 28 act with no pane; the card's job replaces the card after its Stage row. At an 1800 px viewport the same addresses stand as designed: the review 552 px wide with the file beside it at 1261 px, the pane beside the page ("Describes" in the text, no Details act), the card 552 px wide with its job beside it at 1225 px. Evidence: stead `design/evidence.md`, "The step 5b app at `b3b29d9`" (2026-10-06, stack at `5564217`, `packages/server/test/review/drive.mjs` on the `full` fixture, element bounds and page text through the driver's `eval` steps).

## Approach
`Split`'s regions switch on `page-wide:` and `page-max-wide:` (`MAIN_SHARED`, `BESIDE`, `PANE` in plugins/react-ui/src/ui/components/split/index.tsx), and the page is the size container they query, so `wide` is read against the Split's container and not the viewport. In the Shell the container is the viewport less the 240 px sidebar: 1200 px at a 1440 px viewport, which is below `wide`, so the pane and beside-main never stand at the width the spec names and open only from about 1680 px. Stead cannot move the width: a host breakpoint is not geometry the rules page allows, and the spec's 1440 is the screen's width as a person reads it, with the sidebar among what the screen holds. Seen at stack `5564217`.

## Acceptance criteria
- [x] At a 1440 px viewport in the Shell, a Split's `beside` stands beside its main and its `pane` stands beside its list and main, with the sidebar standing.
- [x] Below that width a record the main opened still stands in the main's place, and on the phone it replaces it.
- [x] The reading of `wide` (the page's container, or the viewport less the sidebar) is written in the Split's rule, with the width at which each region opens.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether `wide` is lowered, the sidebar counts outside the page's container, or the Split's regions read a different threshold.

## Built
`wide` is 1200 (it was 1440) in `tokens.ts`: it is read only through the page container, which in the Shell is the viewport less the 240 px sidebar, so `beside` and `pane` stand from a 1440 viewport. DESIGN.md regenerated; `graph.test.ts` pins 1200; the Split rule (`rules.md`) and `ui-core.md` state both thresholds.
Evidence: `behaviour/split.stories.tsx` `BesideFromWide`, `BesideBelowWide`, `PaneFromWide`, `PaneBelowWide` (pages 1200 and 1199 px).
