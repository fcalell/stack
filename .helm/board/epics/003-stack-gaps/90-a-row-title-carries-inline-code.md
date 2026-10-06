---
id: 003-90
status: backlog
sessions: {}
---
# ui-core: a row title carries inline code

## Goal
Stead's criteria name flags and paths in inline code ("`--strict` turns strict mode on.") in the review's Criteria rows and the Brief item (github.com/fcalell/stead, packages/server/src/app/ui/review.tsx). The app now drops the backticks, so the code reads as plain text while Concerns, drawn by Prose, shows it as code.

## Approach
A ListRow title takes `string | Quoted` only; nothing marks a span as code. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
