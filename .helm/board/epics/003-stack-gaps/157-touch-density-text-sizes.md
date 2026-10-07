---
id: 003-157
status: backlog
sessions: {}
---
# ui-core: the touch density keeps a screen to six text sizes

## Goal
Stead's repo screens at 390 and 320 px draw seven text sizes (16/400, 16/500, 22/600, 15/400, 18/600, 14/400, 14/500, shell included) where the desktop draws six at every width (github.com/fcalell/stead, System repos; design/07-interface.md). The touch scale puts the 22/600 title, the 18/600 section title and the 15/400 meta apart without a step between them. Evidence: System repos critique unit u9, measured at 390 and 320 (Stead 948b7ec, stack 5564217).

## Approach
The roles an app uses (title, heading, body, meta, label) are all stack's; the touch density sets each its own size, and the screens use only roles, so the seventh size comes from the density table and not from the app. Not a workaround to fix in the app.

## Acceptance criteria
- [ ] A screen of the standard parts at touch density draws no more sizes than at desktop density (six), or the table names why a role differs.
- [ ] The type-scale page lists both densities' sizes and the critique counts them at 390.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
