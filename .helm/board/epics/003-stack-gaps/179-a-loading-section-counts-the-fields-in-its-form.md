---
id: 003-179
status: todo
sessions: {}
---
# react-ui: a loading Section counts the fields in its Form

## Goal
Stead's repo settings hold one form among their sections, `Section > Form`, as the rules ask: a Commands section whose `Form` holds four `FormField`s and its `ActionBar` (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/commands.tsx`, `Commands` at line 108). While the repo reads, the section must wait as it will stand: four skeleton fields. Today the app keeps a second, waiting copy of the section, `CommandsWaiting` (same file, line 186), whose `FormField`s stand as the `Section`'s direct children with no `Form`, so the Section counts them. The waiting and loaded sections are two shapes of one body, and the app's comment there names this gap.

## Approach
A loading `Section` reads its body by the depth rule (`plugin-react-ui/src/ui/lib/section.ts`, `sectionPartsOf`): direct children, a direct `Group`'s children and a direct `QueryBoundary`'s props. A `Form` is none of the known kinds, so its fields are never counted; the body counts as "any other body" and `sectionState` (`ui-core/src/list-state.ts`) stands `FALLBACK_FIELDS`, three skeleton fields, under a four-field form. The rules make `Section > Form` the shape of one form among sections (story 003-107), so the most common form body is the one the Section cannot count. 003-131 taught the Section to read a `Prose`, `Thread`, `Code`, `Meter` or `Slider` body; it left fields inside a `Form` as they were. The app cannot count them for the Section: `Section` takes no field count, and wrapping or copying the walker is a local copy of a stack module. Seen at stack `74a0e3d`.

## Acceptance criteria
- [ ] A loading `Section` whose body is a `Form` stands one skeleton field per `FormField` the `Form` holds, and its `ActionBar`'s waiting form, at the loaded section's height.
- [ ] A loading `Section` holding fields directly, a `Group` or a `List` is unchanged.
- [ ] The Section showcase holds a loading `Section > Form` beside the loaded one, and the critique measures both heights.

## Open questions
- [x] Its shape (the walker reading through a `Form`, the `Form` taking the Section's loading itself, or another): the stack session decides.

## Ruled
The Form waits for itself; the Section's walker does not read through a Form (counting its fields would hide the body and with it the `ActionBar`'s waiting form). `Form` reads `LoadingContext` and stands one skeleton field per `FormField` (through fragments), the field kept mounted hidden; `Section`'s `KINDS.forms` gains `Form`, so a loading `Section > Form` counts no skeleton fields and shows its body. The skeleton field markup is one `lib/field-wait.tsx` per platform, shared by `Section` and `Form`. No new prop or token. Latent, out of scope: fields plus an `ActionBar` as direct Section children still hide the bar's waiting form.

## Built
`Form` (react-ui and native-ui `components/form/index.tsx`) reads `LoadingContext` and stands a skeleton field per `FormField` (through fragments), the field kept mounted in a hidden wrapper; its `ActionBar` waits on its own through the same context. `Section`'s `KINDS.forms` gains `Form`. The skeleton field is `FieldWait` in a new `lib/field-wait.tsx` per platform (a subpath entry in each `package.json`, as every lib module is), used by `Section` and `Form`. Rules (both platforms), `ui-core.md` and the Section showcase frame (`Commands`, in the loading cell) follow.

Evidence: `behaviour/waiting.stories.tsx` holds `SectionOverItsForm` (+ Touch) and `SectionFormKeepsItsFields`. A loading `Section > Form` of four fields and a one-act bar measures 378 px loaded and 378 px waiting at 1200 px wide, 492 and 492 at 375 px touch. The waiting form holds five skeleton blocks (four fields, one bar) and no textbox or button, and a typed input is the same node after the wait. The scoped run (`--changed master`) passed 257 of 258, the one failure being a defect in the new story's own assertion (a hidden input is still in the DOM), fixed and rerun green (23/23); peak 3464 MiB. `pnpm check` turbo 45/45; the three `verify`s pass.

Limits: a field with a description, or a switch or checkbox field, is not measured (the Section's own skeleton field has the same limit). Fields plus an `ActionBar` as direct Section children still hide the bar's waiting form (out of scope).

## Open
- The height match is measured only for label-plus-control fields (378 px desktop, 492 px touch, loaded and waiting equal). A field with a description and a switch or checkbox field are not measured: the ruling left them to report.
- A loading `Group` or `List` body has no story of its own; only `SectionOverFields` reruns.
- Out of scope by the ruling, still a gap: fields plus an `ActionBar` as direct Section children (no Form) hide the bar's waiting form. The owner decides whether it is this story or another.
- The critique has not measured the frame; the native form is not rendered.
