---
id: 001-08
status: done
merged: de05a03
depends: [001-06]
gate:
  rounds: 2
  round-1: 8 flags (1 blocking, 3 serious, 4 minor), all fixed, none contested
  round-2: 8 flags (1 blocking, 3 serious, 4 minor), all fixed, none contested
---
# Scroll and shell primitives (follow-up)

## Goal

Ship the two web primitives the vocabulary veto (`1a3534c`) left unexpressible at call sites:
**ScrollArea**, the one scroll owner for a pane, and **Frame**, the viewport-capped app frame. Both
are `plugin-solid-ui` components; no plugin wiring, no slots, no native work. Native already has
its halves: `ScrollView` is a gate host and the chrome (`nav-bar`, `tab-bar`, `footbar`) ships.

Driver: the 001-06 veto resolution. Outside `docs/prd/ui-core.md` acceptance, like 001-07; helm's
migration is the first consumer.

## Facts (measured)

- The vocabulary after the veto keeps `overflow-hidden` alone and no fill or viewport heights
  (`packages/ui-core/src/gate.ts:47-59`). The web host rule allows a class only on a bare
  lowercase tag, so a call site cannot put geometry on a component either: a scroll pane's
  geometry can only live inside a shipped component or a consumer `ui/` file.
- helm's census: 19 lines, 21 banned tokens, 10 files, no `src/ui/` today. By role:
  - one shell: `src/app/pages/index.tsx:69`, `flex h-screen flex-col overflow-hidden` plus
    ground classes; the page is the shell, children are header + banner + one flexing body +
    portalled overlays.
  - five fill scrollers: `board-grid.tsx:45`, `chat-pane.tsx:185`, `activity-pane.tsx:187`,
    `card-drawer.tsx:252` (all `min-h-0 flex-1 overflow-y-auto`), and `board-column.tsx:33`
    (`flex flex-1 flex-col gap-2 overflow-y-auto p-2`, no `min-h-0`).
  - two of those are stick-to-bottom logs with hand-rolled autoscroll, byte-identical class
    strings, `flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1` (`chat-pane.tsx:185` via
    `transcriptRef`; `activity-pane.tsx:165-176` pins `scrollTop = scrollHeight` on every
    append). They are flex columns with a gap, so their replacement is a ScrollArea wrapping a
    Stack, and the `pr-1` scrollbar inset drops. `board-grid.tsx:45` also carries
    `overflow-x-hidden` alongside its `overflow-y-auto`.
  - three real horizontal scrollers: `board-grid.tsx:49` (`h-full` + `overflow-x-auto`),
    `epic-lane.tsx:40`, `diff-pane.tsx:123`. Two more carry `overflow-x-auto` that is inert
    under their own `whitespace-pre-wrap` (`proposal-widget.tsx:114`, `tool-call-line.tsx:40`),
    so they neither need nor exercise `axis="x"`.
  - four capped code/output blocks (`max-h-48`/`max-h-64`/`max-h-[45%]` + overflow, one of them
    the both-axis `diff-pane.tsx:173`) that also carry look classes
    (`font-mono text-xs text-muted-foreground`), so they become helm `ui/` primitives
    regardless of what this story ships.
  - geometry also escapes through props the gate cannot see (`contentClass`
    `card-drawer.tsx:252`, `heightClass` `board-column.tsx:15,25`, `epic-lane.tsx:51`);
    helm-side debt, out of scope here.
- Component conventions (`plugins/solid-ui`): one dir + `index.tsx` per component; the literal
  `class?: never` / `style?: never` / `classList?: never` closure is required by b7
  (`scripts/verify.ts:1244-1254`); `cn` from `#lib/cn`; variants from `@fcalell/ui-core/variants`
  called inside `cn(...)`; no barrel, the `./components/*` wildcard export picks up new dirs
  (`package.json:27-30`); b8 walks the components dir and requires the closure fixture to import
  every dir (`verify.ts:1324-1329`) with one legal use plus three `@ts-expect-error` uses;
  `docs/` holds one page per component, 39/39 today.
- The body owns the ground: `globals.css:33-38` sets canvas background and ink-1 color. helm's
  shell ground classes are its retired-token drift, not a Frame concern.
- Sidebar uses `svh` units for a page that may still scroll (`sidebar/index.tsx:142` `min-h-svh`,
  `:220,:230` `h-svh`). No component uses `dvh` today.
- sailward's layout law: every layout concern has one owner; scroll is "one engine", a descendant
  never mounts a second scroller (sailward repo,
  `~/projects/sailward/.knowledge/architecture/layout-ownership.md:3-8,36`). Its
  mobile `ScreenShell` owns body scroll behind a `scroll?: boolean`; its web app has no shell at
  all (static pages, body scrolls under `min-height:100vh`).
- `LOOK_ROOTS` (`verify.ts:1051-1072`) lacks `overflow` and `h`, so overflow and viewport-height
  classes skip the must-compile sweep today.
- `gate.ts:57-58` and the ui-core README name "a `ui/` primitive" as the scrollable pane's home;
  this story makes the shipped primitive the home, `ui/` the fallback.
- The scaffold templates carry no vetoed token; `templates/home.tsx` imports `Card` only.

## Decisions

1. **Two components, no ui-core change beyond prose.** Matrices carry look; these are pure
   geometry, so their classes live in the component the way `Stack` carries `flex flex-col`.
   Dirs `components/scroll-area` and `components/frame`, exports `ScrollArea` and `Frame`
   (naming: decision 5).
2. **ScrollArea API**: `children?: JSX.Element`, `axis?: "y" | "x" | "both"` (default `"y"`),
   `pinToBottom?: boolean`, plus the three `never` closure props. The class map is per axis,
   because the two shapes are different creatures:
   - `y` and `both` are **the fill pane of a flex box**: `flex-1 min-h-0 min-w-0` plus
     `overflow-y-auto` (`y`) or `overflow-auto` (`both`). The pane takes the height its flex
     parent gives (Frame, or a `Section` once decision 9 lands); every intermediate flex
     ancestor must be shrinkable (`min-h-0`), and a content-height parent gives the pane no box
     and therefore no scrolling. The doc page states both as the y composition rules. Sheet and
     Dialog content are their own scroll owners (`sheet/index.tsx:68`, `dialog/index.tsx:56`,
     `max-h-screen overflow-y-auto`, block not flex), so a fill pane does not compose inside
     them; the doc page says so, and a non-scrolling drawer layout stays consumer territory
     (Flags).
   - `x` is **an intrinsic-height strip**: `w-full min-w-0 overflow-x-auto`, no `flex-1` and no
     fill height, so a strip inside a column never becomes a second flexing region. A multi-item
     strip needs an inner `<div class="flex gap-<rung>">` whose items carry `shrink-0` (all
     vocabulary members, so the inner row is legal call-site geometry); items left shrinkable
     squish to min-content and the strip silently never scrolls. The doc page states this as the
     x composition rule.
   Sizing comes from the parent, never from a prop: no `maxHeight`, no size axis. A capped pane
   is a consumer `ui/` primitive.
3. **ScrollArea owns the scroll engine for its box.** Ownership is per box, not per page:
   distinct boxes may each scroll the same axis (a kanban page pane holding column panes, helm's
   shape today), and that is composition. What the doc page warns against is one box with two
   engines: wrapping a pane directly in another pane of the same axis with nothing bounding the
   inner one is one pane too many. sailward's one-owner law is the per-screen version of the
   same rule.
4. **pinToBottom** keeps the pane scrolled to its end as content grows and stays put once the
   reader has scrolled up. Mechanism, fully: a scroll listener maintains a `pinned` boolean,
   initialized `true` and true within `PIN_THRESHOLD = 40` px of the bottom (a named constant,
   pinned by b11), because a mutation callback fires after the change and cannot measure where
   the pane was; a `MutationObserver` (childList, subtree, characterData, attributes) re-pins on
   content growth while `pinned`; the pane pins once on mount so a pane opened onto history
   starts at its end (helm's effect does, `activity-pane.tsx:165-176`); both are torn down in
   `onCleanup`. No new dependencies, and no SSR concern: `createApp` renders client-only. Known
   limitation, stated on the doc page: growth with no observed mutation (late-loading media,
   async layout) does not re-pin. helm's unconditional `scrollTop = scrollHeight` loses the
   reader's place, so the threshold shape replaces it. The prop pins the y axis; the doc page
   says it is meaningless under `axis="x"`.
5. **The frame is named `Frame`, not `Shell`.** "Shell" already names the HTML document shell in
   this framework (`plugin-solid`'s `shell` slot and template, `consumer-project.md`'s "HTML
   shell"), and the canon's one-name-per-concept rule cuts both ways. Dir `components/frame`,
   export `Frame`. API: `children?: JSX.Element` plus the closure props, nothing else. Classes:
   `flex h-dvh min-h-0 flex-col overflow-hidden`. No ground classes: the body owns the ground
   and Frame repeating it would give the concern two owners. `dvh`, not `svh`: the frame is
   `overflow-hidden` so the page never scrolls, and `dvh` tracks the visible viewport as mobile
   browser chrome expands and collapses, keeping pinned bottom chrome reachable; sidebar's `svh`
   serves a scrollable page, a different concern. Composition contract on the doc page:
   intrinsic-height chrome plus exactly one flexing region (typically a ScrollArea); portalled
   overlays contribute no height; `SidebarProvider` (`min-h-svh`) is an alternative page root
   for the page-scroll world and does not nest inside Frame.
6. **Prose recast, values untouched.** Four spots carry the now-stale "a scrollable pane is a
   `ui/` primitive" claim and all four recast to name the shipped pane (`ScrollArea` on web, the
   `ScrollView` host on native) as the home, with consumer `ui/` the fallback: the gate.ts
   sizing comment (`:47-49`), the gate.ts overflow comment (`:57-58`), the ui-core README's
   overflow bullet, and its named-non-members line. The exported `GEOMETRY` and
   `NATIVE_GEOMETRY_HOSTS` values do not change (comments inside the literal may). Caution for
   the README edit: ui-core's c15 bans the case-sensitive substrings `sea` and `Sheet` in that
   README (`packages/ui-core/scripts/verify.ts:840-852`), so the new prose avoids both.
7. **Docs**: `docs/scroll-area.md` and `docs/frame.md` in the existing page format (41/41
   after). scroll-area's page carries the y rules (shrinkable ancestors, box-giving parent, the
   Sheet/Dialog exclusion), the x rule (inner `shrink-0` row), the ownership rule from decision
   3, and the pin limitation; frame's page carries the composition contract and the
   `SidebarProvider` line, and disambiguates the app frame from `plugin-solid`'s HTML shell.
8. **Harness**: `scripts/fixture/closure.tsx` grows both components (alphabetical imports, one
   legal use, three `@ts-expect-error` uses each; b7/b8 pick the dirs up automatically). A new
   check **b11** pins both components' geometry: the axis map exacts, the Frame classes, and
   `PIN_THRESHOLD`, read from source. `LOOK_ROOTS` gains `"overflow"` and `"h"` so the new
   classes ride the must-compile sweep (existing `overflow-*`/`h-svh` members resolve already).
9. **`Section.Root` gains `min-h-0`** (`section/index.tsx:29`, `flex flex-1 flex-col` today).
   Without it, a Section between Frame and a pane resolves `min-height: auto` to its content
   minimum, grows past the clipped frame, and the pane never scrolls; the consumer cannot patch
   it because every class prop is closed. One token, no harness churn: Section is not among
   b3's rebuilt-seven cell pins.

## Non-goals

- helm's migration (separate repo; it consumes these primitives afterwards).
- A capped or code-block pane (helm's capped scrollers carry product look; consumer `ui/`).
- Reshaping `Sheet.Content` or `Dialog` content: both remain their own scroll owners. A
  non-scrolling drawer layout (pinned tabs over a fill pane) is a possible follow-up story if a
  first-party consumer demands it (Flags).
- Any native-ui change.
- Scrollbar styling, scroll-linked animation, virtual scrolling.
- A size, max-height, or padding prop on either component.

## Acceptance criteria

- A1 (file): `components/scroll-area/index.tsx` matches decision 2 exactly (API, per-axis class
  map) and decision 4's pin mechanism, `PIN_THRESHOLD` included.
- A2 (file): `components/frame/index.tsx` matches decision 5 exactly, and `section/index.tsx`
  carries decision 9's `min-h-0`.
- A3 (file): `closure.tsx` imports and exercises both components with the three
  `@ts-expect-error` blocks each. b8 enforces only the per-dir import and the directive floor;
  the per-component pattern is fixture convention, so this criterion is checked by reading the
  fixture.
- A4 (command): `pnpm --filter @fcalell/plugin-solid-ui verify` green, including the new b11 and
  the grown `LOOK_ROOTS` sweep.
- A5 (command): root `pnpm check` green, and `pnpm --filter @fcalell/ui-core verify` green (A7
  edits two ui-core files whose README headings and gate exacts ui-core's own suite pins; root
  `pnpm check` never runs it).
- A6 (file): `docs/scroll-area.md` and `docs/frame.md` exist and carry the decision-7 content:
  the y rules, the x rule, the ownership rule, the pin limitation, the Frame composition
  contract, the `SidebarProvider` line, and the HTML-shell disambiguation.
- A7 (file): all four decision-6 spots recast; the exported `GEOMETRY` and
  `NATIVE_GEOMETRY_HOSTS` values unchanged, proven by ui-core verify's vocabulary check staying
  green (comment bytes inside the literals may change).
- A8 (command): in a scratch consumer, a page composing `Frame` with a header row, a `Section`
  wrapping a `ScrollArea`, and an `axis="x"` strip with an inner `shrink-0` row passes the gate
  and builds; the same page with a raw `overflow-y-auto` class on a div fails naming the token.
- A9 (live, close-out): the A8 page rendered in a browser shows the frame holding the viewport,
  the Section-wrapped pane scrolling, and pinToBottom following appended content until the
  reader scrolls up.

## Open questions

None. The h-dvh/svh split and the no-size-prop line are decided above; the board can veto at
merge.

## Flags for the board

- The frame ships as `Frame`, not the story title's `Shell`: "shell" already names
  `plugin-solid`'s HTML document shell, and one name per concept cuts both ways. Vetoable at
  merge; the rename is a directory and identifier sweep.
- Sheet and Dialog content keep owning their own scroll, so a drawer hosting a fill pane (helm's
  card-drawer shape) is not expressible with shipped parts; helm keeps its local layout when it
  migrates, and a `Sheet` content layout mode is the follow-up story if a first-party consumer
  needs pinned chrome inside a drawer.
- `Frame` ships with no header/footer slots. helm's shape (chrome + one flexing body) composes
  from children alone, so named regions would be speculative surface. If a real consumer needs
  pinned chrome the frame must coordinate with, that is a new story.
- `pinToBottom` covers the scroll-and-pin half of helm's two hand-rolled log effects (the panes
  themselves also need an inner Stack when they migrate); its threshold behavior is deliberately
  different from helm's unconditional pin, which loses the reader's place in history.

## Run record

One worktree run, 4 commits (`433df77` components + fixture, `5edd206` harness pin, `e6fa271`
doc pages, `20e8649` ui-core prose), no contradictions, no deviations. Spec review: all 9
decisions met, A1-A7 pass, nothing faked, 0 blocking, 0 serious, 1 minor (review-scope note on
the root lint leg). Standards review: per-commit gates green at every intermediate commit, 0
blocking, 0 serious, 1 minor (`pinToBottom` is mount-time only and nothing said so). Seat
commits: `f4c1204` adds the mount-time clause to the doc page; `de05a03` replaces decision 4's
scroll-listener mechanism after the live check caught it losing its race (below). Merge:
fast-forward `04efc1b -> f4c1204`, seat fix atop.

**Decision 4 amended at the seat.** The ratified mechanism kept `pinned` in a scroll listener,
and the A9 live check reproduced the race: scroll events dispatch with the rendering steps, so
an append reached the observer before the reader's scroll-up flipped the flag (deterministic in
a throttled background tab) and the pane snapped back to the bottom permanently. The shipped
mechanism derives pinned-ness inside the observer from the height as it was before the change
(`scrollTop + clientHeight >= lastScrollHeight - PIN_THRESHOLD`), needs no scroll listener, and
cannot race. `PIN_THRESHOLD = 40`, the mount pin, the observer config, and the onCleanup
teardown are unchanged; b11's pins were never on the listener.

## Close-out

- Suites on master tip: solid-ui 23/23 (b11 included), ui-core 28/28, native-ui 11/11; root
  `pnpm check` exit 0.
- Guard mutations, both caught by b11: `PIN_THRESHOLD` 40 -> 48 fails "the pin threshold moved
  off 40"; Frame `h-dvh` -> `h-screen` fails "Frame lost its class string".
- A8 in the scratch consumer (M6's, live `link:` graph): the pass page (Frame > header row +
  Section > ScrollArea pinToBottom > Stack + ScrollArea axis="x" > inner shrink-0 row) builds
  exit 0 through gate and vite; adding raw `overflow-y-auto` to the header div fails exit 1 with
  `src/app/pages/index.tsx:19  "overflow-y-auto" is not in the geometry vocabulary`; restored,
  exit 0.
- A9 live (Chrome on the dev server, measured via DOM): page not scrollable, Frame clientHeight
  == viewport, the x strip scrollWidth > clientWidth; with the pane genuinely overflowing (60+
  lines), distance-from-bottom stays <= 40 through appends; after `scrollTop = 0` the pane
  stays at 0 while content keeps growing; after returning to the bottom it re-pins. The same
  run against the pre-fix mechanism showed the snap-back (scrollTop 179 = bottom after the
  scroll-away), which is what forced `de05a03`.

## Carried forward

- helm's migration now has its primitives: the census maps to Frame (1 site), ScrollArea y
  (5 sites, two with pinToBottom + inner Stack), ScrollArea x (3 real strips), and helm `ui/`
  primitives for the four capped look-carrying blocks. helm-side, carried since M3/M5.
- The Sheet content layout mode (pinned chrome over a fill pane inside a drawer) is the named
  follow-up if a first-party consumer needs it; until then drawers own their scroll.
- The `Frame`-not-`Shell` name and the mount-time `pinToBottom` are vetoable at merge review;
  both are one-sweep changes.
- The biome-config worktree glob and the M5 biome-config item remain one combined fix.
