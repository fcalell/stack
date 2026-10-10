---
id: 003-301
status: backlog
sessions: {}
---
# react-ui: an icon act names itself in a tooltip

## Goal
Stead's icon-only acts show nothing but the glyph: Start over (`packages/server/src/app/routes/system/-components/add-repo.tsx:115`), Run now (`commands.tsx:101-104`), a Place's `actions`, and the canvas's zoom stack. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "buttons with only icons and no text need a tooltip", and "toolbar should have tooltips" on the workflow canvas.

## Approach
`IconButtonBase` and `IconButtonLink` set only `aria-label` (`plugins/react-ui/src/ui/components/icon-button/base.tsx:47,75`); the canvas's `ZoomStack` builds on them (`canvas/zoom.tsx:22-66`). The roster has no tooltip. The canvas glyph's native `title` (006-05) is the only precedent. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] Every icon act shows its label on hover and on keyboard focus, after a short delay, and hides on Escape.
- [ ] Touch draws none (the label stays the accessible name).
- [ ] The zoom stack and a Place's icon actions get it with no app change.

## Open questions
- [ ] Its shape (a Tooltip part the IconButton uses): the stack session decides.
