---
id: 003-296
status: review
sessions: {}
---
# ui-core: a Section's body parts stand apart wider than its head's pair

## Goal
On the desktop Stead's sections read as one dense run: in Add a repo the Prose, the Code and the ActionBar stand 6 px apart, the same gap as a section's title over its description (`packages/server/src/app/routes/system/-components/add-repo.tsx:157-170`). Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "sections and child's spacings should be more clear and differentiated, but not on all components".

## Approach
A page Section uses one `gap-pair` cell between its head and body and between every part of its body, on purpose ("the same cell spaces the section … and its body", `packages/ui-core/src/variant-tables.ts:1185-1199`, used at `plugins/react-ui/src/ui/components/section/index.tsx:205,269`); desktop pair is 1.5 (`packages/ui-core/src/tokens.ts:804-817`). Seen at stack `226f48c`.

## Acceptance criteria
- [x] A Section's head stays paired to its body; the parts of its body (a Prose, a Code, a Group, an ActionBar) stand at a wider gap, such as `fields`.
- [x] Rows inside a Group keep their tight spacing.
- [ ] The critique measures the rhythm on a page and in a Split's main at 1280 and 1440 (awaits the critique; the story `BodyPartsStandApart` is written, awaits the batch run).

## Open questions
- [x] Its shape: the stack session decides.

## Ruled
The body's parts stand the `fields` step apart on every Section, not only in a Form: one contract constant, `SECTION_BODY` (`gap-fields`), drawn by the body panel on both platforms, where `SECTION.in` keeps only the head-to-body step (`pair` on a page, `fields` in a Form). So a Form's Section is unchanged. A Group's rows are the Group's own, unchanged; a Section holding one List, Table or Group draws no part gap at all. A skeleton body's fields stand at the same step.

## Built
`SECTION_BODY` in `packages/ui-core/src/variants.ts` (roster `draws` and `holds`), the `SECTION` comment in `variant-tables.ts`, `DESIGN.md` regenerated; `plugins/react-ui/src/ui/components/section/index.tsx` and `plugins/native-ui/src/ui/components/section/index.tsx` (panel and the body's inner wrapper); `ui-core.md`. Story `BodyPartsStandApart` (`apps/showcase/behaviour/section-body.stories.tsx`) reads the root's row gap as `pair` and the body panel's as `fields`; written, not run.
Native unrendered: the same gap on the body `View`s, unchecked on a device.

