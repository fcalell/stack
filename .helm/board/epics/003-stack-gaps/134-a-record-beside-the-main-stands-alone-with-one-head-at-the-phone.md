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

## Critique (second round)
Rework: at 1280 and 1440 a beside record's title stands 36 px off the page gutter (x 960.5 against 924.5 for the list's "Entries" and its rows), its close act before it on the same line; the criterion asks one gutter at every width. At 390 it holds (one head, back over the title, both at x 32).

## Rework (second round)
Beside a Split's main from `wide` the Screen's Close act is the head's last act, after the title and its acts; the back act before the title stands only below `wide`. The title starts at the sections' gutter, and the DOM order is the drawn order. Evidence: `behaviour/split.stories.tsx` `BesideHeadings1440` asserts the record's `h1` and its first section heading share a left edge and the Close act stands after the title (the play measures its own frame, so it holds under any viewport).
Measured on the rendered story (`behaviour-split--beside-headings-1440`, Playwright through `browser-run.sh`, light and dark identical): at a 1280 viewport (frame 1248) the record title's left edge is 844.5, the first section heading "Entries" 844.5 and the sections' gutter 844.5 (the title stood 36 px off, at 880.5, before); at 1440 (frame 1408) all three are 924.5. Close is the one act in the head, 28 px wide at 1212 to 1240 (1372 to 1400), after the title's right edge (1204; 1364) and the head's last element. The inverted left-edge assertion fails in the stories run ("expected 804.5 not to be 804.5" in `BesideHeadings1440`; the guard is a frame of at least `wide`, 1200), so the `wide` branch executes there.

## Browser run (003-304 follow-up)
`BesideAtThePhone` passes after 003-304 made a touch Screen one row: the head is one visible `header`, the back act then the title on one line (title left at or after the back act's right edge), and the first row's name at the page gutter. The old assertion, title at the gutter, belongs to the two-row head 003-304 deliberately replaced (test updated).
