# UI cleanup

2026-10-12. Decided with fcalell in conversation, from a review of Stead's System screen. This page is
the plan for the work and drains as each step lands: what is built moves into
`.helm/knowledge/architecture/ui-core.md`, the guides and the roster, and its line here goes.
The work runs directly from a session, with no board epic.

## The ask

In fcalell's words: stack is "way overengineered and should be fixed in stack"; "cleanup all this
extra logic that i deem useless"; "reduce the amount of possible different behaviours of a
component"; "the flow and rhythm should be linear, from parent that position children", without
Fragments breaking it and without "components place other components with fixed measures"; and
"prepare multiple passes across the different components, to address all the issues we're
currently finding". Loading "is supposed to be an app wide research, cause it breaks on a lot of
different places". The scope is stack's whole roster and every Stead screen, not the System
screen that surfaced it.

## Problem

A screen in Stead's System place (index, Agents list, one agent's details) showed four faults.
Each traced to a frame component deciding layout from something other than its own props:

- **The list's title has no bar while the details have one.** `Split`'s main has no head of its
  own; the Place's strip heads it, so the app draws the title as an `ItemHeader` in the body. The
  details are a `Screen`, which always draws a bar. The section's acts (New agent) sit in the
  Place's strip and vanish when a record opens.
- **Groups 6px apart instead of 32.** `headPaired` (`item-header/pair.tsx`) wraps a factless
  `ItemHeader` and the sibling after it in a `gap-pair` column. The sibling was an app component
  drawing every group, so all of them fell inside the pair. Measured at 2000px: header 153 to 177,
  first group 183 to 371, second from 377.
- **Wasted width.** `SPLIT_BESIDE` gives the main and the record half each, and both cap their
  content at `max-w-measure-inset` (536px), aligned left: at 2000px each half is 700px with 164px
  empty, the gap standing between the columns.
- **The page jumps when the grants picker opens** (a workflow's node details). The listbox's first
  frame lands offset by exactly the main's origin, `(1408, 708)` then `(1168, 620)` at 1440px, past
  the viewport's right edge, inside a shell that is `overflow-hidden`. Likely cause, not confirmed
  in headless Chrome: focus scrolls the hidden-overflow shell, and it snaps back when the list
  moves.

Separately, loading states shift the layout, skeletons stand larger than their component, and the
workflow canvas redraws whole, on many screens. Not yet measured.

These four are what one screen showed. The same causes (a component reading its children, a mark
or a context; a component sizing itself or others; a component with more behaviours than its uses
need) are expected across the roster, and nothing has checked it.

## Goal

Every screen is built one way. A parent lays out its children with plain flex or grid, and a
child only says how it flexes. No component reads its children, a context or a data mark to
choose its layout. Each component has one behaviour, so a screen's author has fewer ways to get it
wrong. The extra logic doing otherwise is deleted, on web and native together.

## Rules

- A container lays out with flex or grid; a child sets only flex or grid item properties.
- Nothing inspects its children (`Children`, `cloneElement`, `.type ===`), a layout context, or a
  `data-*` mark to change its own form.
- A component adapting to its container's size through a CSS container query is allowed: that is
  the container's size, not its kind.
- One named exception: the Place's CSS hides the Panes standing before a covering Pane with
  `:has(~ [data-cover])`. The child declares its intent and the parent's CSS honours it, keeping
  the hidden Panes out of the tab order with no JavaScript.
- Pure CSS for layout. JavaScript only where the browser offers no CSS (starting a view
  transition, which the router does).

## The work

Five steps, in order. Steps 2 and 3 run side by side. Every research step works from a checklist:
everything in scope named in full and, for each, questions whose answers a reader can check (yes
or no, a count, a measurement, a path with its lines). An agent gets the checklist and the report's
columns, never a goal to interpret, and answers every item or says why it cannot. fcalell confirms
each checklist before its step runs.

### 1. Research the checklists

Done 2026-10-12: the confirmed checklists, their sources and methods, the coverage check and the
dropped candidates are [ui-cleanup-checklists.md](./ui-cleanup-checklists.md). Renders run at 320
(touch), 1280 and 1920 (desktop, fine pointer), each in light and dark, at a height of 800, and
measure on web only: native has no render harness and answers the read and grep questions.

### 2. Component review

Done 2026-10-12: every roster component on web and native, every `lib/` file and every
component-folder helper answered on the checklist (reports kept in the session, not the repo).
The rule-breaking logic gathers in the frame (Place, Screen, Split, Shell, `frame.ts`, `page.ts`,
`headPaired`, `splitOf`, `thread/fill.ts` and the layout contexts), in children read by type
(web Section, Form with `field-wait`, Toolbar, Columns, Split; native adds Group, Thread and
Sheet), in contexts that pick a component's form (`GroundContext` in 13 files a platform,
`SectionContext`, `PageTitle`, `FormStands`, `InsetRing`, `ActInk`, Group's registration) and
in JavaScript measures (`usePageTablet`, `useWraps`, `modality`, `focus`, Slider's thumb moving
230 to 320 px after mount). A 300-character unbroken title overflows the page by about 3350 px
in Place and Screen, 2460 px in Banner. Three checklist greps missed real hits (a destructured
`type` in `section.ts`, a context given by value in `field-wait`, `dataset.*` in `media.ts` and
`modality.ts`): step 5's tests cover them.

### 3. Loading study

Done 2026-10-12 on Stead's fixture; the dated lines are in Stead's `design/evidence.md`.

- Every popup in the Shell draws its first frame offset by `main`'s origin, (240, 88) px, on
  listboxes, dialogs and tooltips at 1280, 1440 and 1920; the grants picker reproduces the logged
  (1408, 708) to (1168, 620) at 1440, and at 1280 the Shell frame scrolls sideways 148 px and
  back. The cause is the popup layer inside the `relative` `main` (`shell/host.tsx`).
- Every route that draws a skeleton (55 of 55) differs from its loaded form, 266 of 297 regions:
  ListRow's waiting bars come from a fixed width table, Sections exist only once their data lands,
  and the list column grew with its rows at Stead's pin (master already holds `w-list`).
- The usage-pause banner arrives after first paint and drops the page 88 px (148 at 320): a Stead
  fault, the pause known only from the socket's inbox snapshot. The banner stays in flow.
- Every live frame refetches broad reads through Stead's `useLiveReads`.

### 4. Passes

One pass per family, in this order, each cut confirmed by fcalell on 2026-10-12. Each pass lands on
web and native in one commit, with the roster, `DESIGN.md` (regenerated), the showcase and the
guides. Stead's stack pin moves after each pass and its screens are ported in that step.

1. **Frame:** Place and Pane as designed below. Done: stack `1bf8d50` and `77e2175` (a record's
   name and acts in its Pane's bar), Stead `355ae28` (pin moved, every place ported, the usage
   pause carried on the session read so the banner stands in the first frame).
2. **Overlays:** popups mount in the body (Base UI's default), not in `main`'s layer;
   `PortalHosted` and `FrameHost`'s layer go; a popup takes its mode from a class. Refined
   2026-10-12: `PortalContainer` stays as the one mount point a showcase stage provides, so a
   state story still draws each cell's open popup in its light or dark stage; no app frame
   provides it. Native keeps its `FrameHost` host view: React Native has no body.
3. **Children read by type:** explicit props in place of the walks (Section's `loading`, Toolbar's
   `search`, Form's bars); Columns lays out its children with grid, no wrapper each.
   Decided 2026-10-12: a Form's structure is its prop, exactly one of `children` (fields, at the
   fields step) or `groups` (each a `fieldset` with its `legend`, a sections step apart), its
   bar a `bar` prop; a wizard's `steps` comes later as a third shape. A Section is busy only by
   `loading` and counts only by `count`; a FormField and an ActionBar draw their own waiting
   form. Toolbar's `search` and `chips` are descriptors. FormField takes its control as a
   descriptor per kind (`switch`, `checkbox`, `slider`, `select`, `options`, `segments`, or
   `children` for any other), and DefinitionRow a `switch` or a `pick` prop, so no prop's
   element type is read. A form group may stand untitled, for fields that lead or close a form
   among titled groups. Done: stack `cb41dc2`, `7514766`, `eea00d6`; Stead `95cbc0c`.
4. **Form by context:** one form per component, a prop where callers need two; a row's ground
   comes from its parent's surface.
   Decided 2026-10-12: a row has one form everywhere, square at the card's inset (`px-card`),
   and a standalone `List` bleeds by that inset so its rows' text meets the title over it;
   `GroundContext` goes. A `Group` is a frame whose structure is its prop, exactly one of
   `items` (each `{ key, row }` drawn bare or `{ key, item }` drawn at the card's inset, a
   hairline between) or `list` (a `List` it frames, no bleed); it reads no children, so native
   draws the hairline on its own entries and `Children` leaves it. An empty state is no placed
   component: a `Pane` and a `Section` take `empty` and draw its page or card form themselves,
   and a `List` or `Table` draws its own; `PageTitle` and `SectionContext` choose nothing. A
   `Sheet` and a `Gate` take `form` (a `Form`'s props) and draw its sheet or auth form; a
   `Form` placed alone is the page form, so `FormStands` and native's `FootSlotContext` go. A
   `Pane` and a `Thread` take `sheet` beside `foot` and draw the docked sheet with its measured
   region as a prop; `Sheet` alone is the modal, and `FootPlace` and `FootRegion` go. No
   `Section` stands in a `Section`, and a Section's title is one size, in a sheet too
   (`SECTION_NESTED_TITLE` goes). A source `TextArea` never fills: content-tall to its cap, it
   scrolls inside (`data-fill` and `HOLDS_FILL` go). Where the provider draws the consumer
   itself (Banner's act, Code's acts, Button's count, List's rows, Table's cells, a ListRow's
   entry, Rules, FormField's and OptionList's checkboxes), the context becomes the consumer's
   internal prop. `DistanceContext` stays, the Place's density for the page as a whole, and so
   does native's `Ink`, React Native's stand-in for inherited `currentColor`.
5. **Measuring in JavaScript:** container queries and `flex-wrap`; JavaScript stays for the Canvas
   and where the tree differs (the Shell's sidebar or tab bar).
6. **Overflow:** `min-w-0` and `wrap-anywhere` on text slots.
7. **Loading:** stack: ListRow's waiting form keeps the loaded row's marks and height. Stead:
   Sections drawn before their data, `useLiveReads` narrowed (the usage pause landed with pass
   1). A record's Pane carries the kind's word as its title while it loads; a waiting title
   belongs here.
   Open, designed before the pass: a terminal-like word scramble for text that loads, held to a
   fixed character count in a monospaced face so the line keeps its width, with a still form
   under reduced motion; `judging.md` lets only `transform` and `opacity` animate, so it needs a
   named exception.

Carried from pass 1 to the pass that owns it:

- Pass 4: `Form`'s `FOOT_STUCK.pane` is dead; `Sheet`'s `fit="pane"` and `TextArea`'s
  `data-fill` and `HOLDS_FILL` remain, each a form chosen by where it stands.
- Pass 4: native `Group` still wraps each row to draw the hairline between them (React Native
  has no sibling selector); each row drawing its own from its ground goes with "a row's ground
  comes from its parent's surface". Native `Columns` sets no column width, which a column
  would carry as its own prop.
- Pass 5: `Pane`'s title still measures its wrap with `useWraps` on touch.
- Step 5: a Pane and a Section of one name are two region landmarks of one name (axe
  `landmark-unique` on Stead's knowledge page, the page Pane "Architecture" beside the tree's
  Section "Architecture").
- A device run: the native Pane's keyboard and its nested scroll are untested on a phone; so is
  the native sheet, content-tall and growing to its cap since pass 3 (decided 2026-10-12, its
  foot gorhom's footer on `bottomInset`, which may step rather than slide as the keyboard rises,
  and whose height lands one reaction after the content's).

### 5. Structure rubric and checks

The rules the passes leave standing become ui-core's guide page `structure.md`, beside
`rubric.md`: how a component is built, as `rubric.md` is how it looks. Each rule is measurable,
with its question; an implementer reads it as rules, and the reviewer and the design critic answer
it item by item. Each rule a grep or a test can check becomes a test in stack's `pnpm check`
instead of prose (no `Children` or `cloneElement` under `components/`, no arbitrary value in a
class, no margin on a component's root, no measuring outside a closed list). Stack's
`.helm/agents/index.md` points "edit or create a ui component" at it. Its questions are step 2's
that found real faults; a question that found none is dropped.

The rubric's measurable numbers move from the critic's hand into `stack screens test`, read from
ui-core's tokens, never from a second policy file:

- **Checks on the render.** One walk of the page's elements at each width the floors already
  visit, after the resize settles, so it adds no resize: type sizes and the count per screen,
  control and row heights, gaps and insets, radii (nested ones included), clipping that hides a
  layout error, late fonts, tabular digits on changing numbers. Contrast stays axe's. Estimated at
  25 to 150 ms a screen; timed with `stack screens test --all` on the showcase before and after.
- **States after input.** Behaviour stories run the same checks at the end of their play
  functions, so a state reached by a click or a key (an open picker, a closed dialog's returned
  focus, focus hidden under a sticky bar) is checked; the grants picker gets one.
- **Dark mode.** The floors run in light and dark, as the rubric judges. This about doubles the
  floors' time, which the cut in widths below pays for.
- **Three widths:** the narrowest phone (320, touch), a laptop (1280, desktop: the list and main
  stand together and `wide` is closed) and a desktop monitor (1920: `wide` open, every region
  shown, the only width where a cap leaves dead space), in place of `overflow.ts`'s fixed five;
  `rubric.md`, `design-critique.md` and Stead's review plans (`drive.mjs`, 375/768/1440 today)
  move to the same three.
- **Findings an agent can act on:** the rule, the element, the measured value, the expected value
  and the fix.
- **False-pass tests.** Each check, grep or render, has a test showing it catches a bad case
  (`display: contents`, a hidden element, zero height), so none passes by never matching.

## The frame

The first family's design, decided before the review and open to what it finds.

```
<Place>                                   the page: Panes in a row, no bar of its own
  <Pane title="System" actions more>  <Group/> …  </Pane>
  <Pane title="Agents" actions>  <Section/> <Section/>  </Pane>
  <Pane title="Stead" back="/system/agents">  <Section/> …  </Pane>
</Place>
```

- **Place** is a flex row (decided 2026-10-12, in place of a grid, which cannot size its last
  track without counting the Panes): each Pane but the last prefers `list` (360) and shrinks to
  `region-min` (240), never sized by its content, so nothing moves as rows land (step 3's K2); the
  last takes the rest; a hairline between them. It never reads its
  children. It keeps `distance: "room"` (the TV density). It draws no bar: the first Pane's bar
  carries the page's title, its toolbar, and on the phone the place switcher, so the desktop has
  one row of bars and the phone always one bar.
- **Pane** is a flex column: a bar (title, actions, more, `back` drawn as Close beside other Panes
  and as Back where it stands alone), a body that scrolls (`flex-1 min-h-0 overflow-y-auto`,
  page inset, its direct children always a `sections` gap apart, nothing paired), and an
  optional `foot` docked under the body (an ask box, a message input). Each Pane is the size
  container (`@container/page`) its content's container queries read: no Pane is sized by its
  content, so containment costs nothing (in an `auto` track it would: a size container there
  draws 0 px wide, measured in Chromium 1194).
- **Content width.** A Pane's body content stands within `measure` (58ch, 488px on the desktop),
  aligned left under its title, so a label stays near its value, a field near the size of what it
  holds, a Save near the fields it saves. `wide` lifts the limit for content whose meaning is its
  width: a `Canvas` (the workflow canvas, the knowledge graph) and a code `Diff`. `wide` is for a
  Pane whose content is that wide thing; a wide table in a reading Pane scrolls sideways inside
  the column. The empty space a reading Pane leaves stands only at the screen's right edge.
  Measured with the caps lifted at 1920px, without the limit: pickers 1270px long, a
  `DefinitionRow`'s value or switch 1200px from its label, an `OptionList` box mostly empty, a
  Slider track too long to set, a Form's Save and a Section's act far from what they act on.
- **Covering.** `<Pane cover>` takes the Place's width and the Panes before it are
  hidden with `display: none`: mounted, so they keep scroll and typed text, and out of the tab
  order. A pushed page is a covering Pane with `back`.
- **The tab bar** stands on every web page at touch density (decided 2026-10-12): nothing tells
  the Shell a Pane covers, so the `data-screen` mark goes; on the phone an expo-router push covers
  it natively.
- **Native.** A phone route renders one Pane, pushed in expo-router's stack; the native Place is
  the place's container holding it, with the same props as the web's and no reading of its
  children (decided 2026-10-12).
- **No filled act, no Details act** (decided 2026-10-12): a create act is one of a Pane's
  `actions` at both densities; the touch floating act, its room and the toasts' anchor on it go;
  what the Details sheet held is a deeper Pane or sections of the record's Pane. Something
  chosen on a canvas (a workflow's node, a graph's page) opens in a sheet over the canvas's
  Pane (`Sheet fit="pane"`), so the canvas keeps its width; tried 2026-10-12 as a deeper Pane
  by route, which squeezed the canvas to the list width beside it.
- **A record's head** (decided 2026-10-12): the record's name and its acts stand in its Pane's
  bar; `ItemHeader` keeps the overline and the facts under it.
- **Narrow widths.** Below `tablet` only the last Pane shows, with its back act: the same
  mechanism as covering, every Pane covering the ones before it. Above `tablet` every Pane shows,
  each but the last shrinking from `list` toward `region-min`.
- **Filling.** A `Thread` or a `Canvas` fills its Pane with plain flex (`flex-1 min-h-0`, a
  Thread's log scrolling inside it). No prop, no context, no `data-fill` mark. Cost accepted: the
  log's scrollbar stands inside the page inset.
- **Animation.** Same-document View Transitions (Baseline since Firefox 144, October 2025; Chrome
  111, Safari 18): the router runs navigations as transitions (TanStack Router's
  `defaultViewTransition`, a link's `viewTransition` types for a push), each Pane carries a
  `view-transition-name` (`match-element`), and the motion is CSS on Pane: a Pane entering,
  leaving, covering, and the other columns taking their new widths. No component knows about
  animation. `prefers-reduced-motion` turns it off. `grid-template-columns` transitions cannot
  serve: an `auto` track flips discretely. On the phone a Pane opening is a push in expo-router's
  stack, which animates already.

### Deleted

| Gone | Replaced by |
|---|---|
| `Split` (`list`, `main`, `beside`, `pane`, `empty`, `back`, `open`, `onClose`) | Panes in order |
| `Screen`, pushed and beside forms | A Pane with `back`, covering when pushed |
| The Details act and the pane's side sheet below `wide` | A deeper Pane |
| `headPaired`, `splitOf` | Nothing: Pane children are always `sections` apart; a Pane has its own `back` |
| `Beside`, `DetailsSheet`, `BackRoute`, `ThreadRoom`, `ThreadBleeds`, `OverThread`, `ActRoom`, the `fill.ts` classes | Pane's own props and plain flex |
| `SPLIT_*`, `PAGE_BODY_BESIDE`, `SPLIT_MAIN` `rest`'s cap, `FORM` `in` | The Pane's `measure` and `wide` |
| Place's head, `act`, `context`, `bleed`, `up` | The first Pane's bar; `back` on the first Pane; `foot` on the Pane |

Stead's frame usage at its commit `b3d314e`: 7 Places, 17 Screens, 6 Splits; Place props used:
`title` 7, `bleed` 6, `actions` 5, `more` 4, `up` 2, `foot` 1, `act` 1 (the not-found page, which an
`EmptyState`'s act covers), `context` 0. `wide` on 3 Panes: the workflow canvas, the knowledge
graph, the file diff.

## Method

- Work from a session on stack's `master`, no board epic. Each pass ends with stack's `pnpm check`
  green, then Stead's pin moved, its screens ported and its `pnpm check` green, then a look on
  Stead's fixture server.
- Research steps run as Sonnet agents from their confirmed checklists: step 1 as one agent; step
  2 as several, each taking a named slice of the roster, all on the same questions and the same
  report columns; step 3 as one agent on Stead's fixture. The session checks each report's
  answers against the code before it drives a cut.
- The session that holds the design builds the pattern-setting part of a pass itself (for the
  frame: web `Place` and `Pane`, the `ui-core` variants and roster, the deletions). Sonnet agents
  take the parallel parts that copy a settled pattern: native's mirror, the showcase stories and
  behaviour tests, the guides and knowledge pages, the Stead port. Haiku takes only small edits
  whose answer is already clear. Parallel agents work in their own worktrees; the shared roster and
  `DESIGN.md` are merged one at a time.
- Superseded: epic 005's stories 01 (screen and floating act), 02 (split tells place) and 05
  (section registration), in review with only their phone box open, the `data-fill` and
  `ThreadRoom` mechanism story 03 built (its `fill.test.ts` and `ThreadFillsMain*` stories go
  with it), and its 2026-10-04 ruling that a frame learns what its children need
  through props or slots. A frame needs to know nothing about its children.
