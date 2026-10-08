---
id: 003-150
status: done
sessions: {}
---
# react-ui: an ActionBar that follows an ItemHeader stands a pair under it, not a sections gap

## Goal
Stead's job view puts "Stop the job" in an `ActionBar` right after its `ItemHeader` (design/07-interface.md "The job view": the bar "under the head", in sight where the operator watches). Rendered, the bar sits about 56 css px under the facts line before Stages begin, which reads as dead space between the head and its act (shot `job-1920-light`). Evidence: card critique unit u7 (Stead scratchpad `critique/u7/shots/x/`, Stead `c9c9e5a`, stack `5564217`); 003-139 gives the same bar a waiting form, which keeps this gap.

## Approach
A Place or Screen body is `gap-sections p-page` (`PAGE_BODY` in ui-core variants), so every sibling, the `ActionBar` included, stands a sections gap from the head. An ActionBar that is the head's own act has no way to join the head: the head draws its facts and nothing after them, and an `ActionBar` has no tighter placement. The app cannot wrap the two in a host element with a gap (the gap is the part's to give). 003-96 sets the bar's own fit; 003-43/-44 put facts and acts in the head but not a block-level bar.

## Acceptance criteria
- [x] An `ActionBar` directly after an `ItemHeader` stands a pair step under it (or the head takes the act), and the page's following section keeps the sections gap.
- [x] The ItemHeader showcase holds a head with a bar beneath it, measured at 390 and 1440.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Built
The parent decides the step from its children (the head takes no act prop and the bar no placement). `headPaired` (`item-header/pair.tsx`, both plugins) gathers a leading `ItemHeader` and an `ActionBar` directly after it into one `gap-pair` column; `Place`, `Screen` and a `Split`'s main call it, and the body's sections step stands after the pair. A Thread after the head is never paired, so it stays the body's direct child (the `[&:has(>[data-fill])]` selectors read it). The limit is stated in both `rules.md` pages: a Fragment is seen through, a head or bar behind a wrapper component keeps the sections step.
The ItemHeader showcase frame draws a record page with a head, a bar and a Section. `behaviour/item-header.stories.tsx` measures head-to-bar at the pair step and bar-to-Section at the sections step, at 1440 (desktop) and 390 (touch density).
Evidence: `behaviour/item-header.stories.tsx`, `behaviour/split.stories.tsx`, `behaviour/action-bar.stories.tsx` and the generated `ItemHeader`, `Split`, `Place` and `Screen` stories pass; `ui-core`, `plugin-react-ui` and `plugin-native-ui` verify pass.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/acts/report.md`).
