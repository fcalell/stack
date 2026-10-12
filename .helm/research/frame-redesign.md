# Frame redesign

2026-10-12. Decided with fcalell in conversation, from a review of Stead's System screen. This page is
the plan for the work and drains as each pass lands: what is built moves into
`.helm/knowledge/architecture/ui-core.md`, the guides and the roster, and its line here goes.
The work runs directly from a session, with no board epic.

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
workflow canvas redraws whole. Not yet measured.

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

## The frame

```
<Place>                                   the page: Panes in a grid, no bar of its own
  <Pane title="System" actions more>  <Group/> …  </Pane>
  <Pane title="Agents" actions>  <Section/> <Section/>  </Pane>
  <Pane title="Stead" back="/system/agents">  <Section/> …  </Pane>
</Place>
```

- **Place** is a grid, `grid-template-columns: auto … minmax(0, 1fr)`: each Pane but the last as
  wide as its content, the last taking the rest, a hairline between them. It never reads its
  children. It keeps `distance: "room"` (the TV density). It draws no bar: the first Pane's bar
  carries the page's title, its toolbar, and on the phone the place switcher, so the desktop has
  one row of bars and the phone always one bar.
- **Pane** is a flex column: a bar (title, actions, more, `back` drawn as Close beside other Panes
  and as Back where it stands alone), a body that scrolls (`flex-1 min-h-0 overflow-y-auto`,
  page inset, its direct children always a `sections` gap apart, nothing paired), and an
  optional `foot` docked under the body (an ask box, a message input). Each Pane is the size
  container (`@container/page`) its content's container queries read.
- **Content width.** A Pane's body content stands within `measure` (58ch, 488px on the desktop),
  aligned left under its title, so a label stays near its value, a field near the size of what it
  holds, a Save near the fields it saves. `wide` lifts the limit for content whose meaning is its
  width: a `Canvas` (the workflow canvas, the knowledge graph) and a code `Diff`. `wide` is for a
  Pane whose content is that wide thing; a wide table in a reading Pane scrolls sideways inside
  the column. The empty space a reading Pane leaves stands only at the screen's right edge.
  Measured with the caps lifted at 1920px, without the limit: pickers 1270px long, a
  `DefinitionRow`'s value or switch 1200px from its label, an `OptionList` box mostly empty, a
  Slider track too long to set, a Form's Save and a Section's act far from what they act on.
- **Covering.** `<Pane cover>` spans the Place (`grid-column: 1 / -1`) and the Panes before it are
  hidden with `display: none`: mounted, so they keep scroll and typed text, and out of the tab
  order. A pushed page is a covering Pane with `back`.
- **Narrow widths.** Below `tablet` only the last Pane shows, with its back act: the same
  mechanism as covering, every Pane covering the ones before it. Above `tablet` every Pane shows
  and the grid squeezes the `auto` columns toward their content's minimum.
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

## Passes

Each pass lands on web and native in one commit, with the roster, `DESIGN.md` (regenerated),
the showcase and the guides. Stead's stack pin moves after each pass and its screens are ported in
that step. Usage counts are Stead's at its commit `b3d314e`.

1. **Frame.** Everything under "The frame" and "Deleted". Stead: 7 Places, 17 Screens, 6 Splits;
   Place props used: `title` 7, `bleed` 6, `actions` 5, `more` 4, `up` 2, `foot` 1, `act` 1
   (the not-found page, which an `EmptyState`'s act covers), `context` 0. `wide` on 3 Panes: the
   workflow canvas, the knowledge graph, the file diff.
2. **Loading.** `sectionPartsOf` (`lib/section.ts`) goes: a Section reads its collections'
   loading state from its direct children (Fragments seen through, an app component not), so the
   skeleton depends on how the app wraps its `List`. Loading belongs to what owns the query
   (`QueryBoundary`, 35 uses; about 60 Sections pass `loading`), and a skeleton stands at the size
   of what it stands in for. Then measure layout shift, skeleton size and the canvas redraw on
   Stead's screens through the fixture's slow controls.
3. **Forms.** `Form` (25 uses) and `lib/field-wait.tsx` stop walking their children through
   Fragments and special-casing `FormField` (69 uses), `Section` and `ActionBar` by type: a form is
   a column of fields an even gap apart.
4. **Toolbar.** It sorts its children into search and chips by type; it takes named `search` and
   `chips` slots instead (1 use).
5. **Popover first frame.** A popover appears only once positioned, and the shell's outer
   container becomes `overflow-clip`, which focus cannot scroll. Confirm the jump in a real Chrome
   first.
6. **What remains of the frame.** The Shell, the banner, `foot`'s docking and the room density:
   each kept only where it still earns its code after pass 1.

## Method

- Work from a session on stack's `master`, no board epic. One pass at a time; each ends with
  stack's `pnpm check` green, then Stead's pin moved, its screens ported and its `pnpm check`
  green, then a look on Stead's fixture server.
- The session that holds the design builds the pattern-setting part of a pass itself (pass 1: web
  `Place` and `Pane`, the `ui-core` variants and roster, the deletions). Sonnet agents take the
  parallel parts that copy a settled pattern: native's mirror, the showcase stories and behaviour
  tests, the guides and knowledge pages, the Stead port. Haiku takes only small edits whose
  answer is already clear. Parallel agents work in their own worktrees; the shared roster and
  `DESIGN.md` are merged one at a time.
- Superseded: epic 005's open stories 01 (screen and floating act), 02 (split tells place) and 05
  (section registration), and its 2026-10-04 ruling that a frame learns what its children need
  through props or slots. A frame needs to know nothing about its children.
