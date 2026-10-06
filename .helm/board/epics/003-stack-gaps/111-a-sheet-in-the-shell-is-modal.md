---
id: 003-111
status: backlog
sessions: {}
---
# react-ui: a Sheet opened inside the Shell or a Gate is modal

## Goal
A Sheet or a `confirm()` decision opened in a running app leaves the page behind it in the accessibility tree and takes no focus trap: the rubric's floor says the page behind a modal is hidden from assistive tech. `apps/showcase/behaviour/sheet.stories.tsx` `Decision` (a `confirm()` in a `Gate`) fails on it; the same Sheet outside a host (`Modal`) passes.

## Approach
`SheetBase` passes `modal={container === undefined}` and `disablePointerDismissal={container !== undefined}` to Base UI's `Dialog.Root` (sheet/base.tsx), a switch meant for a showcase frame that holds a sheet beside others. `FrameHost` (shell/host.tsx) also provides a `PortalContainer` (the popup layer in `main`), so every sheet in the Shell or a Gate takes the frame's branch: Base UI's `markOthers` then sets no `aria-hidden` on the page (only `data-base-ui-inert`), the scrim's press does not dismiss and focus is not trapped (Base UI Dialog `modal`: `false` leaves the rest of the document interactive). Tell a frame that scopes its own mode from a host that only places the popup.

## Acceptance criteria
- [ ] A Sheet and a `confirm()` decision opened in the Shell or a Gate hide the page behind them from assistive tech (`aria-hidden` or `inert`), trap focus, and a press on the scrim dismisses.
- [ ] The showcase frames still hold sheets beside each other.
- [ ] `Decision` in `apps/showcase/behaviour/sheet.stories.tsx` passes.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
