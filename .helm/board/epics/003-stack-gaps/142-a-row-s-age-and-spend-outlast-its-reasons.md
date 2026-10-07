---
id: 003-142
status: review
sessions: {}
---
# react-ui: a row's age and spend are the last meta parts to be cut

## Goal
Stead's Work rows read "implementing · pass 1 · “Sign-in from a second de…", "blocked by “Sync the shelf between devices” · 8 …", "waiting for usage · resumes 10:43 PM · round 1 · 8…" and, at 320 px, "refining · round 3 · 3 open flags · 7…": the age and the spend are what the cut takes first (github.com/fcalell/stead, `packages/server/src/app/routes/work/-components/board.tsx` lines 128 to 137; design/07-interface.md "A row's meta": the stage or reason, age and spend always readable). Evidence: critique unit u6, shots `list-1440-light`, `done-expanded-1440-light`, `list-320-dark` (Stead scratchpad `critique/u6/shots/`, stack at `5564217`).

## Approach
ListRow's meta line truncates "the later parts first" (`LATER`, `LATER_TEXT` in list-row/index.tsx), so whatever the app puts last is cut first; the app can order its parts, but then the quoted epic or a long reason is the part that is cut, and the one `LATER` slot shows "at least `figures` of it or none" with no way to say which later part is the one that must read. Not 003-118 (the status against the first part) and not 003-83 (the trailing age against the title): here the line holds a first part, a status, a quote and an age and spend, and the order of yield between the later parts is what is in question. Seen at stack `5564217`.

## Acceptance criteria
- [x] A meta line too narrow for its parts cuts a part the app marks as the yielding one (a quote, a reason) before the age and spend, which read whole while the line is wide enough for them alone.
- [x] The ListRow showcase holds a row with a long quote, an age and a spend at 320 px.

## Decided
No flag. The age and spend go in the row's `trailing`, which is whole or gone already. A `Quoted` later part stands in a span of its own that yields ahead of the plain later parts, so the app marks the yielding part by quoting it; the plain parts between quotes join into one span and cut from their end as before.

## Built
`partRuns` (`lib/parts` on both platforms) splits the later parts into a `Quoted` run per quote and a joined plain run between them. react-ui's `ListRow` draws each run in its own span inside the later slot (the quoted one at shrink weight 10^7, the plain at 1); native-ui draws each as its own `Text` in a row with the same weights. The `ListRow` frame holds a Work part at the pane's 320 px (stage, long quote, reason, and "18 min · $0.42" as the trailing value).
Evidence: `behaviour/row-meta.stories.tsx` `MetaYields` and `MetaYieldsTouch` (the quote clipped, the plain part and the trailing value whole, at 320 and 360 px, both densities), and the generated `ListRow` stories pass.

## Open questions
- [x] Its shape: no `Part` flag; a `Quoted` part yields first (ruling for 003-142).
