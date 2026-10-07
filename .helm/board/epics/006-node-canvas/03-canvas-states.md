---
id: 006-03
status: done
sessions: {}
---
# react-ui: the canvas draws off, a problem, a status and a run's taken path

## Goal
The states both consumers read on the canvas: Stead's off nodes, its problems from a save and a
run's marked node; Martechthings' test status and a scenario's taken path. Every state shows in
the node's visible text or mark, never by colour alone.

## Approach
Read first: story 02's brief ("Room for 03 to 05", "Overlays", "Owns widening and Storybook",
"Decided"), story 01's cells (`CANVAS_NODE`, `CANVAS_NODE_TEXT`), the pattern page
`packages/ui-core/guide/patterns/node-canvas.md` (its Run and Problem rows),
`.helm/research/node-canvas.md` ("Anatomy", "Decisions"), `.helm/agents/conventions.md` and
`plugins/react-ui/src/ui/components/status/`. Land after 02 has committed: this story edits
02's `look.ts`, `node.tsx`, `edges.tsx`, `label.tsx`, `index.tsx` and its stories.

Every cell a state spells exists (01), `Canvas`'s `draws` already lists the
`STATUS*` and `SPINNER*` cells, `owns` already holds every colour the states use (`edge-error`,
`ink-disabled`, `ok`, `warn`, `danger`), the roster's `states` stay `rest` and
`selected` (the roster's `State` is the interaction list, and a node's tone is not one of
those), and no overlay is added. `DESIGN.md` gains nothing.

Decided in this brief (the user's rulings are in "Decided"; the rest follow from them):

- **A node's look is data in, classes out, in one pure place.** `nodeLook` (and a new `edgeLook`)
  in `look.ts` decide; `NodeView`, `EdgeLayer` and `EdgeLabel` only spell what they return. Both are tested in
  node.
- **Nothing a state does changes a node's width or an edge's route.** Off and path-dimmed only
  recolour. A problem line and a status can add a row's height to a node that had none (below),
  and the layout does not rerun for it: the layer gap absorbs it.
- **Hue stays on marks.** The danger hue is the problem's border and its dot, the status hues are
  the dot, accent is the selection and `at`. A taken edge, a taken node's box and the group
  frames take no hue and no tint. Dashed is untouched: only `handoff` draws it.

## The states

### Look (`plugins/react-ui/src/ui/components/canvas/look.ts`)

`nodeLook(node, selected, path)` takes `path` as its third parameter (`path?: CanvasPath`, optional so
02's calls and tests stand; 02's room note names the three-parameter form, and 03 adds it if 02 landed two) and `NodeLook` widens:

```ts
export interface NodeLook {
	// The `CANVAS_NODE` state: the outline's colour.
	state: "rest" | "selected" | "problem";
	// The `CANVAS_NODE_TEXT` tone of every part, the line included.
	tone: "rest" | "off" | "dimmed";
	// What the line slot shows.
	shows: "line" | "off" | "problem";
	// Whether the trailing column draws the node's `status`.
	status: boolean;
	// Whether the trailing column draws the danger mark.
	problem: boolean;
}

export type EdgeTone = "rest" | "dimmed";
export function edgeLook(
	edge: Pick<CanvasEdge, "id" | "from" | "to">,
	nodes: ReadonlyMap<string, Pick<CanvasNode, "off">>,
	path: CanvasPath | undefined,
): EdgeTone;
```

`nodeLook` rules, in this order (a node is **on the path** when `path` is absent, or its id is in
`path.nodes`, or it is `path.at`):

| Field | Rule |
| --- | --- |
| `state` | `selected` when `id === selected` or `id === path?.at`; else `problem` when `node.problem` is set, the node is not `off` and it is on the path; else `rest` |
| `tone` | `dimmed` when off the path; else `off` when `node.off`; else `rest` |
| `shows` | `off` when `node.off`; else `problem` when `node.problem`; else `line` |
| `status` | `Boolean(node.status)` and the node is on the path |
| `problem` | `Boolean(node.problem)`, the node is not `off` and it is on the path; selection does not touch it |

What follows from the table, each a test row:

- **Off** draws the overline and title in `off`, the word `off` (`useWords().off`, "Off") as the
  line in `off`, the `rest` box. It ignores `problem` (an off node does not run, so a consumer passes one or the other).
- **Problem** draws the `problem` box (`border-edge-error`), `node.problem` in place of
  `node.line` in the ink a rest line has, and the danger mark: a `StatusDot` in its `failed`
  state (the state whose hue is `danger`) in the trailing column. Every part keeps its rest ink,
  since status colour is confined to an icon, dot or chip and never the row's text. A node with a
  problem and no line gains the line's row.
- **Problem and status together** draw both, independently: the status's own dot and word, then the
  danger dot below it in the trailing column. A second danger dot beside a `failed` status is
  accepted: the status is a work state the run reports and the dot is the save's problem, two
  facts a consumer passes separately.
- **Selected** wins the outline over `problem`; the problem line and the danger mark stay, so a
  selected problem node still reads (the mark is what carries it once the border is gone). Selection never changes the ink: a selected node off the path keeps `dimmed`.
- **Dimmed** (off the path, with a `path`) draws every part in `dimmed`, the `rest` box, and no
  `Status`. A problem node off the path shows its problem words in `dimmed` ink and the `rest`
  box, and no danger mark (a dimmed node shows no status, and a mark is a status). The run's marks belong to the taken path (the pattern page: "the taken path at full ink
  with its status marks, the rest in disabled ink"); a consumer that has a status for an untaken
  node passes it and the canvas does not draw it.
- **`at`** draws exactly what selection draws: `CANVAS_NODE.state.selected` plus
  `outline-1 outline-selected-outline` (02's selection overlay, a 2 px ring in all), the same
  element, no new class.
  `selected-outline` is the accent (`accent-ink`), the active hue. An `at` that is not in
  `path.nodes` is on the path. With `selected` and `at` both set, both draw the outline.
- **`path` with no nodes** dims every node except `at`; it is the consumer's data.

`edgeLook`: `dimmed` when `path` is set and `edge.id` is not in `path.edges`, or when either end
is an off node (an unknown end is never off); else `rest`. An edge is on the path by its own id
only, never inferred from its ends, so a run that skips an edge between two taken nodes dims it.

### Drawing

`index.tsx` (`Canvas`): each `NodeView` gets `look: nodeLook(node, selected, path)` and each edge
goes to `EdgeLayer` with `tone: edgeLook(edge, byId, path)`; `byId` is the map of nodes by id. `path` joins the
destructured props. A `path` and `nodes` both move with the render, so nothing is memoised on
them beyond what 02 does. `graphKey` does not read `path`, `off`, `problem` or `status`: none of
them moves a node.

`node.tsx` (`NodeView`):

- The line is `canvasNodeText({ part: "line", tone: look.tone })` and its text is
  `look.shows === "off" ? words.off : look.shows === "problem" ? node.problem : node.line`,
  drawn when that text is non-empty. `const words = useWords()` from `../../lib/words.tsx`, as
  `StatusBase` does; the word is never a literal (`b-words`).
- The overline and title use `canvasNodeText({ part, tone: look.tone })`.
- `canvasNode({ state: look.state })` takes `problem`. The hover wash stays on `rest` only
  (`look.state === "rest" && HOVERED`), so a problem's border does not recolour under the
  pointer. A dimmed node keeps `rest`, so it still hovers, selects and takes Tab.
- The trailing column, already `flex flex-col items-end shrink-0` and holding the figure, holds
  `<Status state={node.status.state} label={node.status.label} />` after it when `look.status`
  (`Status` from `../status/index.tsx`, composed, never its cells), then `<StatusDot state="failed" />`
  (`../status/dot.tsx`, composed) when `look.problem`. `running` draws `Status`'s own
  spinner in the accent ink, the dot's place. The label is `StatusMark.label`, always set: the
  status is its word and its dot, so it never reads by colour alone. No `aria-*` is spelled
  (Decided).

`edges.tsx` (`EdgeLayer`) and `label.tsx` (`EdgeLabel`): `EdgeLayer` takes a `tone: EdgeTone` per
edge and passes it to the chip. Each edge's `<g>` carries `data-edge="<edge id>"`, the mark the
behaviour stories read an edge by. The `<g>`'s ink is
`tone === "dimmed" ? "text-grid" : "text-edge-strong"` as two module constants (`INK`, `DIM`), so
the path, its stroke and its arrowhead (`currentColor`) change together, and `strokeDasharray`
stays `"4 4"` for a handoff edge only. `EdgeLabel` takes `text-ink-disabled` in place of
`text-ink-meta` when its tone is `dimmed`, which recolours the handoff glyph (the chip carries its own
ink; atoms do not dim, see Decided). A forward and a back edge dim the same way. Group frames and heads do not
dim: they are structure, and a run changes the nodes and edges.

**Why `grid` for the dimmed edge.** Measured against `canvas`, `edge` is 1.19:1 in light and
1.41:1 in dark, fainter than the dot grid, so a dimmed edge in `edge` is lost among the dots.
`grid` is 1.50:1 in both modes, and the taken edge, `edge-strong`, is 3.38:1 and 3.68:1. The
other candidate, `ink-disabled`, stands within 0.05 of lightness of `edge-strong` (L 0.665 and
0.506 against 0.62 and 0.53), so it would read as the rest edge. `grid` is the faintest ink that
still reads on the ground, and its overlay entry (`text-grid`, 02's, shared with the dot grid)
and `text-ink-disabled` already stand.

### Where the pieces go in the files

| File | Edit |
| --- | --- |
| `look.ts` | `NodeLook`, `nodeLook(node, selected, path)`, `EdgeTone`, `edgeLook` |
| `node.tsx` | the line's source, the box's `problem` state, `Status` and the problem's `StatusDot` in the trailing column, `useWords` |
| `edges.tsx`, `label.tsx` | the per-edge `tone`, `INK`/`DIM` (`text-edge-strong`, `text-grid`), `data-edge`, the chip's ink |
| `index.tsx` | `path` destructured; `look` into each `NodeView`, `tone` into `EdgeLayer` |
| `plugins/react-ui/src/ui/showcase/graphs.ts` | the five fixtures below (it holds `WORKFLOW` and `JOURNEY`) |
| `plugins/react-ui/src/ui/showcase/frames/canvas.tsx` | `drawCanvas` draws them in their cells |
| `apps/showcase/behaviour/canvas.stories.tsx` | the state stories |
| `plugins/react-ui/test/canvas.test.ts` | `nodeLook` and `edgeLook` tables, the fixtures, the frame cells |
| `plugins/react-ui/guide/canvas.md` | a "States" section (below) |
| `.helm/knowledge/architecture/ui-core.md` | one sentence on 02's Canvas bullet (below) |

Not edited: `plugins/react-ui/scripts/overlays.ts` (every class a state spells is in the file
already or in a cell: `b5` stays quiet, and drops no entry; a dimmed edge's `text-grid` is 02's), `packages/ui-core` (roster, cells,
`DESIGN.md`), `plugins/react-ui/scripts/verify.ts`, the closure fixture (`CanvasProps` is
unchanged), `plugin-native-ui`.

## Fixtures (`graphs.ts`)

Plain data beside `WORKFLOW` and `JOURNEY`, built by spreading them so a node keeps its id and
its words. Their words avoid every `PRODUCT_NOUNS` entry (`b-nouns` reads the files, comments
and ids included, case-insensitively: no "story", "job", "card", "brief", "lane", "repo", "trip",
"epic", "inbox").

| Export | Over | Adds |
| --- | --- | --- |
| `OFF` | `WORKFLOW` | `review: { off: true }`. Its in-edge `gate>review` dims; its out-edge `review>handoff` is the handoff, so it dims and stays dashed. |
| `PROBLEM` | `WORKFLOW` | `build: { problem: "Missing the target" }` |
| `STATUSES` | `WORKFLOW` | one status per node, one per state, in node order: `start` `done` "Done", `plan` `waiting` "Waiting", `build` `running` "Running", `check` `failed` "Failed" (it keeps `count: 3`, so its trailing column holds both), `gate` `attention` "Needs a look", `review` `active` "Active", `handoff` `idle` "Idle". Together the seven `STATUS_STATES`. |
| `RUN` | `WORKFLOW` | `path: { nodes: [start, plan, build, check, gate, review], edges: [start>plan, plan>build, build>check, check>build, check>gate, gate>review], at: "review" }` (the loop ran once and the gate answered "green"), with `done` "Done" on the first five and `running` "Running" on `review`. `gate>plan` and `review>handoff` and the `handoff` node are off the path. |
| `SCENARIO` | `JOURNEY` | `path: { nodes: [begin, b1, b2], edges: [begin>b1, b1>b2], at: "b2" }`, `done` "Passed" on `begin` and `b1`, `failed` "Failed" on `b2`. The rest, `merge` and `finish` included, dims: a scenario that stops where it failed. |

Their type is `Graph & { path?: CanvasPath }`; `Graph` gains the optional `path` and the stories
and frames pass it through. Fixtures hold no `position`, so the layout runs and every state is
drawn on the laid-out graph.

## Stories

Light and dark come from the generated frames (each draws both modes); the behaviour stories
assert relations between nodes (a colour differs from another's, a word is present), so they
hold in either mode. Viewport 1280 × 800, the vitest config, left as it is.

**Generated frames.** The generated `Rest` and `Selected` stories take their frames from
`showcaseFrames()`, one per cell and state, and `drawCanvas(frame)` draws a canvas in the cells
below and the swatch in every other. 02 draws two (`CANVAS_NODE.state.rest`); 03 adds five, each
the real `Canvas` in 02's stage and its local `useState` wrapper, with `path` passed:

| Cell | State | Draws | Reads as |
| --- | --- | --- | --- |
| `CANVAS_NODE.state.problem` | `rest` | `PROBLEM` | problem |
| `CANVAS_NODE_TEXT.tone.off` | `rest` | `OFF` | off |
| `STATUS_DOT.state.active` | `rest` | `STATUSES` | status |
| `CANVAS_NODE_TEXT.tone.dimmed` | `rest` | `RUN`, `selected` unset | a run over the workflow |
| `CANVAS_NODE_TEXT.tone.dimmed` | `selected` | `SCENARIO`, `selected` unset | a scenario over the journey |

The cell is the tone or state the frame shows (the cell's own classes are what its swatch would
list); the canvas draws every state a fixture holds, so each frame names the state it is there
to judge. The `Rest` story's `cell` control browses one cell, so a state is one pick, light and
dark side by side. `stories:test` runs axe over every frame. A dimmed node is an operable `button` whose text is
`ink-disabled` (about 3:1), and axe's `color-contrast` exempts only a control that is disabled,
which this is not, so the run and scenario frames are excluded from that check (below).

**The axe exclusion.** The generated modules in `apps/showcase/stories/` are rewritten by
`.storybook/roster.ts`, so the exclusion lives in `apps/showcase/.storybook/state-stories.tsx`,
which builds every generated story's `StoryObj` and already sets its `parameters`.
`.storybook/preview.tsx` holds the global `a11y` config (`PAGE_LEVEL_RULES` disabled) and is not
edited; `.storybook/page-stories.tsx` is the precedent for a per-story `parameters.a11y` (its
`PAGE_A11Y` sets `context` and `config`).

- `state-stories.tsx` gains a module constant keyed by component, read when `stateStories`
  builds a story's `parameters`:

  ```ts
  // A node off a run's path draws disabled ink on purpose (the pattern page's rule: the rest of a
  // run in disabled ink), about 3:1. Axe exempts only a disabled control, and these are enabled
  // buttons, so their text is left out of the check. Only the dimmed frames, only Canvas.
  const UNCHECKED = {
    Canvas: ['[data-cell^="Canvas/CANVAS_NODE_TEXT.tone.dimmed/"] [data-layer] button'],
  };
  ```

  and, for a component in it, `parameters.a11y = { context: { exclude: UNCHECKED[component] } }`
  (the `context` shape `page-stories.tsx` uses). The selector names the run frame and the
  scenario frame (`data-cell` is `<component>/<cell>/<state>/<mode>/<density>`) and only their
  node buttons (the layer is 02's `data-layer` mark); every other frame and story still runs every rule.
- An axe `context` exclusion leaves the excluded nodes out of every rule, not only
  `color-contrast`. The brief accepts that breadth for these two frames: their nodes are the same
  `NodeView` the other frames check. If the installed addon-a11y can scope the exclusion to
  `color-contrast` alone through its per-story `config.rules`, use that instead (verify against
  the addon's docs through context7 before writing it).
- The disabled ink is not raised: that is a contract change.

**Behaviour stories** (`apps/showcase/behaviour/canvas.stories.tsx`, `Behaviour/Canvas`, 02's
shape: `play` with `expect`, `waitFor`, `userEvent`; each is a finding if it fails, never
weakened). Each renders a fixture in a stage with `onSelect`, waits for its first node button to
be visible, and reads a node's button by its title (the button holds its visible text) and an
edge by `[data-edge="<id>"]`:

1. **Off.** `OFF`: the `review` button's text holds "Off" and not "Reads the changes", and its
   title's computed `color` differs from `plan`'s. The `gate>review` edge's path has no
   `stroke-dasharray`, its `<g>`'s `color` differs from `plan>build`'s; `review>handoff` keeps
   `stroke-dasharray` (the dash is the handoff's, not the off state's) and its `color` differs
   from `plan>build`'s too. An off node is still a button in Tab order.
2. **Problem.** `PROBLEM`: the `build` button's text holds "Missing the target" and not "Edits
   the files"; its border colour differs from `plan`'s, its line's `color` equals `plan`'s
   line's (the problem's words are in rest ink), it holds the danger dot and `plan` holds none;
   selecting it draws `outline-width` 1px after a pointer click (the focus ring is 2px and is not in play)
   and the problem words and the dot stay.
3. **Status.** `STATUSES`: each button's text holds its status label; `check`'s holds "3" and
   "Failed"; `build` holds "Running" and a spinner (the element
   `Spinner` draws, read in `Spinner`'s own markup), the others a dot; no status word is only a
   colour.
4. **Run.** `RUN`: the off-path nodes' (`handoff`) title `color` differs from the taken nodes',
   holds no status word, and the taken ones hold "Done"; `review` (at) has `outline-width` 1px
   and the others none; `gate>plan`'s and `review>handoff`'s `<g>` colour differs from
   `build>check`'s, and `check>build` (the taken back edge) equals it. Every node stays a
   button, reachable by Tab in path order.
5. **Scenario.** `SCENARIO`: `b2` has `outline-width` 1px and "Failed"; `merge`, `finish`, `a1`,
   `a2` and `c1` are dimmed (title `color` equals `merge`'s and differs from `begin`'s) and hold
   no status word, and the numbers (`Count`) still draw on every node.
6. **Selection over a path.** Clicking a dimmed node in `RUN` calls `onSelect` with its id and
   draws the 1px outline while its ink stays dimmed.

`graphKey` carries no state, so one more behaviour check guards it: a canvas whose fixture's
`path` changes between renders does not call the layout again (no second `elk-worker` resource
entry, `performance.getEntriesByType("resource")` as 02's layout-on-demand story reads it).

**The design critique.** A session that played no part in the work judges 1280 × 800 renders
taken through Storybook (`pnpm stories`, `Canvas`'s `Rest` and `Selected` stories, `cell` control
set to each of the five cells above), light and dark, against the pattern page. The run
(`CANVAS_NODE_TEXT.tone.dimmed`, `rest`) is read against its Run rows, Twenty
[b94dbaba](https://mobbin.com/screens/b94dbaba-0437-4bd4-acce-8730e1739249) and Attio
[ac501533](https://mobbin.com/screens/ac501533-24e3-49b1-a564-cf0ec2a1b145), for what the pattern
page sets as rules (their previews are too small to measure): every node in place, the taken
nodes and edges at full ink with their status marks, the rest in disabled ink, hue on the marks
only. Attio's taken edges are in the success hue; this canvas keeps them at the rest ink and the
hue on the status dots, which the critique may find a gap (Decided). The problem frame is
read against the Problem rows (n8n, Copy.ai: the node in the danger hue, the problem named
outside the canvas). The off frame is read against the range's "an inactive edge dimmed" and
"dashed only for a handoff".

## Guide and knowledge

- `plugins/react-ui/guide/canvas.md`: a "States" section after "Where the nodes stand" (02's
  page). It teaches: `off` (the muted node with the word "Off", edges dimmed, never dashed: a
  switch lives in the node's sheet), `problem` (the first words only; name the problem outside
  the canvas in a `Banner` and `List`), `status` (a `StatusMark`, a dot and its word, on the
  taken path only when a `path` is passed), `path` (`nodes`, `edges`, `at`: what the run or
  scenario took; the rest dims; `at` is outlined like a selection), with one example, the run:
  `path` over a workflow with `status` on its taken nodes. Present tense; no product nouns it
  does not already use.
- `.helm/knowledge/architecture/ui-core.md`, 02's `Canvas` bullet: one sentence that a node's
  tone is `nodeLook` and an edge's is `edgeLook` (precedence: selected over problem; off path over
  off over rest; an off node ignores its problem; a problem's words keep the rest ink and its mark
  is a danger dot), the dimmed edge draws `grid` because `edge` is fainter than the dot grid and
  `edge-strong` and `ink-faint` are within 0.05 of lightness, and a state never moves a node or
  re-runs the layout.

## Checks

| Check | Change |
| --- | --- |
| `plugins/react-ui/test/canvas.test.ts` | `nodeLook` rows: no path (every node on it, `status` per `node.status`); selected over problem; problem alone; problem and off (off wins, `state` `rest`); off alone; dimmed alone (`state` `rest`, `status` false); dimmed and selected (outline, ink stays dimmed); `at` outside `path.nodes`; `at` and `selected` both; dimmed problem (`shows` `problem`, `tone` `dimmed`); empty `path.nodes`. `edgeLook`: no path; an edge in `path.edges`; one out; an edge between two taken nodes but not listed (dimmed); an edge to an off node; an unknown end. The fixtures: every id in `path` exists, `at` is on the path, every edge id exists, `STATUSES` covers `STATUS_STATES` exactly, `RUN` and `SCENARIO` leave nodes off the path, no fixture holds a `position`. The frame cells: the five cell names above are cells of `showcaseFrames()` for `Canvas` (`test/showcase.test.ts` already imports it), so a renamed cell fails here, not silently as a swatch. |
| react-ui `verify` | `b-words` (the "Off" is `words.off`, no literal), `b-nouns` (the fixtures), `b5` (no new overlay, none stale), `a6` (every class emitted; `text-grid` and `text-ink-disabled` already), `b-owns`, `b-holds` (`Canvas` imports its own cells only; `Status` composed), `b-roster` ("65 of 65" unchanged). |
| ui-core `verify`, native-ui `verify`, `DESIGN.md` drift test | unchanged and run: nothing in ui-core moves. |
| `pnpm stories:test` | the generated frames (axe included) and the behaviour stories above, at the vitest config's 1280 × 800. |
| `pnpm check` | the per-change gate; it must pass. |
| Design critique | as above; its verdict is recorded under "Progress". |

## Risks

- **The dimmed edge is the faintest line on the canvas.** `grid` is 1.50:1 against `canvas`,
  the dot grid's own ink. A continuous line against dots reads, the arrowhead included, but the
  critique judges it at 1280 × 800 in both modes; a failure is a contract question for the user,
  not a new token here.
- **A later status or problem can add height.** A node that first drew no line or no status
  grows by up to a row when one arrives (a run's progress, a save's problems); the layout runs
  on the first measure and not again (`graphKey` is structure only), and the layer gap
  (`max(sections, chip + 3 * pair)`) holds the growth. Group frames and back routes read the live
  boxes and follow.
- **`Status` width.** The trailing column is `shrink-0`; a long custom label narrows the text
  column to its minimum and truncates the title. Statuses use the state's own short word or one
  the consumer keeps short, and the column has no width cap.
- **Frames cost.** Seven generated canvases, each in two modes, each laying out in the ELK
  worker, share the `Rest` story's run (`testTimeout` is 120 s). If it times out, split nothing:
  report it as a finding.

## Acceptance criteria
- [x] The generated frames draw a story per state in `Canvas`'s `Rest` and `Selected` stories, light and dark: off (`OFF`), problem (`PROBLEM`), status (`STATUSES`, all seven states), a run over the workflow (`RUN`) and a scenario over the journey (`SCENARIO`); `pnpm stories:test` (the vitest config's 1280 × 800) passes with the behaviour stories above.
- [x] Every state shows in the node's visible text or mark, never by colour alone: off as the word "Off" in place of the line, a problem as its words in place of the line, a status as its dot (or spinner) and its word, the path's `at` as the selection's outline.
- [x] Off and off-path edges change ink and never the dash; a handoff edge stays dashed in every state.
- [x] A node off the path, with a `path`, draws every part in disabled ink and no status; a node on it keeps full ink and its status; `at` takes the selection's outline.
- [x] No state changes a node's width or any edge's route, and a `path`, `off`, `problem` or `status` change does not rerun the layout.
- [x] `pnpm check` passes and react-ui's, ui-core's and native-ui's `verify` pass.
- [x] The design critique judges the run against Twenty's and Attio's runs and the problem against the Problem rows, on 1280 × 800 renders taken through Storybook, in light and dark.

## Room for 04 and 05

- **04 (editing).** Nothing here reads a position, a handle or a drag. A moved node keeps its
  look; a node landing at the centre draws its states as any node. Ports show only with
  `onConnect` and the `problem` border does not touch them. `path` does not gate editing:
  a consumer that wants a run read-only passes no `onMove` or `onConnect`.
- **05 (touch).** The glyph-only form reads `look` too: it keeps the `CANVAS_NODE` state (outline,
  `problem` border) and the dimmed ink on its glyph, and must keep a status or a problem as a
  mark visible without the text: the problem's border and `Status`'s dot at the node's corner
  are the two candidates, decided in 05. `NodeView`'s trailing column is the second branch's
  first omission; `look.status` and `look.line` do not change.

## Decided
Decided by fcalell (2026-10-06):

- **Screen readers are out of scope.** Nothing here spells a spoken form: no `aria-*` for a
  state, no `sr-only` text. A state is read from the node's visible text or mark, never by
  colour alone.
- **Dashed means a handoff only.** Off and off-path edges change ink, never the dash.
- **No change-set marks.**
- **A node holds no control.** Off is a state, and its switch lives in the node's sheet.
- **Stories and the critique run at 1280 × 800**, the vitest config, in light and dark.

Decided by fcalell (2026-10-06), the questions the refinement raised:

- **An off node with a `problem`: off wins.** The word "Off" shows, the problem is ignored and the
  box stays `rest`: an off node does not run, and the alternative hides the off state behind
  muted ink alone.
- **The atoms do not dim.** `Count`, the edge label's `Chip` and a status's hue keep their ink on
  a dimmed node or edge; only inherited ink (the handoff glyph) dims. They are neutral grey, not a
  hue, and the labels and numbers are content a run still reads. A tone prop on either is a new
  public surface, not taken.
- **Axe's `color-contrast` skips the dimmed nodes of `Canvas`'s run and scenario frames only.**
  Disabled ink stays; the exclusion lives in `.storybook/state-stories.tsx` as a per-story
  `parameters.a11y.context`, with its reason beside it.
- **Taken edges keep the rest ink.** Full ink for the taken edge, `grid` for the rest, the hue on
  the status dots.
- **A long status label has no width cap.** The label is the state's own word or a short one the
  consumer passes.

Decided in this brief from the above and the evidence read:

- The dimmed edge drew `edge` (not `ink-disabled`, which differs by under 0.05 L from the rest
  edge's); the critique changed it, below.
- A state is a cell of the matrices the canvas already draws; the roster's `states` and the
  contract do not move.

Decided after the critique (2026-10-07), the user's rulings delegated to an advisor:

- **A dimmed edge draws `grid` ink, not `edge`.** Measured against `canvas`, `edge` is 1.19:1 in
  light and 1.41:1 in dark, fainter than the dot grid, so the dimmed edge was lost among the dots.
  `grid` is 1.50:1 in both modes and the taken edge, `edge-strong`, is 3.38:1 and 3.68:1, so the
  dimmed edge reads as a faint line and the taken one stays far above it. `text-edge` leaves the
  overlays, since nothing else emits it. The edge label's dimmed ink is `ink-disabled` and is not
  tied to the edge's.
- **The rubric's disabled-ink exception names a dimmed node and a dimmed edge.** A node off a
  run's path, and an edge off it or touching a node switched off (drawn in `grid`, 1.50:1), are
  exempt from the text and boundary floors as a disabled part is. The pattern page
  already sets disabled ink for the rest of a run, and the exemption said nothing of a node, so the
  rubric and the axe exclusion disagreed. Nothing else widens: an enabled control still meets the
  floors.
- **A problem's words draw in body ink, and a danger mark is added.** The rubric confines status
  colour to an icon, dot or chip, never the row's text, so the problem line takes the ink a rest
  line has. The node gains a `StatusDot` in its `failed` state (the state whose hue is `danger`)
  in the trailing column, composed and never its cells. The mark survives selection, which takes the
  outline from the problem border. An off node ignores its problem, as decided, and a dimmed
  problem node shows no mark, since a dimmed node shows no status. A node with a problem and a
  status draws both, the status's dot and word, then the danger dot below it: they are two facts
  the consumer passes, and hiding either leaves a selected problem node unreadable or a run's
  status unreported.

## Progress
Built to the brief. The first design critique (2026-10-07) found rework; its fixes are below, and a fresh critique passed.

Gate:
- `pnpm check` exits 0 (42 of 42 turbo tasks, Biome 794 files, no fixes). react-ui `verify` 13/13 ("65 of 65 roster components built, 331 props"); ui-core `verify` 34/34; native-ui `verify` 19/19; react-ui `test` 125 pass (`canvas.test.ts` 60). Nothing in ui-core moved, `DESIGN.md` is unchanged.
- `pnpm stories:test`: 195 of 209 tests pass, 10 of 79 files fail, and **every Canvas story passes**: the generated `Rest` and `Selected` (the five new frames in light and dark, axe included) and 22 behaviour stories (02's 15 and seven new: Off, Problem, Statuses, Run, Scenario, SelectsOverAPath, StateKeepsTheLayout). The 14 failures are the known ones, none draws a canvas: Menu `Rest`, Screen `Rest`, Select `Selected`, Input, TextArea, Slider and FileInput `Disabled`, Sheet `Decision` and `Docked In Foot`, ListRow `Rest`, `Loading`, `Error`, `Selected`, Table `Rest`. The suite's exit status is 1 because of them. `StateKeepsTheLayout` reads the requests posted to ELK's worker (a second layout would post a second one), since the worker is one per page and its resource entry alone cannot show a second run.

Deviations from the brief:
- **The axe exclusion is `context.exclude`, not a scoped rule.** Installed addon-a11y 10.6.1 takes a per-story `config.rules` (with a rule `selector`), but it runs `axe.reset()` and then configures with the merged story parameters, and Storybook replaces an array rather than merging it: a story's `rules` would drop the preview's page-level list (`PAGE_LEVEL_RULES`, not exported from `preview.tsx`, which is not edited). Scoping to `color-contrast` therefore means copying that list. The brief's `UNCHECKED` in `state-stories.tsx` stands, and its comment says so; it leaves the excluded nodes out of every rule.
- **Four behaviour stories carry the same exclusion.** The `a11y` test is `error` for every story, so `Run`, `Scenario`, `SelectsOverAPath` and `StateKeepsTheLayout` (which draw `RUN` or `SCENARIO`, with dimmed nodes) failed `color-contrast` on those nodes. Each has `parameters.a11y.context.exclude` of `[data-layer] button` (all node buttons: a behaviour story has no `data-cell` to narrow it). The knowledge sentence names both places.
- **A click's outline is read after focus leaves.** A synthetic click is a script focus that Chromium counts as keyboard, so `focus-visible:outline-2` (2 px) covers the selection's 1 px; `Problem` and `SelectsOverAPath` blur the node after the click and then read 1 px. `Run` and `Scenario` read `at`'s outline with no focus in play. An outline with no style reads `none` (Chromium reports a styleless outline's width as its 3 px initial value), so the others are asserted `none`.
- **Edge ids in the stories are the fixtures' real ids** (`gate-review`, not `gate>review`). `EdgeLayer` takes `tones: ReadonlyMap<string, EdgeTone>` (one map built in `Canvas`) in place of a `tone` per edge.
- The scenario's trailing-count check reads the node's third child (the trailing column), and a title is the second line of the text column.

Applied after the critique (2026-10-07): the dimmed edge draws `grid` (`DIM` in `edges.tsx`; `text-edge` is emitted nowhere and not in `overlays.ts`), `NodeLook` is `{ state, tone, shows, status, problem }` (a problem's line takes the rest ink, so `line.tone` is gone and `tone` covers every part; `problem` is the danger mark), `NodeView` draws `StatusDot state="failed"` in the trailing column, and the `Problem` behaviour story asserts the line's ink equals a rest line's and the dot is present before and after selection. The rubric's floors carve-out names a node off a run's path and a dimmed edge. `CANVAS_NODE_TEXT` has no `problem` tone and `Canvas`'s `owns` no `ink-error`: nothing emits them.

The first critique also found every state frame clipped at the 592 px stage. The frames now take `WORKFLOW_STAGE` (86 rem) and `JOURNEY_STAGE` (58 rem), measured against the touch density's drawing, and `FramesHoldTheirGraphAtDesktop` and `FramesHoldTheirGraphAtTouch` fail if a frame clips its graph again.

The fresh design critique (2026-10-07, 1280 × 800, light and dark) shipped it with no rework. Its nits are the dark dimmed edges at 1.51:1 being the faintest ink on the canvas, an off node in dark reading as a slightly muted rest node (the word "Off" carries the state), and the bare danger dot being the weakest problem cue once selection removes the border. Gate after the fixes: `pnpm check` exits 0; ui-core, react-ui and native-ui `verify` pass; every Canvas story passes in `pnpm stories:test`, and its other failures are the known non-canvas set and load timeouts.
