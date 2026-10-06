---
id: 006-01
status: done
sessions: {}
---
# ui-core: the canvas's contract and its graph logic

## Goal
`Canvas` exists in ui-core before any platform draws it: its roster entry (web only), its
descriptor types, its cells, its words and the pure graph logic both the web canvas and its
consumers rely on. Nothing renders in this story, and no component directory is added.

## Approach

Read first: `.helm/research/node-canvas.md` ("Shape", "Anatomy"), the pattern page
`packages/ui-core/guide/patterns/node-canvas.md` (the range every cell stays inside) and
`.helm/agents/conventions.md`. One commit, scope `ui-core`; the native-ui verify edit below rides
in it so no check is red between commits.

### 1. The platform field (`packages/ui-core/src/roster.ts`)

The roster assumes every entry exists on both platforms, and the two plugins' verify suites differ:

- `plugins/native-ui/scripts/verify.ts` is strict. `b-roster` (line ~1248) asserts every roster
  entry has `src/ui/components/<dir>/index.tsx`; `b7` (~1211) demands 7 `@ts-expect-error` sites
  per roster entry in its closure fixture; `b-holds` (~1314) reads every entry.
- `plugins/react-ui/scripts/verify.ts` is lenient by design: its `b-roster` skips an entry with no
  directory yet and reports "N of total built". It needs no edit.

So a web-only entry needs one closed, typed fact in the roster, with no per-check exception list:

```ts
export const PLATFORMS = ["web", "native"] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface RosterEntry {
	// ...existing fields
	// The platforms that ship it; absent means both.
	platforms?: readonly Platform[];
}

export function rosterEntries(platform?: Platform): Array<[Layer, string, RosterEntry]>;
// With a platform: only the entries that ship on it (an entry with no `platforms` ships on both).
```

Edits that follow from it:

- `plugins/native-ui/scripts/verify.ts`: the three `rosterEntries()` calls (`b7`, `b-roster`,
  `b-holds`) become `rosterEntries("native")`. This file is not part of the showcase migration.
- `packages/ui-core/src/design-md.ts`: the Components table's Layer cell reads `content, web only`
  for an entry with `platforms: ["web"]`, so a phone author reading `DESIGN.md` does not reach for
  `Canvas`. Regenerate with `pnpm --filter @fcalell/ui-core design-md` (the committed file is
  asserted equal to the emitter's output by `test/design-md.test.ts`).
- `packages/ui-core/scripts/verify.ts` `c34`: every entry's `platforms`, when present, is
  non-empty and drawn from `PLATFORMS`.
- A plugin's verify passes its own platform; `rosterEntries()` with no argument is the whole roster.

### 2. Descriptor types (`packages/ui-core/src/descriptors.ts`)

Types only, no value imports, no generics (`c23` reads the file; any field named `icon` must be
typed exactly `IconName`). Reuse `StatusMark` and `Act`; do not add a state type.

```ts
export interface CanvasPoint {
	x: number;
	y: number;
}

export interface CanvasNode {
	id: string;
	icon: IconName;
	overline?: string;
	title: string;
	line?: string;
	// The figure in the trailing slot: `number` (a place in a sequence) wins over `count`.
	number?: number;
	count?: number;
	status?: StatusMark;
	// The problem's first words; the node draws it in place of `line`.
	problem?: string;
	off?: boolean;
	position?: CanvasPoint;
}

export interface CanvasEdge {
	id: string;
	from: string;
	to: string;
	label?: string;
	handoff?: boolean;
}

export interface CanvasGroup {
	id: string;
	head: string;
	// Node ids and group ids; a group may hold a group.
	holds: readonly string[];
}

// A run or scenario's taken path; everything else dims.
export interface CanvasPath {
	nodes: readonly string[];
	edges: readonly string[];
	at?: string;
}
```

`StatusMark` is `{ state: StatusState; label: string }` and `StatusState` is the repo's seven
states (`active`, `running`, `waiting`, `done`, `attention`, `failed`, `idle`). The design's "six
states" and its `State` are stale: `State` in `roster.ts` is the interaction-state list
(`rest`, `hover`, ...). `glyph` in the design is `icon` in the canon.

The roster's `props` for `Canvas` are the names below. The component's exported props type,
`CanvasProps` in `plugins/react-ui/src/ui/components/canvas/index.tsx` (story 02), is exactly:

```ts
interface CanvasProps extends Closed {
	label: string;
	nodes: readonly CanvasNode[];
	edges?: readonly CanvasEdge[];
	groups?: readonly CanvasGroup[];
	selected?: string;
	onSelect?: (id: string | null) => void; // null: Escape or a click on the ground
	path?: CanvasPath;
	onMove?: (id: string, position: CanvasPoint) => void;
	onConnect?: (from: string, to: string | null) => void; // null: released on the ground
	act?: Act;
}
```

No product noun: `handoff`, never a product's word for it. No `class`, `className`,
`classList` or `style` (the plugin's `Closed`).

### 3. The roster entry (`roster.ts`, `content` layer, after `Image`)

```ts
Canvas: {
	props: ["label", "nodes", "edges", "groups", "selected", "onSelect", "path", "onMove", "onConnect", "act"],
	platforms: ["web"],
	draws: [
		"CANVAS_GROUND", "CANVAS_NODE", "CANVAS_NODE_TEXT", "CANVAS_PORT", "CANVAS_PORT_HIT",
		"CANVAS_GROUP", "CANVAS_GROUP_HEAD", "CANVAS_ZOOM",
		// composed atoms, at the fit the canvas passes (list them as Table and ListRow do):
		"ICON.fit.meta", "ICON_BUTTON.fit.body", "COUNT", "COUNT_LABEL",
		"CHIP.family.neutral", "CHIP.trailing.none", "CHIP_LABEL.family.neutral",
		"STATUS", "STATUS_DOT", "STATUS_SPINNER", "STATUS_LABEL", "SPINNER", "SPINNER_TRACK", "SPINNER_ARC",
	],
	holds: [/* the eight CANVAS_* names above, and nothing else */],
	states: ["rest", "selected"],
	owns: { /* see below */ },
},
```

`owns` covers every token spelled by the cells in `draws` (run `c35`; it names each miss). Expected:
roles `body`, `meta`, `caption`; colors `canvas`, `group`, `surface`, `edge`, `edge-strong`,
`edge-error`, `selected-outline`, `ink-body`, `ink-meta`, `ink-error`, `ink-disabled`,
`fill-neutral`, `accent-ink`, `ok`, `warn`, `danger`, `chip-`; radii `card`, `control`, `full`,
`chip`; spacing `inside`, `pair`, `control-x`; sizes `node`, `port`, `target`, `row-2`, `control`,
`dot`, `chip`, `icon-meta`, `measure-short`, `spinner`. Story 02 widens `owns` for what its
overlays spell (hover and press washes, the ring, the edge strokes); `b-owns` fails until it does.
Stroke classes on an edge's SVG path are not in any cell (`stroke-*` is outside the matrices'
namespaces and a native probe would have to compile it); they are web overlays from story 02.

Bump the roster count 64 to 65 in `scripts/verify.ts` `c28`, in `packages/ui-core/README.md`
("The roster", and the `@fcalell/ui-core/roster` line) and in
`.helm/knowledge/architecture/ui-core.md` ("names 64 components").

### 4. Missing tokens (`packages/ui-core/src/tokens.ts`)

Two additions, the only ones. Both are outside what the contract can spell today and inside the
pattern page's range:

| Token | Namespace | Value | Why |
| --- | --- | --- | --- |
| `node` | `WIDTHS` (+ `WIDTH_VALUE`) | `240px` | the node's width, "about 240" in the design; no width token fits (`popover` and `sidebar` are other regions' facts) |
| `port` | `SIZES` (+ `TOUCH_SIZES`, `SIZE_PX.desktop`) | 8 desktop, 8 touch | the port's drawn size, 8 hollow in the range; `dot` is 6 on desktop, under it |

Update the pinned counts in `scripts/verify.ts` `c03` (`SIZES` 36 to 37, `WIDTHS` 13 to 14) and
the sizes and widths figures in the README and the knowledge entry where they are stated. Regenerate
`DESIGN.md`. Nothing else in the emit changes: widths and sizes are data-driven, and room
scaling follows from `roomTokens`.

### 5. Cells (`variant-tables.ts` matrices, `variants.ts` cva plus `FAMILIES` entries and constants)

Every cell is spelled out in full, tokens only, no overlay (no `flex`, alignment, state variant,
arbitrary value; `c21`), type role ahead of its leading and tracking (`c26`). Register each matrix
in `MATRICES` in `packages/ui-core/scripts/verify.ts` (`c19` is total in both directions).

**`CANVAS_NODE`** `state`: the node's box and its outline colour.

| `state` | cell |
| --- | --- |
| base | `w-node min-h-row-2 gap-pair px-control-x py-inside rounded-card border bg-group` |
| `rest` (default) | `border-edge` |
| `selected` | `border-selected-outline` |
| `problem` | `border-edge-error` |

`min-h-row-2` is 48 on desktop, 64 on touch, inside the range's 44 to 130. Off and path-dimmed draw
the `rest` box; their difference is the text's ink. The path's `at` node draws `selected`.
Selection's weight: see Open questions.

**`CANVAS_NODE_TEXT`** axes `part` and `tone` (type role on the part, ink on the tone, the rest
ink per part in compound rows):

| axis value | cell |
| --- | --- |
| `part.overline` | `text-caption leading-caption tracking-caption font-normal` (11) |
| `part.title` | `text-body leading-body font-medium` (13/500) |
| `part.line` | `text-meta leading-meta font-normal` (12) |
| `tone.rest` | empty |
| `tone.off` | `text-ink-meta` |
| `tone.problem` | `text-ink-error` |
| `tone.dimmed` | `text-ink-disabled` |
| compound `overline`+`rest`, `line`+`rest` | `text-ink-meta` |
| compound `title`+`rest` | `text-ink-body` |

`defaultVariants`: `part: line`, `tone: rest`. Intended use: off draws the title and overline in
`off` and the word `off` as the line in `off`; a problem draws the line in `problem`; a node off
the path draws every part in `dimmed`.

**Constants** (single cells in `variants.ts`, after the existing groups):

```ts
export const CANVAS_GROUND = "bg-canvas";
export const CANVAS_PORT = "size-port rounded-full border border-edge-strong bg-surface";
export const CANVAS_PORT_HIT = "size-target";
export const CANVAS_GROUP = "rounded-card border border-dashed border-edge-strong";
export const CANVAS_GROUP_HEAD =
	"gap-inside px-control-x py-inside rounded-t-card bg-group text-meta leading-meta font-normal text-ink-meta";
export const CANVAS_ZOOM = "rounded-control border border-edge bg-surface";
```

`CANVAS_GROUND` is `canvas`, one step off the page's `surface` (the range's "canvas one step off").
`CANVAS_PORT_HIT` is the target floor: 24 on a fine pointer, 44 on touch, by the density, so no
touch overlay. The dot grid (16 px pitch, 1 px dots in `edge`) is an arbitrary background and so a
web overlay from story 02, with its entry in `plugins/react-ui/scripts/overlays.ts`. Composed, not
celled: the edge label is a neutral `Chip`, the glyph an `Icon`, the trailing figure a `Count`, the
status a `Status`, the zoom buttons `IconButton` at fit `body` (32 desktop, 44 touch, inside 28 to
36). A handoff edge's glyph is `HANDOFF_GLYPH` (below).

Risk to run, not to assume: every `variants.ts` constant goes through native-ui's `a6` compile
probe, so `border-dashed`, `w-node` and `size-port` must emit under uniwind. If `a6` names
`border-dashed`, move the dash to a web overlay in 02 and keep `border border-edge-strong` in the
cell, and say so in the commit.

### 6. Words (`tokens.ts`: `WORD_KEYS`, `ENGLISH`)

Append to `WORD_KEYS` after `collapse`, with these English values (sentence case, none a slot or
counted word). `c03` word count 65 to 71; update the word lists in `packages/ui-core/README.md`
and `.helm/knowledge/architecture/ui-core.md`.

| key | English | drawn / read as |
| --- | --- | --- |
| `zoomIn` | `Zoom in` | zoom stack button name |
| `zoomOut` | `Zoom out` | zoom stack button name |
| `fit` | `Fit` | zoom stack button name |
| `arrange` | `Arrange` | zoom stack button name (only with `onMove`) |
| `off` | `Off` | the off node's line, drawn and spoken |
| `next` | `Next` | the lead of a node's spoken out-edges |

The `: ` and `; ` in a spoken name are punctuation, not words.

### 7. The logic (`packages/ui-core/src/canvas.ts`, new; `./canvas` in `package.json` `exports`)

Pure, framework-free, erasable-only TypeScript (tests run under node type stripping). Add
`"./canvas": { "types": "./dist/canvas.d.ts", "default": "./dist/canvas.js" }` and add `./canvas`
to the sorted subpath string in `scripts/verify.ts` `c02` (and `packages/ui-core/README.md`'s
subpath list). Input types are structural, so a consumer passes its own objects:

```ts
import type { CanvasEdge, CanvasNode, IconName, Words } from "./descriptors.ts";

// A handoff edge's glyph, drawn beside its label.
export const HANDOFF_GLYPH: IconName = "ArrowRightLeft";

export function pathOrder(
	nodes: readonly Pick<CanvasNode, "id">[],
	edges: readonly Pick<CanvasEdge, "from" | "to">[],
): string[];

export function backEdges(
	order: readonly string[],
	edges: readonly Pick<CanvasEdge, "id" | "from" | "to">[],
): string[];

export function spokenNames(
	nodes: readonly CanvasNode[],
	edges: readonly CanvasEdge[],
	words: Pick<Words, "off" | "next">,
): Map<string, string>;
```

**`pathOrder`** returns every node id once. Edges naming an id not in `nodes` are ignored. Node ids
are unique (the consumer's data; not policed). Two steps:

1. Find the back edges by a colouring walk: roots are the nodes with no in-edge, in array order,
   then each still-unvisited node in array order; walk out-edges in array order; an edge into a node
   still on the walk's stack (a self-loop included) is a back edge. This is the one place a cycle is
   cut, so every cycle terminates, and a cycle with no root (a ring) is cut at its first node in
   array order.
2. Over the remaining edges, walk depth first from each node with no remaining in-edge, in array
   order. Placing a node appends it, then takes its out-edges in array order; a target is placed
   when this was its last unplaced predecessor (each edge counts once, a parallel edge twice), else
   it waits and is placed from whichever predecessor finishes it. A node with no edges is a root.

This is the rule the design states ("depth-first from the roots, out-edges in array order, a node
with several predecessors placed after its last one"), made exact. Read as a plain pre-order walk
it is wrong for the worked example: it gives S1, A1, A2, R, T, B1, B2 (R 4, T 5), where the
journey numbers R 6 and T 7. The wait is what gives the numbers.

**`backEdges`** returns the ids of the edges whose target is at or before its source in `order`,
in edge-array order (an unknown id is never back). Step 1's back edges and this definition agree:
a back edge's target is an ancestor of its source over the other edges, so it precedes it in every
order step 2 produces. The design's "target precedes source in path order" is therefore the
definition to export, and step 1 is only how the order avoids a loop.

**`spokenNames`** returns each node's accessible name by id, in this order, each part omitted when
absent and the parts joined with `", "`:

1. the figure: `number ?? count`, as a string (the canvas never invents a number: a consumer that
   wants the journey's numbering derives it from `pathOrder`)
2. `overline`
3. `title`
4. `words.off` when `off`, else `line`
5. `status.label`
6. `problem`
7. the out-edges, when any whose target is a known node: `` `${words.next}: ${items.join("; ")}` ``
   where each item is `label, target title` (or the target title alone when the edge has no label),
   in edge-array order, back edges and handoff edges included.

A handoff reads like any edge: its meaning is its label.

## Tests

`packages/ui-core/test/canvas.test.ts` (node:test, `assert/strict`, imports `../src/canvas.ts`;
the file's neutral ids carry no product noun). Edges are written `from>to`; `eN` is the Nth edge
in the list, `backEdges(order, edges)` returns edge ids.

`pathOrder` and `backEdges`:

| case | nodes (array order) | edges | order | back |
| --- | --- | --- | --- | --- |
| journey, three legs and a rejoin | S1 A1 B1 B2 A2 R T | S1>A1 S1>B1 A1>A2 B1>B2 A2>R B2>R R>T | S1 A1 A2 B1 B2 R T (numbers 1 to 7: S1 1, A1 2, A2 3, B1 4, B2 5, R 6, T 7) | none |
| workflow: a loop and a gate's answer upstream | T P B C G D | e1 T>P, e2 P>B, e3 B>C, e4 C>B (loop's back edge), e5 C>G, e6 G>P (gate answer upstream), e7 G>D | T P B C G D | e4 e6 |
| two roots rejoining | R1 X R2 Y Z | R1>X R2>Y X>Z Y>Z | R1 X R2 Y Z (Z waits for Y) | none |
| root not first in the array | X R | R>X | R X | none |
| a disconnected node | A B Q | A>B | A B Q | none |
| a ring with no root | A B C | e1 A>B, e2 B>C, e3 C>A | A B C | e3 |
| a ring beside a root | R A B | e1 A>B, e2 B>A | R A B | e2 |
| a self-loop and an unknown id | A B | e1 A>A, e2 A>B, e3 B>ghost | A B | e1 |
| out-edge array order beats node order | S X Y | S>Y S>X | S Y X | none |
| rejoin after a deeper predecessor | S A B C J | S>A S>B A>J B>C C>J | S A B C J | none |
| a parallel edge | A B | A>B A>B | A B | none |
| empty graph | none | none | `[]` | `[]` |

Every order lists each node once (assert length and set size on every row).

`spokenNames` (English words; icons are any `IconName`, `"Check"`):

| node | edges | name |
| --- | --- | --- |
| `rv` number 3, overline Reviewer, title Review, line "Checks the diff", status `{ done, "Done" }` | `rv>sh` "approve", `rv>im` "request changes"; `sh` is titled Ship, `im` Implement | `3, Reviewer, Review, Checks the diff, Done, Next: approve, Ship; request changes, Implement` |
| `im`, title Implement | none | `Implement` |
| `sh`, title Ship | `sh>im` with no label | `Ship, Next: Implement` |
| title Lint, overline Check, line "Runs lint", `off` | none | `Check, Lint, Off` |
| title Build, line "Runs the build", problem "Missing token" | none | `Build, Runs the build, Missing token` |
| title "Fan out", `count` 4 | none | `4, Fan out` |
| title "Fan out", `number` 2, `count` 4 | none | `2, Fan out` |
| `sh` as above | `sh>ghost` | `Ship` |
| title Lint, overline Check, `off`, words `{ off: "Aus", next: "Weiter" }` | none | `Check, Lint, Aus` |
| `sh` as above, same words | `sh>im` "ok" | `Ship, Weiter: ok, Implement` |

A roster test in the same file (precedent: `test/split.test.ts`): `ROSTER.content.Canvas.props`
equals the list above; `platforms` is `["web"]`; `rosterEntries("native")` has no `Canvas` and
`rosterEntries("web")` and `rosterEntries()` have it; `HANDOFF_GLYPH` is a key of Lucide's icons.

## Checks of the showcase migration this story must satisfy

The showcase is being moved to Storybook by another session (`apps/showcase`,
`plugins/react-ui/src/ui/showcase`, `plugins/react-ui/scripts/verify.ts`); this story edits none of
it. Adding `Canvas` to the roster with no component directory yet is what trips these, so each
must treat an unbuilt entry the way `b-roster` already does, or this story lands after 02's first
story:

- `plugins/react-ui/test/showcase.test.ts`, "every roster component has frames", and whatever
  replaces it (generated stories reading `rosterEntries`): a roster entry with no component
  directory is skipped, not failed.
- `showcaseCells` and the families' cells: the `CANVAS_*` cells are drawn by no frame until 02.
- react-ui verify `b-roster` (reports "64 of 65 built"), `b7` (iterates directories, unaffected),
  `b-exports` (iterates frames, unaffected), `a6` and `b5` (sweep `src/ui`, unaffected).

If the migration lands first, rerun `pnpm check` after rebasing and fix any of these by the rule
above in their files, not here.

## Acceptance criteria
- [x] `pnpm check` passes.
- [x] `pnpm --filter @fcalell/ui-core test` passes, including `canvas.test.ts` with every row above and the `DESIGN.md` drift test (regenerated with `pnpm --filter @fcalell/ui-core design-md`).
- [x] `pnpm --filter @fcalell/ui-core verify` passes: `c02` (the `./canvas` subpath), `c03` (37 sizes, 14 widths, 71 words), `c19`, `c20`, `c21`, `c26` (the new matrices and constants), `c23` (descriptors types only), `c28` (65 components, `platforms` valid), `c31` (the six words), `c34`, `c35` (`Canvas`'s `owns`), `c36` (its holds).
- [x] `pnpm --filter @fcalell/plugin-native-ui verify` passes: `b-roster` and `b7` count 64 components (the web-only entry is skipped), `a6` resolves `w-node`, `size-port` and `border-dashed`.
- [x] `pnpm --filter @fcalell/plugin-react-ui verify` passes: `b-roster` reports 64 of 65 components built, no other check changes.
- [x] Path order on the journey example numbers S1 1, A1 2, A2 3, B1 4, B2 5, R 6, T 7, and on the workflow with a loop's back edge and a gate's upstream edge terminates, lists each node once and reports `e4` and `e6` as back edges.
- [x] No component directory, frame or story was added, and no file under `apps/showcase`, `plugins/react-ui/src/ui/showcase` or `plugins/react-ui/scripts/verify.ts` changed.

## Decided
The four questions the refinement raised take its recommendations (2026-10-06):
- **Selection's weight.** The contract has a 1 px hairline and a 2 px ring; the range measures 1.5.
  Recommended: `CANVAS_NODE.selected` recolours the 1 px border to `selected-outline`, and story 02
  adds the weight as a web overlay at the ring's 2 px (`outline-2 outline-selected-outline`, no
  layout shift), judged inside the range's 1 to 2 px spread; no 1.5 token is added.
- **The select handler's name.** The canon's `onChange` (a value's change) and `onOpen` (a row's
  open, in `ListRow` and `Table`) exist; the design and stories 02 to 05 say `onSelect`.
  Recommended: keep `onSelect`, because it must also say "nothing" (`null`, from Escape or the
  ground), which neither existing name carries, and add one line for it to the README canon's
  `onChange` item rather than a new canon name in this story.
- **`count` in the spoken name.** The design's spoken order omits it, but a drawn figure that a
  screen reader skips is a gap. Recommended: read the drawn figure (`number ?? count`) first, as
  above, and treat the design's list as incomplete.
- **Web-only cells in ui-core.** The `CANVAS_*` cells are platform-invariant tokens, so they sit
  in the shared matrices and enter native-ui's `a6` probe though no phone component draws them.
  Recommended: accept that (they compile or `a6` names them), rather than a second, web-only
  matrix module.

## Progress
Implemented, not committed. `pnpm --filter @fcalell/ui-core test` (178 pass), ui-core `verify` (34/34), native-ui `verify` (19/19, 64 components, `a6` resolves `w-node`, `size-port`, `border-dashed`), react-ui `verify` (13/13, "64 of 65 roster components built") and `pnpm check` all pass.
Deviations from the brief:
- `ColumnWidth` in `descriptors.ts` now excludes `node` as well as `selection`: the new width made react-ui's `Table` `WIDTH` record incomplete (react-ui `b7` failed in `tsc`).
- `design-md.ts` has per-size and per-width use maps, so "nothing else in the emit changes" held only after adding `port` to `SIZE_USE`; the Layer cell emits `<layer>, <platform> only` for any single-platform entry.
- The README's stated counts were already stale ("Seventeen subpaths" for 19, "Thirty-five sizes" for 36) and now read twenty and thirty-seven. The README canon's `onChange` item gained the `onSelect` line.
- The `platforms` validity check sits in `c34` (as section 1 says), not `c28`.
