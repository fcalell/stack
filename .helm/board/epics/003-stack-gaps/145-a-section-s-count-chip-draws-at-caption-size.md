---
id: 003-145
status: review
sessions: {}
---
# ui-core: a Section's count chip draws smaller than body

## Goal
Stead's Work board draws each Section's count in a pill at 13 px type and 20 px tall (radius 9999), ink 15.5 to 13.4 contrast; the critique's range for a count chip is 10 to 12 px type and 16 to 22 px tall, so the type is the part out of range and the chip reads as body text (github.com/fcalell/stead, `packages/server/src/app/routes/work/-components/board.tsx`, a `Section` with a `List` that counts its rows). Evidence: critique unit u6, 1440 px both modes (Stead scratchpad `critique/u6/`, stack at `5564217`).

## Approach
`COUNT_LABEL` is `text-caption leading-caption ...` and `COUNT` is `min-h-chip min-w-chip px-inside` (ui-core variants.ts), so the chip is as large as the `caption` role, which resolves to 13 px at the desktop. A count is a figure beside a title and should sit a step under the caption; a smaller role would add a size to the screen's list (the rubric holds sizes on one screen to six), so the choice is the stack session's. Seen at stack `5564217`.

## Acceptance criteria
- [ ] The count chip's type measures 12 px or under on every platform and its height 16 to 22 px, its figures still one width.
- [ ] The Count showcase holds the chip beside a Section title and the critique measures it.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether the caption role steps to 12 px or the chip takes a role of its own.

## Ruled
By design. `caption` is 0.846 of the body: 11 px on the desktop (13 × 0.846) and 14 on touch (16 × 0.846), inside the rubric's 10 to 12 range at the density the chip is judged at. Rendered in a Section at 1200 px, the chip's figure draws 11 px in a 20 px pill (the 16 to 22 range). The 13 px in the story's evidence is the body size, so the reading was of another element. The caption step stays and the chip takes no role of its own.
