---
id: 003-69
status: done
sessions: {}
---
# ui-core: a message detail row's title is a Part

## Goal
Stead's conversation names a story on a card line under a hub message; a model-written name is drawn quoted (design/07-interface.md "Wording"; github.com/fcalell/stead, packages/server/src/app/ui/conversation.tsx).

## Approach
`MessageDetail`'s row `title` is a string (descriptors.ts), while ListRow's title is a Part that can carry the quoted mark; typing quotes into the string would be a workaround.

## Shape
`MessageDetail.row.title` becomes `Part` (was `string`) in `descriptors.ts`. Both Messages spread `detail.row` into `ListRow`, whose `title` is already a `Part`, and Thread's memoised item re-wraps only `onOpen`, so a `Quoted` title draws its quotes and wraps to two lines as in any row.
No source change on either platform. A showcase thread frame gains a quoted detail row, and the rules line notes the title takes a Part. Rejected: typing quotes into the string (the app's workaround) and deriving the row type from `ListRow` props (ui-core holds no React prop types). No pins move.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Unrendered: the rows critique did not capture the Message or Thread detail row.

## Critique (second round)
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/r2-components/report.md`).
