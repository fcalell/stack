---
id: 003-134
status: review
sessions: {}
---
# react-ui: a record beside the main stands alone at the phone with one head, at the page's gutter

## Goal
Stead opens a page's History as a `Screen` in `Split`'s `beside` (github.com/fcalell/stead, `packages/server/src/app/routes/system/route.tsx` lines 181 to 185, `PageHistory` in `-components/knowledge.tsx` line 453; design/07-interface.md "The knowledge editor": "History takes main with back to it", one back act and one title per phone screen). At 390 px the screen draws two heads: the Place's top bar (back, more) and the title "System", then under it the Screen's own back chevron and the title "History", about 170 px of header before the first row. The Screen's title also starts at x = 32 where the page's gutter, the usage banner and the tree stand at 16. Evidence: knowledge editor critique unit u10, shot `history-390-light` (Stead scratchpad `critique/u10/shots/`, stack at `5564217`); at 1440 the History region's title stands at x = 950 and its rows at x = 900, a different column from the page's content at 867.

## Approach
`Place` documents that "while a record stands beside the main, below `tablet` the Place draws no head, its `h1` staying read, unseen: that record's head is the page's one" and implements it as `HEAD_BESIDE` (`page-max-tablet:group-has-data-beside/page:hidden`, plugins/react-ui/src/ui/components/place/index.tsx line 70) on the `header`, with `Split` setting `data-beside` when a record is open and `beside` is given. The compiled CSS holds the rule (`dist/client/assets/*.css` in the app), yet the render at 390 draws the Place's head and the Screen's together, so check first what keeps the rule from applying (the Place in a `bleed` form, the banner above it, the container the `page-max-tablet` query reads). The Screen's own inset (`SCREEN_BESIDE` / `SECTIONS_BESIDE`) adds a second page inset inside the main's, which the phone shows as the 16 px offset; the app passes only a title, a back route and rows. Not 003-73 (heading order) and not 003-95 (the top bar's act inset), not 003-84 (a list's own back act). Seen at stack `5564217`.

## Acceptance criteria
- [x] A `Split` with a record `beside` the main draws one head at 390 px: one back act and one title, the Screen's.
- [x] A beside Screen's title and body start at the page's gutter at every width, the same left edge as the banner above and the list.
- [ ] The Split showcase holds a beside record at the phone width and the critique measures the head's height and the left edges.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether the hide rule is repaired or the Screen takes the Place's head as its own.

## Decided
Not reproducible at HEAD. The Place's head hides below `tablet` beside a record (`HEAD_BESIDE`, `data-beside`), the Screen's head is the page's one, and its title and body start at the page's gutter (16 on touch). The Screen draws one inset, not two. The `place` hide rule needs no change. Stead's report (stack at `5564217`, which already held `HEAD_BESIDE`) is most likely a build that predates it or a Shell-only difference; a Stead render at the current stack settles it.
Evidence: `behaviour/split.stories.tsx` `BesideAtThePhone` (touch, 375 px: one visible `header`, the Screen's title and its first row at the `page` inset).

## Critique
Rework: the render holds (one head, edges at the gutter), but `BesideAtThePhone`'s play fails at every width (expected 32 to be 16): it compares an absolute left with the gutter while Storybook pads the page by 16 px.

## Rework
`BesideAtThePhone` measures against its own frame: the expected left is the Page's left plus the `px-page` gutter. The story passes.
