---
id: 003-301
status: review
sessions: {}
---
# react-ui: an icon act names itself in a tooltip

## Goal
Stead's icon-only acts show nothing but the glyph: Start over (`packages/server/src/app/routes/system/-components/add-repo.tsx:115`), Run now (`commands.tsx:101-104`), a Place's `actions`, and the canvas's zoom stack. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "buttons with only icons and no text need a tooltip", and "toolbar should have tooltips" on the workflow canvas.

## Approach
`IconButtonBase` and `IconButtonLink` set only `aria-label` (`plugins/react-ui/src/ui/components/icon-button/base.tsx:47,75`); the canvas's `ZoomStack` builds on them (`canvas/zoom.tsx:22-66`). The roster has no tooltip. The canvas glyph's native `title` (006-05) is the only precedent. Seen at stack `226f48c`.

## Acceptance criteria
- [x] Every icon act shows its label on hover and on keyboard focus, after a short delay, and hides on Escape.
- [x] Touch draws none (the label stays the accessible name).
- [x] The zoom stack and a Place's icon actions get it with no app change.

## Open questions
- [x] Its shape (a Tooltip part the IconButton uses): the stack session decides.

## Ruled
No new part and no prop: `IconButtonBase` and `IconButtonLink` (every icon act, popup triggers and the canvas zoom stack among them) wrap themselves in a Base UI `Tooltip` showing `label`, so the public surface does not grow and every place that renders an icon act gets it. The look is `TOOLTIP` in the contract (the popover's ground and hairline round one line of meta ink, `max-w-measure-short`), held by the `IconButton` roster entry. Hover opens after 500 ms (Base UI's `delay`, per trigger); touch passes `disabled` to the tooltip (`useTouch`). Because the tooltip's trigger also sets `data-popup-open`, the icon act's pressed-while-open look now reads `aria-expanded` (menu, picker and sheet triggers set it). The tooltip is portaled into the frame's popup layer (`PortalContainer`) on `--layer-popover`, above a sheet and below the toasts. Native has no tooltip: touch draws none.

Open: Base UI opens a tooltip on keyboard focus at once (the delay applies to hover), so the "after a short delay" of the first box holds for the pointer only. A delay on focus would need a controlled tooltip; flagged, not built.

## Built
`plugins/react-ui/src/ui/components/icon-button/base.tsx` (`Named`), `TOOLTIP` in `packages/ui-core/src/variants.ts`, the `IconButton` roster entry (`draws`, `holds`, `owns`) in `roster.ts`, `DESIGN.md` regenerated, the overlay allowlist (`aria-expanded:` for the pressed look). Rules text in `plugins/react-ui/guide/rules.md` and `ui-core.md`. Stories `apps/showcase/behaviour/tooltip.stories.tsx` (`Rest`, `Focus`) cover hover after the delay, Escape, keyboard focus and a menu trigger's tooltip leaving as the menu opens; written, type-check, not run. Touch is not asserted in a story (no coarse-pointer harness in the behaviour stories). Escape inside a sheet may close the sheet as well as the tooltip; unmeasured.
- Browser run: `tooltip.stories.tsx` (`Rest`, `Focus`) pass. The open question is answered: Escape inside a sheet did not close it, because a dialog hands its first act (Close) focus and the focus tooltip took the first Escape (Base UI blocks the dialog's dismiss while a child tooltip is open). `Named` now cancels a `trigger-focus` open whose focus a dialog handed (the focus did not come from inside the dialog); Tab within the dialog still shows the name. `sheet.stories.tsx` `Modal` holds it.
