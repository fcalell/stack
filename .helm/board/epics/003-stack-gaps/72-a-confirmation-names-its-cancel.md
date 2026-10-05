---
id: 003-72
status: backlog
sessions: {}
---
# ui-core: a confirmation names its cancel act

## Goal
Stead asks once when an edited form is left: "Discard the edit", destructive, or "Keep editing" (design/07-interface.md "Forms"; github.com/fcalell/stead, packages/server/src/app/routes/system/-components/edit-text.tsx).

## Approach
`Confirmation` is `{ title, sentence, act, confirmName? }` (descriptors.ts): its cancel act always reads the words' "Cancel", so a confirm whose way out is "Keep editing" cannot say so.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
