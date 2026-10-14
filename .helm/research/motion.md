# Motion: the design

Status: draft for the owner, 2026-10-14; give, the pulse and no haptics decided the same day, the loader styles (§4.2) open. The rules it builds on landed in `cbe5562` (story
003-329): each motion explains a change, and a size or place never animates through layout. This
page defines, for every component of the roster, how it animates, how it answers input, how it
waits and how it arrives (loaded, empty or failed). It is built on a fact inventory of the code as
it stands (every component, both platforms); nothing here is built yet. Once decided it becomes
contract (tokens, cells, a `motion` field on each roster entry, the DESIGN.md section) and the
page drains into `.helm/knowledge/architecture/ui-core.md`.

## 0. Where we start

Almost nothing moves today. The settle (the switch from a waiting form to the loaded one, a view
transition on the web and `LayoutAnimation` on the phone), the modal Sheet, the desktop Menu, the
Toast, the web Switch thumb, the Spinner and the PendingBar fill are the whole of it. Every hover,
press, selection, error edge, popup on the web Picker, Select and Tooltip, docked sheet, fold,
inserted line, row, fill and figure snaps. Skeletons are still fills.

The inventory also found gaps in the waiting system that the motion depends on, so they are part
of this design (§4):

- Only `Section`, `Group`, `QueryBoundary` and a Form group run `useWait`. A bare `List` with its
  own query, `ActionBar loading`, `OptionList`, `ItemHeader` and every content part with its own
  `loading` (Diff, ProseDiff, FileRow, Message, Stats, Stat, QrCode, Image, Canvas, Comparison,
  Table, BarChart outside a Section) draw their waiting form the instant the read starts, with no
  delay, no minimum and no settle.
- Only Section and Group roots carry a settle name, so nothing else moves in a settle; the
  root's crossfade is the browser default (250 ms), not a rung.
- A retry from `Failed` arrives with no settle (`useWait` tracks `isPending`, false on a refetch
  after an error).
- The router runs no view transition, so the settle's "skip while the router's transition runs"
  guards nothing yet.

## 1. Principles

1. **Motion explains a change.** Each motion answers one of: where did it come from, where did it
   go, did my press land, what changed, is the wait live. A motion that answers none is cut.
2. **Direct manipulation is never eased.** What follows a finger or a pointer (a drag, a slider
   thumb, a sheet pulled down, a pan) moves 1:1; only its release animates.
3. **The answer to a touch is immediate.** Press feedback lands within the `instant` rung; nothing
   waits for an animation to finish before it accepts the next input.
4. **A line fades; a block moves.** A single line that appears in flow (a reason, a field's error,
   a checking line, a notice) fades in and pushes what follows at once. A block that appears or
   leaves (a Banner, a docked sheet, an unfolded body, an answered field, an option's children)
   moves its neighbours by a layout move (a view transition on the web, a layout animation on the
   phone).
5. **What the viewer did moves; what arrived on its own enters.** A layout move runs only for the
   viewer's own act or a settle. A change that arrives on its own while the viewer works (a new
   message, a row pushed by the server, a toast) enters by its own fade and pushes its neighbours
   at once: a web view transition freezes the page's drawing for its length, which must never land
   under someone typing.
6. **Errors say, never shake.** A failure changes colour, gains its sentence and keeps still.
7. **Reduced motion snaps every transition.** Two loops keep a still form that still reads as
   live (§4); a gesture still follows the finger.

## 2. Tokens

Kept: the durations `instant` 100, `fast` 150, `base` 200, `slow` 300 ms; the loop 800 ms; the
curves `out`, `in`, `in-out` (none overshoots). New:

| Token | Value | Use |
| --- | --- | --- |
| `pulse` | 1600 ms, a loop | the skeleton's breath: two loops of the spinner, slow enough to read as calm |
| `tick` | 70 ms | the scramble's step (solid-ui's pace) |
| `press` | scale 0.97 | the give of a pressed filled control |
| `lift` | scale 1.02 | a lifted canvas node |

Offsets stay spacing tokens: a popup rises by `float`, a toast or an entering line by `pair`, an
entering Pane by `page`. Every token reaches both platforms the way the scale does now (CSS
custom properties on the web, `deriveTheme().motion` on the phone). Under reduced motion every
rung and `tick` are 0 and `pulse` stops.

## 3. The moves

The vocabulary every component picks from. A component's spec in §5 names its moves and only the
parameters that differ.

### answer: a state's look eases in

Hover, selected, disabled, open, error edge: fill, ink and boundary cross-fade on `fast` `out`.
Press lands on `instant` and lets go on `fast` (a pressed fill releases, never snaps back). The
focus ring snaps in and out: a keyboard user reads it as a position, and a fading ring lags the
key.

- Web: one shared cell, `ANSWER` = `transition-[background-color,border-color,color,text-decoration-color,fill,stroke,opacity,scale] duration-fast ease-out active:duration-instant`. Never `outline` (the ring).
- Phone: a pressed wash fades out on release (`fast`) over the instant press-in, on a Reanimated
  overlay; no hover.

### give: a filled control gives under the press

A control with a fill or a boundary of its own (Button, IconButton with a ground, a chip's remove,
a segment, a tab, a canvas zoom act) scales to `press` on `instant` `out` and back on `fast` `out`.
Not rows, links, fields or anything wider than the measure: a wide surface scaling reads as a
wobble.

### toggle: a control's own value moves

- Switch: the thumb travels on `fast` `in-out` (web has it; the phone gains it), the track cross-
  fades with it.
- Checkbox: the fill cross-fades on `fast`; the mark grows from 0.6 with opacity on `fast` `out`;
  unchecking fades the mark on `instant`; checked to mixed cross-fades the two marks.
- Radio dot (OptionList): grows from 0 on `fast` `out`, shrinks on `instant`.
- SegmentedControl: the selected ground slides from the old segment to the new on `base`
  `in-out` (one named ground moved by a view transition on the web, a Reanimated layout transition
  on the phone); the labels' ink cross-fades.
- A disclosure chevron rotates on `fast` `in-out` instead of swapping glyphs.

### layer: a layer enters and leaves

What stands over the page enters on `base` `out` from where it belongs and leaves on `fast` `in`
by opacity alone (a leave never travels: the eye has already moved on).

| Layer | Enters | Leaves |
| --- | --- | --- |
| Popover (Menu, Select, Picker, switcher) | opacity, rise by `float` toward its anchor, `base` `out` | opacity, `fast` `in` |
| Tooltip | opacity, `fast` `out`, after its 500 ms rest | at once |
| Centred sheet, desktop card | opacity, rise by `pair`, `slow` `out` | opacity, `base` `in` |
| Bottom sheet | slide from below, `slow` `out`; follows a drag down 1:1 | slide down, `base` `in` |
| Scrim | opacity with its sheet | opacity with its sheet |
| Toast | opacity, rise by `pair`, `base` `out`; the stack closes up on `base` `in-out` | opacity, `fast` `in`; a swipe on touch follows the finger and flings |
| Image view | opacity with the scrim, the image scaling from its thumb's place (`base` `out`, a view transition on the web, a shared element on the phone) | the reverse, `base` `in` |

The Menu, the sheets and the Toast have this today; the Select and Picker popovers and the Tooltip
gain it, the Image view gains the thumb origin, and the toast gains the swipe on touch and the
phone.

### block: a block appears or leaves in flow

A block entering in flow fades in on `base` `out` while what follows moves to its new place on
`base` `in-out`; a block leaving fades on `fast` `in` and the gap closes on `base` `in-out`. Web: a
view transition through the page's one coordinator (today's settle coordinator, generalised as
`lib/move`), the moving parts named; phone: `LayoutAnimation.configureNext` on the same rung. Only
for the viewer's act or a settle (principle 5); otherwise the block fades in and pushes at once.

### line: a line appears in flow

A single line (a blocked act's reason, a field's error, the OTP checking line, a MessageInput
notice, a stage's moment) fades in on `fast` `out` and pushes what follows at once; it leaves at
once. Where a line's room is already held (an ActionBar's kept line), only the text cross-fades.

### value: a measured value changes while shown

- A fill (Meter, BarChart bars, PendingBar, StepCount) is the full track scaled from its start
  (`scaleX` from the start edge, `scaleY` from the baseline), so a change moves by transform:
  `slow` `in-out`, its level colour cross-fading on `base`. A bar that appears grows from the
  baseline; a rescaled axis moves every bar together and cross-fades its tick labels on `fast`.
- A figure (Count, Stat, Stats, a Meter's share, a chart's total) rolls when its data changes
  while shown: the old figure leaves upward and the new one rises from below on `fast` `out`, the
  direction by the sign of the change (down for a fall). A clock's tick (a countdown, an age, the
  time left) switches at once: a roll a second is noise.
- A mark that changes state (a Status dot, a Stage mark, a FileRow's seen glyph, a copy act's
  check) cross-fades with a scale from 0.6 on `fast` `out`.

### wait: a read that lasts shows it

The waiting system, unchanged in timing: undrawn for `WAIT_DELAY` (200 ms), holding its place;
drawn at least `WAIT_MIN` (500 ms). Its look gains motion:

- **Appear.** When the delay runs out the waiting form fades in on `base` `out` (today it pops).
- **Pulse.** Every skeleton bar breathes, opacity 1 to 0.55 and back over `pulse` on `in-out`, all
  bars of the page in one phase (one shared clock: Web Animations started at the document
  timeline's zero on the web, one shared value on the phone), so a page breathes as one surface,
  never as a ripple of bars out of step. Reduced motion: still.
- **The loader.** The paint of the waiting box is the app's theme knob (§4.2): a pulse (the
  default), a shimmer, a scramble or still.
- **Spinner.** Where a wait has no shape (a pending act, a running status, a PendingBar with no
  end) the spinner turns on the loop, entering with an opacity fade on `fast`; it keeps turning
  under reduced motion.

### settle: the wait resolves

The switch from a waiting form to its loaded, empty, missing or failed form is one move for all
four: each moving region goes from its old place to its new by a transform on `base` `in-out`, the
waiting form fades out on `fast` `in` and the arrived form fades in on `base` `out` (the root's
crossfade, now on the rungs). A scramble decodes as it arrives (§4.2). A failed form arrives
exactly as a loaded one: no shake, no flash. A retry from a failed form shows the act's pending
form, then arrives through the settle.

### navigate: the page changes

Web, by view transition (story 003-332, built in this work):

- **Open a deeper Pane** beside the current: it enters from the inline end by `page` with
  opacity on `base` `out`; the Panes before it take their new widths by transform on `base`
  `in-out`, their images held at their natural size and clipped (no stretched text).
- **Close it**: it fades on `fast` `in` while travelling `page` toward the end; the rest widen.
- **Cover** (a narrow Place, or a covering Pane): the new Pane slides over from the inline end on
  `slow` `out`; back slides it out on `base` `in`. The phone's stack push, so a covered web page
  and a pushed phone screen read alike.
- **Change place** (the sidebar, the tab bar, the switcher): the page cross-fades on `fast`, no
  slide (places are peers; a slide would claim an order). The selected row's or tab's ground
  answers.
- A density switch (sidebar to tab bar) snaps: no act of the viewer's caused it.

Phone: the stack's push and pop (the consumer's `Stack`; the expo plugin's guide says so), the
place change as a fade on `fast` on the Place root, sheets as above.

A Pane's scroll, typed text and focus survive every move (the Pane stays mounted where it does
today; a view transition only paints between the two states).

### follow: a gesture

What a finger or pointer carries follows it 1:1 with no easing: a slider thumb, a canvas node, a
pan, a bottom sheet dragged down, a toast swiped. On release it settles where it lands on `base`
`out` (a fling continues with its velocity). The canvas viewport's own moves (a zoom act, fit,
reveal, centring on a selected node) travel on `base` `in-out`. A slider's track click and its
keyboard step move the thumb at once: the value is the answer.

### stream: text that arrives as it is written

A streaming reply's text appears as it lands, with no per-word motion (re-laid markdown under a
per-word fade flickers and costs a layout per token). The reply's first text replaces its waiting
line by the settle's crossfade; a new message (the viewer's own or another's) enters at the end of
the log by a rise of `pair` with opacity on `base` `out`. The log keeps following the end at once
while the reader is there; the Latest act enters by fade and rise on `fast` `out` and leaves on
`fast` `in`.

### haptics

None (decided 2026-10-14): the phone answers by sight alone, as the web does.

## 4. Waiting and arriving

### 4.1 One waiting path

Every waiting form goes through `useWait`: the component that owns a `loading` (or a pending
query) runs it, unless a waiting ancestor (`LoadingContext`) already does, in which case it draws
its form while the ancestor's flag is up and arrives with it. Every component that can own a wait
on its own (Section, Group, QueryBoundary, a standalone List, Table, Comparison, BarChart, Thread,
Canvas, Stats, Stat, Code, Diff, ProseDiff, Message, Image, QrCode, OptionList, ItemHeader,
ActionBar) names its root for the settle, so it moves in a settle like a Section does. The root
crossfade takes the rungs. A retry's arrival rides the settle (`useWait` reads a refetch after an
error as waiting).

### 4.2 The loader: a box the component decides, a paint the theme picks

The waiting form's geometry is the component's and never changes: each waiting slot is a box at
the loaded slot's line box and a width the component decides (a hash of the list and row for a
title, `w-figures` for a figure, the shape's own size for an avatar, a check, a field, a chart).
That geometry is what the shift review holds (no Section heading moves between a waiting and a
loaded form). The loader is only how that box is painted, so any loader keeps every layout the
review holds, a scrambled title included.

Slots come in three classes:

- **text**: words in the sans face (titles, names, sentences, prose lines, labels);
- **figure**: a number or an identifier in one-width glyphs (a Stat, a Stats figure, a Count, a
  Meter's share, a chart's total, a table's number cell, a copyable DefinitionRow value);
- **shape**: a box with no glyphs (avatar, icon, dot, check, radio, switch, field, bar, meter,
  chart, an image tile, a QR tile, a canvas node).

The app picks one loader for all of its waiting, a theme knob beside `accentHue` and
`defaultMode`:

```ts
theme: { loading: "pulse" } // "pulse" | "shimmer" | "scramble" | "still"; omitted, "pulse"
```

| Loader | text | figure | shape | busy glyph | arrives | for |
| --- | --- | --- | --- | --- | --- | --- |
| `pulse` (default) | a bar breathing | a bar breathing | breathing | the circle | the settle's crossfade | any app; calm, the default a non-technical app never has to think about |
| `shimmer` | a bar under a sweep | a bar under a sweep | under the sweep | the circle | the crossfade | a consumer app that wants the wait to feel quicker; one sweep crosses the whole page, not one per bar |
| `scramble` | glyphs cycling in the mono face | digits cycling | breathing | three cycling glyphs | a decode | a technical or terminal voice (Stead) |
| `still` | a still bar | a still bar | still | the circle | the crossfade | a quiet surface (a TV, a kiosk), or a product that wants no motion in waiting |

Under reduced motion every loader draws `still`, the scramble's busy glyph standing as `···`.

**The scramble.** In a text slot the box fills with glyphs from `A–Z 0–9 # % & * + = ?` in the
mono face at the slot's type role (the role sets the line box, so the height is the text's), clipped
to the box's width. A figure slot draws digits (an identifier's `0–9 a–f`). Each place changes on
its own cadence around `tick` (70 ms, the solid-ui scramble's pace), so the box shimmers rather than
flips as one. One page-wide ticker writes every scramble's text node directly (no render per tick
on the web; Reanimated's animated text on the phone), so twenty slots cost one timer.

**The decode.** On arrival the loaded text is laid out at once (its own width, its own face) and a
wipe runs left to right across `slow`: the loaded text revealed by `clip-path`, the scramble
continuing to the right of the edge, clipped by the same edge. Layout is the loaded one from the
first frame and the decode is paint alone, so nothing after the slot in its line moves while it
plays. A slot that never waited (a cached read) shows at once.

**The busy glyph** (a pending act, a running status, a PendingBar with no end) follows the
loader: three mono glyphs cycling at `tick` in a box three glyphs wide under `scramble` (solid-ui's,
restored), the turning circle under the rest. It keeps moving under reduced motion only as the
circle; the scramble's glyph stands as `···`, which still reads as a wait in progress.

Rejected:

- a loader chosen per call site (solid-ui's `Spinner kind` and an act's `spinner`): one screen
  could mix voices, and an app author would choose on every wait;
- a loader per region: the same mix, one level up;
- a scramble in the text's own sans face: each tick the glyphs' widths change and the box jitters
  inside itself.

The theme knob is the one new consumer surface: one enum, defaulted, read by both platforms.
### 4.3 Each arrival

| From waiting to | Motion |
| --- | --- |
| loaded | the settle; scrambles decode |
| empty | the settle; the empty sentence arrives as a loaded body does |
| missing | the settle |
| failed | the settle; the act is ready at once |
| failed, retried, loaded | the act's pending form while the refetch runs, then the settle |

## 5. Per component

Each row gives what the component does beyond the move named. In the Wait column "bars" means
the loader's text and shape slots and "scramble" its figure slots: under `scramble` they cycle
glyphs, under the other loaders they are bars (§4.2); "decode" is the scramble's arrival, a
crossfade under the others. "answer" covers hover, press,
selected, disabled and error looks; a focus ring always snaps; reduced motion always snaps.

### Atoms

| Component | Interaction | Change | Wait | Arrive |
| --- | --- | --- | --- | --- |
| Text, Strong | none | none | a bar (its owner draws it) | settle |
| Icon | none | a glyph swapped by its owner cross-fades on `fast` | none | none |
| Button | answer, give | loading: the label, glyph and count fade to 0 on `fast` while the spinner fades in, the width held; back the same. A blocked reason is a line. Count and wait figures: roll (count), at once (wait) | spinner | its owner's |
| IconButton | answer, give (a ground only while pressed or open: the give is the glyph's) | glyph to spinner cross-fade on `fast`; a copy act's check: value mark | spinner | its owner's |
| Tooltip | layer (opacity, `fast`, after 500 ms rest; leaves at once; a second tooltip within 300 ms of the last shows with no rest and no fade) | none | none | none |
| Count | none | roll | scramble | decode |
| StepCount | none | a segment that turns done cross-fades its fill on `base` | none | none |
| Status | none | the dot cross-fades with a scale (value mark); dot to spinner cross-fades | bar and dot | settle |
| Chip | the remove act answers and gives | a chip added by the viewer's act enters by block; one removed by the viewer fades on `fast` and its row closes up | none | settle |
| Input, TextArea, FileInput | answer on the box (hover edge, error edge cross-fade on `fast`; the ring snaps) | the in-field act fades in on `fast`; a TextArea grows at once (it follows typing); a file chosen cross-fades glyph and text on `fast`; the drop ring snaps | its FormField's bars | settle |
| InputOtp | answer on the boxes; the active box's ring moves with the caret at once | a digit fades in on `instant` in its box; the checking line is a line; an error edges every box on `fast` | spinner line | its owner's |
| Select | answer on the trigger; the chevron rotates on open | layer (popover) on the web; the phone's sheet | its FormField's bars | settle |
| Slider | answer on thumb and fill; follow while dragged; a click or a key moves at once | the value figure switches at once (it follows the hand) | bars | settle |
| Switch | answer, toggle (the phone gains the thumb's travel) | none | a bar | settle |
| Checkbox | answer, toggle | none | a bar | settle |
| Spinner | none | fades in and out on `fast` with its owner | is the wait | none |
| Avatar | none | an image fades in on `base` over its fill when it decodes; a failed image's initials cross-fade on `fast` | a bar circle | settle |
| Link | answer on the underline (cross-fades with `text-decoration-color` on `fast`) | none | none | none |

### Layout

| Component | Interaction | Change | Wait | Arrive |
| --- | --- | --- | --- | --- |
| Place | none | navigate: a Pane appended or removed, a cover, a place change | none | none |
| Pane | back and Close answer and give | navigate; the docked sheet is a block (enters on `base` `out` rising by `pair`, leaves on `fast` `in`, the body above resizing by the move); the head's actions fade in on `fast`; the record's title cross-fades on `fast` when its name arrives | none (its Sections wait) | settle |
| Gate | its acts | a new step: the old step fades on `fast` `in`, the new rises by `pair` with opacity on `base` `out` (focus moves at once); a Banner is a block | none | settle |
| Section | the fold row answers, its chevron rotates | fold and unfold are blocks; a blocked act's reason is a line; the count rolls and arrives with the head; the description bar becomes the line by the settle | bars, the count's scramble, the body's forms | settle (named) |
| Group | none | an item the viewer adds or removes is a block; one that arrives on its own fades in | bars | settle (named) |
| List | rows answer | rows the viewer adds, removes or reorders move by block (each row its own name, `match-element`); rows that arrive on their own fade in on `base` and push at once; a tree branch's fold is a block with its chevron rotating | bars, four rows | settle (named when standalone) |
| Form | none | a group appears or leaves as a block; the pending lock fades the other acts to their inert look on `fast` | each group's bars | settle |
| Toolbar | the search and acts answer | the chips row appearing or leaving is a block; a chip is Chip's | none | none |
| ActionBar | acts answer and give | the kept line cross-fades its text on `fast`; an unkept reason is a line; the swap to a PendingBar cross-fades on `base` in its held cell; "N of M chosen" rolls | a bar | settle (named) |
| Columns | horizontal scroll follows the hand | a column added by the viewer is a block | none | none |
| Shell | place rows and tabs answer (the selected ground cross-fades on `fast`), tabs give | navigate (place change fades); a tab's count rolls; the More page fades in on `fast`; a Banner is a block; the switcher is Picker's | none | none |

### Shared

| Component | Interaction | Change | Wait | Arrive |
| --- | --- | --- | --- | --- |
| ListRow | answer (the press wash only on the row's own hit, no longer reaching the row from an inner act); its tick, act and pick are theirs | a status mark is a value mark; a reason is a line; an entry's error is a line; the trailing age switches at once; steps' running mark is the spinner; selected cross-fades | bars by kind | settle |
| DefinitionRow | answer on an opening row | value text cross-fades on `fast` when its data changes; the copy check is a value mark; a locked reason is a line | bars, an identifier's scramble | settle |
| FormField | the label's and control's | the error is a line, replacing the description by a cross-fade on `fast` where both exist; the answered fold and unfold are blocks | bars by the control's shape (the field stays mounted, typed text kept) | settle |
| ItemHeader | facts that act answer | a fact the viewer's act adds is a block, one arriving fades in; the save fact cross-fades saving, saved and failed on `fast` in its held room, its Retry fading in | bars, the count's scramble | settle (named) |
| SegmentedControl | answer, toggle (the ground slides) | none | a bar | settle |
| Sheet | layer (all forms as §3); the bottom sheet follows a drag | a new page (title changes) cross-fades the body on `fast` and scrolls to the top at once; the failed and blocked lines are lines; the docked sheet is a block | its body's | its body's |
| Picker | answer on the trigger, the chevron rotates; options answer (highlight follows the keyboard or pointer at once) | layer (popover on the web's desktop, sheet on touch and the phone); filtering removes rows at once (they follow the typing); a chip added or removed in the trigger is Chip's | its FormField's | settle |
| Menu | items answer | layer | none | none |
| OptionList | options answer, toggle (radio dot, checkbox) | the chosen option's children are a block (in when chosen, out when left); a reason is a line | bars by option shape | settle (named) |
| Missing, Failed | the act answers and gives; Retry shows its pending form | none | none | arrives by the settle |
| QueryBoundary | none | none | the caller's form, pulsing | settle (named) |
| Toast | layer, swipe on touch and the phone; its acts | the stack closes up | none | none |
| Banner | its act | enters and leaves as a block when the viewer caused it (a dismiss), fades in otherwise; its kind changing cross-fades fill and ink on `base` | none | none |
| PendingBar | its act | the fill is a value (linear to its end, as today); entering in an ActionBar's place cross-fades on `base`; spinner to fill cross-fades on `fast`; the time left switches each second | is the wait | none |

### Content

| Component | Interaction | Change | Wait | Arrive |
| --- | --- | --- | --- | --- |
| Prose | links answer | text appended while streaming appears at once (stream) | bars | settle |
| Code | the fold row answers; copy and download | unfolding the earlier lines is a block; copy's check is a value mark | bars | settle (named) |
| Diff, ProseDiff | none | a changed diff cross-fades on `fast` | bars | settle (named) |
| FileRow | answer | seen glyph is a value mark; counts roll | bars | settle |
| Comparison | none | a verdict is a value mark; rows as List's | bars | settle (named) |
| Table | rows, sort heads and cells answer; the sort glyph rotates on `fast` between up and down | sort reorders at once (the viewer reads the new order, a move of every row is noise); a row's reason is a line; an editable cell's control fades in on `instant` under the pointer; ticks toggle | bars, number cells scramble | settle (named) |
| Rules | its pickers and acts | a rule added or removed by the viewer is a block; the arrow's ink cross-fades on `fast` when its pair is set | none | none |
| Message | the system line's act answers; its fold is a block with a chevron rotating | enters at the log's end by a rise (stream); attachments added or removed by the viewer are blocks | bars | settle |
| MessageInput | answer on the box and acts | Stop fades in on `fast` beside Send; Send's enabled look cross-fades; the notice is a line; the box grows with typing at once; attachments enter as blocks | none | none |
| Meter | count links answer | value: fill by `scaleX` on `slow` `in-out`, level colour on `base`, the share rolls, the mark moves by `translateX` on `slow` | bars, the share's scramble | settle; the fill grows from its start on `slow` |
| Stages | none | a stage advancing: the mark is a value mark, the rail below cross-fades on `base`, the moment is a line; `ended` replacing the later stages is a block | bars (gains a waiting form) | settle |
| Stats, Stat | a linked cell answers | figures roll | figures scramble, labels bars | settle (named); scrambles decode |
| BarChart | none | value (bars by `scaleY`, rescale moves all bars, ticks cross-fade); a bar added grows from the baseline | bars, the total's scramble | settle (named); bars grow from the baseline on `slow` |
| Thread | Latest answers | stream; the waiting reply gives way to the reply by the settle's crossfade; follow stays at once; Latest fades and rises | three waiting messages | settle (named) |
| QrCode | none | a new value cross-fades on `base` | the still tile, pulsing | settle |
| Image | answer on the frame | the image fades in on `base` over its skeleton when it decodes (a cached image shows at once); the view opens from the thumb (layer) | a pulsing tile | settle; failed cross-fades to its glyph on `fast` |
| Canvas (web) | nodes answer; drag and pan follow; a touch lift scales to `lift` with the float shadow fading in on `fast` (the web's `vibrate(10)` goes); the in-port target cross-fades | zoom acts, fit, reveal and centring travel on `base` `in-out`; crossing the text floor cross-fades card and glyph on `fast`; a landing node fades in on `base` at its place; path tones cross-fade on `base` | three pulsing node cards | settle; the graph fades in once laid out |

## 6. How it is built and held

- **ui-core.** The new tokens; motion cells (`ANSWER`, `GIVE`, the layer cells moved from the
  web's overlays into the contract, `PULSE`, the value fills) so a motion lives in the matrices
  like any look; a `motion` field on each roster entry naming its moves, emitted per component in
  DESIGN.md; c39 keeps every cell off layout.
- **Web.** `lib/settle` becomes `lib/move` (the one coordinator for settles, blocks, toggles and
  navigation, gathering a frame's moves into one view transition); `view-transition-class` per
  move for its timing in `globals.css`; `Scramble`, `useRoll` and the pulse clock in `lib/`; the
  router's `defaultViewTransition`.
- **Phone.** `lib/motion` gains `usePress`, `useToggle`, `useRoll`, `Scramble`, one pulse shared
  value, the block move (LayoutAnimation, which today only the settle uses), and the place
  fade; the Spinner moves from RN `Animated` to Reanimated.
- **Checks.** Each plugin's verify reads a component's moves against what it draws (the move's
  cell on the web, its hook on the phone), so a move named and not drawn, or drawn and not named,
  fails by name; `b-motion` and c39 stay. The showcase's `behaviour/` stories hold what a test can
  see (a transition's property list and rung, the pulse's phase, the scramble's box equal to the
  loaded slot's, a settle's single transition, focus kept through a navigate); `stack screens
  test` keeps running with motion off. The design critique gains a motion pass: the unit's
  interactions recorded with motion on, judged by §1.
- **Order.** Each phase lands web and native together.
  1. The foundation: tokens, cells, `lib/move`, the single waiting path (§4.1), answer, give,
     toggle, the pulse and the appear fade.
  2. Layers, lines and blocks (popovers, tooltip, docked sheet, folds, reason and error lines,
     chips, rows).
  3. Values and figures: fills by transform (Meter and BarChart today draw `width` and `height`),
     the roll, the scramble and its decode, value marks.
  4. Navigation (story 003-332), the canvas viewport, gestures (toast swipe).

## 7. Decisions

Decided 2026-10-14: give (a filled control scales to 0.97 under a press); the skeleton pulses in
one phase across the page; no haptics on the phone.

Open: the loader (§4.2): the four loaders, the knob's name (`loading`), and whether a figure
should scramble under `pulse` too (proposed: no, one loader is one voice; an app that wants its
figures to scramble picks `scramble`).
