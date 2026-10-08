---
id: 003-179
status: review
sessions: {}
---
# react-ui: a loading Section counts the fields in its Form

## Goal
Stead's repo settings hold one form among their sections, `Section > Form`, as the rules ask: a Commands section whose `Form` holds four `FormField`s and its `ActionBar` (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/commands.tsx`, `Commands` at line 108). While the repo reads, the section must wait as it will stand: four skeleton fields. Today the app keeps a second, waiting copy of the section, `CommandsWaiting` (same file, line 186), whose `FormField`s stand as the `Section`'s direct children with no `Form`, so the Section counts them. The waiting and loaded sections are two shapes of one body, and the app's comment there names this gap.

## Approach
A loading `Section` reads its body by the depth rule (`plugin-react-ui/src/ui/lib/section.ts`, `sectionPartsOf`): direct children, a direct `Group`'s children and a direct `QueryBoundary`'s props. A `Form` is none of the known kinds, so its fields are never counted; the body counts as "any other body" and `sectionState` (`ui-core/src/list-state.ts`) stands `FALLBACK_FIELDS`, three skeleton fields, under a four-field form. The rules make `Section > Form` the shape of one form among sections (story 003-107), so the most common form body is the one the Section cannot count. 003-131 taught the Section to read a `Prose`, `Thread`, `Code`, `Meter` or `Slider` body; it left fields inside a `Form` as they were. The app cannot count them for the Section: `Section` takes no field count, and wrapping or copying the walker is a local copy of a stack module. Seen at stack `74a0e3d`.

## Acceptance criteria
- [x] A loading `Section` whose body is a `Form` stands one skeleton field per `FormField` the `Form` holds, and its `ActionBar`'s waiting form, at the loaded section's height.
- [x] A loading `Section` holding fields directly, a `Group` or a `List` is unchanged.
- [ ] The Section showcase holds a loading `Section > Form` beside the loaded one, and the critique measures both heights.

## Open questions
- [x] Its shape (the walker reading through a `Form`, the `Form` taking the Section's loading itself, or another): the stack session decides.

## Ruled
The Form waits for itself; the Section's walker does not read through a Form (counting its fields would hide the body and with it the `ActionBar`'s waiting form). `Form` reads `LoadingContext` and stands one skeleton field per `FormField` (through fragments), the field kept mounted hidden; `Section`'s `KINDS.forms` gains `Form`, so a loading `Section > Form` counts no skeleton fields and shows its body. The skeleton field markup is one `lib/field-wait.tsx` per platform, shared by `Section` and `Form`. No new prop or token. Latent, out of scope: fields plus an `ActionBar` as direct Section children still hide the bar's waiting form.

## Built
`Form` (react-ui and native-ui `components/form/index.tsx`) reads `LoadingContext` and stands a skeleton field per `FormField` (through fragments), the field kept mounted in a hidden wrapper; its `ActionBar` waits on its own through the same context. `Section`'s `KINDS.forms` gains `Form`. The skeleton field is `FieldWait` in a new `lib/field-wait.tsx` per platform (a subpath entry in each `package.json`, as every lib module is), used by `Section` and `Form`. Rules (both platforms), `ui-core.md` and the Section showcase frame (`Commands`, in the loading cell) follow.

Evidence: `behaviour/waiting.stories.tsx` holds `SectionOverItsForm` (+ Touch) and `SectionFormKeepsItsFields`. A loading `Section > Form` of four fields and a one-act bar measures 378 px loaded and 378 px waiting at 1200 px wide, 492 and 492 at 375 px touch. The waiting form holds five skeleton blocks (four fields, one bar) and no textbox or button, and a typed input is the same node after the wait. The scoped run (`--changed master`) passed 257 of 258, the one failure being a defect in the new story's own assertion (a hidden input is still in the DOM), fixed and rerun green (23/23); peak 3464 MiB. `pnpm check` turbo 45/45; the three `verify`s pass.

Limits: a field of a `Slider`, `Select`, `OptionList` or `SegmentedControl` and an answered (folded) field wait as the label-over-box field and are not measured. Fields plus an `ActionBar` as direct Section children hide the bar's waiting form (003-290).

### Owner ruling built
`FieldWait` (`lib/field-wait.tsx`, both platforms) takes a `FieldShape` (`holds`: field, switch or checkbox; `described`; ui-core `list-state`) and stands the field's own form: a switch's hit box at the label block's end, a checkbox's box on the label's line, a meta bar under the label or the control for a `description`. `fieldWaitOf` in each `form-field` reads the shape off a `FormField` element; `Form` hands it its own fields and `Section` the elements its walker now returns (`fieldNodes`, beside the count `fields`).

Measured before the fix, a loading Section over one field against the loaded one, 1200 px wide: label over a plain field 90 and 90 (matched); with a description 114 loaded, 90 waiting; a switch 50 and 90; a switch with a description 64 and 90; a checkbox 46 and 90; a checkbox with a description 64 and 90. After it, all six match to the pixel at the desktop density and at 375 px touch, and the same six fields inside one `Form` stand at the loaded Section's height with six skeleton blocks and no button. `behaviour/waiting.stories.tsx` holds `SectionOverEachKindOfField`, `SectionOverItsFormOfEachKind`, `SectionOverAGroup` and `SectionOverAList`, each with a Touch twin. A loading `Section > Group` stands the Group's three rows with no skeleton field (loaded 3 rows, waiting 3, equal height); a loading `Section > List` stands the List's own four waiting rows (a List waits as four rows whatever its items will be, so the loaded body is four rows to match) with its count waiting. Scoped run over the Section, Form, FormField, form-leave, sheet, split, item-header, row-meta, text-area and waiting story files: 120 of 120 passed, peak 2620 MiB. `pnpm check` turbo 45/45; the three `verify`s pass. The native form is not rendered; the critique has not measured the frame.

## Owner ruling
The owner rules: fields plus an `ActionBar` as direct Section children (no Form) go to 003-290. To build here: the height match measured for a field with a description and for a switch and a checkbox field, and a loading `Group` and `List` body each with a story; a kind that does not match is fixed in `FieldWait`. Then the critique; the native form is not rendered.

## Owner ruling
Second ruling: the field kinds left (Slider, Select, OptionList, SegmentedControl, and folded fields) go to 003-293. 179 waits on the critique; the native form is not rendered.

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone.
