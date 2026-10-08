---
id: 003-176
status: review
sessions: {}
---
# showcase: the Slider Thumb story waits for the thumb

## Goal
`Behaviour/Slider` `Thumb`'s play threw on load: `getByRole("slider", { name: "Timeout" })` ran before the thumb input existed and the roles list held only `group "Timeout"` (critique `fields/report.md`, pre-existing, `slider.stories.tsx:32`).

## Approach
The play finds the thumb with `findByRole`, which waits for it.

## Acceptance criteria
- [x] `Behaviour/Slider` `Thumb` passes with no console error on load.

## Built
`apps/showcase/behaviour/slider.stories.tsx`: `const thumb = await canvas.findByRole("slider", { name: "Timeout" })`. Evidence: the `Behaviour/Slider` story file passes in the browser run.
