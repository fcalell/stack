---
id: 003-53
status: backlog
sessions: {}
---
# ui-core: a running row's leading spins

## Goal
The running stage in a step list spins, so it reads apart from an idle accent mark. The job view's Stages section; Now's Underway rows for a running job. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`ListRow`'s leading takes an icon, a status dot or an avatar; `Status` `active` draws a static accent dot; `Spinner` is no row leading. Stack 003-25 (a row's step list) and 003-26 (a rail of fixed states) are nearby and cover neither.

Reference: GitHub iOS's run spins its running step ([screen](https://mobbin.com/screens/a3086985-2b47-4048-af7e-81f6941cfab2)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
