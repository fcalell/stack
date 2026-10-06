---
id: 003-99
status: backlog
sessions: {}
---
# react-ui: a desktop Sheet's head has even room and one height

## Goal
On desktop the Sheet head draws its title ~14 px from the top edge with the subtitle tight under it, and its height changes with its content: 70 px with a subtitle (`sheet-1440-light`, `review-evidence-1440-light`) against 56 px with none (`new-thread-code-1440-light`), so the body's first field jumps between sheets. Stead: the question sheet and `routes/chats/-components/new-thread.tsx`.

## Approach
`SHEET_HEAD` = `gap-pair px-card py-pair border-b border-edge` (variants.ts) with the row's height set by the 44 px acts; a head with a subtitle stacks it inside that height, one without leaves the row at the act height. Story 91 is the touch head's title width only.

## Acceptance criteria
- [ ] The head's title and subtitle have even room above and below, desktop.
- [ ] The head's height is the same with or without a subtitle or back act.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
