# Content: text, figures and pictures

The parts that read as a block, each a card of its own in a `Section`'s body (a bare one stands in a `Card`). The lists, tables and threads are `content.md`; `Waveform` is `audio.md` and `Canvas` is `canvas.md`. This page is what each takes.

## Text

A paragraph in a type role. `kind`: `body` (the default) or `meta`, not named `role`, which is the ARIA attribute. Its `children` are words, links or runs: a `{ strong }` run is words at weight 500, a `{ code }` run a span of code.

## Prose

Markdown. `markdown` is the text: headings, paragraphs, lists, quotes, rules, inline code, links and fenced code.

## Code

Text in mono, split on newlines.

- `text`: the text. A selection paints lines until its read lands.
- `title`: what the text is (a file's name, the tool it goes into), in a head over it; it names the acts.
- `copy`: adds the copy act.
- `download`: adds a download act that saves the text as a file of this name (`download="recovery-codes.txt"`).
- `tail`: shows only the last lines, that many, behind an act that reveals the earlier ones: a log.

## Diff

Two texts compared. `label` is the file's path. Give `hunks`, or `before` and `after` with `by`: `line` (the default: code, each line marked and numbered) or `word` (prose: a removed run struck through and an added one underlined in place, in a card at the measure). A code diff wants a `wide` `Pane`.

## Stages

A rail of fixed states.

- `steps`: `{ label, state, at? }`. `state` is `done`, `current` or `later`; `at` is the ISO moment a done or current stage was reached.
- `ended`: `{ label, reason? }`, the terminal row that stands in place of every stage after the last done one.

## Stats

Figures in cells. `items` are cells `{ label, value, meta? }`, each one of:

- plain, with a `unit` beside the figure.
- a link: `href` makes the whole cell a link; `counts` makes sub-counts links of their own. Never both.
- a meter: `bound` is the limit, so `value` is drawn as a share of it, with sub-counts (`counts`) but no `unit` or `href`. `mark` is a tick on the track where the fill turns amber.

## BarChart

Columns over time.

- `label`: what the chart counts, read aloud and never drawn.
- `items` and `bar`: the bars oldest first and the slots that read each (`key`, `value`, `parts`, `at`, `label`).
- `keys`: the names a bar's parts stack by, bottom first. Present, the chart is stacked and the names are its legend.
- `unit`: what the values count, drawn after the total. `{ one, other }` for a plural, `{ currency: "USD" }` for money.
- `level`: the bars are a level, not a flow (open flags per round): the head draws the last bar's value, never a sum.

## Image

A picture that opens full size on a press.

- `src`: the address; a selection paints the tile until its read lands.
- `alt`: what it shows; the failed form's words and the full view's name.
- `fit`: `content` (the default; the container's width at `aspect`, capped in height) or `thumb`, a square tile.
- `aspect`: the width over the height (`16 / 9`), which the screen gives as it knows it before the bytes land. A `content` Image requires it; a `thumb` takes none.

```tsx
<Image src={cover} alt="Cover art" aspect={16 / 9} />
```
