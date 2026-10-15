# Loading and pending

The range a waiting or pending state is measured against in a [design critique](../design-critique.md), and the
executions behind it. Stack's waiting form is the loaded form painted (the `skeleton` colour, line boxes as bars, each box its own,
inert, nothing shown for 400 ms), so the range below bounds the paint's bars and the loaded heights it keeps. Read the measurements as the [references](../references.md) page sets out.

## Range

placeholder bars 12 tall radius 4 at real widths in real row heights; pending act keeps its box, 14–16 spinner, lightened fill; step lists 19–20 tall with the active step spinning; page waits dim to ~40 % with one pill; long work a chip + timer and a toast on start.

## References

Queries: `skeleton loading placeholder rows in a list or table while content loads` · `button with inline spinner in a pending submitting state inside a form or dialog` · `deployment in progress status with a progress indicator and building steps, dark mode`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Neon | [screen](https://mobbin.com/screens/9b5b1374-c015-495b-abcb-9cce659c741b) | chrome and heading render first; table rows arrive as placeholder bars that mirror the columns | sidebar ≈ 235; h1 22/600 real; placeholder rows ≈ 44, hairline-separated; bars 12 h radius 4 ≈ `#e5e5e5`, one per column at column width, plus a 12 px circle for the status dot; header chips placeholders too |
| Railway | [screen](https://mobbin.com/screens/fca24d24-ab3c-4dec-a5d3-e90b18e90af1) | pending deployment as a second card above history with a DEPLOYING chip, step line and a toast | card ≈ 72 h radius 8; DEPLOYING chip blue-tinted 10/600 uppercase vs ACTIVE green; pending card border accent-tinted; sub-row "Deployment in progress: Pulling image…" 12 muted + chevron; canvas node shows "Online · Deploying (00:02)"; toast bottom-right ≈ 280 wide, dark surface, hairline, check icon + link |
| Webflow | [screen](https://mobbin.com/screens/8b7d9540-15cd-4752-9c8e-b9e3b14ed754) | publish progress as a 4-step checklist popover anchored to the Publish button | popover ≈ 375 wide, dark `#1e1e1e`, hairline; title 12/500; steps ≈ 19 h each, 11; active step spinner glyph + full ink, pending steps dash + dimmed; Close button 22 h bottom-right; no bar |
| Notion | [screen](https://mobbin.com/screens/2e595e28-1d50-4c6b-9737-7d88fe423a62) | form dims to ~40 % and a floating pill names the wait; primary keeps its spinner | pill ≈ 260 × 44, white, shadow, radius pill, 13 text + 14 spinner; primary button 32 h disabled blue tint with spinner glyph left of label; sidebar and fields all dimmed together |
| Assembly | [screen](https://mobbin.com/screens/1b2791e8-8b91-435d-a0e2-6855b4aec9f7) | button holds its size, label swaps for a centered ring spinner, fill lightens | card ≈ 500 wide radius 8 hairline; input 56 h; button ≈ 385 × 45 radius 4, fill desaturated green, 16 px ring spinner centered, no label |

DESIGN.md: `notion`: type body-sm 14/400, caption 13/400, micro 12/500, button-md 14/500; radius 4/6/8/12/16/20/24/full; border hairline `#e5e3df`, hairline-strong `#c8c4be`; surface `#f6f5f4`; spacing 4/8/12/16/20/24/32/40. `webflow`: type body-sm 14/400, caption 12.8/550, caption-mono 12/400, eyebrow-uppercase-sm 12/500, button-md 16/500; radius xs 2 / sm 4 / md 8; border hairline `#d8d8d8`; spacing 2/4/8/12/16/20/24/32.

The references span: placeholder bars 12 h radius 4 at ≈ `#e5e5e5` on white, laid out at real column widths inside real row heights (44); pending buttons keep width and height and swap label for a 14–16 px spinner with a lightened fill; multi-step waits list steps at 19–20 h (one preview reading, ≈ 19, which the references page calls approximate; the contract's body line box is 20) with the active step spinning and pending steps dimmed; page-level waits dim the form to ~40 % and float one pill; long-running work gets a chip (DEPLOYING) plus a timer or step text, and a toast confirms the start.

Thin evidence: the inline-spinner button rests on two results (Notion, Assembly).

## In stack

The paint is one fill, the `skeleton` colour, on the loaded form's own boxes: text is filler of the
slot's length whose line boxes are the bars, a mark or a control is its own box with its content
unseen. Painted parts are inert. A collection of unknown length paints four rows (`PAINT_ROWS`), each
at its loaded row's height, so the list differs only by its row count. The paint shows after 400 ms
(`WAIT_DELAY`) and fades in on the web, snaps in on the phone; a read the local server answers
sooner shows none. A pending act is not a read: it is inert at the press and keeps its width and
height, and only after 300 ms (`ACT_DELAY`, `--act-delay`) swaps its label for a spinner and lightens
its fill, so an act the server answers at once never flashes one; it is ready the moment its
promise settles. The promise is the act's own (`ActBase.onAct`), and the host holds it: an
`ActionBar` pends one act at a time with the others inert, a `Sheet` holds its dismissal while its
head submit, foot bar or form bar pends, and an `InputOtp` checking a code draws its checking line
at once (a code is never typed twice). No act queues for a connection that is not there: one pressed
offline is refused at the press, its host's line says "No connection." (or the app's sentence for a lost
socket) with no Retry, and the siblings stay live. A Retry (a frame's, a stale line's,
a more row's) pends on its own refetch's promise; a refetch nobody pressed shows the busy mark alone.

After the first wait the frame says what its read is doing, and the data stays. A refetch is the
**busy** mark: a spinner in the heading's meta ink, after the title (and a Section's count), shown
after the same `WAIT_DELAY` so a refetch the server answers at once draws nothing; only the frame
holding the read renders for it, never its body, and a frame with no heading shows none.
`aria-busy` is the first wait alone. A refetch that failed leaves the data under one meta line,
"Couldn't refresh." with a quiet Retry that is pending while it runs; a read waiting for a
connection says "Waiting for a connection." with nothing to press. Both stand under the heading row.
A read not asked for yet, or paused with no data, **stands still**: the loaded form painted and
inert, with no busy mark. An act drawn from a read follows it: painted while the read waits, still when
it is not asked for, and blocked with the failed sentence once it failed; a constant act is never
painted or inert for a read it does not draw. A next page is the collection's own wait: the painted rows after the loaded
ones (`patterns/data-table.md`). A turn being written is the thread's
(`patterns/activity-feed.md`).
