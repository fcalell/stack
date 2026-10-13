---
id: 003-330
status: backlog
sessions: {}
---
# ui-core: a scramble for loading text

## Goal
Deferred 2026-10-13. Text that loads (a record's title, a value) could show a terminal-like scramble of characters while it waits, then resolve, in place of a bar. It is held to a fixed character count in a monospaced face so the line keeps its width and nothing moves when the text lands, and it stands still under reduced motion.

## Approach
It needs the motion rules first (003-329): `judging.md` lets only `transform` and `opacity` animate, and a scramble changes text. Once the rules allow it, the scramble is a waiting form of the text slot (`loading` on the loaded tree, never a second tree), one component both platforms draw.

## Acceptance criteria
- [ ] A text slot with `loading` draws the scramble at a fixed character count in the mono face, and the line's box equals the loaded line's.
- [ ] Under reduced motion it draws a still form.
- [ ] The settle from the scramble to the loaded text moves nothing.
