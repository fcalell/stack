---
id: 003-65
status: backlog
sessions: {}
---
# react-ui: label and value rows from data

## Goal
Stead draws label and value rows from data: a relay's provenance chain, Add a repo's host-key fingerprints with copy, the question sheet's answers with a Change act (github.com/fcalell/stead, packages/server/src/app).

## Approach
`List` maps its items to `row` (ListRow), `file` (FileRow) or `meter` (Meter) only. A `.map` of DefinitionRows inside a Group draws no waiting, failed or empty form.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
