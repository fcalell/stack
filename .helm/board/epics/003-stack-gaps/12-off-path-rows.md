---
id: 003-12
status: review
sessions: {}
---
# ui-core: rows off a highlighted path dim

## Goal
A Martechthings journey shows a pinned scenario or the latest run as a path: its rows at full contrast, every row off it dimmed. `ListRow` states are rest, highlighted, pressed and selected.

## Approach
- Reference: Twenty's workflow run, taken steps with a green eyebrow, untaken ones grey ([screen](https://mobbin.com/screens/52fec443-3d8b-4400-b087-b9a333531706)).

## Acceptance criteria
- [ ] A row draws a dimmed state that keeps it legible and reachable, in light and dark.

## Shape
`ListRow.dim?: boolean` (and `RowSlots.dim`): the row stands off the highlighted path. Title and trailing draw in `ink-meta`, the title at weight 400; the leading glyph and marks keep their hue; the row stays a hit and focusable. Ink, never opacity, so the title keeps 4.5:1.
