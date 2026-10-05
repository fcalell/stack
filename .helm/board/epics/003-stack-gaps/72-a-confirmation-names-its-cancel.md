---
id: 003-72
status: review
sessions: {}
---
# ui-core: a confirmation names its cancel act

## Goal
Stead asks once when an edited form is left: "Discard the edit", destructive, or "Keep editing" (design/07-interface.md "Forms"; github.com/fcalell/stead, packages/server/src/app/routes/system/-components/edit-text.tsx).

## Approach
`Confirmation` is `{ title, sentence, act, confirmName? }` (descriptors.ts): its cancel act always reads the words' "Cancel", so a confirm whose way out is "Keep editing" cannot say so.

## Shape
`Confirmation.cancel?: string` in `descriptors.ts`: the way out's label, the `cancel` word unless given. The web and phone `ConfirmSheet` draw `{ label: entry.cancel ?? words.cancel, onAct: dismiss }`; Escape, the scrim and the sheet's close stay the same dismissal.
The label cannot be derived ("Keep editing", "Keep the draft", "Stay" are the decision's own), and it needs no `onAct` or `destructive`, so a `cancel: ConfirmAct` is rejected. No new word, component or pin. The touch pair of acts is checked with two labels of about 13 characters at 320 px. Stack owning "leaving an edited form asks once" is filed as story 86.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
