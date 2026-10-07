# The canvas

A graph the viewer reads or walks, a workflow or a journey, is a `Canvas`, never a hand-built
diagram of `div`s and lines. It takes data and draws the nodes, the arrows between them, the
frames around groups and the zoom stack.

```tsx
import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
```

## The data

A node is a `CanvasNode` (`id`, `icon`, `overline`, `title`, `line`, and a trailing `number` or
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

## Moving around

A plain wheel pans, Ctrl or Cmd with the wheel zooms (a trackpad pinch is a Ctrl wheel), a drag
pans, even from a node, one finger pans and two pinch. The zoom stack at
the bottom left zooms in, zooms out and fits: Fit shows the whole graph, never larger than its own
size. A graph that fits at its own size opens centred; a larger one opens at its own size with its
first node, in path order, at the top centre.

## Where the nodes stand

Give no node a `position` and the canvas places them top to bottom in path order, loops inside
their group. With `onMove` it tells you each node's absolute position once, after it has placed
them: store those and pass them back as `position`. Give some nodes a position and you place
all of them; a node without one stands at the origin.

## States

A node says its state in its own text or mark, never by colour alone.

- `off: true` draws the node quiet with the word "Off" in place of its line, and dims its edges.
  An off edge is never dashed: dashed means a handoff and nothing else. The switch for it lives
  in the node's sheet, not on the canvas. An off node ignores its `problem`.
- `problem` draws the node's border in the danger hue, a danger dot in its trailing column and
  its words in place of the line, in the ink a line has. The dot stays when the node is selected,
  which takes the border. Pass the first words only, and name the whole problem outside the canvas
  in a `Banner` and a `List`. A node with a `problem` and a `status` draws both marks.
- `status` is a `StatusMark` (`{ state, label }`): a dot and its word, a spinner while the state
  is `running`, in the node's trailing column. Keep the label short.
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

An `act` stands at the foot's centre; it adds, it never removes.

## Where it stands

The canvas has no height of its own: it fills the region it stands in. Stand it as a `Split`'s
`main` or in a `Place`'s body, never inside a component of your own that sizes it.

## Check

`pnpm check` passes, and the canvas is read in light and dark at desktop and touch density, with
one node chosen and with none.
