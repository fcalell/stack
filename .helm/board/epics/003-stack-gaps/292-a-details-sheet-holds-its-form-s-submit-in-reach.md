---
id: 003-292
status: backlog
sessions: {}
---
# native-ui: a Details sheet holds its form's submit in reach

## Goal
003-200 keeps a long form's submit in reach in a Split pane on the web (a sticky foot in the pane). On the phone the same pane opens as the Split's Details sheet, and a long form there scrolls its `ActionBar` out of reach: React Native has no sticky, so the web shape does not carry. The operator scrolls to the end to save.

## Acceptance criteria
- [ ] A long `Form` in a Split's Details sheet on the phone keeps its submit in reach while its fields scroll, at 375 and 390, light and dark.
- [ ] A short form in the sheet is unchanged.

## Open questions
- [ ] Its shape (the sheet's own pinned foot, as a docked sheet's, or another): the stack session decides; a narrowing goes to the owner before the build.
