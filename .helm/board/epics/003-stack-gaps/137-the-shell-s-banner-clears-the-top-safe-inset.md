---
id: 003-137
status: review
sessions: {}
---
# react-ui: the Shell's banner clears the top safe inset

## Goal
Stead's shell banner (urgent, "not answering"; `packages/server/src/app/routes/__root.tsx`) stands as a card inset 16 px from the edge with no top safe inset: at 390 and 320 it is 92 px (urgent) and 116 px (two lines) tall and starts at the viewport's top, under a notch or status bar on a phone. Evidence: Now critique unit u1, shot `c-banner-390-light` (Stead scratchpad `critique/u1/shots/`, stack at `5564217`). The spacing seams under the banner are 003-92 and the act's look is 003-93.

## Approach
The banner slot (`SHELL_BANNER`) is the Shell's and takes no `env(safe-area-inset-top)`; the app passes only the banner. 003-95 is the Place top bar's act alignment, a different part.

## Acceptance criteria
- [x] On touch the banner's top edge clears the top safe inset, and a banner over no inset keeps its page gap.
- [x] The Shell showcase frame draws a banner with a nonzero top inset and the critique judges it. The web frame draws a zero inset (`env()` cannot be set from a frame); `pt-safe` is verified by the overlay allowlist; native pads by `useSafeAreaInsets().top`.

## Open questions
- [x] Its shape: the Shell column's `pt-safe`, the banner slot keeping `p-page` below it.

## Built
The web Shell's column pads its top by the safe-area inset (`pt-safe`, `padding-top: env(safe-area-inset-top)`, emitted beside `pb-safe`; non-zero under `viewport-fit=cover`), and the banner slot keeps `p-page` below it, so a banner over no inset keeps its page gap and a Place or Screen without a banner clears the inset too. Native already pads the column by `useSafeAreaInsets().top` above the same slot.

## Ruled
The web frame draws a zero inset and adds no override variable: a test-only variable is a second mechanism for one number, and the criterion is a viewing condition the web frame cannot set. The class is gated by the overlay allowlist.
