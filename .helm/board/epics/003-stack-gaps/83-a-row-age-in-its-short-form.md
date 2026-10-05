---
id: 003-83
status: backlog
sessions: {}
---
# react-ui: a row's trailing age in its short form

## Goal
Stead's Now rows end in their age, and design/07-interface.md words it short ("2 min", "2 h"); at 375 px the long form ("16 seconds ago") cuts the row's title to two or three letters (github.com/fcalell/stead, packages/server/src/app/routes/_now/-components/now-list.tsx).

## Approach
`age()` in lib/age.ts gives only the long form, and ListRow keeps its trailing age whole while the title yields. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
