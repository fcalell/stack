---
id: 003-293
status: review
sessions: {}
---
# react-ui, native-ui: every field kind waits at its loaded height

## Goal
003-179 matched a waiting field to its loaded height for a plain, a described, a switch and a checkbox field (`FieldWait` reads the field's shape through `fieldWaitOf`). A field holding a `Slider`, `Select`, `OptionList` or `SegmentedControl`, and an answered (folded) field, still wait as the plain label-over-box field and are not measured, so a loading Section over them changes height on load.

## Acceptance criteria
- [ ] A loading Section (and a `Section > Form`) over a field of each kind left stands at the loaded height, at the desktop density and at 375 touch, on both platforms. (Stories written for the web, awaiting the batch browser run; native unrendered.)
- [x] The kinds 003-179 matched are unchanged. (Their branches of `FieldWait` and `fieldWaitOf` are untouched.)

## Owner ruling
`FieldWait` stands each kind's own form; no prop. `FieldShape` widens to `holds: "field" | "switch" | "checkbox" | "slider" | "options" | "segments" | "folded"`, plus `options?: { rows: number[]; described: boolean; grouped: boolean }`. `fieldWaitOf` reads the shape off the element before data; `answered` outranks the control. A Select's trigger keeps the plain waiting field, only measured. A Slider labels itself and waits as `SliderWait` in the `formField` stack, with a description bar under it. An OptionList waits as the label bar over the list's own card of waiting rows, the Wait moved to `lib/option-wait.tsx` per platform: a static list one row per option (two-line when any option has a description) with a group-label bar per group, a query list its four rows from the `option` map's slots. A SegmentedControl waits as the label bar over a `skeleton({ kind: "bar" })` at `min-h-control-compact`, `w-1/2`. A folded field waits as one `FORM_FIELD_SUMMARY` row: an `icon` skeleton, a `w-1/4` label bar, a growing `w-1/2` answer bar and a trailing `icon` skeleton. Switch, checkbox, field and the described forms are untouched. Tests extend `SectionOverEachKindOfField` and `SectionOverItsFormOfEachKind` with one field per new kind. Known limit: an OptionList's `children` under a chosen option are unknown before data and are not counted.

## Ruled
- `options.rows` is one count per group (one entry when ungrouped); `optionsWaitOf` in `ui-core` reads it off an OptionList's props, with `OPTION_WAIT_ROWS` (4) for a query list.
- The waiting rows draw the check mark for a radio list too: `FieldShape` carries no one-or-several flag, and the two marks are the same size.
- `SliderWait` moved to `lib/slider-wait.tsx` too (a lib file imports no component); it stands on the list ground inside `FieldWait`, so a Group item inset is not drawn twice.
- The folded row's trailing skeleton stands in a `control-compact` box, the Edit act's size, so the row's width matches as well as its height.

## Built
`FieldShape.holds` and `OptionsWait`, `OPTION_WAIT_ROWS` and `optionsWaitOf` (`packages/ui-core/src/list-state.ts`, tested in `test/option-list.test.ts`). Both platforms: `lib/option-wait.tsx` (the OptionList's Wait, now `OptionWait` with `rows`), `lib/slider-wait.tsx` (moved from `components/slider/wait.tsx`), `lib/field-wait.tsx` (the slider, options, segments and folded forms), `components/form-field/index.tsx` (`formOf` tells an option list from segments; `fieldWaitOf` returns the new shapes, `answered` first), `components/option-list/index.tsx` and `components/slider/index.tsx` (import the moved files). Rules text in both guides and `ui-core.md`. Stories: `KINDS` in `apps/showcase/behaviour/waiting.stories.tsx` gains a select, a slider (plain and described), radio lists (flat, described, grouped, from a query), segments and an answered field, so `SectionOverEachKindOfField` and `SectionOverItsFormOfEachKind` (and their `Touch` forms) compare each against its loaded height; the Form story counts the top-level waiting forms. Written and type-checked, not run (the batch browser run measures them). Native unrendered: the phone forms follow the web's with Yoga classes (a strut in each text line), unchecked on a device.

Browser run (web): `behaviour/waiting.stories.tsx` 33 of 33 pass, with the Touch forms of the field-kind stories. The run found two causes. A one-line option row waited at `min-h-row` while the loaded row is its line and the pair padding (34 px under the desktop floor of 003-297), so `OptionWait` now stands `whole` with `min-h-row` as the loaded row does (web and native). The query option list waits as four rows, so the test's loaded query now holds four scopes. The first box stays unticked until the native forms are checked on a device.
