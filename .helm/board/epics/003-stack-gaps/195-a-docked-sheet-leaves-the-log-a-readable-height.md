---
id: 003-195
status: review
sessions: {}
---
# react-ui: a docked Sheet leaves the log above it a readable height

## Goal
Stead's question sheet docks in a conversation's foot and design/07-interface.md ("The question sheet") says the conversation stays readable above it (github.com/fcalell/stead, `packages/server/src/app/ui/question-sheet.tsx` in the Thread of `ui/conversation.tsx`). At 390 x 844 with the usage banner up the log above the docked sheet is 65 px, one line ("Code asked 2 questions · Answer 3:47 PM", cut at its top by the header's hairline), against a sheet of 372 px (shot `shotsB/B-sheet-390-light`; `G.out` line 6: `log [350,65]`, `sheet [415,372]`); after the first page it is 56 px. The operator answering a question cannot read what was asked. Evidence: Stead's chats critique unit u5 at stack `74a0e3d` (Stead scratchpad `critique/u5/`).

## Approach
003-129 ("Decided") holds the body's floor (three rows) and its share (two fifths of the region), and lets the log give way to the foot: `FOOT_DOCKED` is `max-h-full min-h-0`. That fixes the sheet's body and, by design, gives the log nothing: whatever the head, the foot line, the submit and the body leave is the log's, with no minimum, so at 844 px with a banner it is one line, and at shorter viewports it is zero (see 003-194). 003-129's acceptance names "the log giving way", so the floor of the log's own is a separate contract that nothing holds. The app cannot hold one: the log and the foot share the Thread's region, and a geometry class goes on host elements only.

## Acceptance criteria
- [x] With a docked Sheet open in a filling Thread, the log keeps a floor (a stated number of its own lines or rows, in the contract beside `docked-floor`) at 390 x 844 under a banner, the body giving way down to its own floor before the log goes below it.
- [x] A docked Sheet with room is unchanged.
- [ ] The Thread showcase holds the docked Sheet at 390 x 844 under a banner and the critique measures the log's height against the floor.

## Open questions
- [x] Its shape (a log floor as a contract value like `docked-floor`, a lower body floor on touch, or the sheet's head collapsing): the stack session decides, with 003-194.

## Ruled
A log floor as a contract size, `docked-log-floor`, two rows (96 px on touch, 64 on the desktop), beside `docked-floor`. Order when the region is short: the sheet's pinned parts, then the body's three rows, then the log's two. The body's cap is `dockedBodyMax` (ui-core `tokens.ts`): `room = region - pinned`, `cap = max(F, 0.4 * region)`, `bodyMax = max(0, max(min(F, room), min(cap, room - L)))`; with room it equals the cap. The region owner hands the sheet `{ height, chrome, logFloor }`: a Thread's `logFloor` is `docked-log-floor`, a Place's is 0.

## Built
- `packages/ui-core`: `docked-log-floor` in `SIZES` and `DerivedSize` (`tokens.ts`), `sizePx` (`scales.ts`), the size description and the DESIGN.md sentence (`design-md.ts`, regenerated `DESIGN.md`), the Thread roster entry's `owns.sizes`, `scripts/verify.ts` (42 sizes), `test/docked.test.ts` (with room, tight, short and log-free cases, Stead's region of 437 among them) and `test/design-md.test.ts`.
- The two docked sheets and `FootRegion` as under 003-194; `.helm/knowledge/architecture/ui-core.md` and both `rules.md` state the order and the formula.
- `apps/showcase/behaviour/sheet.stories.tsx`: `DockedLeavesTheLogItsFloor` (390 wide, a region of 395: the log shows 96 and the body stands between its three rows and its cap), and `DockedBodyKeepsThreeRows` (390 x 844) asserts the log at or over the floor.
- Evidence: at 390 x 844 (region 651) the body stands at its cap of 260.4 and the log shows 245.6; the formula at Stead's measured region (437, pinned 190) gives a body of 151 and the log its 96 (the unit test pins it). Scoped stories run (36 files, 106 tests passed at a peak of 2514 MiB; the sheet and thread behaviour files rerun last, 21 passed), `pnpm check` and the three `verify` suites pass.

## Open
- The last acceptance box (the Thread showcase's docked Sheet at 390 x 844 under a banner, the log's height measured against the floor by the critique) waits on a design critique run by a session that played no part in the work. The stories assert the log at or over `docked-log-floor` and the body at or over `docked-floor`.
