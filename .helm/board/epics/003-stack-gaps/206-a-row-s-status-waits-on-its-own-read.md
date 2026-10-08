---
id: 003-206
status: backlog
sessions: {}
---
# react-ui: a known row's status line waits on its own read

## Goal
Stead's System index is a fixed list of sections (Status, Usage, Leads, Agents, Workflows, Rules, Sinks, Memory, …), each a `ListRow` whose status line comes from its own read: "1 check fails" from the doctor, "2 running" from the workflows, an agent count (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/system-index.tsx`; design/07-interface.md "### System", the index). The rows are known at once and their status lines arrive later, so Status, Agents and Workflows stand 32 px tall and grow to 48 px when each read answers, moving every row under them. Evidence: Stead's System critique unit u8 at stack `74a0e3d` (Stead scratchpad `critique/u8/report.md`).

## Approach
A `List` waits in two forms (`list-row/wait.tsx`, `trailing-wait.ts`, the List's `known` branch, rules.md on waiting rows): rows fully waiting (`RowWait`, the status a dot alone), or items given with `loading`, which stand as the loaded rows with only their trailing value waiting; `status` passes through `row.status(item)` as is. Nothing lets one known row say its status line is on its way, so it stands either absent (the row a line short) or with words the app would invent. A stand-in status ("Reading") draws words the read has not given and still changes the row when it answers.

## Acceptance criteria
- [ ] A known row whose status is on its way stands its status line as a waiting bar at the loaded row's height, and draws the status in place when it arrives, on both platforms.
- [ ] A row with no status, and a row whose status is known, are unchanged.
- [ ] The ListRow showcase holds a known list with one row's status waiting, at 390 and 1280, measured by the critique.

## Open questions
- [ ] Its shape (a waiting status from the row map, a per-item loading slot, or another): the stack session decides.
