---
id: 003-315
status: backlog
sessions: {}
---
# react-ui: a Section's head holds a more beside its act

## Goal
Stead's composer draws each prompt block as a `Section` titled by the block, with Edit as its act, and on every agent the block's more holds "Move up", "Move down" and "Remove the block" (github.com/fcalell/stead, `design/07-interface.md`, "Agents: the composer", "A prompt block"). `Section` takes one act and no more, so Stead's step 8b drew the moves as a separate "Blocks" list above the prose sections (`packages/server/src/app/routes/system/-components/agent.tsx`, `BlocksSection`), which splits one block's acts across two places on the screen. The owner asked for this gap to be filed on 2026-10-10.

## Approach
`Section` takes `act?: Act | IconAct` and nothing else at the head's end (`plugins/react-ui/src/ui/components/section/index.tsx:106`). `ListRow` already carries `more?: readonly MenuItem[]` after its act (`list-row/index.tsx:221-222`), the shape a Section's head could follow. Seen at stack `0138667b`.

## Acceptance criteria
- [ ] A `Section` can carry a more (a menu of acts, destructive ones marked) at its head's end, after its act, on the head row that never moves.
- [ ] With both an act and a more, at 375 the head keeps the title readable, wrapping the act under the title as the touch rule already does.
- [ ] A foldable Section's more does not fold or open it.
- [ ] Native the same.

## Open questions
- [ ] Whether the more is a prop on `Section` or a menu `act` kind: the stack session decides.
