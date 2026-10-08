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
- [x] A known row whose status is on its way stands its status line as a waiting bar at the loaded row's height, and draws the status in place when it arrives, on both platforms.
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
