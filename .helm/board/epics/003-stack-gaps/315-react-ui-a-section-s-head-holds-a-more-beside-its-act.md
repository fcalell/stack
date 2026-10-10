---
id: 003-315
status: review
sessions: {}
---
# react-ui: a Section's head holds a more beside its act

## Goal
Stead's composer draws each prompt block as a `Section` titled by the block, with Edit as its act, and on every agent the block's more holds "Move up", "Move down" and "Remove the block" (github.com/fcalell/stead, `design/07-interface.md`, "Agents: the composer", "A prompt block"). `Section` takes one act and no more, so Stead's step 8b drew the moves as a separate "Blocks" list above the prose sections (`packages/server/src/app/routes/system/-components/agent.tsx`, `BlocksSection`), which splits one block's acts across two places on the screen. The owner asked for this gap to be filed on 2026-10-10.

## Approach
`Section` takes `act?: Act | IconAct` and nothing else at the head's end (`plugins/react-ui/src/ui/components/section/index.tsx:106`). `ListRow` already carries `more?: readonly MenuItem[]` after its act (`list-row/index.tsx:221-222`), the shape a Section's head could follow. Seen at stack `0138667b`.

## Acceptance criteria
- [x] A `Section` can carry a more (a menu of acts, destructive ones marked) at its head's end, after its act, on the head row that never moves.
- [x] With both an act and a more, at 375 the head keeps the title readable, wrapping the act under the title as the touch rule already does.
- [x] A foldable Section's more does not fold or open it.
- [ ] Native the same.

## Open questions
- [x] Whether the more is a prop on `Section` or a menu `act` kind: the stack session decides.


## Ruled
`more?: readonly MenuItem[]` is a prop on `Section`, shaped as `ListRow.more` (the menu's own item descriptor, its `destructive` mark and `blocked` reason). A menu kind of `act` would widen the `Act` descriptor every act-bearing component shares, for one head; the prop adds one prop on one component and no new type.

## Built
Web (`plugins/react-ui/src/ui/components/section/index.tsx`) and native (`plugins/native-ui/src/ui/components/section/index.tsx`): the head's end slot holds the act, then `MenuBase` (labelled `More <title>`, its touch sheet titled by the Section), so the pair wraps under the title together on touch and the head row never moves. The more sits outside the fold toggle. `more` joins the Section roster (`packages/ui-core/src/roster.ts`); rules in both guides and `ui-core.md`. Stories `HeadHoldsActAndMore375/1440`, `FoldableMoreDoesNotToggle`, `DestructiveItemIsMarked` (`apps/showcase/behaviour/section-more.stories.tsx`) pass in Chromium (4 tests), as do the Section-bearing stories `section-body`, `waiting`, `waiting-late`, `list-row-status`, `row-meta` (70 tests). `pnpm check` and the three verifies pass.
Native unrendered: the menu and the wrap are the web's by construction and unchecked on a device, so the native box stays open.
