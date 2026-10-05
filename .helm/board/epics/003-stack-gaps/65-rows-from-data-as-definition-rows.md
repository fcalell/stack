---
id: 003-65
status: review
sessions: {}
---
# react-ui: label and value rows from data

## Goal
Stead draws label and value rows from data: a relay's provenance chain, Add a repo's host-key fingerprints with copy, the question sheet's answers with a Change act (github.com/fcalell/stead, packages/server/src/app).

## Approach
`List` maps its items to `row` (ListRow), `file` (FileRow) or `meter` (Meter) only. A `.map` of DefinitionRows inside a Group draws no waiting, failed or empty form.

## Shape
`List` gains a fourth item map `definition: DefinitionSlots<T>` (exclusive with `row`, `file` and `meter`): `key`, `label`, `value?`, `change?`, `copyable?` (list-wide, so the waiting rows reserve the act square) and the locked union of `DefinitionRowProps` (`description`, `act`, `href`, `onOpen`, or `locked`).
ui-core `list-state.ts` gains `definitionShape(slots)` (change lane, description line, end: none, act or chevron), read by key as `rowShape` and `meterShape` are; `DefinitionValue` moves to `descriptors.ts`.
Waiting is a new internal `definition-row/wait.tsx` per platform: `SKELETON_ROW.kind.one-line-group` (a label bar and an end-aligned value bar), or `setting` when a description is declared. `Group`'s inline setting skeleton becomes this same wait. Failed, missing and empty come from the List's card.
The list stands in a Group and adds no count to a Section's head. `DefinitionRow` itself is unchanged; the rules forbid a `.map` of `DefinitionRow`s. The value bar's position and width is the one new look. Both platforms; land before 66.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
