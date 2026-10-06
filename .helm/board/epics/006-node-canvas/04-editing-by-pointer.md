---
id: 006-04
status: backlog
sessions: {}
---
# react-ui: a pointer moves nodes, arranges the graph and connects ports

## Goal
Stead edits its workflow's layout and, as a pointer shortcut, its edges on the canvas. Every
edit also has a way without a drag: Arrange is the single-pointer alternative to dragging (WCAG
2.5.7), and connecting without a pointer is the consumer's own sheet.

## Approach
Read first: story 02's brief (`02-canvas-at-rest.md`, authoritative for the structure this story
edits: "Viewport", "Region structure", "Layout", "Edge routing", "Keyboard and input", "Room for
03 to 05", Decided), story 01's Decided, `.helm/research/node-canvas.md` ("Layout", "Anatomy"
ports, "Input", "Risks"), the pattern page `packages/ui-core/guide/patterns/node-canvas.md`
(ports 8 hollow, the zoom stack's 28 to 36), `.helm/agents/conventions.md`. 02's files exist under
`plugins/react-ui/src/ui/components/canvas/`; this story edits them and adds two. Land it after 02
and 03. Nothing in ui-core changes: `CANVAS_PORT`, `CANVAS_PORT_HIT`, the `port` size (8 on both
densities), the `arrange` word and the roster's `onMove`, `onConnect` and `draws` are all landed
(01), and `owns` already spells every token below.

The canvas owns its viewport (02): d3-zoom on the region, one transformed layer, nodes absolutely
placed and measured by a `ResizeObserver`, edges the canvas's own SVG routed by `geometry.ts`. This
story builds on four things 02 provides and changes none of them: the `Viewport` object
(`screenToFlow`, `centreOn`, `fit`, `get`), the `data-no-pan` attribute its d3 `filter` honours,
`NodeView` as the one place a node's pointer handlers live, and `routeEdges` rerunning from live
boxes.

- **Move.** With `onMove`, a pointer drags a node at once: no long press, no handle, no threshold.
  `NodeView` takes pointer events with pointer capture, and a draggable node carries `data-no-pan`
  so d3 never starts a pan from it. The node follows the pointer; the edges and the group frames
  follow it because `routeEdges` reruns from the live boxes. Release reports once:
  `onMove(id, position)`, in the absolute flow coordinates `CanvasNode.position` takes. A press
  that never moves reports nothing, and a drag never selects.
- **Arrange.** With `onMove`, an Arrange `IconButton` joins the zoom stack, after Fit. It reruns
  the layout with every position ignored (`elkGraph` reads sizes, never positions), reports every
  node's position through `onMove` in path order, then fits the view.
- **Landing.** A node with no position, among nodes that have one, lands with its centre at the
  viewport's centre, found through `viewport.screenToFlow`, and, with `onSelect`, is selected. It
  replaces 02's "draws at the flow origin" (step 6 of "Hook side" and the Decided line).
- **Connect.** With `onConnect`, each node shows two ports as children of `NodeView` (top in,
  bottom out), drawn with `CANVAS_PORT` inside `CANVAS_PORT_HIT`. Dragging an out port draws the
  canvas's own connection line; releasing on an in port calls `onConnect(from, to)` and releasing
  on the ground calls `onConnect(from, null)`. The canvas never adds the edge: the consumer does,
  from its data, and a graph that does not pass the new edge back draws as it did.
- **Absent handlers.** Without `onMove` there is no drag and no Arrange; without `onConnect` there
  is no port. With neither, the canvas is 02's read-only one, unchanged.

## What this brief relies on from 02
Each is asserted by a story below, so a wrong reading fails there.

- `data-no-pan` on an element makes d3's `filter` reject any gesture whose target is inside it.
  d3-zoom listens to `mousedown` and `touchstart`, not to pointer events, so a rejected press
  leaves the node's `pointerdown`, `pointermove` and `pointerup` untouched. A node without it pans.
- d3 suppresses the click that ends *its own* drag (`dragEnable(view, g.moved)`). A press d3
  rejected is not its drag, so the click after a node drag is the canvas's to suppress (below).
- `viewport.screenToFlow(point)` takes client coordinates and returns flow coordinates under the
  transform it has now, so a drag that outlives a wheel pan or a zoom stays under the pointer.
- The layer, the edge SVG and the grid take no hit that a node does not: a hit-test over the
  region finds a node or its parts, the zoom stack and the `act` (both `data-no-pan`), or the
  ground (the region, the layer or the grid), which is the set 02's ground click already tests.
- Pointer capture redirects a pointer's events to the capturing element, not what
  `document.elementsFromPoint` reports: the hit-test reads what is under the pointer, whatever
  holds the capture.
- `touch-none` on the region (02) means a touch pointer raises `pointermove` to the page and the
  browser never scrolls under it, so the handlers below read no pointer type.

## Files

All under `plugins/react-ui/src/ui/components/canvas/` unless named.

### `index.tsx` (the region)

1. **One place for a node's position.** `place(node, maps)` (`view.ts`, pure) returns
   `live.get(id) ?? node.position ?? landed.get(id) ?? layout.positions?.get(id) ?? ORIGIN`.
   The flow boxes (which `groupBoxes` and `routeEdges` read, so the frames and the back-edge
   corridors follow a drag) and every `NodeView`'s `left` and `top` call it, replacing 02's copies
   of `node.position ?? computed ?? ORIGIN`. `live` is **the one live-position map** of the
   region, `useState<ReadonlyMap<string, CanvasPoint>>` (`id -> CanvasPoint`), overriding
   `position`, and its only writer is the setter `at(id: string, point: CanvasPoint | null)`: a
   point sets the node's live position and `null` clears it. The release path is `drop(id, point)`:
   `onMove?.(id, point)`, then `at(id, null)`. Story 05's long-press lift writes through this same
   `at` and `drop`, and adds no second map. A consumer that does not store what `onMove` reports
   sees the node return to its own position on release: the component is controlled, as 02 set it.
   `routeEdges` is memoised on the boxes, so a drag reruns it per pointer move; it is pure and
   linear in the graph, and `NodeView` is memoised on its own props so only the dragged node and
   the edge layer render.

2. **The connection in progress.** `link`, `useState<{ from: string; to: CanvasPoint } | null>`,
   written only through `linking(from: string, to: CanvasPoint | null)` (`null` clears it). While
   it is set, `Region` renders `ConnectionLine` as the layer's last child. `from` is an out port's
   node and `to` the pointer in flow coordinates.

3. **Landing** (`landed`, `useState<ReadonlyMap<string, CanvasPoint>>`). A `useLayoutEffect` runs
   on `[nodes, sizes, ready]` and, once the layout has run (02's `ready`), for each node that has
   no `position`, is not in `landed` and is measured, when at least one other node has a
   `position`:
   - `at = landAt(centre, size)` (`view.ts`, below) with `centre =
     viewport.screenToFlow({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })` from
     the region's `getBoundingClientRect()`;
   - `setLanded` with it; `onMove?.(id, at)`; then `onSelect?.(id)`. A `useRef<Set<string>>` of
     landed ids guards a StrictMode double run, and an id that leaves `nodes` leaves both.
   - Until it is in `landed`, such a node draws `invisible` (already an overlay): it is measured
     either way, and a frame never shows it at the origin.
   - **When no node has a position, nothing lands**: the layout places every node (02) and reports
     them. A graph whose consumer gave no position to any node is never partly placed here.
   - Without `onMove` the node is drawn at the landing spot from `landed` and nothing is reported.
     Once the consumer gives it a `position`, that wins in `place`.

4. **Wiring.** `ZoomStack` gets `onArrange={onMove ? layout.arrange : undefined}`. Each `NodeView`
   gets `draggable` (`Boolean(onMove)`), `at`, `drop`, `linking` and `onConnect`. `ports` is
   `Boolean(onConnect)`. Story 05 changes `draggable` to `Boolean(onMove) && !touch` and nothing
   else here: 04 never reads the pointer type.

### `layout.ts` (`useLayout`)

02's effect runs the layout once per `graphKey` when no node has a position, and keys the report
by that key. Both become one function so Arrange is the same run:

- `place(key)`: the existing body of the layout effect (`elkGraph`, the on-demand import of
  `@fcalell/plugin-react-ui/lib/canvas-layout`, `layoutElk`, `fromElk`, drop a stale result,
  `setLaid({ key, positions })`), extracted unchanged. The effect calls it under its existing
  conditions (no node positioned, measured, probe read, `ran.current !== key`).
- `arrange()`: returned on `Layout`. It returns at once when a run is in flight, when a node is
  unmeasured or when the probe is unread; otherwise it calls `place(key)` with no "no node
  positioned" condition and without touching `ran`. The result is a new `Laid` object even for
  the same key.
- The report effect compares the `Laid` **object** (`reported = useRef<Laid | null>`), not its
  key, so Arrange reports again and a StrictMode double effect still reports once. It reports in
  path order exactly as 02's step 4. After it, when this `Laid` came from `arrange()`, it calls
  `requestAnimationFrame(() => viewport.fit(latest.current.bounds))`, `latest` being a ref the
  region keeps to its last `routeEdges` result: the consumer's positions commit before the frame,
  and the fit reads the bounds they produced, not the closure's.
- With positions given, `laid.positions` is under `node.position` in `place`: Arrange changes
  what is drawn only when the consumer stores what it reports, which `onMove`'s contract says it
  does. The guide page says so (below).

### `view.ts` (pure)

- `place(node, maps)` as above.
- `landAt(centre: CanvasPoint, size: Size): CanvasPoint`: the position whose box is centred on
  `centre`, `{ x: centre.x - size.width / 2, y: centre.y - size.height / 2 }`.

### `hit.ts` (new, DOM, not unit-tested in node)

- `isGround(element, region)`: whether `element` is the region, the layer or the grid. 02's ground
  click and `hit` both call it, so the two never disagree about what the ground is.
- `hit(point, region)` returns `{ node: string | null; ground: boolean }` from
  `document.elementsFromPoint(point.x, point.y)`: `node` is the id on the first element carrying
  `data-port="in"` (read from its `data-node`), and `ground` is true when the *topmost* element is
  ground. `elementsFromPoint` rather than `elementFromPoint` so an in port is found when a later
  node's box overlaps its 24 px hit: the port is what the user aimed at. A release over a node's
  body, the zoom stack, the act foot or outside the region has no in port and is not ground, so it
  reports nothing (Decided). Group frames and edge labels take no pointer (02), so they are ground.

### `node.tsx`

`NodeView` takes `draggable`, `ports`, `at`, `drop`, `linking` and `onConnect`. Its handlers exist
only with the flag that needs them.

- **Draggable.** With `draggable` the node's element (the `button`, or the `div` read-only) takes
  `data-no-pan`, `cursor-grab active:cursor-grabbing select-none` and:

  ```ts
  onPointerDown   // primary button only: setPointerCapture; grab = screenToFlow(pointer) - place; moved = false
  onPointerMove   // while captured: first changed point sets moved; at(id, screenToFlow(pointer) - grab)
  onPointerUp     // while captured: if moved, drop(id, point) and arm the click guard; release capture
  onPointerCancel // at(id, null): a cancel is no release and reports nothing
  ```

  `grab` is the pointer's flow point minus the node's position, so a node keeps its offset under
  the pointer through a pan or a zoom. A move is every `pointermove` whose point differs from the
  press. The `button` never carries a drag handle: the whole node drags. The 24 px port hit
  overlaps the node's top and bottom edge, so a press in those 12 px of its centre band starts a
  connection (the port takes it, below), not a drag; the rest of the node drags.
- **Focus.** `onFocus` calls `viewport.centreOn(box)` only when the focus is the keyboard's
  (`event.currentTarget.matches(":focus-visible")`). A press focuses a button, and a pan in the
  middle of `pointerdown` would move the node out from under the pointer when it stands partly
  outside the pane. The pointer path never pans into view: a node under the pointer is where the
  user put it. This narrows 02's "a focused node is panned into view" to the keyboard.
- **A drag does not select: the click guard.** d3 does not suppress this click (it rejected the
  press). On a moved release `NodeView` arms a ref, and `onClickCapture` on the node calls
  `preventDefault()` and `stopPropagation()` while the ref is armed, so neither the node's
  `onSelect` nor the region's ground click sees it. The guard disarms on the click it swallows or
  on a `setTimeout(0)` after the release, whichever is first, so a later Enter on the focused node
  is never swallowed. Pointer capture sends the click to the capturing node even when the release
  is elsewhere; a press that never moved arms nothing, so a plain click selects.
- **Ports.** With `ports`, two children of the node's element, siblings of its content:

  ```tsx
  <span data-port="in" data-node={id} data-no-pan onClick={swallow}
    className={cn(CANVAS_PORT_HIT, "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center shrink-0")}>
    <span className={cn(CANVAS_PORT, "shrink-0")} />
  </span>
  ```

  and the out port the same at `bottom-0 translate-y-1/2` with `data-port="out"` and the pointer
  handlers below. The node's element is `absolute`, so a port centres on its top or bottom edge
  (within the 1 px border of the router's top and bottom centre `T` and `S`). The ring is
  `CANVAS_PORT` (8, hollow: `bg-surface` over `border-edge-strong`) and the hit is
  `CANVAS_PORT_HIT` (24 on a fine pointer, 44 on touch, by the density, so no touch overlay in
  04), centred on it. Every port carries `data-no-pan` itself, so a press on one never pans,
  whether or not the node is draggable. `swallow` calls `stopPropagation()` and `preventDefault()`
  on a port's click, so a click on a port never selects the node. A port is a `span` with no role
  and no tab stop; the screen-reader decision (02) holds.
- **Out port drag.** `onPointerDown` (primary button): `stopPropagation()` so the node does not
  start a move, `setPointerCapture`, `moved = false`. `onPointerMove`: the first changed point
  sets `moved`; then `linking(id, screenToFlow(pointer))`. `onPointerUp`: when `moved`,
  `const { node, ground } = hit(pointerClient, region)`; `node` calls `onConnect(id, node)`,
  `ground` calls `onConnect(id, null)`, else nothing; then `linking(id, null)` and release the
  capture. `onPointerCancel`: `linking(id, null)`, nothing reported. A press on the out port that
  never moves reports nothing. An in port has no handler: a press on it starts nothing and does
  not pan.

### `zoom.tsx`

`ZoomStack({ onArrange })` renders a fourth `IconButton` after Fit when `onArrange` is given:
`icon="Network"` (a Lucide name), `fit="body"`, `label={words.arrange}`, `onAct={onArrange}`.
The stack already carries `data-no-pan` (02). Tab order is Zoom in, Zoom out, Fit, Arrange, then
the act. `Arrange` is `WORDS.arrange` (landed by 01, "only with `onMove`").

### `edges.tsx`, `geometry.ts` and `connection.tsx` (new)

The stroke group of `EdgeLayer` (`<g className="text-edge-strong">`, the arrowhead `marker`, the
`path`) moves to one exported `Stroke({ path, dashed })`, which `EdgeLayer` and the new
`ConnectionLine` both render, so a line being drawn is the line it becomes. Each edge's `path`
also takes `data-edge={id}` (the stories read it). `geometry.ts` exports `bendRoute(from, to,
pair)`, the forward router's rules 1, 2 and 4 with no collision check (02's "Forward route"),
which `routeEdges` already needs for route A and which the connection line reuses.

`ConnectionLine({ from, to })` in `connection.tsx` draws, in the layer's flow coordinates,
`roundedPath(cleanPoints(bendRoute(S, to, pair)), pair)` through `Stroke` with `dashed={false}`
(dashed means handoff, and only that), where `S` is the source's bottom centre from the live
boxes. Its SVG takes the edge SVG's classes (`absolute left-0 top-0 overflow-visible
pointer-events-none`) and a `data-link` mark. The line stays `edge-strong`, never an accent hue
(accent is selection and the path's marks). No valid or invalid tone is drawn: the port beneath
the pointer is the target. It renders after the nodes so it crosses them in view, and holds
nothing focusable.

### Overlays and the allowlist

New classes beyond 02's table: on a draggable node `cursor-grab`, `active:cursor-grabbing` and
`select-none`; on a port `left-1/2`, `top-0`, `bottom-0`, `-translate-x-1/2`, `-translate-y-1/2`
and `translate-y-1/2`. Every other class this story spells (`absolute`, `flex`, `items-center`,
`justify-center`, `shrink-0`, `invisible`, `text-edge-strong`, `overflow-visible`,
`pointer-events-none`) is already listed. `plugins/react-ui/scripts/overlays.ts`, in the
`// Canvas` block, adds the new ones. `b5` fails by name for a miss or a stale entry; add or drop
exactly what it names. `a6` resolves the classes in the built `app.css`. If `select-none` is
already there from 05, it is not added twice.

### Room left for 05 (touch)

- **Long press.** `NodeView` gates a drag in one place: `draggable`, which 05 makes
  `Boolean(onMove) && !touch`; `data-no-pan` and the cursor classes follow the same boolean, so on
  touch a finger on a node pans like one on the ground (d3 reads its filter at `touchstart`). 05
  builds the long press over the same pointer handlers, writes the node's position through
  `at(id, point | null)` and reports through `drop` (`onMove` once, then `at(id, null)`). 04 draws
  no touch special case. `cursor-grab` has no effect on touch.
- **44 px port.** `CANVAS_PORT_HIT` is already 44 on touch by the density. Hit-testing is
  `elementsFromPoint` on the laid-out DOM, so a hit child scaled by 05's un-zoom is found at any
  zoom with no radius to tune: 05 changes only the hit's `style`.
- **Touch release.** Pointer events carry `clientX` and `clientY` for touch, so `hit` and the
  handlers need no edit. Below the floor, 05's glyph-alone node renders no ports (`ports` is the
  one flag it turns off).

## Tests

`plugins/react-ui/test/canvas.test.ts` (02's file, `node --test`, erasable-only TS) gains:

| Subject | Cases |
| --- | --- |
| `landAt` | the centre minus the node's half; a zero-sized node is the centre itself; a negative centre keeps its sign |
| `place` | live beats a given position, a given position beats landed, landed beats computed, computed beats the origin |
| `bendRoute` | equal x gives `[S, T]`; otherwise orthogonal with its bend `pair` under the source; a target within `2 * pair` bends at the span's middle; a target left of or above the source draws, with no duplicate or collinear point after `cleanPoints` |

The same file asserts the pure arrays 02 already tests are unchanged: `elkGraph` ignores `position`
(a graph with every node positioned and the same graph without produce equal ELK input).

## Behaviour stories

`apps/showcase/behaviour/canvas.stories.tsx` (02's file) gains stories, and the helper module
below is new. The suite is Storybook's vitest browser mode at the vitest config's 1280 x 800, so
layout, hit-testing and `getBoundingClientRect` are real; input is the browser's own, sent through
Playwright by Vitest browser mode (Decided), not testing-library's `userEvent`, which dispatches
synthetic DOM events. Stories read the viewport from the layer's `transform` (02's `data-layer`),
edges from `path[data-edge]`, ports from `[data-port]` and the connection line from `[data-link]`.

**Helper** `apps/showcase/behaviour/mouse.ts` (new, beside 05's `touch.ts`: one module family with
the same `toPage`, `steps` and `hold` names and shapes, each waiting real time, never fake
timers). It sends mouse input through `cdp()` from `vitest/browser` (`Input.dispatchMouseEvent`:
`mouseMoved`, `mousePressed`, `mouseReleased`, `button: "left"`), the provider-backed route that
also serves 05's touch. It exports `drag(from, to, { steps, hold })`, which moves to `from`,
presses, moves in at least four steps (a node drag follows each move and a connection needs
movement before its release) and releases at `to` unless `hold` returns first (to read the state
mid-drag), and `click(point)`. Points are client coordinates from `getBoundingClientRect`;
`toPage(point)` adds the test iframe's offset (`window.frameElement?.getBoundingClientRect()`) and
is one exported function shared with `touch.ts`, never two copies. Hit-testing is the browser's, so
a release over a port lands on it.

**First thing the implementer verifies.** Storybook's own bundle must serve a `vitest/browser`
import in a story file, and `cdp()` must reach Playwright's Chromium. `cdp()` throws outside a
vitest run, so a mouse story's `play` fails with the helper's named error in Storybook's UI while
its render still draws. 05's `touch.ts` makes the same bet, so prove both with one `mouseMoved`
and one `touchStart` before writing a story. **Fallback if the import does not resolve:**
`drag` and `click` call a Vitest browser command declared in `vitest.config.ts`
(`test.browser.commands`, wrapping Playwright's `page.mouse`) with the same signatures, so no
story changes. Only if neither runs through Playwright does a story fall back to
`userEvent.pointer`, and that is reported to the user as a departure.

**Fixture.** An `Editable` story component holds `nodes` (the workflow, no positions) in `useState`,
passes `onMove` that stores each position, `onConnect` that records its calls, `onSelect`, an
`act`, and a button outside the canvas that appends a node with no position. Each story is a
finding if it fails, never weakened.

1. **Move.** After the first layout reports, press `plan`, move 120 px right and 60 px down in
   four steps. Mid-drag (`hold`): the node's own `left` and `top` have changed by `delta / zoom`,
   the layer's transform is unchanged (no pan), and `onMove` has not been called for `plan`
   since. After release: `onMove` was called once for `plan`, with `{ x, y }` equal to its start
   plus `delta / zoom` (the scale from the layer's transform), and `onSelect` was not called (the
   click guard). A press and release without moving calls neither, and a click then selects. A
   node standing partly outside the region, pressed and dragged, does not pan the view under the
   pointer (the focus rule). The `d` of the back edges' paths and the group frame of `loop`
   change when a member is dragged.
2. **Arrange.** From the reported layout `L`, drag two nodes, then click `Arrange`: `onMove` is
   called once per node in `pathOrder`, with positions deep-equal to `L` (ELK is deterministic),
   after which every node's box lies inside the region (the fit). The worker was requested once
   in all (`performance.getEntriesByType("resource")`, as 02's layout story counts), and a
   second `Arrange` reports again.
3. **Connect to a node.** Drag `plan`'s out port to `build`'s in port: `onConnect` is called
   once with `("plan", "build")`, and the number of `path[data-edge]` is unchanged (the canvas
   drew nothing). Mid-drag a `[data-link]` path exists, ending at the pointer, and none exists
   after. No `onSelect`, no `onMove`.
4. **Connect to the ground.** Release on empty ground: `onConnect("plan", null)` once. Release
   over a node's body (not its in port): not called. Release over `Zoom in`: not called. Release
   outside the region: not called. Drag from an in port: nothing starts and the layer does not
   pan. A press and release on an out port without moving: not called. A self connection (out
   port to the same node's in port) is reported as `onConnect(a, a)` (Decided).
5. **Landing.** The canvas with every node placed, panned off-centre by a ground drag, then the
   outside button appends a node with no position: `onMove` is called once for it and the node's
   box is centred on the region's centre within 2 px; `onSelect` is called with its id; a node
   of the original graph did not move. A graph with no positions at all does not land anything
   (it lays out, 02's story). The landed node is never painted at the origin: it is `invisible`
   until it is placed.
6. **Handlers decide what exists.**

   | Passed | Ports (`[data-port]` count) | Arrange | Drag |
   | --- | --- | --- | --- |
   | none | none | no | a drag on a node pans (02's read-only story) |
   | `onMove` | none | yes | the node moves; `data-no-pan` on it |
   | `onConnect` | two per node | no | a drag on a node pans; a drag on a port connects and does not pan |
   | both | two per node | yes | the node moves |

7. **Port geometry at desktop.** With `onConnect`: each port's drawn circle measures 8 x 8 and
   its hit measures 24 x 24, centred on the same point, on the node's top and bottom edges; the
   circle's centre lies within 1 px of the node's edge, and within 1 px of a route's end or start
   point. (44 at touch is 05's.)
8. **Keyboard is unchanged.** With `onMove` and `onConnect` passed, Tab still walks the nodes in
   path order, then Zoom in, Zoom out, Fit, Arrange, then the act, and no port is focusable.
9. **A draggable node does not block the wheel.** With `onMove`, a wheel over a node pans the
   layer, and a wheel with `ctrlKey` over it changes the scale: `data-no-pan` stops a pan from a
   press, not a zoom. A failure is a finding against 02's `filter`.

`pnpm stories:test` also runs the generated `Rest` and `Selected` stories under axe: they stay
read-only, so they gain no port and nothing here changes them. The Arrange button's name
(`Arrange`) is in the accessibility tree; the ports are not operable by keyboard, which is the
decided shape (a connection by keyboard is the consumer's sheet).

## Docs

- `plugins/react-ui/guide/canvas.md` (02's page) gains an "Editing" section: `onMove` reports a
  position per drag, per layout and per landing, and the consumer **stores it and passes it back
  as `position`** (that is what makes a drag, Arrange and a landing stick); a node added without a
  `position` among placed ones lands at the viewport's centre and is selected through `onSelect`;
  `onConnect(from, to)` adds an edge from the consumer's own data and `onConnect(from, null)`
  opens whatever the consumer offers for a dropped link (its sheet); the canvas never adds an
  edge; Arrange is the way to lay out without dragging, and connecting without a pointer is the
  consumer's sheet.
- `.helm/knowledge/architecture/ui-core.md`, the `Canvas` bullet: one sentence that editing is
  controlled (the canvas holds only a drag's live position, a landed node's spot and a
  connection in progress, and reports), that a node's pointer handlers and its ports live in
  `NodeView`, and that a port is hit-tested through `elementsFromPoint` rather than by geometry.

## Checks

| Check | Change |
| --- | --- |
| react-ui `verify` `b5`, `a6` | the new overlay entries; every class emitted. |
| `b-holds`, `b-owns` | `node.tsx` imports `CANVAS_PORT` and `CANVAS_PORT_HIT` (held); `owns` already covers every token they spell. Nothing widens. |
| `b-words`, `b-nouns`, `b-stroke`, `b7`, `b-roster` | unchanged and run: no literal word (`arrange` is `useWords()`), no product noun in the fixtures or comments, no stroke weight, `CanvasProps` unchanged (65 of 65). |
| ui-core, native-ui `verify` | unchanged and run. |
| `plugins/react-ui/test/canvas.test.ts` | the rows above. |
| `pnpm stories:test` | the nine stories above plus 02's; 02's read-only story stays green. |
| `pnpm check` | the per-change gate. |
| Design critique | judges a 1280 x 800 render of the workflow with `onConnect` and `onMove` passed, taken through Storybook: ports 8 hollow on the node's edges, the arrowhead meeting the port, Arrange in the stack within the 28 to 36 range, no accent but selection. A session that played no part in the work runs it. |

## Acceptance criteria
- [ ] With real pointer input at the stories' 1280 x 800: a drag moves a node at once and reports once on release; Arrange restores the computed layout and fits; a port drag to a node calls `onConnect(from, to)` and a release on the ground calls `onConnect(from, null)`, the canvas adding no edge.
- [ ] A drag never selects, never pans, and a wheel over a draggable node still pans and zooms.
- [ ] A node without a position among placed ones lands centred on the viewport and is selected; with no position on any node, the layout places them.
- [ ] Without `onMove` and `onConnect`, no port, no Arrange and no drag exist; each alone adds only its own.
- [ ] A port draws 8 px hollow with a 24 px hit on a fine pointer, as a child of `NodeView`.
- [ ] `pnpm stories:test` and `pnpm check` pass; react-ui, ui-core and native-ui `verify` pass.

## Decided
Decided by fcalell (2026-10-06); the open questions took their recommendations except the sixth.
React Flow is dropped (02), so the items that named its mechanics say what replaces them:

1. **A release over a node's body reports nothing.** The target is an in port found under the
   pointer by `elementsFromPoint`, not the nearest handle within a radius. `null` means "released
   on the ground", which the consumer answers with its add-a-node sheet, and a node's body is not
   the ground; a body drop that connected would let a stray release create an edge. Ports are the
   targets.
2. **A self connection is reported** as `onConnect(a, a)`: the hit-test finds the node's own in
   port like any other. `bendRoute` and 02's back route draw a self-loop, the canvas does not
   police back edges, and the consumer's check at save refuses it. Story 4 asserts the report.
3. **Two nodes landing at the same viewport take no offset.** The new node is selected and drawn
   over the older one; Stead adds one at a time and drags it away. Story 5 confirms it paints above.
4. **A landed node without `onMove`** is drawn at the viewport's centre from local state and
   nothing is reported, so a read-only canvas never shows a node at the origin.
5. **Arrange's glyph is `Network`.**
6. **The stories use real pointer input.** Mouse input goes through Vitest browser mode's
   provider-backed commands (`cdp()` from `vitest/browser`, which runs through Playwright), in
   `behaviour/mouse.ts` beside 05's `touch.ts` with a shared `toPage`. Testing-library's
   `userEvent.pointer` is not used. A story that proves flaky on a drag's first move is fixed in
   its helper, never weakened.
7. **Arrange fits afterwards**: a layout's bounds differ from the dragged one's and a node could
   land off-screen. The cost is one `requestAnimationFrame`, as 02's first fit pays.
8. **Positions are reported as the pointer arithmetic gives them**, fractional; a consumer that
   wants a grid snaps what it stores (the canvas has no snap, 02).
9. **One live-position map** in `Region` (`live`, written only through `at(id, point | null)`)
   serves 04's mouse drag and 05's long-press lift, and is cleared on release after `onMove`.

Decided in this brief from 02's shape and the evidence read:

- **A node's drag is its own pointer handlers with capture**, not d3's: `data-no-pan` keeps d3
  off a draggable node, and the canvas suppresses the click itself.
- **A port is a child of `NodeView`**, centred on the node's edge by classes, carrying
  `data-no-pan` and swallowing its own click; the connection line is the canvas's, drawn through
  the edge layer's `Stroke`.
- **The ground is one test** (`isGround`), shared by 02's ground click and the connection's
  release.
- **Focus pans into view only for the keyboard** (`:focus-visible`), so a press never moves the
  view under a drag.

Answered by fcalell's orchestrator (2026-10-06), all taking the recommendation:

- **02's d3 `filter` checks `data-no-pan` on pointer and touch events only, never on wheel**, so a
  wheel over a draggable node still pans and zooms. 02 builds this, and story 9 stands.
- **Pan into view on focus runs only for `:focus-visible`**, as `NodeView`'s focus rule above
  says. 02 builds this too.
- **05 is rewritten on this shape** and uses 04's names: `draggable`, `at`, `drop`, `hit`.
- **The port ring over the arrowhead's tip is left for the critique** (Risks).

## Risks
- A drag's position is held in the canvas and reported on release, and each move re-renders the
  dragged node and the edge layer. If a drag stutters on a large graph, `routeEdges` is the first
  suspect; story 1 asserts the node follows the pointer across four moves.
- The click that ends a mouse drag must not select. The guard relies on pointer capture sending
  the click to the node; story 1 asserts it, and a touch release is 05's.
- `hit` reads `document.elementsFromPoint`. A canvas inside an `inert` region or a shadow root
  would fail it; stack renders neither.
- A node paints above the edge layer, so a port's ring (`bg-surface`) covers the last 4 px of the
  arrowhead that ends at the node's top centre. The critique judges "the arrowhead meeting the
  port"; if it reads as clipped, the fix is a router change (the arrow ends 4 px above `T`), not a
  port style.
- Fit after Arrange runs one frame after the consumer's positions commit. If it runs before,
  the fit uses the old bounds; story 2's inside-the-region assertion fails and the fit moves
  into an effect on the positions' change.
- The 24 px hit is in flow units, so at a low zoom on a fine pointer it shrinks on screen; 05
  un-zooms it on touch and desktop keeps the pattern's 24.
