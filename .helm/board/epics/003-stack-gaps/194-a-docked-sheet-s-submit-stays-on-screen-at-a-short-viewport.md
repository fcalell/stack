---
id: 003-194
status: backlog
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
- [ ] A docked Sheet's submit act stands wholly inside its foot's region, above the shell's tab bar, at 320 x 640 and 390 x 667 with a banner up, the body's floor giving way below three rows when the region cannot hold it.
- [ ] No log text prints over the sheet's head, and the Latest act does not cover the header's status, at 320 x 640 with the banner up.
- [ ] A docked Sheet with room (390 x 844) is unchanged.
- [ ] The Thread showcase holds a two-page docked Sheet under a banner at 320 x 640 and 390 x 667, and the critique measures the submit's bottom against the tab bar's top.

## Open questions
- [ ] Its shape (the floor yielding to the pinned parts, the foot line moving into the body on touch, or a page-level scroll that keeps the foot): the stack session decides.
