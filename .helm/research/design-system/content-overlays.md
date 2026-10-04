# Content molecules: the overlay notes

The Stage 2 content molecules' approved artboards (boards 50 to 54, approved at L2a 2026-10-02;
the files are in git history at `d777de6`) split into the ui-core cells and what each plugin composes over
them. This file is what the React step copies: for every part of every drawn frame and state, the
board's class string verbatim, the ui-core cell or constant it now draws, and the overlay, which is
the board string less the cell. Generated from the light column of each board; the dark column
spells the same strings. Each board is drawn at both densities; where the desktop and the touch
board draw a part differently, both strings stand under one heading, marked by density. Board 52
adds a tablet file (768, the touch density), the grid at touch, and its touch file (390) draws the
Table below tablet. Board 53 also draws the Thread around the messages and the input. A string's frames are listed under it (two named, the rest counted).

## How to read an overlay

- The atoms note's, the layout note's and the shared note's rules hold (`atoms-overlays.md`,
  `layout-overlays.md`, `shared-overlays.md`, "How to read an overlay"): a rest overlay is
  unconditional, another state's classes are that state's web variant, a part inside a clipping
  or pressable region rings inset (`-outline-offset-2`), a composed atom's string is its own cell
  at the fit or act the molecule passes, a glyph draws the ink of its place, and a skeleton bar's
  fraction width is structural.
- A composed molecule (a `Code` in a Prose, a `Prose` in a Message, the `Group` around a
  Comparison, the Table's `List`, `ListRow`s, `EmptyState` and `Picker`) is recorded at its root
  only: it draws its own cells, and the molecule composing it neither spells nor owns them.
- A role's strong form is `TEXT` with `TEXT_STRONG` merged through `cn()`, so `font-medium`
  replaces the role's `font-normal`; figures at one width beside a role are `FIGURES`.
- A state's string names the rest cell; where the state replaces a class of it (a hover
  boundary, a disabled fill or ink, a placeholder's ink), the line under it says which, and the
  overlay holds the state's class.
- A value the data decides (a meter's fill width, a column's or a part's height) is set by the
  component, on both platforms; the board's fractions stand in for one value.
- Structural classes the content boards add, all overlays and admitted in react-ui's class
  sweep (`CLASS_ROOTS`, `CLASS_EXACT` in `plugins/react-ui/scripts/verify.ts`): `z-1` (a stacking
  order inside one component), `isolate` (the Table's grid frame, so its frozen column's
  stacking stays inside it), `sr-only`, `invisible`, `col-start-1`, `row-start-1`,
  `table-fixed`, `-indent-control-x`, `wrap-anywhere` and `text-pretty` (Comparison's value
  column, so a wrapped value never ends on one word).
- Context the content molecules do not own, recorded on the boards for the composition: the
  Place, Screen, Split, Section, Group and List frames around them (`data-context`), a thread's
  pane, the Shell's sidebar, a Table's open record (its side sheet and definition rows).

## Prose

Board 50.

A fenced block is a composed `Code`, recorded at its root. The quote's text is `TEXT {role: body}` in the meta ink (an ink overlay, `text-ink-meta`). Inline code on board 53 spells its sentence's ink (`text-ink-body`) as an overlay over `PROSE_CODESPAN`, which carries none.

### prose

- both densities: `flex flex-col gap-sections min-w-0 max-w-measure text-body leading-body`
  - cell: `PROSE`; overlay: `flex flex-col min-w-0`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · a record's description in a Section: paragraphs alone, no heading, an inline code and a link; and 2 more frames

### prose-part

- both densities: `flex flex-col gap-pair`
  - cell: `PROSE_PART`; overlay: `flex flex-col`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-part › h2

- both densities: `text-heading leading-heading tracking-heading font-semibold text-ink-body`
  - cell: `TEXT {role: heading}`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-part › div

- both densities: `flex flex-col gap-fields`
  - cell: `PROSE_BLOCKS`; overlay: `flex flex-col`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-part › p

- both densities: `text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-list

- both densities: `flex flex-col gap-pair`
  - cell: `PROSE_LIST`; overlay: `flex flex-col`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-item

- both densities: `flex gap-inside`
  - cell: `PROSE_ITEM`; overlay: `flex`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-marker

- both densities: `shrink-0 min-w-icon text-center text-body leading-body font-normal text-ink-meta`
  - cell: `PROSE_MARKER {list: bullet}`; overlay: `shrink-0 text-center`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …
- both densities: `shrink-0 min-w-icon text-end tabular-nums text-body leading-body font-normal text-ink-meta`
  - cell: `PROSE_MARKER {list: ordered}`; overlay: `shrink-0 text-end`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-item › div

- both densities: `flex flex-col gap-pair grow min-w-0`
  - cell: `PROSE_LIST`; overlay: `flex flex-col grow min-w-0`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-item › p

- both densities: `text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-item › strong

- both densities: `font-medium`
  - cell: `TEXT_STRONG {role: body}`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-codespan

- both densities: `whitespace-nowrap rounded-chip bg-fill-neutral px-inside text-code leading-code font-normal font-mono`
  - cell: `PROSE_CODESPAN`; overlay: `inline-block max-w-full` (the board's `whitespace-nowrap` replaced at L2b: the span is one atom that moves whole while it fits; only a span wider than the column wraps, inside itself, with the root's `wrap-anywhere`)
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · a record's description in a Section: paragraphs alone, no heading, an inline code and a link; and 1 more frames

### link

- both densities: `font-medium text-accent-ink underline`
  - cell: `LINK {fit: inline}`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · a record's description in a Section: paragraphs alone, no heading, an inline code and a link; and 1 more frames

### prose-part › h3

- both densities: `text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-item › del

- both densities: `line-through`
  - cell: `PROSE_STRIKE`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-quote

- both densities: `flex flex-col gap-fields border-l border-edge-strong pl-control-x`
  - cell: `PROSE_QUOTE`; overlay: `flex flex-col`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-quote › p

- both densities: `text-body leading-body font-normal text-ink-meta`
  - cell: `TEXT {role: body}`; overlay: `text-ink-meta`
  - the cell's `text-ink-body` is the rest look this state's overlay replaces
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### code

- both densities: `flex flex-col min-w-0 overflow-hidden rounded-card border border-edge bg-surface`
  - composes Code, which draws its own cells; its root's overlay: `flex flex-col min-w-0 overflow-hidden` over `CONTENT_FRAME`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-rule

- both densities: `border-t border-edge`
  - cell: `PROSE_RULE`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose-part › em

- both densities: `italic`
  - cell: `PROSE_EMPHASIS`; overlay: none
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …

### prose › div

- both densities: `flex flex-col gap-fields`
  - cell: `PROSE_BLOCKS`; overlay: `flex flex-col`
  - under: Prose · a record's description in a Section: paragraphs alone, no heading, an inline code and a link; Prose · loading: what the description stands for, two paragraphs of body line boxes a fields gap apart (thr…
- both densities: `flex flex-col`
  - cell: none; overlay: `flex flex-col`
  - under: Prose · loading: what the description stands for, two paragraphs of body line boxes a fields gap apart (thr…

### prose › p

- both densities: `text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: none
  - under: Prose · a record's description in a Section: paragraphs alone, no heading, an inline code and a link

### prose › span

- both densities: `flex items-center h-lh text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `flex items-center h-lh`
  - under: Prose · loading: what the description stands for, two paragraphs of body line boxes a fields gap apart (thr…
- both densities: `hidden touch:flex items-center h-lh text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `hidden touch:flex items-center h-lh`
  - under: Prose · loading: what the description stands for, two paragraphs of body line boxes a fields gap apart (thr…

### skeleton-bar

- both densities: `h-skeleton w-full rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-full`
  - under: Prose · loading: what the description stands for, two paragraphs of body line boxes a fields gap apart (thr…
- both densities: `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: Prose · loading: what the description stands for, two paragraphs of body line boxes a fields gap apart (thr…
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: Prose · loading: what the description stands for, two paragraphs of body line boxes a fields gap apart (thr…

## Code

Board 50.

The text region and the fold act ring inward on their own focus (`focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`); a frame drawn focused spells the static ring (`outline-2 -outline-offset-2 outline-ring`). The fold's hover and press washes are the web's `hover:` and `active:` overlays.

### code

- both densities: `flex flex-col min-w-0 overflow-hidden rounded-card border border-edge bg-surface`
  - cell: `CONTENT_FRAME`; overlay: `flex flex-col min-w-0 overflow-hidden`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Code · title and copy: the head a strip-high bar, the title meta at the compact inset, the copy act IconBut…; and 14 more frames

### code-body

- both densities: `flex min-w-0`
  - cell: none; overlay: `flex min-w-0`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Code · copy without a title: the act in its own column at the text's end, centred on the first line (LINE_B…; and 1 more frames

### code-text

- both densities: `grow min-w-0 overflow-x-auto whitespace-pre py-tile pl-tile text-code leading-code font-normal text-ink-body font-mono focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - cell: `TEXT {role: code} + CODE_TEXT {act: beside}`; overlay: `grow min-w-0 overflow-x-auto whitespace-pre focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Code · copy without a title: the act in its own column at the text's end, centred on the first line (LINE_B…; and 1 more frames
- both densities: `overflow-x-auto whitespace-pre p-tile text-code leading-code font-normal text-ink-body font-mono focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring border-t border-edge`
  - cell: `TEXT {role: code} + CODE_TEXT {act: none} + CODE_UNDER_HEAD`; overlay: `overflow-x-auto whitespace-pre focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - under: Code · title and copy: the head a strip-high bar, the title meta at the compact inset, the copy act IconBut…; Code · copied: the act's glyph a check and its name Copied for two seconds (the IconButton copy act at the …; and 2 more frames
- both densities: `overflow-x-auto whitespace-pre p-tile text-code leading-code font-normal text-ink-body font-mono focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - cell: `TEXT {role: code} + CODE_TEXT {act: none}`; overlay: `overflow-x-auto whitespace-pre focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - under: Code · neither: the bare frame, mono at code, inset by the compact card inset; Code · tail: the last 4 of 18 lines, the folded lines' act over them at the target's height, a hairline und…; and 3 more frames
- both densities: `overflow-x-auto whitespace-pre p-tile text-code leading-code font-normal text-ink-body font-mono focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring border-t border-edge outline-2 -outline-offset-2 outline-ring`
  - cell: `TEXT {role: code} + CODE_TEXT {act: none} + CODE_UNDER_HEAD`; overlay: `overflow-x-auto whitespace-pre focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring outline-2 -outline-offset-2 outline-ring`
  - under: Code · a long line, its text region focused (keyboard): a focusable group named by the title ("Code" untitl…; Code · tail, unfolded: the fold is one-way, pressed it reveals the 14 earlier lines and leaves, focus landi…

### code-act

- both densities: `shrink-0 pt-tile pl-acts pr-float`
  - cell: `CODE_ACT`; overlay: `shrink-0`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Code · copy without a title: the act in its own column at the text's end, centred on the first line (LINE_B…; and 1 more frames

### code-act › span

- both densities: `flex items-center h-lh text-code leading-code`
  - cell: `LINE_BOX {role: code}`; overlay: `flex items-center h-lh`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Code · copy without a title: the act in its own column at the text's end, centred on the first line (LINE_B…; and 1 more frames

### icon-button

- both densities: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control text-ink-meta focus-visible:-outline-offset-2`
  - cell: `ICON_BUTTON {fit: body}`; overlay: `relative inline-flex items-center justify-center shrink-0 focus-visible:-outline-offset-2`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Code · title and copy: the head a strip-high bar, the title meta at the compact inset, the copy act IconBut…; and 10 more frames

### icon-button › svg

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: Prose · rest, release notes in a Place's body: blocks a fields gap apart, a heading a pair over the blocks …; Code · title and copy: the head a strip-high bar, the title meta at the compact inset, the copy act IconBut…; and 10 more frames

### code-head

- both densities: `flex items-center gap-acts min-h-strip pl-tile pr-float`
  - cell: `CODE_HEAD`; overlay: `flex items-center`
  - under: Code · title and copy: the head a strip-high bar, the title meta at the compact inset, the copy act IconBut…; Code · copied: the act's glyph a check and its name Copied for two seconds (the IconButton copy act at the …; and 9 more frames

### code-title

- both densities: `grow min-w-0 truncate text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `grow min-w-0 truncate`
  - under: Code · title and copy: the head a strip-high bar, the title meta at the compact inset, the copy act IconBut…; Code · copied: the act's glyph a check and its name Copied for two seconds (the IconButton copy act at the …; and 9 more frames

### code-fold

- both densities: `flex items-center gap-inside w-full min-h-target px-tile border-b border-edge text-ink-meta focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring border-t border-edge`
  - cell: `CODE_FOLD + CODE_UNDER_HEAD`; overlay: `flex items-center w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - under: Code · tail: the last 4 of 18 lines, the folded lines' act over them at the target's height, a hairline und…
- desktop: `flex items-center gap-inside w-full min-h-target px-tile border-b border-edge text-ink-meta focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring border-t border-edge bg-wash-hover`
  - cell: `CODE_FOLD + CODE_UNDER_HEAD`; overlay: `flex items-center w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring bg-wash-hover`
  - under: Code · tail, the fold act under the pointer (hover wash)
- both densities: `flex items-center gap-inside w-full min-h-target px-tile border-b border-edge text-ink-meta focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring border-t border-edge outline-2 -outline-offset-2 outline-ring`
  - cell: `CODE_FOLD + CODE_UNDER_HEAD`; overlay: `flex items-center w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring outline-2 -outline-offset-2 outline-ring`
  - under: Code · tail, the fold act focused (keyboard): the ring drawn inward
- touch: `flex items-center gap-inside w-full min-h-target px-tile border-b border-edge text-ink-meta focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring border-t border-edge bg-wash-press`
  - cell: `CODE_FOLD + CODE_UNDER_HEAD`; overlay: `flex items-center w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring bg-wash-press`
  - under: Code · tail, the fold act pressed (press wash)

### code-fold › svg

- both densities: `size-icon-meta shrink-0`
  - cell: `ICON {fit: meta}`; overlay: `shrink-0`
  - under: Code · tail: the last 4 of 18 lines, the folded lines' act over them at the target's height, a hairline und…; Code · tail, the fold act under the pointer (hover wash); and 2 more frames

### code-fold › span

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: Code · tail: the last 4 of 18 lines, the folded lines' act over them at the target's height, a hairline und…; Code · tail, the fold act under the pointer (hover wash); and 2 more frames

### code › div

- both densities: `flex flex-col p-tile border-t border-edge`
  - cell: `CODE_TEXT {act: none} + CODE_UNDER_HEAD`; overlay: `flex flex-col`
  - under: Code · loading with a title: the head as loaded, the act absent (nothing to copy yet), the head the strip e…
- both densities: `flex flex-col p-tile`
  - cell: `CODE_TEXT {act: none}`; overlay: `flex flex-col`
  - under: Code · loading, bare

### code › span

- both densities: `flex items-center h-lh text-code leading-code`
  - cell: `LINE_BOX {role: code}`; overlay: `flex items-center h-lh`
  - under: Code · loading with a title: the head as loaded, the act absent (nothing to copy yet), the head the strip e…; Code · loading, bare

### skeleton-bar

- both densities: `h-skeleton w-2/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-2/3`
  - under: Code · loading with a title: the head as loaded, the act absent (nothing to copy yet), the head the strip e…; Code · loading, bare
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: Code · loading with a title: the head as loaded, the act absent (nothing to copy yet), the head the strip e…; Code · loading, bare
- both densities: `h-skeleton w-3/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-3/4`
  - under: Code · loading with a title: the head as loaded, the act absent (nothing to copy yet), the head the strip e…; Code · loading, bare

## Diff

Board 51.

The table structure (`w-full border-collapse`, `align-top`, `text-end` on the numbers, `w-full` on the code) is the web's; native draws rows of the same cells with the number columns at `w-figures`. A wrapped line's first visual line is pulled back by `-indent-control-x` over `DIFF_HANG`.

The loading form is a fixed eight lines, and what stands below a Diff may move when it lands: only the data decides a diff's length, so this is the one closed exception to a loading form mirroring its loaded height.

### diff

- both densities: `flex flex-col min-w-0 overflow-hidden rounded-card border border-edge bg-surface`
  - cell: `CONTENT_FRAME`; overlay: `flex flex-col min-w-0 overflow-hidden`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 4 more frames

### diff › table

- both densities: `w-full border-collapse`
  - cell: none; overlay: `w-full border-collapse`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 4 more frames

### diff-line

- both densities: `text-code leading-code font-normal font-mono bg-group text-ink-meta`
  - cell: `DIFF_LINE {kind: header}`; overlay: none
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 4 more frames
- both densities: `text-code leading-code font-normal text-ink-body font-mono`
  - cell: `DIFF_LINE {kind: context}`; overlay: none
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 3 more frames
- both densities: `text-code leading-code font-normal text-ink-body font-mono bg-danger-soft`
  - cell: `DIFF_LINE {kind: removed}`; overlay: none
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 1 more frames
- both densities: `text-code leading-code font-normal text-ink-body font-mono bg-ok-soft`
  - cell: `DIFF_LINE {kind: added}`; overlay: none
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 2 more frames

### diff-hunk

- both densities: `px-inside py-rows`
  - cell: `DIFF_HUNK`; overlay: none
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 4 more frames

### diff-hunk-text

- both densities: `pl-control-x -indent-control-x whitespace-pre-wrap wrap-anywhere`
  - cell: `DIFF_HANG`; overlay: `-indent-control-x whitespace-pre-wrap wrap-anywhere`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 2 more frames

### diff-gutter

- both densities: `min-w-figures pl-inside text-end align-top tabular-nums text-ink-meta`
  - cell: `DIFF_GUTTER`; overlay: `text-end align-top`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 4 more frames

### diff-mark

- both densities: `px-inside align-top text-ink-meta`
  - cell: `DIFF_MARK`; overlay: `align-top`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 4 more frames

### diff-code

- both densities: `w-full pr-inside pl-control-x -indent-control-x align-top whitespace-pre-wrap wrap-anywhere`
  - cell: `DIFF_CODE + DIFF_HANG`; overlay: `w-full -indent-control-x align-top whitespace-pre-wrap wrap-anywhere`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; Diff · unified, long lines wrapped under themselves (at every width): a wrapped line keeps its numbers on i…; and 2 more frames
- both densities: `w-full pr-inside align-top`
  - cell: `DIFF_CODE`; overlay: `w-full align-top`
  - under: Diff · loading: the hunk header's bar on its ground, the lines' bars in the code line box (18); loading

### diff-hunk › span

- both densities: `flex items-center h-lh`
  - cell: none; overlay: `flex items-center h-lh`
  - under: Diff · loading: the hunk header's bar on its ground, the lines' bars in the code line box (18); loading

### skeleton-bar

- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: Diff · loading: the hunk header's bar on its ground, the lines' bars in the code line box (18); loading
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: Diff · loading: the hunk header's bar on its ground, the lines' bars in the code line box (18); loading
- both densities: `h-skeleton w-2/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-2/3`
  - under: Diff · loading: the hunk header's bar on its ground, the lines' bars in the code line box (18); loading
- both densities: `h-skeleton w-3/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-3/4`
  - under: Diff · loading: the hunk header's bar on its ground, the lines' bars in the code line box (18); loading
- both densities: `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: Diff · loading: the hunk header's bar on its ground, the lines' bars in the code line box (18); loading

### diff-code › span

- both densities: `flex items-center h-lh`
  - cell: none; overlay: `flex items-center h-lh`
  - under: Diff · loading: the hunk header's bar on its ground, the lines' bars in the code line box (18); loading

## ProseDiff

Board 51.

### prose-diff

- both densities: `flex flex-col min-w-0 overflow-hidden rounded-card border border-edge bg-surface`
  - cell: `CONTENT_FRAME`; overlay: `flex flex-col min-w-0 overflow-hidden`
  - under: ProseDiff · the removed run struck on danger-soft, the added run on ok-soft, in the Diff's frame on the sur…; ProseDiff · loading: four body line boxes (20) in the frame, the bars at the measure; and 2 more frames

### prose-diff-body

- both densities: `p-card`
  - cell: `PROSE_DIFF_BODY`; overlay: none
  - under: ProseDiff · the removed run struck on danger-soft, the added run on ok-soft, in the Diff's frame on the sur…; ProseDiff · loading: four body line boxes (20) in the frame, the bars at the measure; and 2 more frames

### prose-diff-text

- both densities: `max-w-measure text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body} + PROSE_DIFF_TEXT`; overlay: none
  - under: ProseDiff · the removed run struck on danger-soft, the added run on ok-soft, in the Diff's frame on the sur…; removed struck on danger-soft, added on ok-soft, in the frame
- both densities: `flex flex-col max-w-measure text-body leading-body`
  - cell: `LINE_BOX {role: body} + PROSE_DIFF_TEXT`; overlay: `flex flex-col`
  - under: ProseDiff · loading: four body line boxes (20) in the frame, the bars at the measure; loading

### prose-diff-text › del

- both densities: `bg-danger-soft line-through`
  - cell: `PROSE_DIFF_RUN {kind: removed}`; overlay: none
  - under: ProseDiff · the removed run struck on danger-soft, the added run on ok-soft, in the Diff's frame on the sur…; removed struck on danger-soft, added on ok-soft, in the frame

### prose-diff-text › span

- both densities: `sr-only`
  - cell: none; overlay: `sr-only`
  - under: ProseDiff · the removed run struck on danger-soft, the added run on ok-soft, in the Diff's frame on the sur…; removed struck on danger-soft, added on ok-soft, in the frame

### prose-diff-text › ins

- both densities: `bg-ok-soft underline`
  - cell: `PROSE_DIFF_RUN {kind: added}`; overlay: none
  - under: ProseDiff · the removed run struck on danger-soft, the added run on ok-soft, in the Diff's frame on the sur…; removed struck on danger-soft, added on ok-soft, in the frame

### skeleton-line

- both densities: `flex items-center h-lh`
  - cell: none; overlay: `flex items-center h-lh`
  - under: ProseDiff · loading: four body line boxes (20) in the frame, the bars at the measure; loading

### skeleton-bar

- both densities: `h-skeleton w-full rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-full`
  - under: ProseDiff · loading: four body line boxes (20) in the frame, the bars at the measure; loading
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: ProseDiff · loading: four body line boxes (20) in the frame, the bars at the measure; loading

## FileRow

Board 51.

The row's hit is ListRow's (shared-overlays.md): `absolute inset-0`, `rounded-row touch:rounded-none` on the list ground, its ring inset. The counts' loading lane spells `text-meta` over `SKELETON_LANE {role: meta}`, which carries no role of its own.

### file-row

- both densities: `relative flex items-center gap-inside min-h-row px-control-x rounded-row touch:rounded-none`
  - cell: `ROW {lines: one, state: rest, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 8 more frames
- both densities: `relative flex items-center gap-inside min-h-row px-card`
  - cell: `ROW {lines: one, state: rest, ground: group}`; overlay: `relative flex items-center`
  - under: ground=group · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; ground=group · rest · seen absent: the file glyph leads; a long directory gives way first, the file name st…; and 6 more frames
- desktop: `relative flex items-center gap-inside min-h-row px-control-x rounded-row touch:rounded-none bg-wash-hover`
  - cell: `ROW {lines: one, state: highlighted, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ground=list · hover (wash-hover)
- desktop: `relative flex items-center gap-inside min-h-row px-card bg-wash-hover`
  - cell: `ROW {lines: one, state: highlighted, ground: group}`; overlay: `relative flex items-center`
  - under: ground=group · hover (wash-hover)
- both densities: `relative flex items-center gap-inside min-h-row px-control-x rounded-row touch:rounded-none bg-wash-press`
  - cell: `ROW {lines: one, state: pressed, ground: list}`; overlay: `relative flex items-center touch:rounded-none`
  - under: ground=list · active (wash-press); active (wash-press) on the first, focus (the ring, inset) on the second
- desktop: `relative flex items-center gap-inside min-h-row px-card bg-wash-press`
  - cell: `ROW {lines: one, state: pressed, ground: group}`; overlay: `relative flex items-center`
  - under: ground=group · active (wash-press)

### row-hit

- both densities: `absolute inset-0 rounded-row touch:rounded-none`
  - cell: none; overlay: `absolute inset-0 rounded-row touch:rounded-none`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 8 more frames
- both densities: `absolute inset-0`
  - cell: none; overlay: `absolute inset-0`
  - under: ground=group · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; ground=group · rest · seen absent: the file glyph leads; a long directory gives way first, the file name st…; and 6 more frames
- both densities: `absolute inset-0 rounded-row touch:rounded-none outline-2 -outline-offset-2 outline-ring`
  - cell: none; overlay: `absolute inset-0 rounded-row touch:rounded-none outline-2 -outline-offset-2 outline-ring`
  - under: ground=list · focus (the 2 px ring, inset); active (wash-press) on the first, focus (the ring, inset) on the second
- desktop: `absolute inset-0 outline-2 -outline-offset-2 outline-ring`
  - cell: none; overlay: `absolute inset-0 outline-2 -outline-offset-2 outline-ring`
  - under: ground=group · focus (the 2 px ring, inset)

### row-leading

- both densities: `flex shrink-0 items-center justify-center size-avatar`
  - cell: `ROW_LEADING`; overlay: `flex shrink-0 items-center justify-center`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 17 more frames

### row-leading › svg

- both densities: `shrink-0 size-icon text-ink-meta`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-meta`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 14 more frames

### file-path

- both densities: `flex grow min-w-0 text-code leading-code font-mono`
  - cell: `FILE_PATH`; overlay: `flex grow min-w-0`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 14 more frames

### file-dir

- both densities: `shrink-0 text-ink-meta`
  - cell: `FILE_PATH_PART {part: directory}`; overlay: `shrink-0`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 14 more frames

### file-name

- both densities: `shrink-0 font-medium text-ink-body`
  - cell: `FILE_PATH_PART {part: name}`; overlay: `shrink-0`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 14 more frames

### file-counts

- both densities: `flex shrink-0 items-center gap-inside tabular-nums text-meta leading-meta font-normal`
  - cell: `FILE_COUNTS`; overlay: `flex shrink-0 items-center`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 14 more frames

### count-added

- both densities: `min-w-figures text-end text-ok`
  - cell: `FILE_COUNT {kind: added}`; overlay: `text-end`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 14 more frames

### count-removed

- both densities: `min-w-figures text-end text-danger`
  - cell: `FILE_COUNT {kind: removed}`; overlay: `text-end`
  - under: A review in a Split at the board's width: FileRow (ground=list) in the list, one per changed file, the ring…; ground=list · rest · seen given: the ring (not seen) and the tick (seen), both meta ink; and 14 more frames

### skeleton-row

- both densities: `flex items-center gap-inside min-h-row px-control-x`
  - cell: `SKELETON_ROW {kind: one-line}`; overlay: `flex items-center`
  - under: ground=list · loading: the glyph, the path at half the row, the counts in a meta lane; loading, both grounds
- both densities: `flex items-center gap-inside min-h-row px-card`
  - cell: `SKELETON_ROW {kind: one-line-group}`; overlay: `flex items-center`
  - under: ground=group · loading: the glyph, the path at half the row, the counts in a meta lane; loading, both grounds

### skeleton-glyph

- both densities: `shrink-0 size-icon rounded-full bg-skeleton`
  - cell: `SKELETON {kind: icon}`; overlay: `shrink-0`
  - under: ground=list · loading: the glyph, the path at half the row, the counts in a meta lane; ground=group · loading: the glyph, the path at half the row, the counts in a meta lane; and 1 more frames

### skeleton-lane

- both densities: `flex grow min-w-0`
  - cell: none; overlay: `flex grow min-w-0`
  - under: ground=list · loading: the glyph, the path at half the row, the counts in a meta lane; ground=group · loading: the glyph, the path at half the row, the counts in a meta lane; and 1 more frames
- both densities: `flex basis-0 grow justify-end min-w-0 max-w-measure-short text-meta`
  - cell: `SKELETON_LANE {role: meta}`; overlay: `flex basis-0 grow justify-end min-w-0 text-meta`
  - under: ground=list · loading: the glyph, the path at half the row, the counts in a meta lane; ground=group · loading: the glyph, the path at half the row, the counts in a meta lane; and 1 more frames

### skeleton-bar

- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: ground=list · loading: the glyph, the path at half the row, the counts in a meta lane; ground=group · loading: the glyph, the path at half the row, the counts in a meta lane; and 1 more frames
- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: ground=list · loading: the glyph, the path at half the row, the counts in a meta lane; ground=group · loading: the glyph, the path at half the row, the counts in a meta lane; and 1 more frames

## Comparison

Board 51.

The card is a composed `Group` whose children are the rows. On touch the label stands over its values (`touch:basis-full` on the label cell) and the head's empty cell leaves the layout and stays the head row's first cell for assistive tech (`touch:sr-only`).

### comparison

- both densities: `flex flex-col overflow-hidden rounded-card border border-edge bg-surface divide-y divide-edge`
  - composes Group, the rows its children, which draws its own cells; its root's overlay: `flex flex-col overflow-hidden` over `GROUP`
  - under: Comparison · two cells: a plan change, the column labels the cells' own labels in the header row (meta 500)…; Comparison · three cells, a row with a chip (Chip neutral) beside its label; and 3 more frames

### comparison-head

- both densities: `flex items-baseline gap-pair min-h-row py-inside px-card flex-wrap`
  - cell: `COMPARISON_ROW`; overlay: `flex items-baseline flex-wrap`
  - under: Comparison · two cells: a plan change, the column labels the cells' own labels in the header row (meta 500)…; Comparison · three cells, a row with a chip (Chip neutral) beside its label; and 1 more frames
- both densities: `flex items-center gap-pair min-h-row py-inside px-card flex-wrap`
  - cell: `COMPARISON_ROW`; overlay: `flex items-center flex-wrap`
  - under: Comparison · loading: the header row and four rows at the row height (32), a bar per column; loading

### comparison-head › span

- both densities: `basis-0 grow min-w-0 touch:sr-only`
  - cell: none; overlay: `basis-0 grow min-w-0 touch:sr-only`
  - under: Comparison · two cells: a plan change, the column labels the cells' own labels in the header row (meta 500)…; Comparison · three cells, a row with a chip (Chip neutral) beside its label; and 3 more frames
- both densities: `basis-0 grow min-w-0 wrap-break-word text-meta leading-meta font-medium text-ink-meta`
  - cell: `TEXT {role: meta} + TEXT_STRONG {role: meta}`; overlay: `basis-0 grow min-w-0 wrap-break-word`
  - under: Comparison · two cells: a plan change, the column labels the cells' own labels in the header row (meta 500)…; Comparison · three cells, a row with a chip (Chip neutral) beside its label; and 1 more frames

### comparison-row

- both densities: `flex items-baseline gap-pair min-h-row py-inside px-card flex-wrap`
  - cell: `COMPARISON_ROW`; overlay: `flex items-baseline flex-wrap`
  - under: Comparison · two cells: a plan change, the column labels the cells' own labels in the header row (meta 500)…; Comparison · three cells, a row with a chip (Chip neutral) beside its label; and 1 more frames

### comparison-row › span

- both densities: `flex flex-wrap basis-0 grow min-w-0 items-center gap-inside touch:basis-full`
  - cell: `COMPARISON_LABEL`; overlay: `flex flex-wrap basis-0 grow min-w-0 items-center touch:basis-full`
  - under: Comparison · two cells: a plan change, the column labels the cells' own labels in the header row (meta 500)…; Comparison · three cells, a row with a chip (Chip neutral) beside its label; and 1 more frames
- both densities: `min-w-0 wrap-break-word text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `min-w-0 wrap-break-word`
  - under: Comparison · two cells: a plan change, the column labels the cells' own labels in the header row (meta 500)…; Comparison · three cells, a row with a chip (Chip neutral) beside its label; and 1 more frames
- both densities: `basis-0 grow min-w-0 wrap-break-word text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `basis-0 grow min-w-0 wrap-break-word`
  - under: Comparison · two cells: a plan change, the column labels the cells' own labels in the header row (meta 500)…; Comparison · three cells, a row with a chip (Chip neutral) beside its label; and 1 more frames

### chip

- both densities: `inline-flex shrink-0 items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-neutral-soft text-chip-neutral-ink`
  - cell: `CHIP {family: neutral, trailing: none}`; overlay: `inline-flex shrink-0 items-center min-w-0`
  - under: Comparison · three cells, a row with a chip (Chip neutral) beside its label; the label over its values: the desktop's row with the label on its own line, so each value column takes a w…

### chip-label

- both densities: `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal text-chip-neutral-ink`
  - cell: `CHIP_LABEL {family: neutral}`; overlay: `truncate`
  - under: Comparison · three cells, a row with a chip (Chip neutral) beside its label; the label over its values: the desktop's row with the label on its own line, so each value column takes a w…

### skeleton-lane

- both densities: `flex items-center h-lh basis-0 grow min-w-0 text-meta leading-meta`
  - cell: `LINE_BOX {role: meta}`; overlay: `flex items-center h-lh basis-0 grow min-w-0`
  - under: Comparison · loading: the header row and four rows at the row height (32), a bar per column; loading
- both densities: `flex items-center h-lh basis-0 grow min-w-0 text-body leading-body touch:basis-full`
  - cell: `LINE_BOX {role: body}`; overlay: `flex items-center h-lh basis-0 grow min-w-0 touch:basis-full`
  - under: Comparison · loading: the header row and four rows at the row height (32), a bar per column; loading
- both densities: `flex items-center h-lh basis-0 grow min-w-0 text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `flex items-center h-lh basis-0 grow min-w-0`
  - under: Comparison · loading: the header row and four rows at the row height (32), a bar per column; loading

### skeleton-bar

- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: Comparison · loading: the header row and four rows at the row height (32), a bar per column; loading
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: Comparison · loading: the header row and four rows at the row height (32), a bar per column; loading
- both densities: `h-skeleton w-2/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-2/3`
  - under: Comparison · loading: the header row and four rows at the row height (32), a bar per column; loading

### skeleton-row

- both densities: `flex items-center gap-pair min-h-row py-inside px-card flex-wrap`
  - cell: `COMPARISON_ROW`; overlay: `flex items-center flex-wrap`
  - under: Comparison · loading: the header row and four rows at the row height (32), a bar per column; loading

## Table

Board 52.

From tablet up the grid (the desktop board and the tablet board, 768 at the touch density); below tablet (the touch board, 390) a composed Picker at its row fit (the sort) over a composed List of ListRows, whose strings are shared-overlays.md's. A column's width (`col`) is the column's `width`; the tablet board stands every column at `measure-short`. The frozen leading column (tablet) is `TABLE_FROZEN` on its `td`/`th` under the structural `sticky left-0 z-1`, its content `TABLE_FROZEN_CELL` by the row's state. Every body cell rings inward as the cell cursor (`focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`), the drawn cursor the static ring. A cell's edit composes the Input (`FIELD` at the bar fit), the Picker (its field fit) or the Checkbox, the cell its target.

### table-frame

- desktop: `flex flex-col -mx-control-x`
  - cell: `TABLE_FRAME`; overlay: `flex flex-col`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 14 more frames

### table

- desktop: `w-full table-fixed text-body`
  - cell: `TABLE`; overlay: `w-full table-fixed`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 14 more frames
- tablet (768, touch density): `w-max table-fixed text-body`
  - cell: `TABLE`; overlay: `w-max table-fixed`
  - under: From tablet up the Table is the grid. On touch it stands at the touch density (rows and header 48, body 16)…; Scrolled 120 px (the board sets scrollLeft on load): the frozen leading cell, header and body, stands over …; and 7 more frames

### table › col

- desktop: `w-1/4`
  - cell: none; overlay: `w-1/4`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 14 more frames
- desktop, tablet (768, touch density): `w-measure-short`
  - cell: none; overlay: `w-measure-short`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames

### table-head-row

- desktop, tablet (768, touch density): `border-b border-edge`
  - cell: `TABLE_ROW {state: rest}`; overlay: none
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames

### table-head-row › th

- desktop, tablet (768, touch density): `p-0 font-normal text-start`
  - cell: none; overlay: `p-0 font-normal text-start`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames
- desktop, tablet (768, touch density): `p-0 font-normal text-end`
  - cell: none; overlay: `p-0 font-normal text-end`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames
- tablet (768, touch density): `p-0 font-normal text-start sticky left-0 z-1 bg-surface`
  - cell: `TABLE_FROZEN`; overlay: `p-0 font-normal text-start sticky left-0 z-1`
  - under: From tablet up the Table is the grid. On touch it stands at the touch density (rows and header 48, body 16)…; Scrolled 120 px (the board sets scrollLeft on load): the frozen leading cell, header and body, stands over …; and 7 more frames

### table-sort

- desktop, tablet (768, touch density): `flex items-center w-full min-w-0 gap-inside min-h-row border-x border-transparent px-control-x`
  - cell: `TABLE_HEAD {state: rest}`; overlay: `flex items-center w-full min-w-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames
- desktop, tablet (768, touch density): `flex items-center w-full min-w-0 gap-inside min-h-row border-x border-transparent px-control-x justify-end`
  - cell: `TABLE_HEAD {state: rest}`; overlay: `flex items-center w-full min-w-0 justify-end`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames
- desktop: `flex items-center w-full min-w-0 gap-inside min-h-row border-x border-transparent px-control-x bg-wash-hover`
  - cell: `TABLE_HEAD {state: highlighted}`; overlay: `flex items-center w-full min-w-0`
  - under: pointer on Queue (wash-hover, the both-ways arrow); Last run pressed (wash-press)
- desktop, tablet (768, touch density): `flex items-center w-full min-w-0 gap-inside min-h-row border-x border-transparent px-control-x bg-wash-press`
  - cell: `TABLE_HEAD {state: pressed}`; overlay: `flex items-center w-full min-w-0`
  - under: pointer on Queue (wash-hover, the both-ways arrow); Last run pressed (wash-press); Sorting: the header as on the desktop at the touch row's 48; top, sorted by Updated with Queue pressed; bel…
- desktop: `flex items-center w-full min-w-0 gap-inside min-h-row border-x border-transparent px-control-x outline-2 -outline-offset-2 outline-ring`
  - cell: `TABLE_HEAD {state: rest}`; overlay: `flex items-center w-full min-w-0 outline-2 -outline-offset-2 outline-ring`
  - under: sorted by Retries, ascending: the arrow leads the end-aligned label; Job focused by the keyboard (the ring …
- tablet (768, touch density): `flex items-center w-full min-w-0 gap-inside min-h-row border-x border-transparent px-control-x border-r-edge`
  - cell: `TABLE_HEAD {state: rest} + TABLE_FROZEN_CELL {state: rest}`; overlay: `flex items-center w-full min-w-0`
  - under: From tablet up the Table is the grid. On touch it stands at the touch density (rows and header 48, body 16)…; Scrolled 120 px (the board sets scrollLeft on load): the frozen leading cell, header and body, stands over …; and 7 more frames
- tablet (768, touch density): `flex items-center w-full min-w-0 gap-inside min-h-row border-x border-transparent px-control-x outline-2 -outline-offset-2 outline-ring border-r-edge`
  - cell: `TABLE_HEAD {state: rest} + TABLE_FROZEN_CELL {state: rest}`; overlay: `flex items-center w-full min-w-0 outline-2 -outline-offset-2 outline-ring`
  - under: Sorting: the header as on the desktop at the touch row's 48; top, sorted by Updated with Queue pressed; bel…

### table-sort › span

- desktop, tablet (768, touch density): `truncate text-meta leading-meta font-medium text-ink-meta`
  - cell: `TABLE_HEAD_LABEL {sort: none}`; overlay: `truncate`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames
- desktop, tablet (768, touch density): `truncate text-meta leading-meta font-medium text-ink-body`
  - cell: `TABLE_HEAD_LABEL {sort: sorted}`; overlay: `truncate`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames

### table-head

- desktop, tablet (768, touch density): `flex items-center min-w-0 min-h-row border-x border-transparent px-control-x`
  - cell: `TABLE_CELL`; overlay: `flex items-center min-w-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames

### table-head › span

- desktop, tablet (768, touch density): `truncate text-meta leading-meta font-medium text-ink-meta`
  - cell: `TABLE_HEAD_LABEL {sort: none}`; overlay: `truncate`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames

### table-sort › svg

- desktop, tablet (768, touch density): `shrink-0 size-icon-meta text-ink-body`
  - cell: `ICON {fit: meta}`; overlay: `shrink-0 text-ink-body`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 23 more frames
- desktop, tablet (768, touch density): `shrink-0 size-icon-meta text-ink-meta`
  - cell: `ICON {fit: meta}`; overlay: `shrink-0 text-ink-meta`
  - under: pointer on Queue (wash-hover, the both-ways arrow); Last run pressed (wash-press); sorted by Retries, ascending: the arrow leads the end-aligned label; Job focused by the keyboard (the ring …; and 1 more frames

### table-row

- desktop, tablet (768, touch density): `border-b border-edge`
  - cell: `TABLE_ROW {state: rest}`; overlay: none
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames
- desktop: `border-b border-edge bg-wash-hover`
  - cell: `TABLE_ROW {state: highlighted}`; overlay: none
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 2 more frames
- desktop, tablet (768, touch density): `border-b border-edge bg-wash-press`
  - cell: `TABLE_ROW {state: pressed}`; overlay: none
  - under: Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; Row states on touch (no pointer hover): rest; pressed (wash-press); selected (the record open in its sheet,…
- desktop, tablet (768, touch density): `border-b border-edge bg-wash-selected`
  - cell: `TABLE_ROW {state: selected}`; overlay: none
  - under: Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; Opening a row (onOpen, which onEdit requires): pressing any part of a row that is not an editable cell, or …; and 1 more frames
- desktop: `border-b border-edge bg-wash-selected-hover`
  - cell: `TABLE_ROW {state: selected-hover}`; overlay: none
  - under: Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…

### table-row › td

- desktop, tablet (768, touch density): `p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - cell: none; overlay: `p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames
- desktop, tablet (768, touch density): `p-0 outline-2 -outline-offset-2 outline-ring`
  - cell: none; overlay: `p-0 outline-2 -outline-offset-2 outline-ring`
  - under: the cursor on a plain cell (Last run of Invoice sweep): arrows move on; on an editable cell (Schedule): Enter or Space swaps the Input in; and 4 more frames
- tablet (768, touch density): `p-0 sticky left-0 z-1 bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - cell: `TABLE_FROZEN`; overlay: `p-0 sticky left-0 z-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`
  - under: From tablet up the Table is the grid. On touch it stands at the touch density (rows and header 48, body 16)…; Scrolled 120 px (the board sets scrollLeft on load): the frozen leading cell, header and body, stands over …; and 5 more frames
- tablet (768, touch density): `p-0 sticky left-0 z-1 bg-surface outline-2 -outline-offset-2 outline-ring`
  - cell: `TABLE_FROZEN`; overlay: `p-0 sticky left-0 z-1 outline-2 -outline-offset-2 outline-ring`
  - under: Row states on touch (no pointer hover): rest; pressed (wash-press); selected (the record open in its sheet,…

### table-cell

- desktop, tablet (768, touch density): `flex items-center min-w-0 min-h-row border-x border-transparent px-control-x`
  - cell: `TABLE_CELL`; overlay: `flex items-center min-w-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 21 more frames
- desktop, tablet (768, touch density): `flex items-center min-w-0 min-h-row border-x border-transparent px-control-x justify-end`
  - cell: `TABLE_CELL`; overlay: `flex items-center min-w-0 justify-end`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 21 more frames
- tablet (768, touch density): `flex items-center min-w-0 min-h-row border-x border-transparent px-control-x border-r-edge`
  - cell: `TABLE_CELL + TABLE_FROZEN_CELL {state: rest}`; overlay: `flex items-center min-w-0`
  - under: From tablet up the Table is the grid. On touch it stands at the touch density (rows and header 48, body 16)…; Scrolled 120 px (the board sets scrollLeft on load): the frozen leading cell, header and body, stands over …; and 6 more frames
- tablet (768, touch density): `flex items-center min-w-0 min-h-row border-x border-transparent px-control-x bg-wash-press border-r-edge`
  - cell: `TABLE_CELL + TABLE_FROZEN_CELL {state: pressed}`; overlay: `flex items-center min-w-0`
  - under: Row states on touch (no pointer hover): rest; pressed (wash-press); selected (the record open in its sheet,…
- tablet (768, touch density): `flex items-center min-w-0 min-h-row border-x border-transparent px-control-x bg-wash-selected border-r-edge`
  - cell: `TABLE_CELL + TABLE_FROZEN_CELL {state: selected}`; overlay: `flex items-center min-w-0`
  - under: Row states on touch (no pointer hover): rest; pressed (wash-press); selected (the record open in its sheet,…

### row-link

- desktop, tablet (768, touch density): `truncate text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `truncate`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames

### table-cell › span

- desktop, tablet (768, touch density): `truncate text-code leading-code font-normal text-ink-body font-mono`
  - cell: `TEXT {role: code}`; overlay: `truncate`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames
- desktop, tablet (768, touch density): `truncate tabular-nums text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body} + FIGURES`; overlay: `truncate`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames
- desktop, tablet (768, touch density): `truncate tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta} + FIGURES`; overlay: `truncate`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames
- desktop, tablet (768, touch density): `flex items-center gap-inside grow min-w-0`
  - cell: `STATUS`; overlay: `flex items-center grow min-w-0`
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…
- desktop, tablet (768, touch density): `size-dot rounded-full shrink-0 bg-skeleton`
  - cell: `SKELETON {kind: dot}`; overlay: `shrink-0`
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…

### chip

- desktop, tablet (768, touch density): `inline-flex items-center min-w-0 rounded-full px-inside min-h-chip bg-chip-teal-soft text-chip-teal-ink`
  - cell: `CHIP {family: teal, trailing: none}`; overlay: `inline-flex items-center min-w-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames

### chip-label

- desktop, tablet (768, touch density): `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal`
  - cell: `CHIP_LABEL {family: teal}`; overlay: `truncate`
  - the board's label predates the label's ink (`text-chip-teal-ink`); the Chip draws its cell whole
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames

### checkbox

- desktop, tablet (768, touch density): `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on`
  - cell: `CHECKBOX {state: checked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames
- desktop, tablet (768, touch density): `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip border border-edge-strong bg-surface`
  - cell: `CHECKBOX {state: unchecked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 13 more frames
- desktop: `relative inline-flex shrink-0 items-center justify-center overflow-hidden size-check rounded-chip bg-toggle-on-hover`
  - cell: `CHECKBOX {state: checked}`; overlay: `relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-toggle-on-hover`
  - the cell's `bg-toggle-on` is the rest look this state's overlay replaces
  - under: Edit, checkbox (CellCheck): the Checkbox stands in the cell at rest and edits with no swap, the cell its ta…

### checkbox › span

- desktop, tablet (768, touch density): `flex size-icon-meta text-on-accent`
  - cell: `CHECKBOX_MARK`; overlay: `flex`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames
- desktop: `absolute inset-0 bg-wash-hover`
  - cell: none; overlay: `absolute inset-0 bg-wash-hover`
  - under: Edit, checkbox (CellCheck): the Checkbox stands in the cell at rest and edits with no swap, the cell its ta…
- desktop, tablet (768, touch density): `absolute inset-0 bg-wash-press`
  - cell: none; overlay: `absolute inset-0 bg-wash-press`
  - under: Edit, checkbox (CellCheck): the Checkbox stands in the cell at rest and edits with no swap, the cell its ta…; checkbox: Search reindex's Alerts just ticked; Session purge's pressed

### checkbox › svg

- desktop, tablet (768, touch density): `w-full`
  - cell: none; overlay: `w-full`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames

### status

- desktop, tablet (768, touch density): `inline-flex items-center min-w-0 gap-inside`
  - cell: `STATUS`; overlay: `inline-flex items-center min-w-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames

### dot

- desktop, tablet (768, touch density): `size-dot rounded-full shrink-0 bg-ok`
  - cell: `STATUS_DOT {state: done}`; overlay: `shrink-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 18 more frames
- desktop, tablet (768, touch density): `size-dot rounded-full shrink-0 bg-accent-ink`
  - cell: `STATUS_DOT {state: active}`; overlay: `shrink-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 14 more frames
- desktop, tablet (768, touch density): `size-dot rounded-full shrink-0 bg-danger`
  - cell: `STATUS_DOT {state: failed}`; overlay: `shrink-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 14 more frames
- desktop, tablet (768, touch density): `size-dot rounded-full shrink-0 border border-ink-meta`
  - cell: `STATUS_DOT {state: idle}`; overlay: `shrink-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 8 more frames
- desktop, tablet (768, touch density): `size-dot rounded-full shrink-0 bg-ink-meta`
  - cell: `STATUS_DOT {state: waiting}`; overlay: `shrink-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 4 more frames
- desktop, tablet (768, touch density): `size-dot rounded-full shrink-0 bg-warn`
  - cell: `STATUS_DOT {state: attention}`; overlay: `shrink-0`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 5 more frames

### status-label

- desktop, tablet (768, touch density): `truncate max-w-measure-short text-meta leading-meta font-normal text-ink-meta`
  - cell: `STATUS_LABEL`; overlay: `truncate`
  - under: Table in its Place, every column kind: Job (text, the leading cell at body 500, the row's name), Schedule (…; Row states (TABLE_ROW): rest; highlighted (pointer, wash-hover); pressed (wash-press); selected (the row wh…; and 19 more frames

### cell-input

- desktop: `flex items-center w-full gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge-hover`
  - cell: `FIELD {fit: bar, trailing: none, state: rest}`; overlay: `flex items-center w-full border-edge-hover`
  - the cell's `border-edge` is the rest look this state's overlay replaces
  - under: An editable cell under the pointer shows the field it becomes (FIELD at the bar fit, 28, the hover boundary…
- desktop, tablet (768, touch density): `flex items-center w-full gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {fit: bar, trailing: none, state: rest}`; overlay: `flex items-center w-full outline-2 outline-offset-2 outline-ring`
  - under: Edit, input (CellInput): the cell swaps for the Input at the bar fit (28) inside the row's 32, its text at …; input open: Schedule of Invoice sweep

### cell-input › span

- desktop, tablet (768, touch density): `min-w-0 grow truncate text-code leading-code font-normal font-mono text-ink-body`
  - cell: `TEXT {role: code}`; overlay: `min-w-0 grow truncate`
  - under: An editable cell under the pointer shows the field it becomes (FIELD at the bar fit, 28, the hover boundary…; Edit, input (CellInput): the cell swaps for the Input at the bar fit (28) inside the row's 32, its text at …; and 1 more frames
- desktop: `min-w-0 grow truncate text-end tabular-nums text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body} + FIGURES`; overlay: `min-w-0 grow truncate text-end`
  - under: Edit, input (CellInput): the cell swaps for the Input at the bar fit (28) inside the row's 32, its text at …

### cell-picker

- desktop: `relative flex items-center w-full text-start gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge-hover`
  - composes Picker at its field fit (the cell's edit), which draws its own cells; its root's overlay: `relative flex items-center w-full text-start border-edge-hover` over `FIELD {fit: bar, trailing: none, state: rest} + PICKER {fit: field}`
  - the cell's `border-edge` is the rest look this state's overlay replaces
  - under: An editable cell under the pointer shows the field it becomes (FIELD at the bar fit, 28, the hover boundary…
- desktop, tablet (768, touch density): `relative flex items-center w-full text-start gap-inside rounded-control border bg-surface min-h-control-compact px-control-x border-edge outline-2 outline-offset-2 outline-ring`
  - composes Picker at its field fit (the cell's edit), which draws its own cells; its root's overlay: `relative flex items-center w-full text-start outline-2 outline-offset-2 outline-ring` over `FIELD {fit: bar, trailing: none, state: rest} + PICKER {fit: field}`
  - under: Edit, picker (CellPick): the cell swaps for the Picker's trigger (the field box at the bar fit with the chi…; picker open: Queue of Invoice sweep, the pick sheet over the screen

### table-cell › svg

- desktop: `shrink-0 size-icon text-ink-body`
  - cell: `ICON {fit: body}`; overlay: `shrink-0 text-ink-body`
  - under: An editable cell under the pointer shows the field it becomes (FIELD at the bar fit, 28, the hover boundary…

### table-row › div

- desktop: `relative flex`
  - cell: none; overlay: `relative flex`
  - under: Edit, picker (CellPick): the cell swaps for the Picker's trigger (the field box at the bar fit with the chi…

### popover-anchor

- desktop: `absolute left-0 top-full pt-pair`
  - cell: none; overlay: `absolute left-0 top-full pt-pair`
  - under: Edit, picker (CellPick): the cell swaps for the Picker's trigger (the field box at the bar fit with the chi…

### popover

- desktop: `flex flex-col gap-pair w-popover p-float bg-raised border border-edge-raised rounded-popover shadow-float`
  - composes Picker (its popover), which draws its own cells; its root's overlay: `flex flex-col` over `POPOVER + PICKER_POPOVER`
  - under: Edit, picker (CellPick): the cell swaps for the Picker's trigger (the field box at the bar fit with the chi…

### skeleton-row

- desktop, tablet (768, touch density): `border-b border-edge`
  - cell: `TABLE_ROW {state: rest}`; overlay: none
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…

### skeleton-row › td

- desktop, tablet (768, touch density): `p-0`
  - cell: none; overlay: `p-0`
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…
- tablet (768, touch density): `p-0 sticky left-0 z-1 bg-surface`
  - cell: `TABLE_FROZEN`; overlay: `p-0 sticky left-0 z-1`
  - under: Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…

### skeleton-bar

- desktop, tablet (768, touch density): `h-skeleton w-2/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-2/3`
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…
- desktop, tablet (768, touch density): `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…
- desktop, tablet (768, touch density): `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…
- desktop, tablet (768, touch density): `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…
- desktop, tablet (768, touch density): `h-skeleton w-3/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-3/4`
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…

### skeleton-check

- desktop, tablet (768, touch density): `size-check rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: check}`; overlay: none
  - under: Loading: the header is real (the columns are known); each row stands at its loaded height (32 + the hairlin…; Loading: the header real, each row at the loaded 48 + the hairline, each cell's skeleton at its column's wi…

### empty-state

- desktop, tablet (768, touch density): `flex justify-center p-page`
  - cell: `TABLE_EMPTY`; overlay: `flex flex-col grow`; the slot the grid holds its `empty` in, the consumer's EmptyState inside it drawing its own cells
- touch: the consumer's EmptyState alone in the body, which draws its own root and cells
  - under: Empty (empty, no rows): the header stays, so the columns tell what will land here; under it the consumer's …; Empty: the consumer's EmptyState alone in the body, with no sort pick (nothing to sort); the Place's floati…; and 1 more frames

### table-sort-bar

- touch: `flex items-center justify-end`
  - cell: none; overlay: `flex items-center justify-end`
  - under: Below tablet the Table is one row per record, a ListRow (board 40) built from the columns: the leading colu…; Sorting: the pick opens the pick sheet of the sortable columns over the scrim (board 41's touch Picker, tit…; and 1 more frames

### picker

- touch: `inline-flex shrink-0 items-center gap-inside rounded-full px-inside min-h-target -me-inside text-ink-meta`
  - composes Picker at its row fit (the sort pick), which draws its own cells; its root's overlay: `inline-flex shrink-0 items-center -me-inside` over `PILL_ACT + PICKER {fit: row}`
  - under: Below tablet the Table is one row per record, a ListRow (board 40) built from the columns: the leading colu…; Sorting: the pick opens the pick sheet of the sortable columns over the scrim (board 41's touch Picker, tit…; and 1 more frames

### list

- touch: `flex flex-col gap-rows -mx-control-x`
  - composes List, its rows ListRows, which draws its own cells; its root's overlay: `flex flex-col` over `LIST`
  - under: Below tablet the Table is one row per record, a ListRow (board 40) built from the columns: the leading colu…; Sorting: the pick opens the pick sheet of the sortable columns over the scrim (board 41's touch Picker, tit…; and 1 more frames

### table-scroll

- tablet (768, touch density): `flex flex-col -mx-control-x overflow-x-auto`
  - cell: `TABLE_FRAME`; overlay: `flex flex-col overflow-x-auto`
  - under: From tablet up the Table is the grid. On touch it stands at the touch density (rows and header 48, body 16)…; Scrolled 120 px (the board sets scrollLeft on load): the frozen leading cell, header and body, stands over …; and 7 more frames

## Message

Board 53.

A reply's body is a composed `Prose`, recorded at its root. `you` names its speaker in a visually hidden head (`sr-only`). The thread on the board (`thread`: the messages `gap-sections` apart in a measure-wide column) and the pane around it are not a Message's parts.

### message

- both densities: `flex items-center justify-center min-h-target text-center`
  - cell: `MESSAGE {author: system}`; overlay: `flex items-center justify-center text-center`
  - under: Light, desktop density; system, rest: system, rest: one meta line centred in a row at the target height, the time beside it; and 7 more frames
- both densities: `flex flex-col items-end gap-pair`
  - cell: `MESSAGE {author: you}`; overlay: `flex flex-col items-end`
  - under: Light, desktop density; you, rest: you, rest: one line, the time under it; the name a visually hidden head (sr-only), read before t…; and 3 more frames
- both densities: `flex flex-col gap-pair`
  - cell: `MESSAGE {author: other}`; overlay: `flex flex-col`
  - under: Light, desktop density; other, rest: other, rest: the name at body 500 and the time beside it, the body Prose (its blocks a fields …; and 3 more frames

### message › p

- both densities: `inline-flex flex-wrap justify-center gap-x-inside min-w-0`
  - cell: `MESSAGE_LINE`; overlay: `inline-flex flex-wrap justify-center min-w-0`
  - under: Light, desktop density; system, rest: system, rest: one meta line centred in a row at the target height, the time beside it; and 2 more frames

### message › span

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: Light, desktop density; system, rest: system, rest: one meta line centred in a row at the target height, the time beside it; and 2 more frames
- both densities: `flex items-center h-lh text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `flex items-center h-lh`
  - under: other, loading: other, loading: the name line and three body lines
- both densities: `flex items-center h-lh text-meta leading-meta w-1/3`
  - cell: `LINE_BOX {role: meta}`; overlay: `flex items-center h-lh w-1/3`
  - under: system, loading: system, loading: the meta line box, a third of the column, in the row at the target height

### at

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: Light, desktop density; you, rest: you, rest: one line, the time under it; the name a visually hidden head (sr-only), read before t…; and 8 more frames

### head

- both densities: `sr-only`
  - cell: none; overlay: `sr-only`
  - under: Light, desktop density; you, rest: you, rest: one line, the time under it; the name a visually hidden head (sr-only), read before t…; and 2 more frames
- both densities: `flex items-baseline gap-inside`
  - cell: `MESSAGE_HEAD`; overlay: `flex items-baseline`
  - under: Light, desktop density; other, rest: other, rest: the name at body 500 and the time beside it, the body Prose (its blocks a fields …; and 1 more frames

### bubble

- both densities: `max-w-4/5 rounded-card bg-group px-tile py-pair`
  - cell: `MESSAGE_BUBBLE`; overlay: `max-w-4/5`
  - under: Light, desktop density; you, rest: you, rest: one line, the time under it; the name a visually hidden head (sr-only), read before t…; and 2 more frames
- both densities: `w-1/2 rounded-card bg-group px-tile py-pair`
  - cell: `MESSAGE_BUBBLE`; overlay: `w-1/2`
  - under: you, loading: you, loading: the bubble at its one-line height, the bar in the body line box

### bubble › p

- both densities: `whitespace-pre-wrap text-body leading-body font-normal text-ink-body`
  - cell: `TEXT {role: body}`; overlay: `whitespace-pre-wrap`
  - under: Light, desktop density; you, rest: you, rest: one line, the time under it; the name a visually hidden head (sr-only), read before t…; and 2 more frames

### name

- both densities: `text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: none
  - under: Light, desktop density; other, rest: other, rest: the name at body 500 and the time beside it, the body Prose (its blocks a fields …; and 1 more frames

### open

- both densities: `inline-flex items-center gap-inside min-w-0 rounded-control px-inside min-h-target text-ink-meta`
  - cell: `MESSAGE_OPEN`; overlay: `inline-flex items-center min-w-0`
  - under: Light, desktop density; system with onOpen, rest: system with onOpen, rest: the line is the act, a chevron after it; the hit box th…; and 1 more frames
- both densities: `inline-flex items-center gap-inside min-w-0 rounded-control px-inside min-h-target text-ink-meta bg-wash-hover`
  - cell: `MESSAGE_OPEN`; overlay: `inline-flex items-center min-w-0 bg-wash-hover`
  - under: system with onOpen, hover: system with onOpen, hover: the line is the act, a chevron after it
- both densities: `inline-flex items-center gap-inside min-w-0 rounded-control px-inside min-h-target text-ink-meta outline-2 outline-offset-2 outline-ring`
  - cell: `MESSAGE_OPEN`; overlay: `inline-flex items-center min-w-0 outline-2 outline-offset-2 outline-ring`
  - under: system with onOpen, focus: system with onOpen, focus: the line is the act, a chevron after it
- both densities: `inline-flex items-center gap-inside min-w-0 rounded-control px-inside min-h-target text-ink-meta bg-wash-press`
  - cell: `MESSAGE_OPEN`; overlay: `inline-flex items-center min-w-0 bg-wash-press`
  - under: system with onOpen, active: system with onOpen, active: the line is the act, a chevron after it

### open › span

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: Light, desktop density; system with onOpen, rest: system with onOpen, rest: the line is the act, a chevron after it; the hit box th…; and 4 more frames

### open › svg

- both densities: `size-icon-meta shrink-0`
  - cell: `ICON {fit: meta}`; overlay: `shrink-0`
  - under: Light, desktop density; system with onOpen, rest: system with onOpen, rest: the line is the act, a chevron after it; the hit box th…; and 4 more frames

### bubble › span

- both densities: `flex items-center h-lh text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `flex items-center h-lh`
  - under: you, loading: you, loading: the bubble at its one-line height, the bar in the body line box

### skeleton-bar

- both densities: `h-skeleton w-full rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-full`
  - under: you, loading: you, loading: the bubble at its one-line height, the bar in the body line box; system, loading: system, loading: the meta line box, a third of the column, in the row at the target height
- both densities: `h-skeleton w-1/5 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/5`
  - under: other, loading: other, loading: the name line and three body lines

### prose

- both densities: `flex flex-col gap-sections min-w-0 max-w-measure text-body leading-body`
  - composes Prose, which draws its own cells; its root's overlay: `flex flex-col min-w-0` over `PROSE`
  - under: other, loading: other, loading: the name line and three body lines

## MessageInput

Board 53.

The desktop draws the stacked box (`MESSAGE_INPUT_BOX`), touch and native one row (`MESSAGE_INPUT_ROW`, the field `FIELD` at the bar fit over `MESSAGE_INPUT_FIELD`): a structure that follows density, chosen as the Shell's is. Send and Stop share one grid cell (`col-start-1 row-start-1`), the absent act `invisible`. The box's hover, focus and disabled looks are overlays over its rest cell, as the Input's are (`border-edge-hover`, the ring on focus-within, `bg-fill-disabled`). The disabled frame is the `disabled` prop (the Input atom's).

### message-input-root

- both densities: `flex flex-col gap-pair w-full`
  - cell: `MESSAGE_INPUT`; overlay: `flex flex-col w-full`
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 14 more frames

### message-input

- desktop: `flex flex-col gap-rows rounded-card border border-edge bg-surface p-inside`
  - cell: `MESSAGE_INPUT_BOX`; overlay: `flex flex-col`
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 10 more frames
- desktop: `flex flex-col gap-rows rounded-card border border-edge-hover bg-surface p-inside`
  - cell: `MESSAGE_INPUT_BOX`; overlay: `flex flex-col border-edge-hover`
  - the cell's `border-edge` is the rest look this state's overlay replaces
  - under: hover: hover: the boundary steps to edge-hover
- desktop: `flex flex-col gap-rows rounded-card border border-edge bg-surface p-inside outline-2 outline-offset-2 outline-ring`
  - cell: `MESSAGE_INPUT_BOX`; overlay: `flex flex-col outline-2 outline-offset-2 outline-ring`
  - under: focus: focus: the ring around the whole box (focus-within)
- desktop: `flex flex-col gap-rows rounded-card border border-edge bg-fill-disabled p-inside`
  - cell: `MESSAGE_INPUT_BOX`; overlay: `flex flex-col bg-fill-disabled`
  - the cell's `bg-surface` is the rest look this state's overlay replaces
  - under: disabled: disabled: the disabled fill and ink, no Attach (IconButton has no disabled form), Send disabled; …
- touch: `flex items-end gap-inside`
  - cell: `MESSAGE_INPUT_ROW`; overlay: `flex items-end`
  - under: Light, touch density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 13 more frames

### text

- desktop: `px-inside py-inside`
  - cell: `MESSAGE_INPUT_TEXT`; overlay: none
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 13 more frames

### text › textarea

- desktop: `block w-full resize-none field-sizing-content max-h-message-input overflow-y-auto text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + MESSAGE_INPUT_VALUE`; overlay: `block w-full resize-none field-sizing-content overflow-y-auto text-ink-meta`
  - the cell's `text-ink-body` is the rest look this state's overlay replaces
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 5 more frames
- desktop: `block w-full resize-none field-sizing-content max-h-message-input overflow-y-auto text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text} + MESSAGE_INPUT_VALUE`; overlay: `block w-full resize-none field-sizing-content overflow-y-auto`
  - under: idle, value: idle, value: Send is the screen's one filled act; hover: hover: the boundary steps to edge-hover; and 5 more frames
- desktop: `block w-full resize-none field-sizing-content max-h-message-input overflow-y-auto text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_VALUE {kind: text} + MESSAGE_INPUT_VALUE`; overlay: `block w-full resize-none field-sizing-content overflow-y-auto text-ink-disabled`
  - the cell's `text-ink-body` is the rest look this state's overlay replaces
  - under: disabled: disabled: the disabled fill and ink, no Attach (IconButton has no disabled form), Send disabled; …

### foot

- desktop: `flex items-center gap-inside`
  - cell: `MESSAGE_INPUT_FOOT`; overlay: `flex items-center`
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 13 more frames

### attach

- both densities: `relative inline-flex items-center justify-center shrink-0 rounded-control size-control-compact text-ink-meta`
  - cell: `ICON_BUTTON {fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 13 more frames

### attach › svg

- both densities: `size-icon-control shrink-0`
  - cell: `ICON {fit: control}`; overlay: `shrink-0`
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 13 more frames

### foot › span

- desktop: `grow`
  - cell: none; overlay: `grow`
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 13 more frames

### act-slot

- both densities: `grid shrink-0`
  - cell: none; overlay: `grid shrink-0`
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 14 more frames

### button

- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact shrink-0 col-start-1 row-start-1 invisible bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 col-start-1 row-start-1 invisible`
  - under: Light, desktop density; working: working: Stop, the hairline act, in Send's place; the field stays open; and 3 more frames
- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact shrink-0 col-start-1 row-start-1 border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 col-start-1 row-start-1`
  - under: Light, desktop density; working: working: Stop, the hairline act, in Send's place; the field stays open; and 2 more frames
- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact shrink-0 border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0`
  - under: Light, desktop density; notice with its act: notice with its act: the sentence at meta, the act the hairline Button at bar fit, und…; and 2 more frames
- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact shrink-0 col-start-1 row-start-1 bg-fill-disabled text-ink-disabled`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 col-start-1 row-start-1 bg-fill-disabled text-ink-disabled`
  - the cell's `bg-act-accent text-on-act-accent` is the rest look this state's overlay replaces
  - under: idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; notice with its act: notice with its act: the sentence at meta, the act the hairline Button at bar fit, und…; and 3 more frames
- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact shrink-0 col-start-1 row-start-1 invisible border border-edge text-ink-body`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 col-start-1 row-start-1 invisible`
  - under: idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; idle, value: idle, value: Send is the screen's one filled act; and 9 more frames
- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact shrink-0 col-start-1 row-start-1 bg-act-accent text-on-act-accent`
  - cell: `BUTTON {act: primary, fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 col-start-1 row-start-1`
  - under: idle, value: idle, value: Send is the screen's one filled act; hover: hover: the boundary steps to edge-hover; and 4 more frames
- both densities: `relative inline-flex items-center justify-center gap-inside rounded-control px-control-x min-h-control-compact shrink-0 col-start-1 row-start-1 border border-edge text-ink-disabled`
  - cell: `BUTTON {act: secondary, fit: bar}`; overlay: `relative inline-flex items-center justify-center shrink-0 col-start-1 row-start-1 text-ink-disabled`
  - the cell's `text-ink-body` is the rest look this state's overlay replaces
  - under: working without onStop: working without onStop: Stop drawn disabled

### button › span

- both densities: `truncate text-body leading-body font-medium text-on-act-accent`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate`
  - under: Light, desktop density; idle, value: idle, value: Send is the screen's one filled act; and 9 more frames
- both densities: `truncate text-body leading-body font-medium text-ink-body`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate`
  - under: Light, desktop density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 13 more frames
- both densities: `truncate text-body leading-body font-medium text-ink-disabled`
  - cell: `BUTTON_LABEL {act: primary}`; overlay: `truncate text-ink-disabled`
  - the cell's `text-on-act-accent` is the rest look this state's overlay replaces
  - under: idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; working without onStop: working without onStop: Stop drawn disabled; and 4 more frames
- both densities: `truncate text-body leading-body font-medium text-ink-body opacity-0`
  - cell: `BUTTON_LABEL {act: secondary}`; overlay: `truncate opacity-0`
  - under: the notice's act pending (its Act's loading): the notice's act pending (its Act's loading): its box kept, t…
- both densities: `absolute inset-0 flex items-center justify-center`
  - cell: none; overlay: `absolute inset-0 flex items-center justify-center`
  - under: the notice's act pending (its Act's loading): the notice's act pending (its Act's loading): its box kept, t…
- both densities: `relative shrink-0 size-spinner`
  - cell: `SPINNER`; overlay: `relative shrink-0`
  - under: the notice's act pending (its Act's loading): the notice's act pending (its Act's loading): its box kept, t…
- both densities: `absolute inset-0 rounded-full border-2 opacity-30 border-ink-body`
  - cell: `SPINNER_TRACK`; overlay: `absolute inset-0 border-ink-body`
  - under: the notice's act pending (its Act's loading): the notice's act pending (its Act's loading): its box kept, t…
- both densities: `absolute inset-0 rounded-full border-2 border-t-transparent animate-spin border-ink-body`
  - cell: `SPINNER_ARC`; overlay: `absolute inset-0 animate-spin border-ink-body`
  - under: the notice's act pending (its Act's loading): the notice's act pending (its Act's loading): its box kept, t…

### notice

- desktop: `flex items-center gap-inside pl-control-x pr-inside border-x border-transparent`
  - cell: `MESSAGE_NOTICE`; overlay: `flex items-center`
  - under: Light, desktop density; notice with its act: notice with its act: the sentence at meta, the act the hairline Button at bar fit, und…; and 3 more frames
- touch: `flex items-center gap-inside`
  - cell: `MESSAGE_INPUT_ROW`; overlay: `flex items-center`
  - under: Light, touch density; notice with its act: notice with its act: the sentence at meta, the act the hairline Button at bar fit, und…; and 3 more frames

### notice › p

- desktop: `grow min-w-0 text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: `grow min-w-0`
  - under: Light, desktop density; notice with its act: notice with its act: the sentence at meta, the act the hairline Button at bar fit, und…; and 3 more frames
- touch: `grow min-w-0 px-control-x border-x border-transparent text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta} + MESSAGE_NOTICE_TEXT`; overlay: `grow min-w-0`
  - under: Light, touch density; notice with its act: notice with its act: the sentence at meta, the act the hairline Button at bar fit, und…; and 3 more frames

### attachments

- desktop: `flex flex-wrap gap-inside px-inside pt-inside`
  - cell: `MESSAGE_INPUT_CHIPS`; overlay: `flex flex-wrap`
  - under: attachments: attachments: neutral chips, each removed by its remove act (onDetach), over the text; a long n…
- touch: `flex flex-wrap gap-inside`
  - cell: `MESSAGE_INPUT_ROW`; overlay: `flex flex-wrap`
  - under: attachments: attachments: neutral chips, each removed by its remove act (onDetach), over the text; a long n…

### attachment

- both densities: `inline-flex items-center min-w-0 rounded-full pl-inside min-h-chip bg-chip-neutral-soft text-chip-neutral-ink`
  - cell: `CHIP {family: neutral, trailing: remove}`; overlay: `inline-flex items-center min-w-0`
  - under: attachments: attachments: neutral chips, each removed by its remove act (onDetach), over the text; a long n…

### chip-label

- both densities: `truncate max-w-measure-short text-caption leading-caption tracking-caption font-normal text-chip-neutral-ink`
  - cell: `CHIP_LABEL {family: neutral}`; overlay: `truncate`
  - under: attachments: attachments: neutral chips, each removed by its remove act (onDetach), over the text; a long n…

### remove-hit

- both densities: `inline-flex items-center justify-center shrink-0 min-h-chip min-w-chip rounded-full`
  - cell: `CHIP_REMOVE_HIT`; overlay: `inline-flex items-center justify-center shrink-0`
  - under: attachments: attachments: neutral chips, each removed by its remove act (onDetach), over the text; a long n…

### remove-hit › svg

- both densities: `size-icon-meta`
  - cell: `ICON {fit: meta}`; overlay: none
  - under: attachments: attachments: neutral chips, each removed by its remove act (onDetach), over the text; a long n…

### field

- touch: `flex flex-col justify-center gap-inside grow min-w-0 rounded-control border border-edge bg-surface min-h-control-compact px-control-x py-inside`
  - cell: `FIELD {fit: bar, trailing: none, state: rest} + MESSAGE_INPUT_FIELD`; overlay: `flex flex-col justify-center grow min-w-0`
  - under: Light, touch density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 10 more frames
- touch: `flex flex-col justify-center gap-inside grow min-w-0 rounded-control border border-edge-hover bg-surface min-h-control-compact px-control-x py-inside`
  - cell: `FIELD {fit: bar, trailing: none, state: rest} + MESSAGE_INPUT_FIELD`; overlay: `flex flex-col justify-center grow min-w-0 border-edge-hover`
  - the cell's `border-edge` is the rest look this state's overlay replaces
  - under: hover: hover: the boundary steps to edge-hover
- touch: `flex flex-col justify-center gap-inside grow min-w-0 rounded-control border border-edge bg-surface min-h-control-compact px-control-x py-inside outline-2 outline-offset-2 outline-ring`
  - cell: `FIELD {fit: bar, trailing: none, state: rest} + MESSAGE_INPUT_FIELD`; overlay: `flex flex-col justify-center grow min-w-0 outline-2 outline-offset-2 outline-ring`
  - under: focus: focus: the ring around the whole box (focus-within)
- touch: `flex flex-col justify-center gap-inside grow min-w-0 rounded-control border border-edge bg-fill-disabled min-h-control-compact px-control-x py-inside`
  - cell: `FIELD {fit: bar, trailing: none, state: rest} + MESSAGE_INPUT_FIELD`; overlay: `flex flex-col justify-center grow min-w-0 bg-fill-disabled`
  - the cell's `bg-surface` is the rest look this state's overlay replaces
  - under: disabled: disabled: the disabled fill and ink, no Attach (IconButton has no disabled form), Send disabled; …

### field › textarea

- touch: `block w-full resize-none field-sizing-content max-h-message-input overflow-y-auto text-body leading-body font-normal text-ink-meta`
  - cell: `FIELD_VALUE {kind: text} + MESSAGE_INPUT_VALUE`; overlay: `block w-full resize-none field-sizing-content overflow-y-auto text-ink-meta`
  - the cell's `text-ink-body` is the rest look this state's overlay replaces
  - under: Light, touch density; idle, empty: idle, empty: the placeholder in ink-meta; Send disabled until there is text; and 5 more frames
- touch: `block w-full resize-none field-sizing-content max-h-message-input overflow-y-auto text-body leading-body font-normal text-ink-body`
  - cell: `FIELD_VALUE {kind: text} + MESSAGE_INPUT_VALUE`; overlay: `block w-full resize-none field-sizing-content overflow-y-auto`
  - under: idle, value: idle, value: Send is the screen's one filled act; hover: hover: the boundary steps to edge-hover; and 5 more frames
- touch: `block w-full resize-none field-sizing-content max-h-message-input overflow-y-auto text-body leading-body font-normal text-ink-disabled`
  - cell: `FIELD_VALUE {kind: text} + MESSAGE_INPUT_VALUE`; overlay: `block w-full resize-none field-sizing-content overflow-y-auto text-ink-disabled`
  - the cell's `text-ink-body` is the rest look this state's overlay replaces
  - under: disabled: disabled: the disabled fill and ink, no Attach (IconButton has no disabled form), Send disabled; …

### attach-slot

- touch: `shrink-0 w-control-compact`
  - cell: `MESSAGE_ATTACH_SLOT`; overlay: `shrink-0`
  - under: Light, touch density; notice with its act: notice with its act: the sentence at meta, the act the hairline Button at bar fit, und…; and 2 more frames

## Meter

Board 54.

The fill's width is the value's share of the max, set by the component (the board's `w-1/12` to `w-full` stand in for the data).

### meter

- both densities: `flex flex-col gap-pair min-w-0`
  - cell: `METER`; overlay: `flex flex-col min-w-0`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · low: the fill in the meta ink; and 7 more frames

### meter-head

- both densities: `flex items-center gap-inside`
  - cell: `METER_HEAD`; overlay: `flex items-center`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · low: the fill in the meta ink; and 7 more frames

### meter-head › span

- both densities: `min-w-0 grow truncate text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body}`; overlay: `min-w-0 grow truncate`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · low: the fill in the meta ink; and 6 more frames
- both densities: `flex items-center grow h-lh text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `flex items-center grow h-lh`
  - under: loading · the label, share and meta as bars in their line boxes, the track a skeleton at its height; loading · beside its loaded form (the height holds)
- both densities: `flex items-center justify-end shrink-0 w-1/12 h-lh text-meta leading-meta`
  - cell: `LINE_BOX {role: meta}`; overlay: `flex items-center justify-end shrink-0 w-1/12 h-lh`
  - under: loading · the label, share and meta as bars in their line boxes, the track a skeleton at its height; loading · beside its loaded form (the height holds)

### meter-share

- both densities: `shrink-0 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta} + FIGURES`; overlay: `shrink-0`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · low: the fill in the meta ink; and 6 more frames

### meter-track

- both densities: `h-meter rounded-chip bg-fill-neutral overflow-hidden`
  - cell: `METER_TRACK`; overlay: `overflow-hidden`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · low: the fill in the meta ink; and 6 more frames
- both densities: `h-meter rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: meter}`; overlay: none
  - under: loading · the label, share and meta as bars in their line boxes, the track a skeleton at its height; loading · beside its loaded form (the height holds)

### meter-fill

- both densities: `h-full rounded-chip bg-ink-meta w-1/4`
  - cell: `METER_FILL {level: under}`; overlay: `w-1/4`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…
- both densities: `h-full rounded-chip bg-ink-meta w-2/3`
  - cell: `METER_FILL {level: under}`; overlay: `w-2/3`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · no meta: label, share, bar
- both densities: `h-full rounded-chip bg-warn w-11/12`
  - cell: `METER_FILL {level: near}`; overlay: `w-11/12`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · near full (≥ 90 %): the fill in warn
- both densities: `h-full rounded-chip bg-danger w-full`
  - cell: `METER_FILL {level: over}`; overlay: `w-full`
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · over the max: the fill full in danger, the share past 100
- both densities: `h-full rounded-chip bg-ink-meta w-1/12`
  - cell: `METER_FILL {level: under}`; overlay: `w-1/12`
  - under: rest · low: the fill in the meta ink; loading · beside its loaded form (the height holds)
- both densities: `h-full rounded-chip bg-warn w-full`
  - cell: `METER_FILL {level: near}`; overlay: `w-full`
  - under: rest · at the max (100 %): still warn, nothing is over

### meter-meta

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: Meter · in a Group under a Section, a Place body: one meter per group item at the card inset; low, mid, nea…; rest · low: the fill in the meta ink; and 5 more frames

### skeleton-bar

- both densities: `h-skeleton w-1/3 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/3`
  - under: loading · the label, share and meta as bars in their line boxes, the track a skeleton at its height; loading · beside its loaded form (the height holds)
- both densities: `h-skeleton w-full rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-full`
  - under: loading · the label, share and meta as bars in their line boxes, the track a skeleton at its height; loading · beside its loaded form (the height holds)
- both densities: `h-skeleton w-1/2 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/2`
  - under: loading · the label, share and meta as bars in their line boxes, the track a skeleton at its height; loading · beside its loaded form (the height holds)

### meter › span

- both densities: `flex items-center h-lh text-meta leading-meta`
  - cell: `LINE_BOX {role: meta}`; overlay: `flex items-center h-lh`
  - under: loading · the label, share and meta as bars in their line boxes, the track a skeleton at its height; loading · beside its loaded form (the height holds)

## BarChart

Board 54.

A column's and a part's height is its value's share of the axis top, set by the component (the board's `h-n/12` stand in for the data); a tick centres on its gridline by `-translate-y-1/2`. The values reach assistive tech as a visually hidden table (`sr-only`). A column's share of its slot (`w-2/3`) is a structural fraction width, as a skeleton bar's. A stacked chart's legend comes from `keys` (the parts' names, bottom first), never from a bar: each key holds its series mark by its place, and the loading form draws the same legend (dot and name, its figure a skeleton in the four-figure lane, `CHART_TICK_LANE`), so the head wraps as the loaded one does and the plot moves 0 px when the data lands.

### bar-chart

- both densities: `flex flex-col gap-fields min-w-0`
  - cell: `CHART`; overlay: `flex flex-col min-w-0`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot; and 1 more frames

### chart-head

- both densities: `flex items-baseline gap-inside`
  - cell: `CHART_TOTAL`; overlay: `flex items-baseline`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `flex flex-col gap-pair`
  - cell: `CHART_HEAD`; overlay: `flex flex-col`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `flex items-center h-lh text-body leading-body`
  - cell: `LINE_BOX {role: body}`; overlay: `flex items-center h-lh`
  - under: BarChart · loading at the loaded boxes: the total's line, the axis column with a number's lane on each tick…

### chart-head › span

- both densities: `tabular-nums text-body leading-body font-medium text-ink-body`
  - cell: `TEXT {role: body} + TEXT_STRONG {role: body} + FIGURES`; overlay: none
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-body

- both densities: `flex items-start gap-inside`
  - cell: `CHART_BODY`; overlay: `flex items-start`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot; and 1 more frames

### chart-axis

- both densities: `flex flex-col shrink-0 h-chart`
  - cell: `CHART_GRID`; overlay: `flex flex-col shrink-0`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot; and 1 more frames

### chart-band

- both densities: `flex justify-end flex-1 border-t border-transparent`
  - cell: `CHART_BAND {kind: axis, rule: top}`; overlay: `flex justify-end flex-1`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot; and 1 more frames
- both densities: `flex justify-end flex-1 border-y border-transparent`
  - cell: `CHART_BAND {kind: axis, rule: both}`; overlay: `flex justify-end flex-1`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot; and 1 more frames
- both densities: `flex-1 border-t border-edge`
  - cell: `CHART_BAND {kind: grid, rule: top}`; overlay: `flex-1`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `flex-1 border-y border-edge`
  - cell: `CHART_BAND {kind: grid, rule: both}`; overlay: `flex-1`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-band › span

- both densities: `-translate-y-1/2 tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta} + FIGURES`; overlay: `-translate-y-1/2`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `-translate-y-1/2 flex items-center h-lh text-meta leading-meta w-chip`
  - cell: `LINE_BOX {role: meta} + CHART_TICK_LANE`; overlay: `-translate-y-1/2 flex items-center h-lh w-chip`
  - ruled: the lane is `w-figures` (its labels are at most four tabular figures); the board's `w-chip` is superseded
  - under: BarChart · loading at the loaded boxes: the total's line, the axis column with a number's lane on each tick…

### chart-body › div

- both densities: `flex flex-col gap-pair grow min-w-0`
  - cell: `CHART_MAIN`; overlay: `flex flex-col grow min-w-0`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot; and 1 more frames

### chart-plot

- both densities: `relative`
  - cell: none; overlay: `relative`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `h-chart rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: chart}`; overlay: none
  - under: BarChart · loading at the loaded boxes: the total's line, the axis column with a number's lane on each tick…

### chart-grid

- both densities: `flex flex-col h-chart`
  - cell: `CHART_GRID`; overlay: `flex flex-col`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-bars

- both densities: `absolute inset-0 flex`
  - cell: none; overlay: `absolute inset-0 flex`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-slot

- both densities: `flex flex-col justify-end items-center flex-1 min-w-0`
  - cell: none; overlay: `flex flex-col justify-end items-center flex-1 min-w-0`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-bar

- both densities: `w-2/3 h-4/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-4/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-6/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-6/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-7/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-7/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-5/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-5/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-2/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-2/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-1/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-1/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-8/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-8/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-9/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-9/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-10/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-10/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-3/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-3/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body
- both densities: `w-2/3 h-11/12 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-11/12`
  - under: BarChart · one series, 30 bars, in a Section of a Place body

### chart-table

- both densities: `sr-only`
  - cell: none; overlay: `sr-only`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-times

- both densities: `flex`
  - cell: none; overlay: `flex`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `flex justify-between`
  - cell: none; overlay: `flex justify-between`
  - under: BarChart · loading at the loaded boxes: the total's line, the axis column with a number's lane on each tick…

### chart-time

- both densities: `flex justify-center flex-1 min-w-0`
  - cell: none; overlay: `flex justify-center flex-1 min-w-0`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-time › span

- both densities: `whitespace-nowrap tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta} + FIGURES`; overlay: `whitespace-nowrap`
  - under: BarChart · one series, 30 bars, in a Section of a Place body; BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-head › div

- both densities: `flex items-baseline gap-inside`
  - cell: `CHART_TOTAL`; overlay: `flex items-baseline`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-keys

- both densities: `flex flex-wrap gap-x-fields gap-y-pair`
  - cell: `CHART_KEYS`; overlay: `flex flex-wrap`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-key

- both densities: `inline-flex items-center gap-inside`
  - cell: `CHART_KEY`; overlay: `inline-flex items-center`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### dot

- both densities: `size-dot rounded-full shrink-0 bg-chip-teal`
  - cell: `CHART_KEY_DOT + CHART_FILL {series: teal}`; overlay: `shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `size-dot rounded-full shrink-0 bg-chip-violet`
  - cell: `CHART_KEY_DOT + CHART_FILL {series: violet}`; overlay: `shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `size-dot rounded-full shrink-0 bg-chip-amber`
  - cell: `CHART_KEY_DOT + CHART_FILL {series: amber}`; overlay: `shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-key › span

- both densities: `text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta}`; overlay: none
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `tabular-nums text-meta leading-meta font-normal text-ink-meta`
  - cell: `TEXT {role: meta} + FIGURES`; overlay: none
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### chart-part

- both densities: `w-2/3 h-1/12 shrink-0 bg-chip-amber border-b border-transparent bg-clip-padding`
  - cell: `CHART_FILL {series: amber} + CHART_PART_SPLIT`; overlay: `w-2/3 h-1/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `w-2/3 h-3/12 shrink-0 bg-chip-violet border-b border-transparent bg-clip-padding`
  - cell: `CHART_FILL {series: violet} + CHART_PART_SPLIT`; overlay: `w-2/3 h-3/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `w-2/3 h-5/12 shrink-0 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-5/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `w-2/3 h-6/12 shrink-0 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-6/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `w-2/3 h-4/12 shrink-0 bg-chip-violet border-b border-transparent bg-clip-padding`
  - cell: `CHART_FILL {series: violet} + CHART_PART_SPLIT`; overlay: `w-2/3 h-4/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `w-2/3 h-2/12 shrink-0 bg-chip-amber border-b border-transparent bg-clip-padding`
  - cell: `CHART_FILL {series: amber} + CHART_PART_SPLIT`; overlay: `w-2/3 h-2/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `w-2/3 h-4/12 shrink-0 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-4/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `w-2/3 h-1/12 shrink-0 bg-chip-violet border-b border-transparent bg-clip-padding`
  - cell: `CHART_FILL {series: violet} + CHART_PART_SPLIT`; overlay: `w-2/3 h-1/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot
- both densities: `w-2/3 h-2/12 shrink-0 bg-chip-teal`
  - cell: `CHART_FILL {series: teal}`; overlay: `w-2/3 h-2/12 shrink-0`
  - under: BarChart · stacked by one dimension (BarSeries.parts), 7 bars, a time under every slot

### skeleton-bar

- both densities: `h-skeleton w-1/4 rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-1/4`
  - under: BarChart · loading at the loaded boxes: the total's line, the axis column with a number's lane on each tick…
- both densities: `h-skeleton w-full rounded-chip bg-skeleton`
  - cell: `SKELETON {kind: line}`; overlay: `w-full`
  - under: BarChart · loading at the loaded boxes: the total's line, the axis column with a number's lane on each tick…

### chart-times › span

- both densities: `flex items-center h-lh text-meta leading-meta w-1/12`
  - cell: `LINE_BOX {role: meta}`; overlay: `flex items-center h-lh w-1/12`
  - under: BarChart · loading at the loaded boxes: the total's line, the axis column with a number's lane on each tick…

## Thread

Board 53.

The Place body around the board's thread is context: the Thread's messages and its foot stand a sections gap apart. On touch (and native) both stand in the screen's column, without `THREAD_COLUMN`; the web picks the column by density, as a structure.

### thread

- desktop: `flex flex-col gap-sections w-full max-w-measure mx-auto`
  - cell: `THREAD + THREAD_COLUMN`; overlay: `flex flex-col`
  - under: Light, desktop density
- touch: `flex flex-col gap-sections`
  - cell: `THREAD`; overlay: `flex flex-col`
  - under: Light, touch density

### message

- both densities: `flex items-center justify-center min-h-target text-center`
  - composes Message, which draws this root and its own cells
  - under: Light, desktop density; Light, touch density
- both densities: `flex flex-col items-end gap-pair`
  - composes Message, which draws this root and its own cells
  - under: Light, desktop density; Light, touch density
- both densities: `flex flex-col gap-pair`
  - composes Message, which draws this root and its own cells
  - under: Light, desktop density; Light, touch density

### composer

- desktop: `flex flex-col w-full max-w-measure mx-auto`
  - cell: `THREAD_COLUMN`; overlay: `flex flex-col`
  - under: Light, desktop density
- touch: `flex flex-col`
  - cell: none; overlay: `flex flex-col`
  - under: Light, touch density

### message-input-root

- both densities: `flex flex-col gap-pair w-full`
  - composes MessageInput (the foot), which draws this root and its own cells
  - under: Light, desktop density; Light, touch density

## QrCode

Board 54.

The tile's `light` is the web's mode scope (its modules dark in both modes). The typed code and its copy act beside the tile on the board are the consumer's composition, not QrCode's.

### qr

- both densities: `light shrink-0 self-start size-qr overflow-hidden rounded-card border border-edge bg-surface`
  - cell: `QR_TILE`; overlay: `light shrink-0 self-start overflow-hidden`
  - under: QrCode · in a Section of a Place body, the typed code and its copy act beside it (the consumer's); rest · dark modules on the light ground in both modes (the tile is a light scope), the quiet zone four modu…; and 1 more frames

### qr-code

- both densities: `block size-full text-ink-body`
  - cell: `QR_CODE {state: rest}`; overlay: `block`
  - under: QrCode · in a Section of a Place body, the typed code and its copy act beside it (the consumer's); rest · dark modules on the light ground in both modes (the tile is a light scope), the quiet zone four modu…
- both densities: `block size-full text-skeleton`
  - cell: `QR_CODE {state: loading}`; overlay: `block`
  - under: loading · the tile at its size in the same light scope (dark mode keeps the light tile when the code arrive…

