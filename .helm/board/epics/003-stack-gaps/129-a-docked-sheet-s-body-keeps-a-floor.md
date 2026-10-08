---
id: 003-129
status: review
sessions: {}
---
# react-ui: a docked Sheet's body keeps a floor of rows

## Goal
Stead's question sheet docks in a conversation's foot, and at 390 x 844 with the usage banner up (130 px) its body scroller is 358 x 84 on a question page (one option half cut), 46 on the review page and about 23 under the "Round n is ready." banner, so the operator answers through a slit (github.com/fcalell/stead, `packages/server/src/app/ui/question-sheet.tsx`; design/07-interface.md "The question sheet", the conversation readable above it). Evidence: chats critique unit u5, shots `D-q1-390l`, `D-failed-390l`, `D-ready-390l`, `q1-chosen-390l`, `D-q1-390d` (Stead scratchpad `critique/u5/shots/`, stack at `5564217`).

Measured again in the u5 run (390 x 844, usage banner up): the body scroller is 84 px of the 226 the page needs in light, 62 px in dark, about 45 px at 390 x 800; with a note field open (the chosen option) it shows as a ~10 px sliver, and on the review page the last row ("Callers opt in.") sits on the card's bottom border at a 46 px body. Shots `q1-390-light`, `q-chosen-390-light`, `q-review-390-light`, `shots3/q-chosen-390-dark`.

## Approach
`FOOT_DOCKED` caps the foot at `max-h-3/5` of the region and `SheetDocked` (sheet/docked.tsx) holds its head, foot line and submit at their height (`shrink-0`), so the body is whatever the cap leaves after them, with no minimum: a long head, a foot line, a stacked touch submit and a banner over the region together leave the body under two rows. The log keeps its two fifths, so it is not the log that gives way. The app cannot set a body minimum or drop the foot line from outside (geometry classes go on host elements only); it can shorten its own head, and Stead is doing that, but a floor is the sheet's. The same small log is where the Latest act floats over the last line ("Code asked 2 questions · Answer" half hidden at 390 dark): no room above the foot for it to stand clear. 003-63 built the docked sheet and left the half bound to the critique; 003-124 is a Split's list over a docked foot, a different case. Seen at stack `5564217`.

## Acceptance criteria
- [x] A docked Sheet's body keeps room for at least three option rows on touch, whatever its head, foot line and banners hold, the log giving way (or the foot line moving into the body on touch).
- [x] A docked Sheet with room is unchanged.
- [ ] The Thread showcase holds a two-page docked Sheet at 390 x 844 with a banner up and the critique measures the body and the Latest act's clearance.

## Decided

The foot is no longer capped at three fifths: `FOOT_DOCKED` is `max-h-full min-h-0`, so the log gives way to the foot. The docked Sheet bounds its own body, two fifths of the region at most (`max-h-[40cqh]`) and three `row` sizes at least. The region the log and the foot share (a filling Thread's column, a Place's region) is a size container (`[container-type:size]`, sized by its flex height, never its content), which is what `cqh` reads. The cost: a body shorter than three rows pads to the floor. No prop. Native has no container units, so it reads the `Lifted` region's height from `onLayout` (`FootRegion`) and gives the body `maxHeight` 0.4 of it and `minHeight` three `--spacing-row`.

## Built

- `packages/ui-core/src/variants.ts`: `FOOT_DOCKED` drops `max-h-3/5`, takes `max-h-full` (shared by both platforms; native's foot is `maxHeight: '100%'`).
- `plugins/react-ui`: Thread's `FILL` and Place's `REGION` are size containers; the docked Sheet's body, when it stands in a docked foot (`FootPlace` is `docked`), takes `min-h-[calc(var(--spacing-row)_*_3)] max-h-[40cqh]` (inline among sections it stays unbounded); `scripts/overlays.ts` lists the three classes; `scripts/verify.ts` escapes `*` when it looks a class up in the built CSS.
- `plugins/native-ui`: `FootRegion` and `useFootRegion` in `lib/frame.ts`; Thread and Place measure their `Lifted` column and hand its height to the docked foot; the docked Sheet's body Scroll takes the `maxHeight` and `minHeight` above.
- The Sheet frame's docked conversation is 844 px high under a warn Banner.
- Docs: the Sheet rule in both `rules.md`, `ui-core.md`, the `FOOT_DOCKED` comment and the Thread JSDoc.
- Evidence: `behaviour/sheet.stories.tsx` `DockedBodyKeepsThreeRows` (390 x 844 column under a banner, touch: the body is at least three rows (144 px) and at most two fifths of the region, the log has height, the sheet ends inside the region, the review page pads to three rows) and `DockedWithRoomFitsItsPage` (1600 px column: the body does not scroll and the log is taller) pass in the touch project, with the rest of `sheet`, `not-found` and `failed`. `pnpm check` turbo, the three `verify` runs and Biome pass. Native is typechecked and `verify`d only: Yoga's min-versus-max on the body Scroll and `onLayout` on `KeyboardAvoidingView` (read from its source) are not run on a device.
- Left: the critique of the render (measuring the body and the Latest act's clearance) belongs to a session outside this work.
