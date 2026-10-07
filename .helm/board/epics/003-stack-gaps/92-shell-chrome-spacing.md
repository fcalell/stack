---
id: 003-92
status: backlog
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
- [ ] The banner keeps the page's gap from the header under it, at touch and desktop density.
- [ ] The sidebar's first row and the tab bar's glyphs sit at the same inset as the page column's header.
- [ ] A showcase frame draws the Shell with a banner, a page header and a tab count, and the design critique judges it.

## Open questions
- [ ] Which tokens each slot takes: the stack session decides.
