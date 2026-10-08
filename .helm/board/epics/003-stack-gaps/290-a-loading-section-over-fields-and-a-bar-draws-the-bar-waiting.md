---
id: 003-290
status: review
sessions: {}
---
# react-ui, native-ui: a loading Section over fields and an ActionBar draws the bar waiting

## Goal
A `Section` whose direct children are `FormField`s and an `ActionBar` (no `Form`) counts the fields, and `sectionState` hides the body whenever its field count is above zero, so the bar's waiting form never draws: the section waits as fields alone and grows by the bar's height on load. 003-179 made a `Section > Form` wait as its own skeleton fields and bar; this is the same body without the `Form`.

## Acceptance criteria
- [ ] A loading `Section` holding `FormField`s and an `ActionBar` as direct children stands one skeleton field per field and the bar's waiting form, at the loaded section's height, on both platforms.
- [x] A loading `Section` of fields alone, a `Form`, a `Group` or a `List` is unchanged.
- [ ] The Section showcase holds the form loading beside loaded, measured by the critique.

## Open questions
- [x] Its shape (the Section drawing a direct bar's waiting form after the skeleton fields, or another): the stack session decides; a narrowing goes to the owner before the build.

## Ruled
The Section draws a direct bar's waiting form after the skeleton fields; no `Form` is needed and `sectionState` is unchanged. Scope is `ActionBar` only; a Meter, Slider or Prose beside fields is the same latent shape and is not widened.

## Built
`liftBars` (`lib/field-wait.tsx`, both platforms) walks a body's children through fragments and, while the Section stands skeleton fields (`fields > 0`), takes each direct `ActionBar` out of the hidden wrapper, leaving a null at its place so the other children keep their keys and their typed text. `Section` (both platforms) renders those bars after the skeleton fields under `LoadingContext`, where the bar draws its own waiting form. Loaded, `fields === 0` and the bar stands in its children's order, mounted anew. Rules (both), `ui-core.md` and the Section showcase (`Profile` frame, loaded and loading) follow.

Evidence: `behaviour/waiting.stories.tsx` holds `SectionOverFieldsAndItsBar` (+ Touch): a loading `Section` of two `FormField`s and a one-act `ActionBar` stands within 1 px of the loaded Section's height at 1280 desktop and 375 touch, with `aria-busy` and no textbox or button in the waiting tree. `SectionOverFields` (fields alone), `SectionOverItsForm`, `SectionOverAGroup` and `SectionOverAList` still pass. The scoped run (`--changed master`) passed 308 of 308 (66 files), peak 4194 MiB. `pnpm check` turbo 45/45; the react-ui, native-ui and ui-core `verify`s pass.

The first criterion is measured on the web; the native twin has no render run here and waits on the critique, as does the showcase measure.
