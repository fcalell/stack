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
