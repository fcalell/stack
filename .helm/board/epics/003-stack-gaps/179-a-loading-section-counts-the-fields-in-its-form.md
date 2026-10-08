---
id: 003-179
status: backlog
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
- [ ] Its shape (the walker reading through a `Form`, the `Form` taking the Section's loading itself, or another): the stack session decides.
