---
id: 001-08
status: backlog
depends: [001-06]
---
# Scroll and shell primitives (follow-up)

## Goal

The vocabulary veto (`1a3534c`) removed fill heights and scroll overflow from the call-site
vocabulary, so a scrollable pane and a viewport-capped app frame have no expressible home outside
`ui/`. Ship them from `plugin-solid-ui` (candidates: a `scroll-area` pane, a `shell` frame) so a
consumer never authors that plumbing. Native owes nothing: `ScrollView` is a gate host and the
shell pieces (`nav-bar`, `tab-bar`, `footbar`) already ship.

Driver: the 001-06 veto resolution. Outside `docs/prd/ui-core.md` acceptance, like 001-07; helm's
migration consumes these (~14 measured scroll/height call sites).
