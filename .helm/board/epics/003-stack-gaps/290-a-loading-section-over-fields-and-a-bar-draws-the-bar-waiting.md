---
id: 003-290
status: todo
sessions: {}
---
# react-ui, native-ui: a loading Section over fields and an ActionBar draws the bar waiting

## Goal
A `Section` whose direct children are `FormField`s and an `ActionBar` (no `Form`) counts the fields, and `sectionState` hides the body whenever its field count is above zero, so the bar's waiting form never draws: the section waits as fields alone and grows by the bar's height on load. 003-179 made a `Section > Form` wait as its own skeleton fields and bar; this is the same body without the `Form`.

## Acceptance criteria
- [ ] A loading `Section` holding `FormField`s and an `ActionBar` as direct children stands one skeleton field per field and the bar's waiting form, at the loaded section's height, on both platforms.
- [ ] A loading `Section` of fields alone, a `Form`, a `Group` or a `List` is unchanged.
- [ ] The Section showcase holds the form loading beside loaded, measured by the critique.

## Open questions
- [ ] Its shape (the Section drawing a direct bar's waiting form after the skeleton fields, or another): the stack session decides; a narrowing goes to the owner before the build.
