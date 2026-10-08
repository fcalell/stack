---
id: 003-122
status: done
sessions: {}
---
# react-ui: a Split's `tablet` reads against the viewport, so a 768 px screen keeps its main

## Goal
Stead sets Now, Chats, Work and System from a list and a main with a "Pick an item." empty main "from tablet" (design/07-interface.md "Now"; github.com/fcalell/stead, `packages/server/src/app/routes/_now/route.tsx` passes `empty`). At a 768 px viewport the list stands full width with no main and no "Pick an item.", as on the phone. Evidence: Now critique unit u2, shots `w-768-light` and `w-768-dark` (Stead scratchpad `critique/u2/shots/`, stack at `5564217`).

## Approach
`Split`'s regions switch on `page-tablet:` and `page-max-tablet:` (split/index.tsx: `BEHIND`, `ALONE`, the list's `page-max-tablet:w-full`), and the page is the size container they query. In the Shell the container is the viewport less the 240 px sidebar, 528 px at 768 px, below `tablet` (768, `BREAKPOINTS` in ui-core/src/tokens.ts), so a tablet-wide window draws the phone's one region at a time. This is 003-115's reading for `wide` (container, not viewport) applied to `tablet`; 003-115's criteria name `wide` at 1440 and would not move this. Not 003-94 (the list's top and wash). Seen at stack `5564217`.

## Acceptance criteria
- [ ] At a 768 px viewport in the Shell, a Split stands its list and its main (or `empty`) together, with the sidebar standing.
- [x] Below that width one region stands at a time, as now, and the phone is unchanged.
- [x] The reading of `tablet` is written in the Split's rule beside `wide`'s, with the viewport width at which each region opens.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, together with 003-115, whether the breakpoints read the viewport less the sidebar or the container's thresholds drop.

## Ruled
By design, nothing changes. `tablet` stays 768: it is also the viewport density switch, and at a 768 viewport the Shell's page is 528, which leaves a 168 px main beside the 360 px list. The Split rule now says the list and the main stand together from a page 768 wide (a 1008 viewport in the Shell) and `beside` and `pane` from a page 1200 wide (a 1440 viewport).
Evidence: `behaviour/split.stories.tsx` `FromTablet` and `BelowTablet` (pages 768 and 767 px).

## Critique
Ship, by a fresh critic at 1280, 768, 1440 and 390, light and dark (scratchpad `critique/split/report.md`).

## Cut
Acceptance 1 asked that at a 768 px viewport in the Shell a Split stand its list and its main (or `empty`) together with the sidebar standing. It is not delivered: at 768 the Split still draws one region at a time. An AI ruling cut it (`rulings.md` item 1, lines 9 to 12, "Do not change `tablet`. Close the story as by design"; the story's Ruled repeats it); the owner did not rule it. The gap is in the code today: `tablet` stays 768 against the page container, which is 528 at a 768 viewport; only the rule text changed.

## Owner ruling
The owner accepts the cut. List and main stand together from a page 768 wide (a 1008 viewport), one region below: a 168 px main fails the measure.
