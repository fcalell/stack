# Node canvas: what Stead and Martechthings need, and the shape that serves both

2026-10-06. Feeds gap 003-110 and epic 006 (`.helm/board/epics/006-node-canvas/`).
It drains into `packages/ui-core/guide/patterns/node-canvas.md`, the roster and
`.helm/knowledge/architecture/ui-core.md` when epic 006 ships; delete it then.

Desk research: the two consumers' design docs as of this date, Mobbin, and the libraries' docs.
Nothing was built.

## Verdict

One molecule, **`Canvas`**, web only (`react-ui`), over two dependencies: `@xyflow/react` draws
the viewport, nodes, edges, pan, zoom and drag, and `elkjs` computes a top-to-bottom layout when
the consumer gives no positions. Every part of a node and an edge is data. The consumer passes no
node renderer, so the look stays stack's. The canvas never makes or removes an edge on its own:
edges are data, set in the consumer's sheet, and a port drag is a pointer shortcut the consumer
may switch on.

Both consumers run on the web. Stead is one web app at 375 to 1440 px, and Martechthings members
work at desktop. `native-ui` gets no canvas until a consumer runs one on the phone.

## What each consumer needs

Sources: Stead `design/07-interface.md` ("A workflow: the canvas", "A run", "Workflows"),
`design/decisions.md` ("The workflow canvas"), `design/03-domain.md` ("Workflows"). Martechthings
`.helm/research/ux/journey-steps.md` ("A later graph view"), `.helm/knowledge/product/ux/screens.md`
(Wave C), `src/shared/journey.ts`, epic 007 story 04.

| Need | Stead (workflow editor) | Martechthings (journey graph view) |
| --- | --- | --- |
| Graph | Directed. Back edges allowed: a loop's back edge and a gate item's answer upstream | Loop-free DAG given as predecessor lists, at most 200 steps |
| Size | About 5 to 12 nodes, a few dozen at most | Up to 200 steps, nesting about three legs deep |
| Node | Kind glyph, overline (the lead it runs as), name, one line, class as a `Status`, a count, a switch | Number, page name and type, action, test status |
| Node states | Selected, off ("Off" in place of its line, edges pass through), failed with the problem's first words, the run's node marked | Selected, test status, refusal on the step, change-set marks (inferred) |
| Edge | Label per answer or result ("green", "uncertain", "approve"); a relay dashed with a glyph and "Relay" | Option label on a leg's first edge, numbered in order; a rejoin is two edges into one node |
| Group | A loop frames its body, its bound on the group's head, up to two levels | None |
| Positions | The user's, kept with the workflow outside its hash. A new node lands at the centre | None stored. Computed in list order, top to bottom |
| Edges made | In the node's sheet ("Next" pickers). A port drag is a pointer shortcut; releasing on empty canvas opens Add a node | In the option list and Sheet only. No drag |
| Select | Opens the node's sheet: the pane from `wide`, a side sheet below | Opens the step's option list and Sheet |
| Read-only | A run's canvas: its node marked, at the run's version | Live, Ready, a version, a scenario or run as the taken path |
| Taken path | From its anchor (Twenty): full contrast, rest dimmed | Stated: full contrast, rest dimmed, walked one step at a time |
| Problems | A danger `Banner` over the canvas with a `List`; a row pans to its node and selects it | A refusal names a step; the first failing one is shown |
| Touch | 375 px: one finger pans, pinch zooms, long press moves, 44 px at any zoom, zoomed-out nodes collapse to their glyph | Desktop only (inferred) |
| Keyboard, AT | Tab through nodes in path order, Enter opens the sheet; read as a list of nodes with their edges named | None stated; the story's criteria apply |
| Placement | `main` without the measure; the System index in the list column | A view of the Journey `Split` main, beside the step list |

Neither consumer asks for undo, multi-select, copy and paste, a minimap, or a delete key on the
canvas. Every edit goes through a sheet.

## References

The pattern page's five executions (Twenty, Plain, Railway, Runway, AirOps) cover the editor at
rest. The modes both consumers add (a run, a branching journey, a problem, a loop, the phone) take
these executions, read from Mobbin's previews:

| Mode | App | Screen | What it shows |
| --- | --- | --- | --- |
| Run | Twenty | [screen](https://mobbin.com/screens/b94dbaba-0437-4bd4-acce-8730e1739249) | Taken nodes at full ink with a check and a count; untaken nodes stay in place in grey ink; a "Completed" chip on the root; output in the right pane |
| Run | Attio | [screen](https://mobbin.com/screens/ac501533-24e3-49b1-a564-cf0ec2a1b145) | Taken edges in the success hue, a "Completed" chip over each taken node, "Is true" and "Is false" edge labels, a zoom pill at the foot |
| Run | AirOps | [screen](https://mobbin.com/screens/6dadd86c-1a15-47ea-b654-a45132bb45d1) | A success badge on each node's corner, "Step n" chips |
| Run | n8n | [screen](https://mobbin.com/screens/d3af4413-04f9-4534-8aa4-01916d2b4910) | Success borders and checks, item counts on edges, a zoom stack of three at the bottom left |
| Branch | Klaviyo | [screen](https://mobbin.com/screens/70a06600-2c90-4ee6-aa43-e488fbb98b76) | A split with numbered paths ("1 Path #1", "2 Everyone else"), orthogonal edges, "+" on edges, "End" terminals, a zoom stack with Fit at the bottom right |
| Branch | Flodesk | [screen](https://mobbin.com/screens/d9e582df-d12e-4a5a-af34-19f89cb159d6) | Uppercase eyebrow ("YES/NO BRANCH"), edge labels as chips, a 2 px accent selection, the settings pane right |
| Branch | HubSpot | [screen](https://mobbin.com/screens/fa65026d-2edb-407b-afe9-bda9cc13c9f9) | Orthogonal edges top to bottom; a "Go to Mid-Intent" node draws a rejoin by reference |
| Rejoin | Typeform | [screen](https://mobbin.com/screens/b097fda2-89d7-4270-8583-a9a9f6475212) | Numbered nodes with a type glyph, two curved edges into one end node |
| Labelled ports | WRITER | [screen](https://mobbin.com/screens/2368f17d-4fcc-4590-912d-08cb39245dab) | A classification node lists its out-ports by label on its edge, one edge per category |
| Problem | n8n | [screen](https://mobbin.com/screens/f70fc619-d6bf-4dff-958d-ef47afc0342e) | The failing node in a danger border with a cross badge; "Problem in node AI Transform" names it |
| Problem | Copy.ai | [screen](https://mobbin.com/screens/6f08a1bf-96ff-4ff7-8ee9-682db343aacf) | A danger border and dot on the node; a banner "Some steps need your attention" over the canvas |
| Problem | Customer.io | [screen](https://mobbin.com/screens/773dc504-362f-4bce-a732-dfce6f95f9d1) | A warning strip inside the node's foot ("No AI credits remaining"); an action pill at the foot (Add, Copy, Move, Delete, zoom) |
| Problem | Langdock | [screen](https://mobbin.com/screens/9d722559-7b20-4238-b43d-4bb6d1522459) | An inline warning row inside the node ("Form fields required") |
| Loop | AirOps | [screen](https://mobbin.com/screens/ff79a5c0-07ad-4a62-b1b4-189e90c55c88) | A dashed group around the body, a "Loop" tag, a "Complete" exit chip on its lower edge |
| Loop | Lindy | [screen](https://mobbin.com/screens/dd2a41b6-3782-45bb-a634-d38c6354ef24) | A tinted group holding "Enter loop" and "Exit loop" nodes, the back edge on its side |
| Phone | Deel | [screen](https://mobbin.com/screens/87440622-694f-43b0-a2d5-ec62933f566a) | A workflow on iOS drawn as a single column of node cards with a "+" below; no free canvas |

What they agree on:

- **Run.** A run keeps every node in place. Taken nodes and edges stay at full ink with a
  success mark, and untaken ones drop to muted ink. The status hue stays on the marks, never on
  a node's fill.
- **Branch.** An out-edge carries its label as a small chip on the edge, close to the source. A
  branch is drawn orthogonally top to bottom.
- **Problem.** A problem marks the node in the danger hue (border or badge) and names it in a
  surface outside the canvas (banner, toast or pane).
- **Loop.** A loop is a bordered group (dashed or tinted) with a tag naming it.
- **Phone.** No reference pans a node canvas on a phone. Mobile workflow apps fall back to a
  column. Stead's 375 px pan and zoom has no execution to measure, so its touch rules are judged
  against the rubric's floors alone.

## Libraries

| Library | Licence | What it gives | What it lacks |
| --- | --- | --- | --- |
| `@xyflow/react` 12 | MIT, about 57 KB gzip | Viewport, pan, pinch zoom, node drag, port connections, custom node and edge types, viewport culling, focusable nodes and edges, auto-pan on focus, localisable ARIA text | Long press to lift a node on touch, groups as layout (it nests by `parentId` but sizes nothing), layout |
| `elkjs` | EPL-2.0 | Layered layout with direction, model order, ports, compound nodes (a loop group), edge label placement, orthogonal routing, feedback edges; runs in a worker | Small size: it is a compiled Java library and loads lazily |
| `@dagrejs/dagre` | MIT | Layered layout, small | Ports, edge labels routed around groups, reliable compound layout |
| Stack's own SVG | n/a | Full control | Pan, pinch, drag, culling and focus handling are all hand-built, a widget the [philosophy](../knowledge/product/philosophy.md) judges against the bar first |

React Flow's own accessibility gives Tab through nodes, Enter to select, Escape to clear,
arrow keys to move, and auto-pan to a focused node. The canvas keeps Tab, Enter, Escape and
auto-pan and turns arrow-key moves off (`disableKeyboardA11y`). DOM order is the order the nodes
array gives, so the canvas sorts it into path order. Expo's DOM components (`'use dom'`) can run
this same web canvas inside a native app when a phone consumer appears.

## Design

### Shape

One molecule in the `content` layer. Its props describe the graph's meaning and carry no
product nouns:

```tsx
<Canvas
  label="The workflow"                       // the accessible name
  nodes={[{
    id, glyph: IconName, overline?, title, line?,
    number?, count?, status?: State,          // the six states
    problem?: string,                         // the problem's first words
    off?: boolean,
    position?: { x, y },
  }]}
  edges={[{ id, from, to, label?, handoff?: boolean }]}
  groups={[{ id, head, holds: string[] }]}    // a loop; a group may hold a group
  selected={id}
  onSelect={(id) => …}                         // absent: nothing selects
  path={{ nodes, edges, at? }}                 // a run or scenario: the rest dims
  onMove={(id, position) => …}                 // absent: nodes do not move
  onConnect={(from, to) => …}                  // absent: no port drag
  act={…}                                      // the foot's act, e.g. "+ A node"
/>
```

- **Read-only** follows from the handlers. With no `onMove` and no `onConnect` nothing changes
  the graph, and `onSelect` still opens a read sheet.
- **Back edges** are any edge whose target precedes its source in path order. The layout routes
  them up the side. The canvas does not police them: Stead's check at save does.
- **Path order** is a depth-first walk from the roots, taking out-edges in array order. It gives
  the Tab order, the reading order, and Martechthings' numbering when its numbers are absent.

### Layout

- **No node has a position** (Martechthings; a shipped Stead workflow opened the first time):
  ELK lays out top to bottom, in model order, groups as compound nodes. The canvas reports each
  computed position through `onMove`, when one is passed, so the consumer can keep it.
- **Every node has a position**: the canvas draws them as given.
- **A node without a position among placed ones** lands at the viewport's centre, selected
  (Stead's add).
- An **Arrange** act in the zoom stack reruns the layout. It is the single-pointer alternative to
  dragging (WCAG 2.5.7), and it exists only when `onMove` is passed.

### Anatomy, inside the pattern page's range

- **Ground.** Dot grid at 16 px, 1 px dots, on the canvas one step off the page.
- **Node.** About 240 × 56 px, radius 8, hairline on `group`. Its parts:
  - top row: the glyph and the overline 11 px in muted ink
  - the title at 13/500, then the line at 12 in muted ink
  - a trailing slot for `number` or `count` as a quiet chip, and `status` as a dot with its label
- **Ports.** 8 px hollow circles, top (in) and bottom (out). A port's hit area meets the target
  floor (24 px on pointer, 44 px on touch) beyond its drawn size, and ports exist only with
  `onConnect`.
- **Edge.** 1 px in muted ink, orthogonal with rounded corners, an arrowhead at the target.
  - The label is a chip near the source.
  - A handoff edge is dashed and carries a glyph beside its label.
- **Group.** A 1 px dashed border at radius 8, holding a tinted head row with the group's
  `head` ("Until green · repeat 2×").
- **Selected.** A 1.5 px accent outline. The accent appears only on selection and the taken
  path's marks.
- **Off.** The node in muted ink with "Off" in place of its line. Its edges draw dimmed, never
  dashed, so dashed means handoff alone.
- **Problem.** A danger border and the problem's first words as the node's line, in the danger
  ink.
- **Path.** Nodes and edges off the path drop to the disabled ink. On-path nodes keep full ink
  and their `status` mark. `at` gets the selection outline's weight in the active hue.
- **Zoom stack.** At the bottom left, 32 px buttons, 44 px on touch: Zoom in, Zoom out, Fit,
  Arrange. `act` sits at the foot's centre.

### Input

| Act | Pointer | Touch | Keyboard |
| --- | --- | --- | --- |
| Pan | Drag the ground; wheel scrolls | One finger | Auto-pan to the focused node |
| Zoom | Ctrl/⌘ wheel; the stack | Pinch; the stack | The stack's buttons |
| Select | Click | Tap | Tab to a node, Enter |
| Move | Drag at once | Long press lifts, then drag | None; Arrange instead |
| Connect | Drag port to port; release on the ground calls `onConnect(from, null)` | Same, from a 44 px port | None: the consumer's sheet |
| Deselect | Click the ground | Tap the ground | Escape |

On touch, a node at the current zoom smaller than 44 px draws its glyph alone at 44 px, and a tap
on one zooms to it.

### Assistive technology

The canvas root is a `region` named by `label`. The nodes are a `list` in path order. Each node
is a `listitem` holding one button whose name reads, in order: number, overline, title, line,
status, problem, then its out-edges as "Next: approve, Implement; request changes, Review". The
zoom stack and `act` follow the list in the Tab order. Edges are not focusable: their meaning is
in each node's name.

## Decisions

Decided by fcalell (2026-10-06):

1. **A node holds no control.** It shows off as state ("Off"), and the switch lives in the
   node's sheet, which Stead's sheet already holds. A control inside a node would give one node
   two tab stops and two targets under the 44 px floor at any zoom. Stead's spec draws a
   `Switch` on the node and takes this change.
2. **Dashed means handoff.** Inactive draws dimmed. The pattern page says so.
3. **`elkjs` is taken unmodified** as a dependency of `react-ui`. EPL-2.0 binds changes to its own
   files and nothing else.
4. **No change-set marks on nodes** until a consumer files the need.
5. **The phone pans and zooms** at 375 px as Stead specifies, judged by the rubric's floors. No
   column fallback below `tablet`.

## Risks

- React Flow has no long press. Lifting a node on touch is built over its drag start, and it
  must not take a pan.
- Semantic zoom (glyph-only nodes) re-renders every node when zoom crosses the threshold, so the
  node reads the threshold, never the raw zoom.
- React Flow ships its own stylesheet. The canvas imports only the base styles and draws
  everything else from ui-core cells, which `a6` and the overlay allowlist check.
