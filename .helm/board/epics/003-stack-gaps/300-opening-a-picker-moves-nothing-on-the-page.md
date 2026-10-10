---
id: 003-300
status: backlog
sessions: {}
---
# react-ui: opening a Picker or Select moves nothing on the page

## Goal
In Stead's System, Repos, opening "Sensitive above" (a `Picker fit="row"`, `packages/server/src/app/routes/system/-components/repos.tsx:300-312`) shifts the whole page briefly, and so do similar parts. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10).

## Approach
Likely cause, not yet measured in a browser: the Picker's desktop list is a Base UI `Select.Root` left at its default `modal` (`plugins/react-ui/src/ui/components/picker/base.tsx:619`; `select/index.tsx:82` the same), whose scroll lock changes overflow and the scrollbar gutter on the root. `Menu` passes `modal={false}` (`menu/base.tsx:185`) and does not shift. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] Opening and closing a Picker, a Select and every popup in the roster shifts no layout (a layout-shift measurement in the behaviour stories, with a scrollbar present).

## Open questions
- [ ] Its shape: the stack session decides.
