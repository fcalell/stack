---
id: 003-206
status: review
sessions: {}
---
# react-ui: a known row's status line waits on its own read

## Goal
Stead's System index is a fixed list of sections (Status, Usage, Leads, Agents, Workflows, Rules, Sinks, Memory, …), each a `ListRow` whose status line comes from its own read: "1 check fails" from the doctor, "2 running" from the workflows, an agent count (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/system-index.tsx`; design/07-interface.md "### System", the index). The rows are known at once and their status lines arrive later, so Status, Agents and Workflows stand 32 px tall and grow to 48 px when each read answers, moving every row under them. Evidence: Stead's System critique unit u8 at stack `74a0e3d` (Stead scratchpad `critique/u8/report.md`).

## Approach
A `List` waits in two forms (`list-row/wait.tsx`, `trailing-wait.ts`, the List's `known` branch, rules.md on waiting rows): rows fully waiting (`RowWait`, the status a dot alone), or items given with `loading`, which stand as the loaded rows with only their trailing value waiting; `status` passes through `row.status(item)` as is. Nothing lets one known row say its status line is on its way, so it stands either absent (the row a line short) or with words the app would invent. A stand-in status ("Reading") draws words the read has not given and still changes the row when it answers.

## Acceptance criteria
- [x] A known row whose status is on its way stands its status line as a waiting bar at the loaded row's height, starting where the loaded word does, and draws the status in place when it arrives, on both platforms (the phone's render unchecked).
- [x] A row with no status, and a row whose status is known, are unchanged.
- [ ] The ListRow showcase holds a known list with one row's status waiting, at 390 and 1280, measured by the critique.

## Open questions
- [x] Its shape (a waiting status from the row map, a per-item loading slot, or another): the stack session decides.

## Ruled
A `status` may be `{ loading: true }` (`RowStatus`, ui-core `descriptors.ts`, taken by `ListRow.status` and `RowSlots.status`; `StatusMark` itself is unchanged). A string or `null` sentinel is an untyped meaning, and a per-item slot is a second function for one state; `loading` is the roster's one waiting word.

## Built
- ui-core `descriptors.ts`: `RowStatus = StatusMark | { loading: true }`; `roster.ts` ListRow note; `README.md` and `verify.ts` name it.
- react-ui and native-ui `list-row/status.tsx` (new): a waiting status stands as a `skeleton` line bar `w-measure-short` in a box the meta line's height (`LINE_BOX` meta with `h-lh` on the web, a `Strut` on the phone), hidden from assistive tech, yielding to the first part as the status does. It counts as a mark, so the row is the two-line row from its first frame. Loaded, the `Status` draws in the same place. `ListRow` and `List` types take `RowStatus`; a row with no status, and a row with a loaded one, draw as before.
- Both `rules.md` and `ui-core.md` describe the waiting status.
- Showcase: `behaviour/list-row-status.stories.tsx` (`StatusWaits`, `StatusWaitsKnown` and their touch twins) draws a `List` whose Agents status waits, in a 390 and a 440 px column, in a plain list and in a `known` list: the waiting row is as tall as its answered self, the rows under it keep their top and height after the answer, a row with no status stays a line shorter. Scoped stories run: the `list-row`, `row-meta`, `status`, `list.stories` and `table` files, all passed.
- The phone's render is unchecked on a device; the native verify suite and type-check pass.
Native unrendered: status waits, on both platforms.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique (rework): row height is held waiting and loaded (52/64), but the waiting bar starts at x=16 against the loaded status text at x=28 on desktop and x=32 on touch, and is 140/162 px wide against the narrow loaded "2 running".

## Owner ruling
The owner rules rework: the waiting bar starts at the loaded status text's x (28 desktop, 32 touch) and is at most `measure-short` wide; the row height stays 52/64. Acceptance at 390 and 1280: the bar's left edge equals the arriving status text's left edge, no horizontal shift on arrival. The native box stays open.

## Built (rework)
The waiting status is now the `Status`'s own waiting form: `StatusBase` takes `waiting="short"` (react-ui and native-ui `status/base.tsx`), which keeps the dot's room unseen (a `statusDot` cell, `invisible` / `opacity-0`) and the status's `gap-inside`, then a `skeleton` line bar `w-measure-short` wide at most; the list row's `RowStatusMark` draws it in its meta-line-tall box (`h-lh`; a `Strut` on the phone), so the bar's left edge is the loaded word's, 28 px on the desktop and 32 on touch, and it is no wider than a short label. Row heights stay (52 and 64). `ui-core.md` and both `rules.md` say so.
`behaviour/list-row-status.stories.tsx` `waits` (`StatusWaits`, `StatusWaitsKnown` and the touch twins, 390 and 440 px columns) additionally asserts the bar is at most a `w-measure-short` probe wide and that, once the read answers, "2 running" starts at the bar's left edge (`toBeCloseTo`, 1 digit), with the heights and tops unchanged as before. The four stories and the file's other six pass.
Native box stays open (native unrendered).
