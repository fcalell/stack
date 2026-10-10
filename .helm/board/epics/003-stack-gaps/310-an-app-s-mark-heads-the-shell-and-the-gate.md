---
id: 003-310
status: backlog
sessions: {}
---
# react-ui: an app's mark heads the Shell's sidebar and the Gate, and is its icon

## Goal
Stead has no logo, and stack has nowhere to put one. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "need a logo". Stead's `design/07-interface.md` now has the mark (a logo beside the word "Stead") head the desktop sidebar and the `Gate`, and the logo be the page's icon; Stead draws the logo.

## Approach
`Shell` takes places, banner, switcher and children (`plugins/react-ui/src/ui/components/shell/index.tsx:67-73`), no brand; the `Gate`'s mark is text; the react plugin's config (`react({ title })`) takes no icon, so no favicon is emitted. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] The Shell's desktop sidebar heads with the app's mark when one is given, and is unchanged when not.
- [ ] The Gate draws the mark in place of its text mark when one is given.
- [ ] The react plugin's config takes an icon (an SVG) and the page links it as its favicon, with a dark-mode form when given.

## Open questions
- [ ] Its shape (one `mark` passed to the Shell and the Gate, or a config the plugin carries to both): the stack session decides.
