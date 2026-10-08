---
id: 003-92
status: done
sessions: {}
---
# react-ui: the Shell's banner, sidebar and tab bar sit off the spacing rhythm

## Goal
Stead's app (`packages/server/src/app/routes/__root.tsx`) passes `Shell` its places and a `Banner` and nothing else, and three seams in the Shell draw wrong at every width:
- The banner slot (`SHELL_BANNER = "px-page pt-page"`) has no space under it, so the banner sits flush on the page header below (desktop: the strip touches the "Chats" header; touch: the header's act floats in a gap of its own between banner and title).
- The sidebar's places (`SHELL_PLACES = "gap-rows p-float"`) start against the top edge, with less room above the first row than the page column gives its header.
- The tab bar (`SHELL_TAB_BAR = "px-float …"`) has no top padding, so the glyphs sit against its top hairline, and the Now count crowds the glyph.

The Now count draws as a grey filled pill (about 24 px, "3") over the home glyph's top-right corner in the tab bar at 390 light, and as a grey disc at the end of the sidebar row (6 at 1280 dark); design/07-interface.md asks for the count in muted ink, never a pill. Evidence: Now critique unit u1 (Stead scratchpad `critique/u1/shots/`, `first-390-light`, `first-1280-dark`).

## Approach
Nothing in the app can fix these: geometry classes go on host elements only, and the Shell owns all three slots. Stack's own review judges the Shell and the Banner in separate showcase frames, never the Shell holding a banner over a page with a header, which is where the first seam shows. Screens: Stead's sign-off set, `banner-urgent-{375,1440}-{light,dark}.png`, `chats-*`, `board-*`.

## Acceptance criteria
- [x] The banner keeps the page's gap from the header under it, at touch and desktop density.
- [x] The sidebar's first row and the tab bar's glyphs sit at the same inset as the page column's header.
- [x] A showcase frame draws the Shell with a banner, a page header and a tab count; the design critique is run by a session that played no part.

## Open questions
- [x] Which tokens each slot takes: the spacing seams take the page, pair and float rungs (Built); the count is the muted-ink number everywhere.

## Built
`SHELL_BANNER` is `p-page` (was `px-page pt-page`), so the page gap stands under the banner above the header, on both platforms. `SHELL_TAB_BAR` takes `pt-pair`, which puts the glyphs' centre on the header strip's line (touch strip 44, glyph centre 22). The sidebar needed no change: the places' float inset centres a 32 px row on the 40 px strip (`(strip - row) / 2 = float`), so the first row already shares the title's line; the comment on `SHELL_SIDEBAR` states the derivation. The Shell frame (`layout/Shell`) draws a danger banner over the Place's head, with the Activity count in the sidebar and the tab bar.
Evidence: `pnpm check`, the three verifies and `layout/Shell` Rest and Selected in the browser run pass.
Owner render: `layout/Shell` Rest and Selected, desktop and touch, light and dark; confirm the sidebar's first row against the header title.

## Ruled
A count is the muted-ink number everywhere: one `Count`, one `COUNT` cell, no pill in the nav and a number in the heads.

## Built (the count)
`COUNT` is `text-ink-meta` (it lost its ground, `min-h-chip`, `min-w-chip`, `px-inside` and `rounded-full`); `COUNT_LABEL` keeps the caption type and tabular figures but no colour, so a count in a filled act can take the act's. `Count` inside a `Button` (an internal `InAct` context the button sets around its count and `wait`) draws in the button's own ink (web: currentColor of the act; native: the `Ink` the button provides, blocked and banner inks included). That is the label's ink in every `act` and state, so the count holds the contrast the label already holds (`on-act-accent` on `act-accent`, `on-act-danger` on `act-danger`, `ink-meta` on `fill-disabled`, the unfilled acts on the page); `ui-core verify` gates those pairs, light and dark. The waiting count (`skeleton({ kind: "count" })`, Section's and ItemHeader's `COUNT_WAIT`) is a `h-skeleton` bar one figure wide, its width set by an unseen caption figure, so loaded and waiting rows keep their height. The Shell's `TAB_COUNT` overlay stands the plain number at the glyph's top end. Doc comments no longer say pill.
Evidence: `pnpm check`, the three verifies and the `Button`, `Count`, `Section`, `ItemHeader`, `Shell`, `Meter`, `Canvas` and waiting stories in the browser run.
Owner render: `atom/Count` Rest; `atom/Button` Rest and Loading (every act, light and dark); `layout/Shell` Rest (sidebar count, tab count); `layout/Section` Rest and Loading (tally, waiting bar); `shared/ItemHeader` Rest and Loading (count fact, waiting bar).

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/shell/report.md`).
