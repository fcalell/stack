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

The questions under steps 2 and 3 are a first draft, written from what one screen showed. This step
makes them as complete as the known faults and the established practice allow, before any
component or screen is checked.

Read in full, and for each source answer: which fault or rule does it name that the draft misses?
How would a question about it be answered (a grep, a read, a measure on the render)?

- **Ours:** the ask and the problem above; `.helm/knowledge/product/philosophy.md`;
  `.helm/knowledge/architecture/ui-core.md`; ui-core's guide (`rubric.md`, `judging.md`,
  `design-critique.md`, `screen.md`, `patterns/loading-and-pending.md` and every other pattern
  page); `research/render-smells.md` and epic 005's stories; `research/skeleton-loading.md`;
  Stead's `design/evidence.md` and `design/07-interface.md`.
- **Established practice,** checked against current docs, not memory:
  - React's pages on `Children` and `cloneElement` and their listed alternatives, and "You Might Not
    Need an Effect";
  - Every Layout's axioms: spacing owned by the parent, intrinsic sizing, the Stack and Sidebar
    primitives;
  - web.dev on Cumulative Layout Shift and its causes;
  - TanStack Query on placeholder and previous data, and TanStack Router on pending components;
  - composition and slot APIs in Radix, React Aria and Ark;
  - the component API and contribution guides of GitHub Primer, Shopify Polaris and Adobe
    Spectrum on props, variants and booleans;
  - container queries against media queries;
  - WAI-ARIA Authoring Practices on overlays and focus;
  - React Native and Expo parity with the web.

**Coverage check.** Every fault in the problem above and every complaint in the ask is caught by
at least one question. Every question names how it is answered.

**Report:** the final checklists for steps 2 and 3, each question with its source and its method;
then the candidates dropped, each with its reason.

### 2. Component review

**Scope, named in full:** each of the 66 components in `ui-core/src/roster.ts`, on web
(`plugin-react-ui`) and native (`plugin-native-ui`), and each helper under `react-ui/src/ui/lib`
and its native mirror that a component uses to lay out, measure, wait or read its children
(`section.ts`, `field-wait.tsx`, `frame.ts`, `item-header/pair.tsx`, `thread/fill.ts` and the
rest the review finds).

**Questions per component (draft):**

- Tree and flow:
  1. Does it read its children (`Children`, `cloneElement`, `.type`, Fragments seen through)?
  2. Does its form change by a context, or by a `data-*` mark?
  3. Does a child decide the parent's layout (a mark, a registration in a context, a portal back
     into the parent)?
  4. Does it set a margin or spacing outside itself that the parent's gap should own?
  5. Does it render a wrapper with no layout or meaning, or a Fragment callers must see through?
  6. Does it work only inside a given parent or around a given child? Which, and what breaks outside?
- Size and position:
  7. Every fixed size, min, max and arbitrary value it sets on itself or its children: is each a
     token or a literal?
  8. Does it read the viewport where its container should decide?
  9. Does it measure in JavaScript (`getBoundingClientRect`, `ResizeObserver`, a layout effect)?
  10. Does it position absolutely or fixed, portal, clip overflow or scroll on its own? Can focus
      scroll that container? Does its clipping hide content that overflows by a layout error?
  11. Does it render once, or paint a first frame and then move?
  12. A surface inside another: is its radius the outer radius less the inset? A number that
      changes in place: are its digits tabular?
- Loading:
  13. Does it have a loading form, and where does that form's size come from?
  14. Does the loading form match the loaded form's size and structure, measured in the showcase?
  15. Does it remount on a data change (a changing `key`, a conditional swap)?
  16. Do its empty and error forms stand at the loaded form's size?
- Behaviour and API:
  17. How many behaviours, props and variant values does it have?
  18. How many of each does Stead use?
  19. Which props combine into states that are invalid or never used?
  20. Which props are layout a parent's flex or grid would do (`bleed`, `inset`, `fill`, `in`)?
  21. Does it import routing, a query or app state that belongs to its caller?
  22. What logic would go?
- Parity and cost:
  23. Does native take the same props and behave the same? Each difference.
  24. Which showcase stories, behaviour tests and guide pages encode a behaviour that would go?
  25. Which Stead call sites change, and how many?
  26. Does the cut lose a role, a label or a focus order?
  27. Does focus stay visible, never under a sticky or fixed element, and does it return to the
      trigger when an overlay closes?

**Report:** one row per component and helper, a column per question, each answer with its path
and lines; then the components grouped into families sharing a cause, each family with its
proposed cut.

### 3. Loading study

**Scope, named in full:** every route in Stead's app, in every state the fixture seeds, at 375,
768 and 1440px, under the fixture's slow and fail controls.

**Inspections per screen and region (draft):**

1. Total layout shift, from the browser's `layout-shift` entries until the screen settles, and
   each shift's source element.
2. The skeleton's box against the loaded box: width, height, row or item count.
3. How long the skeleton shows; a flash under about 200ms.
4. During a refetch, is the stale data kept, or does the region drop back to its skeleton?
5. Which elements remount on a refetch (node identity kept or not), the canvas first: are node
   positions, the viewport and the selection kept?
6. Between Panes, does only the changed Pane load, or the whole page?
7. Are scroll position and focus kept across load, refetch and navigation?
8. Request waterfalls (queries waiting on each other without need) and duplicate requests.
9. Error and empty states: their size against the loaded state; does a retry shift the layout?
10. Late fonts or icons shifting the layout.
11. An overlay opening (popover, sheet, picker): its first frame's position, and any scroll of an
    ancestor. The grants picker first, in a real Chrome.

**Report:** a table per screen, each fault with its numbers and its cause traced to the stack
component or the Stead code behind it; dated lines in Stead's `design/evidence.md`; a summary here.

### 4. Passes

One pass per family from steps 2 and 3, each family's cut confirmed by fcalell before it is built.
The frame is the first family, its design below, written before the review; the review confirms
or changes it. Each pass lands on web and native in one commit, with the roster, `DESIGN.md`
(regenerated), the showcase and the guides. Stead's stack pin moves after each pass and its
screens are ported in that step.

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
- **Three widths, derived:** the narrowest phone (320), `tablet` (768, the narrowest width where
  every Pane shows) and the viewport where a page's `wide` opens (1440, `wide` plus the sidebar),
  each the hardest point of its layout. They come from `BREAKPOINT_PX` and the sidebar's width in
  place of `overflow.ts`'s fixed five; `rubric.md`, `design-critique.md` and Stead's review plans
  use the same three.
- **Findings an agent can act on:** the rule, the element, the measured value, the expected value
  and the fix.
- **False-pass tests.** Each check, grep or render, has a test showing it catches a bad case
  (`display: contents`, a hidden element, zero height), so none passes by never matching.

## The frame

The first family's design, decided before the review and open to what it finds.

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

Stead's frame usage at its commit `b3d314e`: 7 Places, 17 Screens, 6 Splits; Place props used:
`title` 7, `bleed` 6, `actions` 5, `more` 4, `up` 2, `foot` 1, `act` 1 (the not-found page, which an
`EmptyState`'s act covers), `context` 0. `wide` on 3 Panes: the workflow canvas, the knowledge
graph, the file diff.

## Leads for the review

Faults already seen while tracing the System screen, for step 2 to confirm, measure and place in
their families. None is a decided cut.

- `Section` reads its collections' loading state from its direct children (`lib/section.ts`,
  `sectionPartsOf`, Fragments seen through, an app component not), so its skeleton depends on how
  the app wraps its `List`. `QueryBoundary` has 35 uses in Stead; about 60 Sections pass `loading`.
- `Form` (25 uses) and `lib/field-wait.tsx` walk their children through Fragments and treat
  `FormField` (69 uses), `Section` and `ActionBar` apart by type.
- `Toolbar` sorts its children into search and chips by type (1 use).
- A popover's first frame lands before it is positioned, inside the `overflow-hidden` shell.
- The Shell, the banner, `foot`'s docking and the room density: what each still earns once the
  frame is Panes.

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
- Superseded: epic 005's open stories 01 (screen and floating act), 02 (split tells place) and 05
  (section registration), and its 2026-10-04 ruling that a frame learns what its children need
  through props or slots. A frame needs to know nothing about its children.
