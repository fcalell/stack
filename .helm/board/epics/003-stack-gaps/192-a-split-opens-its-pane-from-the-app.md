---
id: 003-192
status: review
sessions: {}
---
# react-ui: a Split opens its pane from the app below wide

## Goal
design/07-interface.md "### A workflow: the canvas", Interactions: "A tap on a node selects it and opens its sheet", the sheet standing in the pane from `wide` and as a side sheet below it. Stead (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/canvas.tsx:406` selects on `onSelect` and `:444-451` hands the node's sheet to `Split` as `pane`) selects on a tap at every width, but below `wide` the pane opens only from the Details act the Place draws. It costs Stead a second step on the phone and a tablet: tap a node, then find Details, where the spec opens the sheet at the tap.

## Approach
`SplitProps` (`plugin-react-ui/src/ui/components/split/index.tsx:69-82`) has `list`, `main`, `beside`, `pane`, `empty` and `back`. The sheet's open state is `useState(false)` inside `Split` (`:101`), set only through `SheetBase`'s `onOpen` from the Details act (`:186-188`); `pane` below `wide` is `page-max-wide:hidden` (`PANE`, `:61`) and nothing opens the sheet from outside. Things tried:
- Keying the `pane` or the `Split` on the selection remounts the Split and resets the open state to closed; it does not open it.
- Rendering the node sheet as an app-owned `Sheet` below `wide` and as the `pane` above it duplicates the sheet and the width test the Split already makes, and loses the Details act's handle (`DetailsSheet` in `lib/frame.ts`, not exported to apps).
- Stead cannot click the Details act programmatically without a host query on the roster's DOM.

## Acceptance criteria
- [x] A Split can be told to open its pane: below `wide` the pane stands as its side sheet when the app asks, and closing it (its close act, Escape, the scrim) is heard by the app, so the app's selection can clear; from `wide` the pane stands beside the main as today.
- [x] The Details act stands and works as today, and agrees with the app's state.
- [x] A Split that never asks is unchanged.
- [ ] The Split showcase holds a pane opened by the app below `wide` (375 and 768 px) and its close, measured by the critique.

## Open questions
- [x] Its shape (`open` and `onClose` props, a handle the app holds, or the pane opening whenever it changes from `undefined`): the stack session decides.

## Ruled
`open` and `onClose` on `SplitProps`, a typed pair (`{ open?: undefined; onClose?: undefined } | { open: boolean; onClose: () => void }`). The sheet is open when the pane exists and either the Details act (local state) or `open` asks; every close sets local state false and calls `onClose`. On the web `open` applies only where the pane is a sheet: always beside a `beside` record, else while the pane's `aside` is not displayed (a `ResizeObserver` reads its width at 0), so from `wide` it draws no sheet. Native is always the sheet, so `open` applies at once. Not a handle, and not "opens when `pane` changes".

## Built
- `plugins/react-ui/src/ui/components/split/index.tsx`: the pair, `useUndisplayed(paneNode)`, `asked = open === true && (besides || stacked)`, `onClose` called on every close.
- `plugins/native-ui/src/ui/components/split/index.tsx`: the same pair; the sheet opens on `open || asked`, `onClose` heard beside the page-held `setOpen(false)`.
- `packages/ui-core/src/roster.ts` (Split props), both `rules.md`, `ui-core.md`.
- `apps/showcase/behaviour/split.stories.tsx`: `AppOpensPane375`, `AppOpensPane768`, `AppOpensPaneFromWide`, `AppOpensPaneBesideARecord`, `PaneStaysClosedUnasked`.
- Evidence: scoped stories run 105 files, 405 tests passed; `pnpm check` turbo part, ui-core, react-ui and native-ui `verify` pass.

## Open
- The last acceptance box (the Split showcase's app-opened pane at 375 and 768 and its close, measured by the critique) waits on a design critique run by a session that played no part in the work. The stories assert the sheet's box (bottom sheet full width at the bottom edge at 375, side sheet at the viewport's end at 768), the close counts and the no-sheet case from `wide`.

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone.

## Browser run
`AppOpensPane375/768/FromWide/BesideARecord` and `PaneStaysClosedUnasked` pass. `AppOpensPane768` first failed: the reopened side sheet's focused Close act showed its 003-301 tooltip and the tooltip took the Escape, leaving the sheet open (a keyboard user would have needed two presses). Fixed in code: `Named` in `icon-button/base.tsx` lets an Escape that hides the tooltip propagate (`allowPropagation`), so the sheet closes on the one press; the tooltip stories still pass.
