---
id: 003-215
status: backlog
sessions: {}
---
# react-ui: a Sheet a route opens returns focus somewhere when it closes

## Goal
Stead's question round opens as a modal `Sheet` when its item's route loads, with no act pressed to open it (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx`, the question sheet mounted open by the item route; `ui/question-sheet.tsx`; design/07-interface.md "### Chats", the question sheet). Escape or Close navigates back, and focus falls to the document body, so a keyboard operator starts again from the page's top. Evidence: Stead's Chats critique unit u5 (second pass) at stack `74a0e3d`.

## Approach
A `Sheet` returns focus to the element that opened it; a sheet a route mounts open has none. 003-212 covers a sheet opened from a pick's act that unmounts; here nothing opened it. `Sheet` takes no return target, and the app moving focus by hand needs a ref and a `.focus()` into the roster's markup.

## Acceptance criteria
- [ ] A Sheet mounted open by its route, closed by the keyboard, leaves focus on a named place of the page it returns to (its main region's head or first control), never the body, at every density.
- [ ] A Sheet opened by an act is unchanged.
- [ ] The showcase holds a route-opened Sheet, checked by a behaviour story on close.

## Open questions
- [ ] Its shape (a return target on `Sheet`, focus to the destination's head on a closing navigation, or another): the stack session decides.
