---
id: 003-300
status: review
sessions: {}
---
# react-ui: opening a Picker or Select moves nothing on the page

## Goal
In Stead's System, Repos, opening "Sensitive above" (a `Picker fit="row"`, `packages/server/src/app/routes/system/-components/repos.tsx:300-312`) shifts the whole page briefly, and so do similar parts. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10).

## Approach
Likely cause, not yet measured in a browser: the Picker's desktop list is a Base UI `Select.Root` left at its default `modal` (`plugins/react-ui/src/ui/components/picker/base.tsx:619`; `select/index.tsx:82` the same), whose scroll lock changes overflow and the scrollbar gutter on the root. `Menu` passes `modal={false}` (`menu/base.tsx:185`) and does not shift. Seen at stack `226f48c`.

## Acceptance criteria
- [x] Opening and closing a Picker, a Select and every popup in the roster shifts no layout (a layout-shift measurement in the behaviour stories, with a scrollbar present).

## Open questions
- [x] Its shape: the stack session decides.

## Ruled
Base UI's `Select.Root` defaults to `modal` (page scroll locked, outside pointer events off), whose lock sets the root's overflow and scrollbar gutter; the Picker's desktop list and the `Select` now pass `modal={false}`, as `Menu` does, with the `Combobox` (a searchable Picker) naming `modal={false}` too although it is the default. A sheet is a Dialog and stays modal by design (a Picker's touch form opens a sheet). Nothing else in the roster opens a popup over the page.

## Built
`plugins/react-ui/src/ui/components/picker/base.tsx` (`Select.Root`, `Combobox.Root`), `select/index.tsx`. `ui-core.md` says no roster popup locks the page. Story `apps/showcase/behaviour/popups.stories.tsx` (`Opens`): a page 250vh tall, opens and closes a Picker, a Select and a Menu and asserts the root's width, gutter and overflow styles and each control's box unchanged (layout shift 0); written, type-checks, not run. The cause is unmeasured in a browser: the fix follows the Base UI lock's source (gutter and overflow set on the root), so the batch run is the proof. Picker changes are the `modal` prop only; focus return for a Sheet opened from a Picker act (003-212) is untouched.
- Browser run: `popups.stories.tsx` `Opens` passes (the layout shift is 0). The first run failed on axe, not layout: the story's bare `Select` had no name; it now stands in a `Field.Root` with a label, as `select.stories.tsx` does.
