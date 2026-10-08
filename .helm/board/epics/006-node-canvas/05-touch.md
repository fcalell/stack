---
id: 006-05
status: done
sessions: {}
---
# react-ui: the canvas on touch at 375, and its overview on every input

## Goal
Stead's phone pans and zooms the same canvas: one finger pans, a pinch zooms, a long press lifts
a node, and every node and port keeps the 44 px floor at any zoom. Below the text floor, on every
input, a node is its glyph alone, and a click or tap on it zooms to it: the overview of a large
graph never shows text under the floor. There is no column fallback.

## Approach
Read first: story 02's brief ("Viewport", "Keyboard and input", "Room for 03 to 05", "Decided"),
story 03's `look.ts` section and its "Room for 04 and 05", story 04 (a draft while this is
written: the dependencies on it are named below), `.helm/research/node-canvas.md` ("Input",
"Risks"), and `.helm/agents/conventions.md` (no slot or plugin edit, so no `plugin-authoring.md`).
Land after 04: this story edits 02's `node.tsx`, `index.tsx`, `view.ts`, `viewport.ts` and
`zoom.tsx`, and 04's drag and port code.

The touch density is the repo's rule, read once through `useTouch()` (`lib/media.ts`): the touch
set draws unless the pointer is fine and the viewport is `tablet` or wider (`DESKTOP_MEDIA`), or a
root pins it. Every touch rule below is gated by it, so a desktop window and a phone differ by
density alone (one interaction model per density, no pointer-type branch). At 375 the density is
touch by the media rule. The semantic zoom (the below-floor flag and the glyph form) is the one
rule the density does not gate: it runs on every input, and only the glyph's size follows the
density.

Already true from 02 and the tokens, so 05 only proves it: one finger pans and two pinch through
d3-zoom's touch handlers, the region carries `touch-none`, the zoom stack's `IconButton fit="body"`
is 44 px (`control` is 44 on touch), the `act` is a `Button fit="body"` (44), `CANVAS_PORT_HIT` is
`size-target` (24 desktop, 44 touch), `min-h-row-2` is 64 on touch.

### Evidence recorded for this brief (2026-10-06)

Read from the installed d3-zoom 3.0.0 `src/zoom.js` (`node_modules/.pnpm/d3-zoom@3.0.0`); the
Vitest and Storybook points came through context7 (`/vitest-dev/vitest`, `/storybookjs/storybook`).

- **The filter is read once per gesture, at its start.** `touchstarted` begins with
  `if (!filter.apply(this, arguments)) return;`. `touchmoved` and `touchended` never call the
  filter: `touchmoved` returns only when `!this.__zooming` and otherwise moves the gesture. So a
  `data-no-pan` set on a node after the finger is down changes nothing for that finger; it only
  decides the next `touchstart`. A node that must stop a pan already under way cannot do it through
  the filter.
- **A gesture starts on the first touch and holds its touches.** `touchstarted` records each touch
  as `[screen point, world point, identifier]` in `g.touch0` and `g.touch1` and sets
  `this.__zooming`. `touchmoved` rewrites a touch's screen point from `event.changedTouches` and
  calls `translate(t, p, l)`, which keeps the recorded world point `l` under the finger. A pan is
  therefore "the world point first touched stays under the finger"; if moves are withheld and the
  finger then moves again, the next move applies the whole distance at once and the view jumps.
- **d3-zoom has no cancel.** The only way a gesture ends is `touchended`, which deletes the ended
  touch and calls `g.end()` when none is left (`touchcancel` is routed to it). `touchended` also
  returns early when `!this.__zooming`.
- **The listeners are on the region element** (`touchstart.zoom`, `touchmove.zoom`,
  `touchend.zoom touchcancel.zoom`), registered only when `touchable()` is true at the moment the
  behaviour is applied (`navigator.maxTouchPoints` or `ontouchstart`). A touch event stopped on a
  descendant, or on `document` in the capture phase, never reaches them. `touchstarted` calls
  `stopImmediatePropagation` on the region, which hides the touch event only: `pointerdown` and
  `click` are untouched, and `pointerdown` fires before `touchstart` for the same finger.
- **`scaleExtent` is read on every operation** (`scale()` clamps by it), so changing it takes effect
  on the next gesture, and `zoom.scaleBy(selection, 1)` re-clamps the current zoom to a new
  extent.
- Vitest browser mode: `cdp()` from `vitest/browser` sends raw Chrome DevTools Protocol commands
  (`Input.dispatchTouchEvent`, with several `touchPoints` for a pinch) on the Playwright
  provider with Chromium, and needs `api.allowWrite` and `api.allowExec` (on by default for a
  local run). `playwright({ contextOptions: { hasTouch: true } })` enables touch for an instance
  (and with it `navigator.maxTouchPoints`, which d3's `touchable()` reads), and an instance's own
  `provider` does not merge with the top-level one (repeat `launchOptions`). `page.viewport(w, h)`
  resizes the test iframe; an instance's `viewport` sets it for a project.
- Storybook 10: a story or meta takes `globals: { density: "touch" }` (it overrides the toolbar for
  that story), and `storybookTest({ tags: { include, exclude } })` filters which stories a project
  runs (default include `test`).

## The design

### Gestures, one owner each

On touch with `onMove`, **the node is not `data-no-pan` until it is lifted** (04 sets it from the
start; on touch the lift sets it). A finger that starts on a node therefore pans like one on the
ground, through d3-zoom, until the node lifts. A lifted node takes the finger: `NodeView` holds the
pointer and the canvas stops d3-zoom seeing it (below).

| Gesture | Owner | Result |
| --- | --- | --- |
| One finger drags from the ground | d3-zoom | Pans |
| One finger drags from a node, before the press completes or past the slop | d3-zoom | Pans; the node does not move; no `onSelect` |
| Two fingers move apart or together | d3-zoom | Zooms and pans |
| Tap on a node (above the floor) | the node's `button` | `onSelect(id)` |
| Tap on the ground | the region's `onClick` | `onSelect(null)` |
| Hold on a node, still within the slop, for `LIFT_MS` (with `onMove`, above the floor) | `useLift` | The node lifts; it draws the selection's outline |
| Drag after the lift | `useLift` | The node follows the finger; the viewport holds still |
| Release after the lift | `useLift` | `onMove(id, position)` once, absolute flow coordinates; no `onSelect` |
| A second finger lands while the press is pending | d3-zoom | The press is cancelled; the pinch proceeds |
| A second finger lands while lifted | `useLift` | The node drops where it is (`onMove` once); the finger is ignored and the view holds still until the first finger lifts |
| Click or tap on a glyph-alone node (below the floor, any input) | the glyph `button` | The viewport centres on the node at its own size (`centreOn`); no `onSelect` |

Without `onMove`, or below the floor, there is no lift: a hold on a node does nothing, and a drag
from it pans. Below the floor 04's immediate drag is off on every input (`draggable` is
`Boolean(onMove) && !touch && !below`), so a pointer drag from a glyph pans too, and the click that
follows a moved gesture is swallowed as it is for a node.

### Handing over from d3-zoom mid-gesture

The finger that lifts a node started a d3-zoom gesture at its `touchstart` (the node was not
`data-no-pan`), so when the timer fires d3-zoom is already panning with that finger. The d3
gesture is **not interrupted and cannot be**: d3-zoom has no cancel, its filter is not read again
until the next `touchstart` (Evidence), and a synthetic `touchcancel` needs a `Touch` object that
iOS Safari cannot construct. The handover starves it instead:

1. **At the lift**, `useLift` adds two native listeners on `document`, capture phase,
   `{ passive: false }`: `touchmove` and `touchstart`, each calling `event.stopPropagation()`. A
   document capture listener runs before the region's, so d3-zoom's `touchmoved` is never called
   and `touchstarted` never sees a second finger. The gesture stays open with its first touch
   frozen where the lift happened. (A React `onTouchMove` runs after the region's native listener
   and is too late.)
2. **`touchend` and `touchcancel` are not stopped.** The lifting finger's `touchend` reaches
   d3-zoom, which deletes its touch and calls `g.end()`, so `__zooming` clears and the next
   gesture starts clean. A stopped `touchend` would leave the gesture open for good.
3. **The listeners come off when the lifting finger ends** (`pointerup` or `pointercancel` of its
   id), after `drop`, not when the node drops. A second finger that drops the node does not free
   the first: the first finger's d3 touch is frozen, and its next `touchmove` would apply the whole
   distance since the lift as one jump, so the moves stay stopped until it lifts.
4. **The node's own `data-no-pan`** (set on lift) is for the next `touchstart` only: it makes a
   fresh finger on a lifted node start no pan. It plays no part in the finger already down.
5. **Position is taken at the lift**, not at `pointerdown`: the view may have panned up to `SLOP`
   screen px under the finger during the hold, so `useLift` records the node's flow position and
   the pointer's client point when the timer fires.

### `useLift` (`canvas/lift.ts`, new)

```ts
// How long a still finger holds before a node lifts, and how far it may stray first.
export const LIFT_MS = 400;
export const SLOP = 8;

export interface Lift {
	lifted: boolean;
	// Spread on the node's `button`, in place of 04's drag handlers on touch.
	bind: {
		onPointerDown: (event: React.PointerEvent) => void;
		onPointerMove: (event: React.PointerEvent) => void;
		onPointerUp: (event: React.PointerEvent) => void;
		onPointerCancel: (event: React.PointerEvent) => void;
		onClickCapture: (event: React.MouseEvent) => void;
		onContextMenu: (event: React.MouseEvent) => void;
	};
}

export function useLift(args: {
	id: string;
	enabled: boolean; // touch && Boolean(onMove) && !below
	viewport: Viewport; // `get().k` for the zoom
	at: (id: string, point: CanvasPoint | null) => void; // 04's setter, the only writer of `live`
	drop: (id: string, point: CanvasPoint) => void; // 04's release path: onMove, then at(id, null)
	place: () => CanvasPoint; // 04's `place(node, maps)` for this node: live, given, landed, computed
}): Lift;
```

Behaviour, each a browser test (below):

- `pointerdown` (first pointer only, when `enabled`) records the pointer id and client point and
  starts a `LIFT_MS` timer. `pointermove` beyond `SLOP` client px cancels the timer and marks the
  gesture moved; `pointerup` and `pointercancel` cancel it too. While the timer runs the node's pan
  is d3-zoom's, untouched. A second finger lands elsewhere than on this node, so the node may never
  see its `pointerdown`: while the timer runs `useLift` also listens for `pointerdown` on
  `document` (capture) and cancels the press when it sees another pointer id.
- When the timer fires the node lifts: it records `place()` and the latest client point (above),
  sets `lifted` true, calls `setPointerCapture(pointerId)` and installs the handover listeners.
- While lifted, `pointermove` writes `position = start + (client - clientStart) / k` through
  `at(id, point)`, `k` read from `viewport.get()` in the handler. There is no auto-pan: the user
  drops the node and pans.
- `pointerup` while lifted calls `drop(id, point)` once and `at(id, null)`. A `pointerdown` of
  another id on `document` while lifted does the same (the drop) and keeps the handover listeners.
  `onClickCapture` swallows the click that follows a lift or a pan (a moved gesture), so neither
  calls `onSelect`. `onContextMenu` prevents the default while a press is pending or lifted (a long
  press raises the context menu on some platforms). `LIFT_MS` 400 and `SLOP` 8 are gesture
  constants, stated once in this file with the reason (a platform long press is about 400 to 500
  ms; 8 px is the touch slop).
- On touch with `onMove`, 04's `draggable` is `Boolean(onMove) && !touch`, so `data-no-pan` and the
  immediate drag are off and `NodeView` binds `useLift` in their place; `data-no-pan` is rendered
  while lifted. Both paths write the same `live` through `at` and finish through the same `drop`,
  so a drop is one `onMove` on either path. A mouse in the touch density drags at once, as on
  desktop: on `pointerdown` with `pointerType === "mouse"` `NodeView` sets `data-no-pan` on its
  element (the event precedes d3's `mousedown`, which reads the filter) and runs 04's drag
  handlers; `useLift` ignores a mouse.

`NodeView` draws a lifted node with a 2 px `outline-2` in the selection's colour (the focus ring's
width; the one element, no new class beyond `outline-2`, already in the allowlist): the lifted node
is the one in hand. It does not call `onSelect`.

**Live position, owned by 04.** While a node is in hand its position lives in 04's `live` map in
`Region` (`id -> CanvasPoint`), which `placeOf(id)` reads for the nodes, the group frames and the
back routes. 05 adds no second map and writes only through 04's setter `at(id, point | null)` (a
point sets the live position, `null` clears it); `drop` is the release path 04 has,
`onMove(id, position)` once, absolute, then `at(id, null)`.

### Semantic zoom: the below-floor flag

- **The trigger is text, on every input.** A node draws its words at their own size times the
  zoom, and its smallest text is the `caption` type role (the overline, `CANVAS_NODE_TEXT`
  `part: overline`, 11 px). That role's size is **the text floor**, read from
  `@fcalell/ui-core/tokens`, never a literal. The flag compares what the smallest text renders at
  with the floor: `zoom * text < floor`, where `text` is the caption's size at zoom 1 and `floor`
  is the text floor. The two are the same number, so the threshold is exactly zoom 1
  (`ZOOM_TO_NODE`), on a pointer and on a finger alike, and a node at exactly zoom 1 is not below.
  The 44 px target floor no longer decides the flag: a node is taller than the target at zoom 1, so
  the text floor is crossed first, and the glyph keeps the target floor through its own size
  (below).
- **One flag for the canvas, derived once.** `Region` computes
  `const below = useViewportValue(viewport, (t) => belowFloor(t.k, TEXT, TEXT_FLOOR))`, where
  `useViewportValue(viewport, select)` is a `useSyncExternalStore` over the viewport's `get` and
  `subscribe` (02's seam, added to `viewport.ts` here). A selector returning a boolean re-renders
  `Region` only when the boolean flips, so crossing the threshold re-renders once and a pan or a
  zoom within a side re-renders nothing. It is one boolean for the whole canvas, not a comparison
  per node and not the shortest node's height, so no node is ever drawn as a card under the floor
  and the graph is one form at a time.
- **It reaches nodes as a prop.** `Region` renders every `NodeView`, so `below` is a `NodeView`
  prop; no context. A `NodeView` never reads the zoom.
- The pure parts are in `floor.ts` and tested in node: `TEXT_FLOOR`,
  `belowFloor(zoom, text, floor)`, `minZoomFor(boxes, glyph)` (below). `shortestHeight` and the
  touch-only `FLOOR` are gone.

### The glyph-alone node

- **Layout stays.** In the glyph form the node keeps its card markup in the box, `invisible`
  (class already in `overlays.ts`), so the measured size, the group frames, the routes and the
  layout are unchanged by a crossing. The glyph is a second element over it. An `invisible`
  element takes no pointer, so a finger lands on the glyph.
- **Markup** (`node.tsx`, a second branch of the same component):

  ```tsx
  <div className="relative">
  	{card /* the existing markup; `invisible` when below */}
  	{below ? (
  		<div className="absolute inset-0 flex items-center justify-center">
  			<button type="button" onClick={centre} style={UNZOOM}
  				className={cn(canvasNodeGlyph({ state: look.state }), "relative flex items-center justify-center select-none", look.state === "selected" && SELECTED)}>
  				<Icon name={node.icon} fit="body" />
  				{look.status ? <span className="absolute -top-inside -right-inside"><StatusDot state={node.status.state} /></span> : null}
  			</button>
  		</div>
  	) : null}
  </div>
  ```

  `UNZOOM` is `{ scale: "var(--canvas-unzoom)" }`, an inline style as the canvas already writes for
  a dynamic coordinate (one-line comment saying so).
- **The glyph's size follows the density and holds at any zoom.** The glyph is `size-control` in
  the node's coordinates: the `control` size role, which is the desktop `IconButton`'s size on a
  pointer (`SIZE_PX.desktop.control`) and the touch target on a finger (`SIZE_PX.touch.control`),
  so it clears the target floor on both. On screen it would be that size times the zoom, so
  `Region` keeps the variable `--canvas-unzoom` (`1 / k`) on the region element from outside
  React: an effect (on every input, not only `touch`) sets it once and then
  `viewport.subscribe(() => set(1 / viewport.get().k))`. The node never reads the zoom; CSS does,
  so a pinch or a wheel re-renders nothing and the glyph keeps its size.
- **A glyph is a `button` below the floor whether or not `onSelect` is passed**: its tap moves the
  view, which is navigation, not an edit. Above the floor 02's rule stands (a read-only canvas has
  no node button). Below the floor a node does not lift or drag.
- **The click or tap** is one `onClick`, so a mouse click, a tap and the keyboard's Enter and Space
  take the same path. It calls `viewport.centreOn(box, ZOOM_TO_NODE)`, with `ZOOM_TO_NODE = 1` in
  `view.ts` (a node at its own size, the one zoom its tokens are drawn for, and the text floor's
  threshold, so the card is back at once).
  02's `centreOn(box)` pans only and does nothing when the box is inside; here it gains an optional
  zoom: given one, it always moves, setting the zoom (clamped to the extent) with the box's centre
  at the pane's centre, through the pure `centredTransform(box, k, pane)` in `view.ts`. Instant,
  like 02's moves, so reduced motion needs no branch. It does not select.
- **The look carries over (03).** `look.state` (`rest`, `selected`, `problem`) is the glyph's
  border, `tone` `dimmed` and `off` ink the `Icon` through `text-ink-disabled` and `text-ink-meta`
  on the glyph button (classes in `overlays.ts` already), and `look.status` draws a `StatusDot` on
  the glyph box's top right corner, straddling its border so it clears the icon, the spinner while `running`. `look.problem` draws the `failed` `StatusDot`
  on the bottom right corner the same way (the node's own danger mark, which outlives selection taking the border). A glyph carries no words, so the overview reads
  state by border and dot, and the word is one tap away.
- **Group heads and edge labels** take the same flag: below it they are `invisible` (they stay in
  the layout, so frames and routes do not move), so the overview shows no text at all.
- **Keyboard.** Tab still walks the nodes in `pathOrder`: a glyph is the node's `button` and the
  `invisible` card takes no focus. Enter and Space on a glyph are its `click`, so they zoom to the
  node and **do not select** (the same as a tap, since selecting is a second step on the
  card that is back on screen). The zoom unmounts the
  glyph, so when the activation came from the keyboard (`event.detail === 0`) the handler moves
  focus to the node's card `button`, and Enter there selects as 02 sets. 02's pan into view on
  keyboard focus runs for a glyph as for a card.
- **No overlap.** A glyph is its `control` size on screen at any zoom, and nodes in the flow stand
  closer than that when zoomed far out. On every input the canvas passes `minZoom` to
  `useViewport`: `minZoomFor(boxes, glyph)`, with `glyph` the density's `control` size
  (`SIZE_PX[touch ? "touch" : "desktop"].control`) over the smallest `max(|dx|, |dy|)` between two
  node centres, clamped to `[0.1, 1]`, so no two glyphs overlap, recomputed when the boxes change. (The critique's ruling adds a gap: see
  "Decided after the critique".)
  It maps to d3's `scaleExtent([minZoom, 2])`, applied in an effect (not at creation, since the
  boxes arrive after the first measure), followed by `behaviour.scaleBy(select(region), 1)` to
  re-clamp a zoom already below it.

### Ports and the zoom stack at 44 px

- **Zoom stack and `act`.** Already 44 on touch by the density (`IconButton fit="body"`,
  `Button fit="body"`); the stack stands outside the layer, so the zoom does not scale it. 05
  proves it, with 04's Arrange button, at 375.
- **Ports.** 04 draws a port as `CANVAS_PORT` (8) inside a `CANVAS_PORT_HIT` (`size-target`, 44 on
  touch) child of the node. That hit box is in flow coordinates, so at zoom 0.5 it is 22 px on
  screen. On touch the hit child takes the same `style={UNZOOM}` as the glyph, so it is 44 px at
  any zoom, centred on the port. A port carries `data-no-pan`, so d3-zoom's filter rejects a finger
  that starts on it: it connects and does not pan. A port exists only with `onConnect`, as in 04.
- **Hit testing.** 04's `hit(point, region)` (`hit.ts`, with `isGround`) reads `elementsFromPoint` on
  the laid-out DOM, so a hit child scaled by `UNZOOM` is found at any zoom with no radius to tune,
  and touch release needs no edit to it: pointer events carry `clientX` and `clientY` for touch.
  Scenario 8 at scale 0.5, written before the code, proves it (Risks). Below the floor the glyph-alone
  node renders no ports (04's `ports` flag turned off).

### Pinch and the pane

Pan and pinch stay as 02 set them; double tap does not zoom (`dblclick.zoom` is off); the region's
`touch-none` keeps the page from scrolling under a pan. The touch changes to `useViewport` are
`minZoom` and nothing else.

## Files

New, `plugins/react-ui/src/ui/components/canvas/`:

| File | Holds |
| --- | --- |
| `lift.ts` | `LIFT_MS`, `SLOP`, `useLift` |
| `floor.ts` | `TEXT_FLOOR`, `belowFloor`, `minZoomFor`, `UNZOOM` |

Edited:

- `viewport.ts`: `useViewportValue(viewport, select)`; a `minZoom` option on `useViewport` mapped to
  `scaleExtent`; `centreOn(box, zoom?)`.
- `node.tsx`: `useLift`, `data-no-pan` only while lifted on touch, the glyph branch, the `below`
  prop, `UNZOOM`; `select-none` on the node box; 04's `draggable` off while `below`.
- `index.tsx` (`Region`): `useTouch()`, the `below` value, the `--canvas-unzoom` effect and
  `minZoom` from `minZoomFor` (all three on every input), `useLift`'s `at` wired to 04's `at`.
- `view.ts`: `ZOOM_TO_NODE`, `centredTransform`.
- 04's port element: the hit child's `style={UNZOOM}` on touch.
- `plugins/react-ui/scripts/overlays.ts`: under `// Canvas`, `"select-none"`, `"-top-inside"`,
  `"-bottom-inside"` (`-right-inside` is a token class, so `b5` lists none; the rest of the glyph's classes are in the list: `relative`, `absolute`,
  `inset-0`, `flex`, `items-center`, `justify-center`, `invisible`, `outline-2`,
  `outline-selected-outline`, `text-ink-disabled`, `text-ink-meta`; `invisible` also serves the group
  heads and edge labels below, so 05 adds no entry for them). `b5` names any miss or stale
  entry; add or drop exactly what it names.
- `plugins/react-ui/guide/canvas.md`: an "On touch" section (below).
- `.helm/knowledge/architecture/ui-core.md`, 02's `Canvas` bullet: one sentence (below).

### The contract edit (`packages/ui-core`): one cell

A glyph-alone node is a box no existing cell draws (`CANVAS_NODE` is 240 wide). 01 closed the
contract, so this is a named reopening, small and mechanical:

- `src/variant-tables.ts`, after `CANVAS_NODE_TEXT`:

  ```ts
  // A node under the text floor: its glyph alone in a control-sized box. The state is the
  // outline's colour, as the node's own.
  export const CANVAS_NODE_GLYPH = matrix({
  	base: "size-control rounded-card border bg-group",
  	variants: {
  		state: {
  			rest: "border-edge",
  			selected: "border-selected-outline",
  			problem: "border-edge-error",
  		},
  	},
  	defaultVariants: { state: "rest" },
  });
  ```

- `src/variants.ts`: `export const canvasNodeGlyph = build(CANVAS_NODE_GLYPH);` and
  `family("CANVAS_NODE_GLYPH", CANVAS_NODE_GLYPH, canvasNodeGlyph)` after `CANVAS_NODE_TEXT`'s.
- `src/roster.ts`, `Canvas`: `draws` gains `"CANVAS_NODE_GLYPH"` and `"ICON.fit.body"`; `holds`
  gains `"CANVAS_NODE_GLYPH"`. `owns` already holds every token the cell spells (`size` `control`,
  `radii` `card`, colours `group`, `edge`, `selected-outline`, `edge-error`); `c35` names any miss
  and the icon's size `icon` if absent: add exactly what it names. The roster count stays 65, the
  `states` stay `rest` and `selected`.
- `scripts/verify.ts`: import `CANVAS_NODE_GLYPH` and `canvasNodeGlyph`, register
  `["CANVAS_NODE_GLYPH", CANVAS_NODE_GLYPH, canvasNodeGlyph]` in `MATRICES` (`c19`).
- Regenerate `packages/ui-core/DESIGN.md` (`pnpm --filter @fcalell/ui-core design-md`). Native-ui
  runs unchanged: its `a6` probe compiles `size-control`, `rounded-card`, `bg-group` already.
- The generated frames draw a cell only through `drawCanvas`; the new cell is drawn by none and so
  shows as a swatch in the `Rest` story's `cell` control. `drawCanvas` draws a canvas in it: the
  `WORKFLOW` at the touch density, zoomed below the floor (see the stories), so the frame judges
  the form. If the frame set only holds desktop density for this cell, the swatch stands and the
  behaviour story is the proof.

## Stories and tests

### What the run needs

`apps/showcase/vitest.config.ts` has one project, `storybook`, with one instance at 1280 × 800 and
no touch. **That file belongs to the showcase migration's session; this story edits it only after
that session has committed, and the edit is this one addition**, in the file's own shape:

```ts
// A second project: the touch stories, in a 375 px phone with touch events on.
{
	extends: true,
	plugins: [storybookTest({ configDir: `${dirname}.storybook`, tags: { include: ["touch"] } })],
	test: {
		name: "touch",
		testTimeout: 120_000,
		browser: {
			enabled: true,
			headless: true,
			provider: playwright({
				contextOptions: { hasTouch: true },
				...(chrome ? { launchOptions: { executablePath: chrome } } : {}),
			}),
			instances: [{ browser: "chromium", viewport: { width: 375, height: 812 } }],
		},
	},
},
```

and the first project's plugin takes `tags: { exclude: ["touch"] }` so the desktop run does not
run them. (The instance's `provider` replaces the top-level one, which is why `launchOptions` is
repeated.) If the migration's config has moved on, keep the shape: a separate project at 375 with
`hasTouch`, selected by the `touch` tag. `hasTouch` also makes `navigator.maxTouchPoints`
non-zero, which d3-zoom reads when the viewport mounts to register its touch handlers.
`pnpm stories:test` runs `vitest run`, which runs both.

The density at 375 is touch by the media rule, but the preview pins `data-density` from the
`density` global (default `desktop`), so each touch story sets `globals: { density: "touch" }`.
The mode is `parameters.mode` (`"light"` or `"dark"`), which the preview's decorator reads.

### `apps/showcase/behaviour/touch.ts` (new, beside `support.ts`)

Story 04's mouse helpers are `behaviour/mouse.ts`, beside this module (same `steps` and `hold`
shapes, both driving `vitest/browser`). `toPage` is 04's, defined and exported in `mouse.ts` (04
lands first), and `touch.ts` imports it: one copy. Real touch through `cdp()` from
`vitest/browser` (`Input.dispatchTouchEvent`): `tap(point)`, `press(point, ms)`,
`drag(from, to, { steps, hold })`, `pinch(centre, from, to)` (two `touchPoints` with ids 0 and 1,
`touchStart`, a run of `touchMove`, `touchEnd` with `[]`). Each waits real time (`setTimeout`),
never fake timers: a press is `LIFT_MS` plus a margin. **That `toPage` lands a touch where
intended is the first thing the implementer proves** (Risks). `cdp()` throws outside a vitest run,
so the helper's error names that, and a touch story's `play` fails with it in Storybook's own UI;
the stories' renders are still drawn there at the toolbar's touch density for the critique.

### `apps/showcase/behaviour/canvas-touch.stories.tsx` (new; 02's `canvas.stories.tsx` is not edited)

`title: "Behaviour/Canvas touch"`, `tags: ["touch"]`, `globals: { density: "touch" }`. Each
scenario below is written once and exported twice by a helper, `Light` and `Dark`
(`parameters: { mode }`, e.g. `PanLight`, `PanDark`), so a scenario's name carries its mode and
every one runs in both. Each is a finding if it fails, never weakened. The canvas is the `WORKFLOW`
fixture from `showcase/frames/canvas` in a stage `flex flex-col h-[40rem] w-full`, with `onSelect`,
`onMove` and `onConnect` as spies unless the scenario says otherwise. The viewport transform is
read from the layer (02's `data-layer` mark) and element rects as 02's `viewport` and `rect`
helpers do (copy them into the file; they are not exported).

1. **Pan.** A one-finger drag on the ground changes the layer's translate by the drag's delta and
   not its scale; no spy is called. The same drag from a node pans too, the node's position is
   unchanged, `onSelect` and `onMove` are not called.
2. **Pinch.** Two fingers moving apart grow the layer's scale by about the ratio of the finger
   distances (within 15 percent), moving together shrink it; no spy is called.
3. **Tap.** A tap on a node calls `onSelect(id)` once; a tap on the ground calls `onSelect(null)`.
4. **Long press.** A hold of `LIFT_MS` plus a margin on `plan`, then a drag of `d` screen px: the
   node's flow position moved by `d` over the scale (within 1 px), the layer's translate and scale
   are unchanged although the finger moved (d3-zoom is starved, not merely overridden), the node
   has a 2 px outline in the selection's colour while down, and the device is pulsed once, and on release `onMove` is called once with the node's
   id and that absolute position, `onSelect` not at all. After release a one-finger drag on the
   ground pans by exactly its own delta (the frozen gesture left no jump).
5. **No gesture takes another's.** (a) A drag from a node that starts before the press completes
   pans and does not lift: the node's position is unchanged, `onMove` not called. (b) A hold then a
   drift past `SLOP` cancels the lift and pans. (c) A hold on a node, then a second finger on the
   ground before `LIFT_MS`: no lift, the pinch zooms. (d) A lift, then a second finger: `onMove` is
   called once at the drop, the scale does not change, and the first finger's further moves leave
   the layer where it is; both fingers up, a new pinch zooms. (e) A canvas without `onMove`: a hold
   then a drag pans, nothing lifts. (f) After a lift or a pan, no `onSelect`.
6. **Below the floor.** Zoom out (the zoom stack's `Zoom out` and a pinch) until the viewport scale
   is under 1: every node's glyph `button` is visible, its rect is at least 43.5 by 43.5 (the touch
   `control` size) at three scales (just under 1, half of that, the touch `minZoom`), the card's
   text is not visible (`invisible`), and no two glyph rects overlap (`apart`). A glyph does not
   lift: a hold then a drag on it pans. A tap on a glyph sets the scale to 1 within 0.01 and
   centres that node in the region within 1 px, `onSelect` is not called, and its card is visible
   again. A pinch past the touch `minZoom` stops at it.
7. **Once per crossing.** A `MutationObserver` on one node's element (attributes, `childList`,
   `subtree`) records nothing while the viewport zooms within one side of zoom 1 (several
   `Zoom in` or `Zoom out` steps, and a pan), and records the change at the crossing.
8. **The floor on controls.** At 375 every zoom button and the `act` is at least 44 by 44, and so is
   04's Arrange button. With `onConnect`, a port's hit child is at least 44 by 44 at scale 1 and at
   scale 0.5 (its rect, read through `elementsFromPoint` at the port's centre), and a finger drag
   from it to another node's port calls `onConnect(from, to)` at both scales without panning; a
   release on the ground calls `onConnect(from, null)`.
9. **Selection through the glyph's state.** A `PROBLEM` and a `STATUSES` fixture below the floor:
   the problem glyph's border colour differs from a rest glyph's and it holds the danger dot, and a status glyph holds a dot.

`apps/showcase/behaviour/canvas-overview.stories.tsx` (new, beside it) holds the pointer story,
`title: "Behaviour/Canvas overview"`, no `touch` tag, `globals: { density: "desktop" }`, so the
first project runs it at 1280 × 800 with a mouse, in both modes (`Light` and `Dark` as above). It
reads the viewport and rects through the same copied helpers and drives `behaviour/mouse.ts`'s
helpers.

1. **Overview on a pointer.** At the fitted zoom of a graph that fits, scale 1 or above, every card
   is visible and no glyph is. Zoom out below 1 (the zoom stack's `Zoom out`, then a wheel): every
   node is a glyph `button`, visible, with a rect of at least 31.5 by 31.5 (the desktop `control`
   size) at three scales (just under 1, half of that, the desktop `minZoom`), no two overlap
   (`apart`), and every text in the canvas (node cards, group heads, edge labels) is `invisible`: no
   visible text node in the layer renders under the caption's 11 px, read as its computed font size
   times the layer's scale.
2. **Click and Enter.** A click on a glyph sets the scale to 1 within 0.01, centres that node in
   the region within 1 px, calls no `onSelect` and shows its card. Zoom out again, `userEvent.tab()`
   walks the glyph buttons in `pathOrder`, Enter on one does the same, calls no `onSelect`, and
   focus lands on that node's card `button`.
3. **A drag pans.** With `onMove` passed, a mouse drag from a glyph pans by its own delta, the
   node's position is unchanged, `onMove` and `onSelect` are not called.
4. **Once per crossing.** As touch scenario 7, with the wheel and `Zoom in` steps.

The generated `Rest` and `Selected` stories (axe included) run at the first project's 1280 × 800;
the `touch` project does not run them (it includes only the `touch` tag), so axe at 375 comes from
these stories: they run under the preview's `a11y: { test: "error" }` like any story, in both modes.

`drawCanvas` draws the canvas in `CANVAS_NODE_GLYPH.state.rest` (the new cell) as the `WORKFLOW`
below the floor, through a wrapper that calls `viewport.fit` and zooms out to just under 1 once the
layout is ready (a showcase file, outside `b5`), so the design critique has a frame for the form in
both modes and both densities.

### The design critique

A session that played no part in the work judges 375 renders taken through Storybook (`pnpm stories`,
the toolbar's density on touch, the `Canvas touch` stories, and the `Canvas overview` stories at
desktop density), light and dark, against the rubric's
floors alone (the pattern page has no phone reference: no phone app on Mobbin pans a node canvas;
Deel's iOS workflow is a column, which is decided against). It reads: 44 px on every target at the
fitted zoom and below the floor at 375, the `control` size on the glyph on a pointer, and no text
under 11 px in an overview; the glyph form's border and dot against the pattern page's range
(radius 6 to 10, accent only on selection); the lifted node's outline; no overlap of glyphs.

## Checks

| Check | Change |
| --- | --- |
| `plugins/react-ui/test/canvas.test.ts` (`node --test`, erasable-only TS) | `floor.ts`: `belowFloor` at the threshold exactly (`zoom * text === floor` is not below, and with the caption's size on both sides the threshold is zoom 1), `minZoomFor` (two nodes a known distance apart, at the desktop and the touch glyph sizes; the L-infinity metric; clamps to `[0.1, 1]`; one node and none give `0.1`). `lift.ts`'s pure part, if the position arithmetic is exported (`start + delta / zoom`). `view.ts`'s `centredTransform` (the box's centre lands on the pane's centre at the given zoom). |
| react-ui `verify` | `b5` (three overlay entries, none stale), `a6` (every class emitted), `b-holds` (`Canvas` imports `CANVAS_NODE_GLYPH` and composes `StatusDot` and `Icon`, never their cells), `b-owns`, `b-words` (no literal word), `b-stroke`, `b-roster` ("65 of 65"), `b-exports`. |
| ui-core `verify` | `c19` (the new matrix registered both ways), `c20`, `c21`, `c26` (tokens only, `size-target` outside the matrices' namespaces is not used), `c35` (`Canvas`'s `owns` and the `draws` it names), `c36` (its `holds`), `c34`; the `DESIGN.md` drift test (`pnpm --filter @fcalell/ui-core test`) after `design-md`. |
| native-ui `verify` | unchanged and run (`Canvas` is web only; `a6` compiles the glyph cell's classes). |
| `apps/showcase/vitest.config.ts` | the `touch` project and the first project's `exclude` (named above; the other session's file). |
| `pnpm stories:test` | now both projects: the desktop run (1280 × 800) and the touch run (375 × 812, `hasTouch`): the scenarios in both modes pass. |
| `pnpm check` | the per-change gate; it must pass. |
| Design critique | as above; the verdict is recorded under "Progress". |

## Guide and knowledge

- `plugins/react-ui/guide/canvas.md`: an "On touch" section after 04's: the touch density's
  rules (a finger on a node pans; a long press then a drag moves it when `onMove` is passed; a
  pinch zooms), the 44 px floor on every node, port and zoom button, and that on every input a
  node under zoom 1 is its glyph alone with border and dot (a click, tap or Enter zooms to it), so
  a consumer keeps its
  `problem` and `status` words short and puts the detail in its sheet. Present tense, no new nouns.
- `.helm/knowledge/architecture/ui-core.md`, 02's `Canvas` bullet: one sentence that on touch the
  canvas lifts a node by long press over `NodeView`'s own pointer handlers (d3-zoom reads its
  filter once, at `touchstart`, and has no cancel, so a lift starves its gesture of touch moves
  rather than ending it), derives one below-floor flag, on every input, from the zoom against the
  caption's text floor (zoom 1) and a CSS variable for the unzoom, and draws `CANVAS_NODE_GLYPH`
  under the floor at the density's `control` size.

## Risks

- **Real touch in the iframe.** CDP touch points are the top page's coordinates and the test runs
  in an iframe. If `toPage` is not enough (a scaled orchestrator frame), the fallback is a
  Vitest custom browser command that dispatches through the Playwright page; stop and report if
  neither lands a touch where intended.
- **The handover's listener ordering.** It relies on a `document` capture listener running before
  d3-zoom's listener on the region (the event path's order, read in the spec and the source). If
  the pan still drifts after a lift, the finding is the ordering, not a reason to weaken scenario 4.
- **d3's touch handlers register only on a touch-capable device** (`touchable()` is read once, when
  the behaviour is applied). A touch-density window with no touch hardware has no touch pan
  or pinch; the mouse path (drag, wheel) is 02's and the lift does not apply to it.
- **Port release at 0.5.** Scenario 8 proves it before the glyph and lift
  code are written. A cell or radius change it needs is a finding for the user.
- **`scale` as an individual transform.** The `scale` CSS property is in every browser the
  showcase targets (Chromium 104). If a consumer's target is older, `transform: scale()` is the
  same one line.
- **Raising `minZoom` clamps the graph.** A graph whose nodes stand close (200 nodes) cannot be
  seen whole on a phone: `minZoomFor` stops the pinch where glyphs would overlap, and the user pans.
- **The `touch` project doubles the browser's startup.** The desktop run is unchanged; report the
  added time.

## Acceptance criteria
- [x] With real touch at 375 on the workflow story: a drag pans, a pinch zooms, a long press then a drag moves a node (one `onMove`, no pan, no `onSelect`), and no gesture takes another's (scenarios 1 to 5).
- [x] Every zoom button and the `act` are at least 44 px on screen at any zoom, and (with `onConnect`) every port is at least 44 px at every zoom that draws one (1 and above: below the floor a node is its glyph and draws no port), and a finger drag connects at 1 as at 1.5.
- [x] Zoomed out below 1 on any input, every node is a glyph of the density's `control` size (a pointer's `IconButton` size, 44 on touch) with its state's border and dot, no two overlap, no node text renders under 11 px, and a click, tap or Enter on one zooms to it at its own size without selecting it.
- [x] Crossing zoom 1 changes the DOM once and zooming within a side changes none; no node reads the raw zoom.
- [x] `pnpm stories:test` passes at 375 in both modes (the `touch` project) and at 1280 × 800 (the first project, the overview stories included), axe included. Every Canvas story passes (touch 40 of 40, `canvas.stories.tsx` 43 of 43, overview 20 of 20, generated `Canvas` 2 of 2); the 13 failures of the full run are the known non-canvas ones.
- [x] `pnpm check` passes; react-ui's, ui-core's and native-ui's `verify` pass; `DESIGN.md` is regenerated.
- [ ] The design critique judges 375 renders in both modes against the rubric's floors.

## Decided
Decided by fcalell (2026-10-06):

- **The phone pans and zooms at 375 with no column fallback.**
- **Screen readers are out of scope.** The glyph form, the lift and the controls spell no `aria-*`
  or spoken form; a glyph's button carries `title={node.title}`, a native tooltip that also names the button for axe and voice control. It is the one name the canvas spells; no `aria-*`, no spoken form.
- **A node holds no control.**
- **Below the text floor, every node draws its glyph alone, on every input** (fcalell, after the
  design critique of the node canvas). The trigger is any zoom where node text would render under
  the floors: the eyebrow is 11 px, so any zoom below 1, pointer as well as touch. The overview of
  a large graph never shows text under the floor. The flag is the canvas's one boolean, derived for
  every input once per crossing, comparing the smallest text's rendered size with the text floor
  at zoom 1. The glyph is `size-control`: the desktop `IconButton` size on a pointer, 44 on touch.
  A click or tap zooms to it with `centreOn`; Tab reaches the glyphs in path order and Enter zooms.
- **Semantic zoom.** A node reads a below-floor flag that the canvas derives once per threshold
  crossing, never the raw zoom.

Answers to the open questions (fcalell, 2026-10-06), all taking the recommendation:

- **One live-position map, owned by 04.** 05 writes through 04's `at` (into `live`) and adds no second map.
- **Glyph marks:** the `problem` border plus a `StatusDot` at the corner (the spinner while `running`); the overview reads by hue and motion, the word is one tap away.
- **A glyph is always a button below the floor**, with or without `onSelect`: a tap that moves the view is navigation.
- **Enter on a glyph zooms and does not select; group heads and edge labels go `invisible` on the same flag; after a keyboard zoom, focus moves to the node's card `button`** (fcalell's orchestrator, 2026-10-06, taking the recommendations; the last follows from the rule that the overview never shows sub-floor text).
- **A dynamic `minZoom` on every input** (`minZoomFor`), so glyphs never overlap; it maps to d3-zoom's `scaleExtent`.
- **The canvas lifts a node itself on touch**, over `NodeView`'s own pointer handlers (`useLift`); a node is `data-no-pan` only while lifted, so a finger on it pans until then.
- **Lifting does not select**: it draws the selection's outline and calls only `onMove`.
- **The touch run is a second Vitest project tagged `touch`**, landing after the other session commits `apps/showcase/vitest.config.ts`.

Decided in this brief from the above and the evidence read:

- A node's glyph size on screen follows the zoom through a CSS variable the canvas sets outside
  React, so a pinch re-renders nothing; the node reads the flag, the stylesheet reads the zoom.
- The touch rules follow the density (`useTouch`), except that a mouse in the touch density drags at once (below).
- The glyph form is a second element over the card's own markup, which stays in the box
  `invisible`, so the node's measured size and everything laid out from it do not move on a
  crossing.
- A lift does not interrupt d3-zoom's gesture; it withholds `touchmove` and a second `touchstart`
  from it until the lifting finger ends, and lets `touchend` through so the gesture closes itself.

Decided after the build (2026-10-07): **the glyph's button carries `title={node.title}`.** The preview runs every axe rule on every story, and `button-name` fails an unnamed button; the user's delegate ruled for a `title`, which axe-core 4.13 accepts (`non-empty-title`) and which is no `aria-*`, no spoken form and no exclusion.

Decided after the critique (2026-10-07), the user's delegate ruling on the "rework" verdict:

- **The marks straddle the glyph box's corner** (`-top-inside`, `-bottom-inside` and `-right-inside`), in place of the inside offsets: the status dot, the spinner and the problem dot overlapped the icon. Re-measured: at 32 px (mouse) the icon is 14, the dots 6 and the gap to the icon 8; the spinner is 14 and its box meets the icon's at a corner point (gap 0, no overlap); at 44 px (touch) the icon is 18, the dots 8 with a gap of 12 and the spinner 18 with a gap of 2. The spinner clears the icon at 32 px, so it stays a mark and does not replace the icon while `running`.
- **The lift shows.** A lifted node draws a 2 px outline (`outline-2`, the selection's colour), the focus ring's width, in place of the selection's 1 px, which a node in hand did not read through, and `navigator.vibrate?.(10)` fires once at the lift as a progressive enhancement.
- **The opening view clears the chrome.** The first view takes the room Fit takes (`viewport.clearance()`, the `data-clear` read of the zoom stack and the act), through one helper for both, so a graph that fits the room opens centred in it and no node opens under the chrome. A graph larger than the room still opens at zoom 1 with its first node at the top centre of the room (02's rule: a larger graph keeps its text readable), so a lower node can stand under the act at the pane's foot, as the pane itself cuts the graph.
- **The routes follow the glyph below the floor.** Edges and frames drew to the hidden card's box, so a back edge ended 29 to 64 px from the glyph in empty space. Below the floor each node's routing box is its glyph's rect in flow units, centred on the card's centre with side `glyph / k` (rounded up to a `pair` of flow so routing runs only as that side steps, not on every wheel tick); ELK's positions and the cards' sizes stay, nothing moves, and the frames tighten by construction. No port is drawn there, so the router leaves no ring.
- **A gap at the zoom-out limit.** `minZoomFor(boxes, glyph, pair)` keeps `2 * pair` (screen px) between two glyphs, not only their size, so the edges between them still draw: the shortest route reads 11.9 px on screen at the desktop limit and 15.2 px at the touch limit.
- **The act's focus ring was the critic's scripted focus.** A real Tab key (a trusted CDP key press from the region) onto "Add a step" draws the ring (`:focus-visible`, 2 px solid, unclipped by the region): `globals.css` gives every control the ring, and a scripted `focus()` or a synthetic key (`userEvent.tab()`) does not match `:focus-visible`. No code change.
- **The act may cover the last glyph at the zoom-out limit.** The limit is a bound, not a chosen view; the glyph stays reachable by a pan and the Fit.

Decided by fcalell's orchestrator (2026-10-06), all taking the recommendation:

1. **`centreOn` takes an optional zoom**; a tap on a glyph calls `centreOn(box, ZOOM_TO_NODE)`.
2. **A second finger while a node is lifted drops the node** and does not pinch; the view holds still until the first finger lifts.
3. **A mouse in the touch density drags at once**: `NodeView` sets `data-no-pan` at `pointerdown` when `pointerType === "mouse"`. The input type, not the density, is the honest discriminator here.
4. **One canvas-wide below-floor flag**, passed as a prop.
5. **Names follow 04**: `drop(id, point)`, `at(id, point | null)`, `place`, `hit.ts` (`isGround`, `hit`), and `toPage` in `behaviour/mouse.ts`.

## Progress
Built to the brief and the code as 04 left it. The glyph's button carries `title={node.title}` (see "Decided after the build"), which settles the open choice the first build stopped on: axe's `button-name` passes on every glyph. The critique ran once and returned "rework"; its rulings are built (see "Decided after the critique" and "After the critique") and the critique box stays unticked for a second run by a session that played no part in the work.

### After the critique
- **Marks**: `node.tsx` places the marks with `-top-inside`, `-bottom-inside` and `-right-inside` on the glyph's own box. Measured by `MarksClearTheIcon` (both modes, both densities): desktop glyph 32, icon 14, dot 6 (gap to the icon 8), spinner 14 (gap 0, corner to corner); touch glyph 44, icon 18, dot 8 (gap 12), spinner 18 (gap 2). Nothing overlaps.
- **Lift**: `outline-2` in the selection's colour while held (`LongPress` asserts `2px`), and `navigator.vibrate?.(10)` once at the lift (`LongPress` stands a spy in for it and asserts one call with 10).
- **Opening view**: `openTransform` takes a `Clearance`; `useLayout` passes `viewport.clearance()`, the read `fit` uses (the viewport's one helper). `OpensClearOfTheChrome` (both modes) asserts no card meets the stack or the act, at 1280 (`Canvas overview`, the workflow in its full stage) and at 375 (`Canvas touch`, the same). 02's `OpensCentred` and `OpensAtTheFirstNode` read the room, not the pane, through `canvas-support`'s `room()`.
- **Routes below the floor**: `floor.ts` gains `routeSide(zoom, glyph, step)` (0 from zoom 1; else `glyph / zoom` rounded up to a multiple of `step`, the `pair`) and `glyphBoxes(boxes, side)`; `useLayout` reads the side through `useViewportValue` (it re-renders only as the side steps) and routes to `glyphBoxes` with no ports. `GroupFrame` carries `data-group` so a story reads it. `RoutesFollowTheGlyphs` (both modes, both densities, at just under 1 and at the limit) asserts every edge's ends lie within a `pair` of their glyph's rect (measured at most 3.7 px just under 1, 0.6 px at the limit), every route is at least `2 * pair - 1` long on screen, and a frame holds each glyph by the card padding and ends a padding under its lowest.
- **Routing time** (node, `routeEdges`, mean of 50 runs after warm-up): the workflow (7 nodes, 8 edges, 1 group) 0.15 ms by card and 0.10 ms by glyph; the journey (8 nodes) 0.08 ms both; a synthetic 200-node, 199-edge tree 9.6 ms by card and 8.9 ms by glyph. The glyph boxes do not make routing slower, and the step bounds how often it runs.
- **The limit's gap**: `minZoomFor(boxes, glyph, pair)` is `(glyph + 2 * pair) / nearest`; `canvas.test.ts` covers it (the L-infinity metric, the clamp, a zero gap, the workflow at both glyph sizes, and a gap of `2 * pair` at the limit), plus `routeSide`, `glyphBoxes`, glyph-routed ends and frames over both fixtures, and `openTransform` with a clearance. Measured at the limit: the shortest route is 11.9 px on screen at desktop (`pair` 6) and 15.2 px at touch (`pair` 8).
- **The act's ring**: `ActFocusRing` (`Canvas overview`, both modes) presses a real Tab (a trusted CDP key, `tabKey`) from the ground until the act is focused, then asserts `:focus-visible`, a solid 2 px outline and that the ring stays inside the region. It passes, so the cause was the critic's scripted focus; no code change.
- **Story helpers**: `groundPoint` now stands 32 px (a finger's touch adjustment) clear of every button, since a tap 4 px from the first node snapped to it once the opening view moved the node; `lowestZoom` adds the gap.

### Gate
- `pnpm check` exits 0 after the critique's rulings (42 of 42 turbo tasks, Biome 798 files, no fixes). react-ui `verify` 13/13, ui-core `verify` 34/34, native-ui `verify` 19/19; react-ui `check-types` clean and `test` 145 pass (`canvas.test.ts` 80).
- The five Canvas story files, run together with `--maxWorkers=1` under a 5 GB cgroup cap (77 s): 105 of 105 pass. `canvas.stories.tsx` 43, `canvas-overview.stories.tsx` 20, `canvas-touch.stories.tsx` (touch project) 40 and the generated `Canvas` 2, light and dark, axe included. The new stories (`OpensClearOfTheChrome`, `RoutesFollowTheGlyphs`, `MarksClearTheIcon` at both densities, `ActFocusRing`) and the changed ones (`LongPress`, `OpensCentred`, `OpensAtTheFirstNode`) pass. The full `stories:test` was not run for this round; the first build's run (below) had 13 known non-canvas failures.
- The first build's full run: `pnpm stories:test` (both projects, 1215 s under a 6 GB cgroup cap with `--maxWorkers=1`): 263 of 276 pass, 13 fail in 9 files, every one a known non-canvas failure: Sheet `Decision` and `Docked In Foot`, FileInput, TextArea, Input and Slider `Disabled`, Select `Selected`, Screen `Rest`, Menu `Rest`, and ListRow's four load timeouts.
- `FitClearsTheChrome` was seen to fail at desktop and touch with `clearance()` removed (a node under the act), then restored.

### Memory of the run
The canvas does not leak; the run's growth is the test setup. Peak resident memory is the run's, not the component's:
- One file at a time, in its own Vitest run, peak of the single Chrome renderer: `canvas-touch` 421 MB (34 stories, 52 s), `canvas-overview` 404 MB (12, 13 s), `canvas.stories.tsx` 514 MB (43, 28 s), generated `Canvas` 314 MB (2, 9 s). The same three desktop files in one page in turn (`--maxWorkers=1`) peak at 510 MB: nothing accumulates across files.
- 62 mounts and unmounts of the workflow `Canvas` (each crossing the floor), a forced GC after: JS heap 28 to 29 MB, DOM nodes 367 flat, event listeners 175 flat, live `ResizeObserver`s 0, net `document` and `window` listeners 0. ELK's worker is a module singleton, one per page, and stays alive after a canvas unmounts.
- The full run's one renderer climbs to 4.5 GB (cgroup peak 5.8 GB with one worker per project) while `stories/ListRow.stories.ts` runs, which takes 600 s of the 1215 s and ends in its four known timeouts: the renderer goes from 1.0 to 4.3 GB over that file and falls to 340 MB when it ends. `OptionList` and `Table` ride at 2.7 to 3.0 GB. The other 60 generated files finish in about 230 s with the renderer under 700 MB. At Vitest's default workers the same run reached 6.0 GB in 90 s (22 Chrome processes) and the cap killed it.
- Vitest's browser mode opens one page per parallel worker, runs the files queued to it one after another in a fresh iframe each (`isolate`, on by default), and caps the pages by `maxWorkers`; Chrome keeps a page's renderer heap between iframes.
- Recommendation, for the showcase session's `vitest.config.ts` (not edited here): fix ListRow's runaway frame (the known timeout) and set `maxWorkers` so a run fits in memory; the gate here ran with `--maxWorkers=1`.

### What is built
- ui-core: `CANVAS_NODE_GLYPH`, `canvasNodeGlyph`, the `Canvas` roster entry (`draws` gains `CANVAS_NODE_GLYPH` and `ICON.fit.body`, `holds` the glyph cell, `owns.sizes` the `icon` size `c35` named), `verify.ts`'s `MATRICES`, `DESIGN.md` regenerated.
- react-ui: `floor.ts`, `lift.ts`; `viewport.ts` (`centreOn(box, zoom?)`, `limit(lowest)`, `clearance()`), `view.ts` (`EXTENT` moved here, `ZOOM_TO_NODE`, `centredTransform`, `Clearance`, a fit that leaves room), `node.tsx` (lift, glyph, `below`, port hit at `UNZOOM` on touch), `index.tsx`, `group.tsx`, `label.tsx`, `edges.tsx`, `zoom.tsx`; overlays `top-inside`, `right-inside`, `bottom-inside`; `drawCanvas` draws the glyph cells (the workflow fitted, under the floor); the guide's "On touch" section and the knowledge base's `Canvas` bullet.
- Showcase: `touch.ts`, `canvas-support.ts`, `canvas-touch.stories.tsx` (17 scenarios, each in both modes), `canvas-overview.stories.tsx`, and the `touch` project in `vitest.config.ts`.

### The `Rest` story's axe
The glyph frames press Fit after the layout shows, so axe may run on the card form or the glyph form. Both pass: the card form is the workflow frame's own, and the glyph button is named by its `title`, so `button-name` passes at either moment. `GlyphFramesAtDesktop` and `GlyphFramesAtTouch` hold axe on the glyph form after Fit. Four runs of the generated `Canvas` stories in this build all passed.

### Deviations (the code won over the brief)
- **Fit leaves room for the canvas's own chrome** (the 04 critique's overlap). The zoom stack and the act foot mark themselves `data-clear="left"` and `"bottom"`; `viewport.fit` reads their rects off the DOM, adds a `pair`, and `fitTransform(bounds, pane, inset, clear)` fits and centres in the room that leaves. Arrange's fit goes through the same call. The critique's ruling gives the opening view the same read (`viewport.clearance()`). A story at each density asserts no card and no glyph meets either part after Fit and after Arrange.
- **The glyph is a sibling of the card, not a wrapper.** The card stays the layer's direct child (02's and 04's stories select `[data-layer] > button` and read its `style.left`), and the glyph stands in its own `pointer-events-none` box of the card's rect, which `NodeView` returns beside it in a fragment (a fragment that appears and disappears would remount the card). `NodeView`'s `box` carries the size once measured.
- **A mouse in the touch density** sets `data-no-pan` on the press and removes it on release, since `data-no-pan` otherwise stays on a node for the next finger; `useLift` keeps a pan's click from selecting even when the lift is off (a read-only canvas, a glyph).
- **`NodeEdit`** gains `touch` and `liftable`; `draggable` is `onMove && !touch && !below`. `ports` is off below the floor, as the brief says, though the invisible card would hide them anyway.
- **`viewport.limit(lowest)`** replaces the brief's `minZoom` option on `useViewport`: the boxes the minimum comes from exist only after the layout, which needs the viewport. `ZoomStack` takes `minZoom` and disables Zoom out at it. 02's `ZoomLimits` expected 0.1; it now expects the zoom `minZoomFor` gives (read off the laid-out nodes).
- **Scenario 8 at scale 0.5 cannot exist**: below zoom 1 the node is its glyph and draws no port. A port's hit is asserted 44 px at zoom 1, 1.5 and 2, a finger drag connects at 1 and 1.5 and a release on the ground reports `null`, and below the floor no `[data-port]` exists. The second acceptance box is left unticked for that reading.
- **Marks on a glyph**: the status dot top right, the problem's danger dot bottom right, as the card's trailing column stacks them; the critique's ruling moves both onto the box's corner (see "Decided after the critique").
- **Story infrastructure.** The Storybook addon's setup sets each story's viewport itself (a `viewport` global, else 1200 x 900) over the project's instance, so the touch stories name a 375 x 812 `phone` in their meta; the desktop run is therefore 1200 x 900, not 1280 x 800. `touch.ts` waits two frames per event (Chrome aligns moves to a frame) and none for a gesture that must finish inside a long press's time, since a slow frame under load lifted a node before a pan began once. A touch and a move also carry the hand's own time as their `timeStamp` (a frame per event plus what `wait` waits), because Chrome takes a round trip per event and a loaded machine takes longer than the press between a touch and its first move; the lift reads the stamps, and `PanThroughAStall` and `SecondFingerThroughAStall` stall the page past the press to prove it. A `touchEnd` carries no stamp, since Chrome does not recognise a tap whose end is stamped. A hold's reads use real time. `LIFT_MS`, `SLOP` and `Graph` reach the stories through `showcase/frames/canvas`, as the stage classes do; `canvas-support.ts` holds what both new files read. 02's `FramesHoldTheirGraph` leaves the glyph frames to `GlyphFramesAt*`. A `MutationObserver` collects its records in its callback (`takeRecords` is empty after any await).
- **The text floor** is `round(BODY_SIZE.desktop * TYPE_SCALE.caption.size)` = 11, read from the tokens (`scales.ts` is not an export of ui-core), passed as both the text and the floor, so the threshold is exactly zoom 1.
- **Not run.** The design critique. The second acceptance box stays unticked: its "connects at scale 0.5" clause has no scenario, since no port exists below the floor.
- **02's wheel, pinch and touch box is ticked** on `Behaviour/Canvas` `Wheel` and `DragDoesNotSelect`, and `Behaviour/Canvas touch` `Pan` and `Pinch` (light and dark).

## Critique
Ship, by a fresh critic at 1280 x 800 and 375 x 812 with touch, light and dark (scratchpad `critique/canvas/report.md`).
