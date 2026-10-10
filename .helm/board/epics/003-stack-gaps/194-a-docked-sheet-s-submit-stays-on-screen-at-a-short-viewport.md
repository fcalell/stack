---
id: 003-194
status: done
sessions: {}
---
# react-ui: a docked Sheet's pinned parts stay on screen at a short viewport

## Goal
Stead's question sheet docks in a conversation's foot (github.com/fcalell/stead, `packages/server/src/app/ui/question-sheet.tsx`, standing in the Thread of `ui/conversation.tsx`; design/07-interface.md "The question sheet": the submit act is the operator's way through, and the conversation stays readable above it). With the usage banner up on a short phone the sheet's primary act leaves the screen. Evidence: Stead's chats critique unit u5 at stack `74a0e3d`, Stead scratchpad `critique/u5/` (measurements in `G.out`):
- 320 x 640 (shots `shotsB/B-sheet-320-light`, `shotsG/G-sheet-320-light`): Done stands at y 579-623 and the tab bar's top is 583, so 4 px of the 44 px act show. The sheet's description is overprinted by the log line ("Code asked 2 questions" runs through "Round 12 · Code reads them next."), and the Latest act sits over the header's status ("Waiting for" is cut by it).
- 390 x 667 (shot `shotsG/G-sheet-390-light`): Next stands at y 633-677 in a 667 px viewport, below the fold at rest; the Place's scroller is 381 of 402 px, so the operator reaches the act only by scrolling the page. The first page's third option is cut at the body's end.
- 390 x 844 is the case 003-129 and 003-164 (both done) proved; this is the same sheet at the two shorter viewports.

## Approach
003-129 gave the docked body a floor of three rows (`docked-floor`, 144 px on touch) and a share of two fifths of the region, with the log giving way. At 390 x 844 that fits. With the banner (130 px) and the top bar, the Place's region at 640 or 667 px is smaller than the head, the foot line, the stacked touch submit and the kept reason line plus that floor, so the sum overflows the region and the foot runs under the shell's tab bar; at 320 the head also wraps to three lines, and the log's last line prints over it. The floor holds the body, not the sheet's pinned parts, so nothing keeps the submit inside the region when the floor and the pinned parts together exceed it. The app cannot repair it: geometry classes go on host elements only, and shortening the sheet's head (Stead's own) does not remove the floor. The reference is the sheet-and-confirm pattern (Vapi, Neon footers) where the footer is always on screen and only the body scrolls, the floor yielding when the region is short.

## Acceptance criteria
- [x] A docked Sheet's submit act stands wholly inside its foot's region, above the shell's tab bar, at 320 x 640 and 390 x 667 with a banner up, the body's floor giving way below three rows when the region cannot hold it.
- [x] No log text prints over the sheet's head, and the Latest act does not cover the header's status, at 320 x 640 with the banner up.
- [x] A docked Sheet with room (390 x 844) is unchanged.
- [x] The Thread showcase holds a two-page docked Sheet under a banner at 320 x 640 and 390 x 667, and the critique measures the submit's bottom against the tab bar's top.

## Open questions
- [x] Its shape (the floor yielding to the pinned parts, the foot line moving into the body on touch, or a page-level scroll that keeps the foot): the stack session decides.

## Ruled
The floor stops being a minimum on the scroller and becomes a minimum on the body's content, so the scroller yields by flex shrink where the region is short. No prop. The body's cap is one formula shared with 003-195 (`dockedBodyMax`), in which the pinned parts (the dock's chrome, the sheet's head, foot line, submit and kept reason) never give. A Thread's log region clips its height (`overflow-y-clip`, native `overflow-hidden`), so nothing the log draws and not the Latest act paints over the foot's head or the header.

## Built
- `plugins/react-ui/src/ui/components/sheet/docked.tsx`: the scroller keeps only its scroll classes and `maxHeight` from `dockedBodyMax`; `SHEET_DOCKED_BODY` and `SHEET_DOCKED_FLOOR` move to an inner content `div`; one `ResizeObserver` on the sheet and its body measures what the sheet pins and reads `--spacing-docked-floor`.
- `plugins/native-ui/src/ui/components/sheet/docked.tsx`: `minHeight: floor` moves to `contentContainerStyle`; the head and foot `onLayout` give the pinned height.
- `plugins/{react,native}-ui/src/ui/lib/frame.ts`: `FootRegion` carries `{ height, chrome, logFloor }`; `useFootRegion` measures the dock's block padding and border (web from the dock node, native from `--spacing-acts` and `--spacing-hairline`); Thread and Place hand it in.
- `plugins/{react,native}-ui/src/ui/components/thread/index.tsx`: `REGION` clips; `plugins/react-ui/scripts/overlays.ts` follows (`overflow-y-clip`).
- `packages/ui-core/src/tokens.ts`: `dockedBodyMax`, pinned by `packages/ui-core/test/docked.test.ts`.
- `apps/showcase/behaviour/sheet.stories.tsx`: `DockedShortPhone` (320 x 640), `DockedShortPhoneTall` (390 x 667), `DockedShortestPhone` (320 x 560, where the body gives below three rows), `DockedLatestStaysInItsRegion`, each with a stand-in tab bar of 57 px and a banner.
- Evidence (measured in the stories): 320 x 640 region 366, body 144, log 77 showing, submit bottom 545 against the tab bar's top 583; 390 x 667 region 417, body 166.8, log 105, submit bottom 572 against 610; 320 x 560 region 286, body 141 (below the 144 floor), log 0, submit bottom 465 against 503. The Latest act at 320 x 560 is clipped (the point at its centre hits nothing of it). 390 x 844 (`DockedBodyKeepsThreeRows`, `DockedWithRoomFitsItsPage`) pass unchanged: the body stands at its cap, 0.4 of the region. Scoped stories run (36 files, 106 tests passed at a peak of 2514 MiB; the sheet and thread behaviour files rerun last, 21 passed), `pnpm check` and the three `verify` suites pass.

## Open
- The last acceptance box (the Thread showcase's two-page docked Sheet at 320 x 640 and 390 x 667, the submit's bottom measured against the tab bar's top) waits on a design critique run by a session that played no part in the work. The stories assert the same two measures (submit bottom against the region's bottom and against a stand-in tab bar's top).

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique (blocker, focus visible): at 320x560 the log's Latest button (y 165-209) is clipped above the log top (217) yet focusable, and a Tab to it rings nothing visible. Submit is clear of the tab bar by 38 px at 320x640, 390x667 and 320x560 (that box is met). Nit: at 320x640 the body's last row sits flush against the submit (0 px gap).

## Owner ruling
The owner rules rework (blocker): Latest is never focusable while out of view. At 320x560, 320x640 and 390x667 the Latest button's box is inside the log's visible box, or the button is not rendered or is inert whenever the log is shorter than the button plus its inset. A Tab to it draws a visible 2 px ring in every one of those viewports. Submit stays clear of the tab bar (38 px now). The body's last row keeps at least the section gap above the submit (0 px at 320x640 now).

## Built (rework)
- `plugins/react-ui/src/ui/components/thread/latest.tsx`: the Latest act measures its box against the region's visible box (its top less the focus ring and offset must be at or below the region's top, a ResizeObserver on both) and, where it does not fit, gets `invisible`: out of the tab order and the tree, so it is never focusable while out of view. Native has no tab stop or ring; unchanged.
- `packages/ui-core/src/variants.ts`: `SHEET_DOCKED_BODY` is `gap-sections pt-card pb-sections`, so the body's last row ends a sections gap (40 px touch) above the submit when scrolled to its end (it was 21 px: card inset plus the row's own padding); ui-core.md updated.
- `apps/showcase/behaviour/sheet.stories.tsx`: `DockedLatestStaysInItsRegion` (320x560: the act is out of the tab order and a Tab from the log lands on no Latest act), `DockedLatestReachableShortPhone` (320x640) and `DockedLatestReachableShortPhoneTall` (390x667) (the box inside the log's visible box, a Tab lands on it, a solid 2 px outline wholly inside the region), `DockedLastRowKeepsTheSectionGap320/390/560` (last row to submit at least the sections gap). sheet.stories 37 of 37 (with the unchanged `DockedShort*` submit-vs-tab-bar stories), the related thread, waiting, place-foot, form-leave stories green, `pnpm check` and the three `verify` suites pass.
- Note: the critique's 0 px at 320x640 is the body's visible edge against the submit while the body is scrolled to its top (the body is a clipped scroller, flush with the foot); the measured scrolled-to-end gap was 21 px and is now 40 px. Submit clearance of the tab bar is unchanged (the `DockedShort*` stories). The Thread-showcase critique box stays open.

## Re-review
Accepted 2026-10-10 after the round-2 re-critique: Latest is hidden and inert at 320x560, ringed wholly inside the log at 320x640 and 390x667, the submit stands 38 px clear of the tab bar, the last row 45 px above the submit scrolled to the end.
