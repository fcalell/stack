# The canvas

A graph the viewer reads or walks, a workflow or a journey, is a `Canvas`, never a hand-built
diagram of `div`s and lines. It takes data and draws the nodes, the arrows between them, the
frames around groups and the zoom stack.

```tsx
import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
```

## The data

A node is a `CanvasNode` (`id`, `icon`, `role`, `overline`, `title`, `line`, and a trailing `number` or
`count`), an edge a `CanvasEdge` (`id`, `from`, `to`, an optional `label`), a group a
`CanvasGroup` (`id`, `head`, `holds`: node ids and group ids). All come from
`@fcalell/ui-core/descriptors`. The canvas draws `number` over `count` and never invents a number.

A **workflow** loops, answers back upstream and hands work to someone else. An edge into an
earlier node is drawn up the side, and an edge with `handoff: true` is dashed, with the handoff
glyph beside its label: dashed means a handoff and nothing else.

```tsx
<Canvas
  label="Release flow"
  nodes={[
    { id: "build", icon: "Hammer", overline: "Build", title: "Make the change", line: "Edits the files" },
    { id: "check", icon: "ShieldCheck", overline: "Check", title: "Run the checks", count: 3 },
    { id: "ship", icon: "Send", overline: "Handoff", title: "Hand over" },
  ]}
  edges={[
    { id: "a", from: "build", to: "check" },
    { id: "b", from: "check", to: "build", label: "red" },
    { id: "c", from: "check", to: "ship", label: "green", handoff: true },
  ]}
  groups={[{ id: "loop", head: "Until green", holds: ["build", "check"] }]}
/>
```

A **journey** branches and rejoins, and numbers its steps. Take the numbers from the library, in
the order the canvas reads and the keyboard walks:

```tsx
import { pathOrder } from "@fcalell/ui-core/canvas";

const numbers = new Map(pathOrder(nodes, edges).map((id, index) => [id, index + 1]));
const numbered = nodes.map((node) => ({ ...node, number: numbers.get(node.id) }));
```

## What a node is

A node says what it is in the graph with its `role`, which sets its shape and its tone from the
design's tokens, never from a colour of the app's. `step` is the default, today's plain card.

| `role` | Draws | For |
| --- | --- | --- |
| `start` | a pill in the accent tone (accent-tinted ground and edge, accent icon) | where the graph begins: a trigger, an entry |
| `step` | the plain card | work that happens |
| `decision` | a compact card (its overline and title, no line) with its icon in a diamond, a stronger edge | a branch; its answers are the labels on its out-edges |
| `wait` | a card in the attention tone (attention-tinted ground and edge, attention icon) | something waits for the operator here |
| `call` | a card with a double edge (a second hairline a step outside the first) and, with an `href`, an open act | another graph runs here |
| `end` | a pill in the quiet tone (muted ground, muted words) | where a path stops |

A `call` node's `href` (a `Route`) draws a small open act at the card's end, an arrow named
"Open" and the node's title, which goes to that graph and never chooses the node; pressing the
node's body still does. The act is the card's sibling and draws only while the node draws its card:
under the text floor the glyph carries no act.

Every tier shows the role: under the text floor and the overview floor the glyph takes the role's
shape and tone too (a pill is a circle, a decision a diamond, a call keeps its double edge), so an
overview you zoomed out to still reads. A role's look is its own shape and tone only: `off` draws
the node quiet over its role (the shape stays, the tone steps back to the plain card's), a
`problem` still replaces the line and takes the outline, a node off a run's `path` dims as it
did, and the selection's outline is the accent's ink, which is stronger than the start's edge.

## Moving around

A plain wheel pans, Ctrl or Cmd with the wheel zooms (a trackpad pinch is a Ctrl wheel), a drag
pans, even from a node (with `onMove` a drag from a node moves that node instead), one finger pans
and two pinch. The zoom stack at the bottom left zooms in, zooms out and fits (a zoom step is about the focused node, which stays where it stands, else the pane's centre): Fit shows the
whole graph, never larger than its own size and never smaller than the scale a node draws its
title and its line at (the text floor, scale 1; `FIT_FLOOR`), clear of the zoom stack and the `act`.
A graph opens as Fit shows it: centred in the room the zoom stack and the `act` leave, at its own
size where it fits there. A graph that holds in the room only below the floor is fitted at the floor
and framed at its start instead, the first node in path order: the graph's top at the room's top, and
across, centred where the graph is narrower than the room, else the start node on the room's middle
(held so the graph still covers the room's ends), moved where a group's head would stand left of the pane to bring it in view (as far as the start node stays whole, or at the room's start where it is wider than the room) and where a node would stand under the zoom stack to clear it, the nearest offset that keeps every node off the stack's corner. The reader pans for the rest, and a node never
opens as a glyph. Zooming out by hand still goes under the floor, to the overview and the glyph
alone, below.

## Where the nodes stand

Give no node a `position` and the canvas places them top to bottom in path order, loops inside
their group, the layers a bend, a chip's room and an arrowhead apart (about a node's height, so a
typical graph holds at a larger scale) and the nodes of a layer a card step apart. With `onMove` it tells you each node's absolute position once, after it has placed
them: store those and pass them back as `position`. Give some nodes a position and you place
all of them; a node without one among placed ones lands at the centre of the view (see Editing).

## Editing

Editing is controlled: the canvas reports and holds nothing of yours. `onMove(id, position)`
reports a node's position when a drag ends, once for each node when the canvas lays them out or
Arrange runs, and once for a node that lands. **Store each one and pass it back as `position`**:
that is what makes a drag, Arrange and a landing stick, and a position you do not store is
forgotten on release.

- **Move.** With `onMove` a node follows a drag at once, with no long press and no handle, and
  the edges and group frames follow it, and it stands over the nodes it crosses. A drag never
  selects. Arrange joins the zoom stack, the
  way to lay the graph out again without dragging: it ignores every position, reports each
  node's, and fits the view.
- **Landing.** A node added without a `position` among placed ones lands with its centre at the
  centre of the view, and `onSelect` is called with its id. Two added at once land on one
  another. Without `onMove` it is drawn there and nothing is reported.
- **Connect.** With `onConnect` each node shows an in port at its top and an out port at its
  bottom. Dragging an out port to an in port calls `onConnect(from, to)`, and releasing on the
  ground calls `onConnect(from, null)`: open whatever you offer for a dropped link (your sheet).
  The in port under the pointer fills with ink while the link is dragged, so the release has a
  visible target, and a forward edge ends just above an in port, clear of its ring. A release over
  a node's body, a control or outside the canvas reports nothing, and a link from a node to itself
  is reported: refuse it when you save. The canvas never adds the edge; add it to your own data and
  pass it back in `edges`.
- A canvas with neither handler has no drag, no Arrange and no port. Connecting without a
  pointer is your own sheet: the ports are not focusable. A `path` does not gate editing and a
  port keeps its ink on a dimmed or marked node: a run you want read-only is a canvas given
  neither handler.

## On touch

The canvas draws the touch density's sizes at touch, and a phone pans and zooms the same
canvas. One finger drags the ground, and drags a node too, which pans (a node never moves under a
finger that is moving). Two fingers pinch. With `onMove`, a node held still for a moment lifts,
draws a 2 px outline in the selection's colour, scales to the lift scale with its float shadow fading in on `fast`, and follows the finger; releasing it calls `onMove` once. A
second finger landing on a lifted node drops it where it is. A lift never selects, and a tap on a
node selects it as a click does.

Every zoom button, the `act`, each glyph and each port is at least 44 px at the touch density, at
any zoom: a port's hit is drawn at that size whatever the scale.

On every input, pointer and finger alike, a node under zoom 1 is its glyph: the icon in a
box of the density's `control` size, its border the state's (a selection or a problem), its
status as a dot on the box's top right corner, and a problem as a danger dot on its bottom right
corner, straddling the border so neither covers the icon. From zoom 1 down to half the glyph
carries the node's `title` beside it, on one line at the meta size (12 px or more), in body ink at 500, cut at the
short measure, on the canvas's own ground so an edge never strikes through it; the name is
drawn at the same size at any zoom, so the overview never shows text under the 12 px floor.
Under half the glyph stands alone, with the `title` as its tooltip (the native `title`, so the cut-text tooltip leaves it its own). A name cut at the short measure, and a group head cut to the frame's width, show whole in the cut-text tooltip when the pointer rests on them. A graph whose nodes stand too
close for their names to clear each other at half raises that zoom to the lowest at which they
clear, and one that cannot clear them under zoom 1 has no named overview: the glyph alone. Group
heads stay under zoom 1, drawn at their own size on screen (a button a target tall, the meta role's size, cut to
the frame's width), and edge labels draw nothing. A click, a tap or Enter on a glyph or its name
zooms to that node at its own size about its centre, which stays where it stood (under the finger) unless the node would then pass the canvas's edge, when the view shifts just far enough (a page inset in) to hold the whole node, and chooses nothing. The zoom buttons zoom about the node last focused, with the same shift. A zoom step is a fifth of the scale.
Edges and group frames follow the glyphs, so an edge ends on its glyph, and zooming out stops
where two glyphs would stand closer than two `gap`, so the edges between them still draw.
Give each node its own `title`: beside the icon it is the overview's only mark of one node of a
kind from another. Keep `problem` and `status` words short and put the detail in your
sheet: a glyph shows the mark, and the words are one tap away.

## States

A node says its state in its own text or mark, never by colour alone.

- `off: true` draws the node quiet with the word "Off" in place of its line, and dims its edges.
  An off edge is never dashed: dashed means a handoff and nothing else. The switch for it lives
  in the node's sheet, not on the canvas. An off node ignores its `problem`.
- `problem` draws the node's border in the danger hue, a danger dot in its trailing column and
  its words in place of the line, in the ink a line has. The dot stays when the node is selected,
  which takes the border. Pass the first words only, and name the whole problem outside the canvas
  in a `Banner` and a `List`. A node with a `problem` and a `status` draws both marks.
- `status` is a `StatusMark` (`{ state, label }`): a dot (a spinner while the state is
  `running`) beside its `label` in the node's trailing column. The title stands whole first and the label truncates beside its dot (down to the dot
  itself) where the node is out of room; the label never takes more than the short measure.
- `path` (`nodes`, `edges`, `at`) is what a run or a scenario took. A node the path leaves out
  draws every part in disabled ink and no status or problem mark, an edge it leaves out dims, and `at` is outlined
  as a selection is. An edge is on the path by its own id, never by its ends.

A run over the workflow, with a status on the nodes it took:

```tsx
<Canvas
  label="Release run"
  nodes={nodes.map((node) => ({ ...node, status: statuses.get(node.id) }))}
  edges={edges}
  groups={groups}
  path={{ nodes: ["build", "check"], edges: ["a", "b"], at: "check" }}
/>
```

A state never moves a node or runs the layout again.

## Choosing a node

A canvas with no handler is read-only: it has no node button and no node moves. Pass `onSelect`
and each node is a button named by its text, in path order in the Tab order. Enter or Space
chooses it, Escape or a click on the ground calls `onSelect(null)`, and a node focused from the
keyboard pans into view. Hold the choice yourself and pass it back as `selected`; a change from
outside (a row in a list) pans to its node.

```tsx
const [selected, setSelected] = useState<string>();
<Canvas label="Journey" nodes={numbered} edges={edges} selected={selected} onSelect={(id) => setSelected(id ?? undefined)} />
```

A group is a frame; with `onSelect` its head is a selectable control. The head is a button named
by its text (at least a target tall) that calls `onSelect(group.id)`, and `selected` may name a
group, which draws its frame in the selection's outline (a heavier dashed line). The head
shows hover as a node does. Node ids and group ids share one
namespace. The frame's body takes no pointer, so a drag from it pans, and a group does not move:
its frame follows its holds. The heads take their Tab stops first, outer before inner, then the
nodes in path order. Under the text floor a head draws at its own size on screen and stays a stop.

A group holding no present node (an empty loop) is a leaf of the graph: the layout stands it in
its place in the path, as a frame of its head and padding at a node's width, and an edge may name
its id as `from` or `to`, so its edges meet it. Its head is a button as any group's. It is no
node: it takes no port, no drag and no connection, and `onMove` never hears it. The layout
places it. When every node has a `position` no layout runs, and the empty groups stand in one row
below the nodes' bounds, left-aligned with them, in path order; an empty group takes no
`position`. A group that holds an empty group frames it, and an edge naming a group that holds a node is ignored.

An `act` stands at the foot's centre; it adds, it never removes.

## Loading

`nodes`, `edges` and `groups` take a constant or a selection (`flow.at((f) => f.nodes)`). While a
selection's read waits the canvas stands its bare surface: the dotted ground and the zoom stack
(with arrange where you gave `onMove`), inert, and no node. It is the region the graph arrives in,
so the page below the head does not move when the nodes appear. The handlers and the `act` are
ignored meanwhile, and the surface draws no act, no node button and no drag. Give the canvas its
selection, not `nodes={[]}` for a wait: it reads as an empty graph. Its failed and empty read forms
are the frame's, as for any collection.

A read that answers no node is the frame's empty form, with the generic sentence. The canvas draws
no sentence of its own under a graph; a hint such as "Add a node" belongs in your page's head or its act.

## Where it stands

The canvas has no height of its own: it fills the region it stands in. Stand it as the body's
direct child of a `wide` `Pane`, never inside a component of your own that sizes it. It fills the
body edge to edge: it runs over the body's inset to the Pane's sides and its bottom edge, and to
its top edge when it is the body's first child. What stands above it (a record's head, a meta line, a
banner) keeps the inset, and the canvas's top edge then draws a hairline where it meets that
content. Below `tablet` it keeps at least half of the column it stands in: the column scrolls past
it, so a head and banners above it scroll away and never shrink it.

## Check

`pnpm check` passes, and the canvas is read in light and dark at desktop and touch density, with
one node chosen and with none.

## Motion

The canvas's viewport travels for the viewer's own acts: a zoom step, Fit, a reveal of a node chosen
from outside or reached by the keyboard, and a tap on a glyph travel on `base` `in-out`, by the
canvas's own frames (the layer and the dot grid together); quick presses add up, and a pointer, a
finger or a wheel taking over ends the travel where it got to. The opening view, Arrange's fit and
the lowest-scale clamp land at once. A node answers on `fast` (its border and ink), a taken path's
tone (the edges, the chips, the words) cross-fades on `base`, and a node crossing the text floor
cross-fades with its glyph on `fast`: the card fades out and, inert, takes no pointer or key, and
the glyph fades in. A node that lands fades in at its place on `base`, and the graph fades in once
it is laid out. Under reduced motion every one of these lands at once.
