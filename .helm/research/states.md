# States: the design

Status: decided with the owner, 2026-10-14, and revised the same day after an adversarial review
(§15). Phases 1 to 5 of §14 are built (the read; the frames and the paint; the states beyond the first read; acts and saves; navigation reads and preload) and §15 records what changed in building them; phase 6 is Stead's; phase 7, long collections (§7), is built on the web and its phone half is owed to a device (§15); phase 9 fixed what the audit of 2026-10-15 found, and the owner's rulings revert phase 8 where they differ (§15); phase 10, motion, is scheduled (§14). The wait's numbers are tuned live. This page defines how every component
of the roster reads, waits, fails, goes missing, stays empty, refreshes, streams and acts, on both
platforms, and how state is held so that a change re-renders only what it changes. It supersedes
`motion.md` §4.1 (one waiting path) and the shape question of `skeleton-loading.md`; `motion.md`
keeps the motion (the loaders' paint, the settle, the decode). Once built it drains into
`.helm/knowledge/architecture/ui-core.md` and the guide (`packages/ui-core/guide/screen.md`,
`patterns/loading-and-pending.md`).

## 0. Where we start

A read of the code as it stands (every component, both platforms; the per-component tables are
not kept, the findings are):

- **Five sources of waiting.** A collection's own `query` (List, Table, BarChart, Comparison,
  Thread, through `listState`); `QueryBoundary` with a hand-written `loading` tree; Section, Group
  and Form-group `loading`, fanned out by `LoadingContext`; a part's own `loading` (ItemHeader,
  ActionBar, Stats, Stat, Diff, ProseDiff, FileRow, Canvas, Message, Image, QrCode); and none
  (ListRow, Stages, Avatar, Status, Chip, Text, and every bare control: Input, Select, Switch,
  Picker, Checkbox, SegmentedControl, FileInput, InputOtp, MessageInput, TextArea).
- **One clock with four callers.** Only QueryBoundary, Section, Group and a Form group run
  `useWait` (delay, minimum, veil, settle). Everything else draws its waiting form on the first
  frame, so a bare `List query` flashes on a fast read. Apps work around it by stating a read
  twice (`Section loading={q.isPending}` around `List query={q}`, eight times in the showcase),
  and the two clocks can flip in different frames, the second snapping.
- **Hand-built waiting forms.** About twelve in the collections alone (~850 lines on the web:
  RowWait 222, OptionWait 129, DefinitionWait ~120, CanvasWait 95, Table's SkeletonRow ~70, …),
  each repeating its loaded layout's classes and mirrored on the phone. Their row counts disagree
  (3, 4, 5, 8); OptionList draws four rows even for a static option set.
- **States not modelled.** `isFetching`, `isPlaceholderData` and `hasNextPage` are never read:
  "busy" means the first load, a failed refetch replaces rows already shown with the failed form,
  there is no stale, no more-pages and no stream-failed form. List with no `empty` draws a blank
  box, Comparison nothing, BarChart an empty plot.
- **Acts are a second system.** Button `loading`, ActionBar `running`, Sheet `busy`, PendingBar,
  ConfirmSheet and toast each re-implement "pending, then ready", with no delay. A control's save
  (Switch, Select, Slider, `onCommit`) has no saving, saved or failed state; act failure has three
  homes the app feeds; ConfirmSheet swallows a rejection. `loading` means four things (an act
  running, a code being checked, a read on its way, a count of acts).
- **The app carries the rest.** Stead: ~50 `loading?: boolean` props, a `ready` in every screen
  body, ~18 `length === 0 && !loading ? { sentence } : undefined`, ~28 `loading: m.isPending`,
  its own `useAct`/`actFailed` (~45 sites), hand-built query objects for live channels and the
  Thread, list-cache seeding (`listed`/`known`), and two source checks (no Section gated on its
  data's length, no QueryBoundary waiting on a hand-built tree) plus the shift review that stack
  documents but does not ship. Pane titles, heads and sheets read `query.data` outside any
  boundary.
- **The phone.** Each settle runs its own `LayoutAnimation`: no frame batching, no guard for one
  already running.
- **Nothing virtualizes.** List, Table, Comparison and Thread draw every row on the web; the
  phone's Thread turns a ScrollView upside down (as `VirtualizedList` inverts) without recycling.

The spike (2026-10-14, web, the showcase's deploys list and record; not kept) drew the loaded
body from TanStack placeholder data with each text slot painted as a bar. The record's Section
headings stood at the same y waiting and loaded (Summary 283, Domains 503, Steps 627 at 1280 px)
where master's record waits as a lone ItemHeader skeleton. It also showed what this design
removes: a `display: contents` wrapper broke the Pane's child sizing (a width shift); invented
data leaked wherever app code read it (a Pane title of `xxxx`, a Banner and PendingBar fired by
an invented `active` state, a count of the invented array); constants inside the boundary
painted as waiting; generated ids collided as keys.

## 1. Principles

1. **State lives in the deepest leaf that needs it.** A value is subscribed by the component that
   draws it, a field's pending by the field, an act's pending by the host that runs it (a Button,
   an ActionBar, a Sheet, a field), the deepest component that has to know.
2. **Handles go down; the one value that goes down is an item to its row.** Props and context
   carry stable handles to reads; data and status reach a component only through its own
   subscription, except that a collection hands each row its item (structurally shared, so an
   unchanged item is the same reference). A data change never renders a parent above the leaf
   that draws it.
3. **Contexts carry identity, never state** (handles, words, theme, the Pane's scroller). A
   context never changes a child's form. `HoldsContext` (the keys of the reads held above) is
   identity that places flags only: it says which frame draws a read's busy, stale and paused
   lines, never what a frame's body looks like. Structure rule 11 classes every context and holds
   it.
4. **Every subscription is a slice:** one `useQueries` per leaf over the reads it draws, with
   tracked properties and structural sharing.
5. **Data flows down; nothing reports up.**
6. **The app's own code never receives a placeholder.** `useRead` returns real data only. A
   selector or a `combine` function the app writes does run over the placeholder, so it is pure
   and total; one that throws paints its slot at the kind's default size (and logs in dev).
7. **The app never branches on a state the framework can draw.**

## 2. The read

A read is a TanStack query, or anything with the same interface (a live channel, a streamed
reply), written to the cache. plugin-api's query utils build its handle:

```ts
const deploy = orpc.deploys.get.read({ id }); // typed: the query options and how not found reads
deploy.at((d) => d.commit);                   // a selection: the handle + a selector, typed
combine([deploy, files], (d, f) => …);        // a selection over several selections
```

A read is itself a selection (its whole value), so a collection takes a read or a selection
alike. The handle (`Read`, `Selection`) lives in plugin-api; a read's not found is `read.missing`,
plugin-api's `isNotFound` unless the read says otherwise. ui-core knows only an observer's result
(`ReadResult`), so it stays free of TanStack, and derives one state from it (`readState`),
framework-free and tested without rendering: one phase and the flags beside it.

| Phase | When |
| --- | --- |
| idle | not asked for yet (`enabled: false`, `skipToken`, a dependent read's parameter missing) |
| waiting | asked for, no data yet |
| ready | real data |
| failed | no data and the read failed |
| missing | failed with not found (the handle knows its error type; no duck typing) |

| Flag | When |
| --- | --- |
| busy | ready and refetching, or failed and retrying |
| stale | ready and the last refetch failed |
| more | an infinite read with a next page (`hasNextPage`) |
| streaming | a streamed read still writing |
| paused | the read waits for a connection (`networkMode` paused it) |

`selection.or(fallback)` is real data when its reads have it and `fallback` in every other state.
It never paints, holds or fails a frame, and a read used only inside `or` parts is quiet:
subscribed, never held, painted or registered for the no-holder check. It is for enrichments alone
(a name, a badge, a lane order, a link); a read whose rows, options, facts or text a component
draws is never `or`.

What a leaf draws for a selection it cannot answer also says why (`Drawn.phase`): *waiting* (asked
for, no answer), *still* (not asked for, or paused with no data, so nothing is coming), or
*failed* and *missing* (the read ended). Waiting paints; still paints with no sentence; only failed
and missing end, and an act drawn from a read is blocked on them (§3).

**Empty is the frame's, not the read's**: a frame's selection that is an empty array, `null` or
`undefined` on real data, decided by the frame's own read alone and never by a count the app
checks. A procedure answering `null` ("no current X") is ready, and its frame
draws empty.

A component's data prop takes a **selection** (it comes from a read: the leaf subscribes to it,
paints it while waiting, re-renders when it changes) or a **plain value** (a constant: drawn as
given, never painted). The type tells data from constants. A prop that chooses a form (a tone, a
variant, a metered meter) takes a selection where its component draws data, and paints from the
placeholder's value while waiting.

## 3. Frames own reads

A read's states are drawn by the frame that holds it: `Pane read`, `Section read`, `Sheet read`,
`Form read`, or a collection or an option control given a selection, each a frame of its own read.
QueryBoundary is deleted: each of its jobs has a better home.

```tsx
const deploy = orpc.deploys.get.read({ id });
const steps = deploy.at((d) => d.steps);

<Pane read={deploy} title={deploy.at((d) => d.message)} back="/deploys">
  <ItemHeader facts={[deploy.at((d) => d.author), deploy.at((d) => d.age)]} />
  <Section title="Summary">
    <Group items={[
      { key: "commit", row: <DefinitionRow label="Commit" value={deploy.at((d) => d.commit)} copyable /> },
      { key: "region", row: <DefinitionRow label="Region" value="Frankfurt, eu-central-1" /> },
    ]} />
  </Section>
  <Section title="Steps" read={steps}>
    <List items={steps} row={…} />
  </Section>
</Pane>
```

- **The type says who draws what.** The frame given the read itself (the root) draws its phase
  and flags: failed, missing, busy, stale, paused. A frame given an array selection draws its
  count and its empty. A collection takes `items` explicitly, always; a standalone
  `List items={deploys}` holds a root, so it is its own frame. No claims and no items delivered
  through context: a context never changes what a child draws (rule 11).
- **A frame holds one read.** It holds the one read of its selection that is neither quiet (`or`)
  nor held by an enclosing frame; `HoldsContext` carries the keys held above, memoized by their
  joined keys, and decides only which frame draws a read's busy mark, stale and paused line and
  `aria-busy`, which reads the dev registry counts, and what Retry refetches. A second such read
  in one frame is a dev `console.error` naming both keys (production holds the first). A failure
  with no holder is a dev error, caught at run time where selections cross files as props.
- **A frame's form comes from its own selection.** Waiting, still, failed, missing, empty and
  ready come from the frame's non-quiet reads and nothing above it, so a context never changes a
  child's form. Sibling frames that draw one read each hold it and each fail in place; the repeated
  line is accepted, and a read is never lifted into a frame around its siblings. A leaf that needs
  two reads at once takes `combine`; a region that draws two reads is two frames. A read that only
  names or orders reaches its leaf through `or`, with a quiet fallback, and never fails a frame.
- **Collections and option controls show their own read's state.** List (and Group's list), Table,
  Thread, BarChart, Comparison, Canvas (its `nodes`) and Diff (its `hunks`) are frames of their
  items, and Picker, Select and OptionList of their options: each draws its failed, missing and
  empty forms in its own box with the generic sentences, and the stale and paused line above its
  rows. A control draws its options' failure and Retry in a line under itself, with no busy or
  stale flag; while the options wait its trigger paints, and it paints still, inert and with no
  sentence while they are idle or paused. A Thread's failed and missing forms stand in the log's
  place and its empty form is an empty log with no sentence; its foot and reply stand through
  each.
- **The frame draws in its own fit.** A Pane's failure fills the page with Back to its route; a
  Section's fills its body under its heading; a Sheet's its body over its acts. Retry refetches
  the read the frame holds and keeps the failed form with Retry pending (`motion.md` §4.3). A failed
  Pane keeps its foot and its docked sheet, which answer to their own reads.
- **A Pane with a read** draws its title from a selection (painted while waiting), and its head
  is a leaf (`PaneHead`, as a Section's `SectionHead`): the title, acts, more and description
  subscribe themselves, so one of those reads changing renders the head and nothing under the
  body.
- **An act paints by its own datum.** A plain act is a constant: drawn as given, live in every
  form of every frame. An act given as a selection (a Pane's actions and more, a Section's act, more
  and description, a Banner's act, a row's act and more) paints while its own read waits, stands
  still with no sentence while the read is idle or paused with no data, and stands blocked with the
  failed sentence once the read has failed (`words.missing` when it is missing), never a false
  yes. A Section's count shows only when its form is ready or empty.
- **Every frame of a read is named for the settle** (today only Section and Group roots are).

## 4. The waiting form is the loaded form, painted

There is no waiting tree. While its read waits, each leaf draws its loaded form from the
placeholder and paints its selected slots; constants draw as given. Each component defines only
how its loaded form paints:

| Slot | Paint |
| --- | --- |
| text (title, name, sentence, label from data) | the string's own line boxes as bars |
| figure, id | per the loader (`motion.md` §4.2): bars, or the scramble |
| mark (avatar, status dot, chip, icon from data) | the skeleton fill |
| block (meter track, chart plot, code, prose, diff, image, canvas node) | at its own size: a meter's track, a plot's height, code by its lines, an image box at its ratio |
| control (a field whose value is a selection) | its own box, value painted, inert |

No wrapper element is added: a `display: contents` wrapper breaks a parent's child rules. On the
phone a text bar is a nested `Text` with transparent ink over a background colour, which paints
each line fragment natively (no `onTextLayout`; to check on a device).

**The placeholder is one value, P**, the same for every read (a router procedure, a live
channel, a stream, the org's rules), so nothing is generated and a consumer writes nothing. P is a
frozen, callable Proxy that answers any property with itself:

- `P.a.b === P`, so an optional is present and a recursive type never ends; it is deterministic;
- comparisons are false and lookups miss (`d.state === "failed"`, `LABELS[d.state]`), so a
  selector takes its own default branch;
- as a number it is 0 (`new Date(P)` is the epoch, a figure formats as `0`); as a string it is one
  private-use character, so a string built from it (`` `${d.a} · ${d.b}` ``, `` `/d/${d.id}` ``)
  is recognised as a placeholder (`isPlaceholder`);
- iterating it yields nothing, `.map` and `.filter` return P, and `Object.entries(P)` is `[]`.

The paint's sizes are the leaf's, not the data's: a text slot's length comes from its role (a
title, a name, a sentence), and a collection draws its default count of painted rows, keyed
`waiting-0`, … each item P. P is given to each leaf's observer as `placeholderData`, never written
into the cache. There is no cache seed and no previous data: a record whose title should be there
before its read lands gets it from preload (§11), not from an invented write. A lookup that misses
can drop an optional slot while waiting; the shift check catches it and `LABELS[d.state] ?? d.state`
fixes it.

**Waiting forms are inert.** On the web the painted region is `inert`; on the phone it is not
pressable and hidden from assistive technology (`importantForAccessibility="no-hide-descendants"`).
No `href` is built from placeholder data, and an accessible name (a Pane title that a log or a
Columns region is labelled by) comes from real data only.

## 5. On TanStack's own observers

The read needs no store of stack's own: each part is a TanStack builtin.

- **A leaf** is one `useSelections([...])` over the data props it draws: one `useQueries` over
  their distinct reads (deduplicated by query key), each with P as `placeholderData`, whose
  `combine` runs each prop's selector and answers, per prop, `{ painted, value }`. Constants pass
  through unpainted, so the hook count is fixed whatever mix of selections and constants a leaf
  is given. `usePainted(values)` is the same `useQueries` whose `combine` answers one boolean, for a
  component that only needs to know whether any of its values paints (the action bar, a Pane's
  `aria-labelledby`). A selector that throws over the placeholder answers P (logged in dev); a throw over
  real data is the app's bug and rethrows. Each observer renders only for the result properties
  its combine reads, and `useQueries` notifies only when the combined answer changes.
- **`useRead(selection)`** is the same `useQueries` without the placeholder: real data, or
  `undefined`.
- **`combine([a, b], fn)`** is a selection over selections, resolved by the same hook.
- **The phase and flags** are `readState(result, read.missing)` in ui-core, over the observer's
  result (`status`, `fetchStatus`, `isEnabled`, `isPlaceholderData`, `isRefetchError`,
  `hasNextPage`), tested without rendering.
- **One flip.** One cache write notifies every observer of the read in one batch, so every leaf,
  frame and `useRead` of the read changes in one commit, on both platforms.
- **The settle** sits where every batch is scheduled. `settleReads` (plugin-api) listens to the
  query cache and marks a batch that changes a read's form: its first data, its first failure with
  no data, or a reset to waiting, while the read has observers. TanStack calls the scheduler
  (`notifyManager.setScheduler`) synchronously right after that listener, so the mark binds to
  its own batch; a marked batch, and any batch scheduled while it is held, flushes through the
  platform's `settle`, every other batch as TanStack schedules it. `QueryProvider` takes the
  `settle`, and each UI plugin passes its own through the providers it already contributes, so a
  consumer writes nothing. `createSettle` moves to ui-core and serves both platforms: the web
  flushes inside a view transition (`startViewTransition(() => flushSync(flush))`), the phone
  after `LayoutAnimation.configureNext`, gaining the web's frame batching and running guard. The
  guards stay: reduced motion, a hidden page, a move already running, an editable with focus. It
  replaces `useWait`: every other waiting thing is an act (§9).
- **The delay is no clock.** A painted slot fades in `WAIT_DELAY` after it mounts (a CSS
  `animation-delay` on the web, Reanimated's `withDelay` on the phone), so a read that lands
  inside the delay never shows its paint. Constants draw at once.
- **Live timings, and the minimum on a read's own first write.** `timings` (`waitDelay`,
  `actDelay`, `waitMin`) is a bench knob read at use, as the web's `--wait-delay` and `--act-delay`
  are, so the showcase's sliders change them on the next mount. The waiting form has the loaded
  form's geometry, so a form shown briefly changes paint, not layout, and the settle's crossfade
  carries it, and `waitMin` is 0. If a number is set above it, a first load's cache write is held
  until the paint has stood for it (`holdFor(elapsed)`, `QueryProvider hold`): the query's own
  `queryFn` in `read()` and the first snapshot in `channelRead` wait, so the read still flips at
  once, from the fetch's start; a refetch or a later page is never held, and a query built without
  `read()` is not held.
- **The root holder count** (§3) comes from the query cache's observer-added and -removed events,
  in dev only.
- **idle** and **paused** while waiting are one form, `still`: the loaded tree painted and inert,
  not busy; a paused holder also shows one line ("Waiting for a connection").
- `aria-busy` is the holding frame's. There is no live region: nothing is built for a screen reader
  alone (`philosophy.md`).
- **A failed read stays failed while it refetches.** Retry keeps the failed form with Retry
  pending; an automatic refetch (focus, reconnect) is a busy mark, never a flip back to waiting.
- `WAIT_DELAY` starts at 400 ms (from 200) and is tuned live.

## 6. Subscriptions and renders

| Who | Subscribes to | Renders when |
| --- | --- | --- |
| a frame | its own observer: the phase's properties (and its selection's length, if it holds one) | either changes |
| the root holder's busy mark | the busy flag | a refetch starts or ends |
| a head (`PaneHead`, `SectionHead`) | its title, acts, more and description | one of them changes |
| a leaf with a selection | its own observer's slice | its slice changes |
| a row | nothing: its item comes from its collection | its item's reference changes |
| the app (`useRead(selection)`) | its slice, real data only | its slice changes once real |
| an act's host or a control | its own promise (`useRun`, `useDraft`) | its own pending or failure |

- **Collections.** A List subscribes to its items. Structural sharing keeps every unchanged
  item's reference, and each row kind (ListRow, Meter, DefinitionRow, FileRow) is one `memo` row
  component that takes its `item`, `index`, the descriptor and `painted`, runs its slots inside
  itself and calls `onOpen(item)` itself, so a refetch that changes one item renders exactly that
  row; `Window` builds rows by index (§7). The row's act and more may be selections its own leaf
  subscribes to. The React Compiler does the memoizing where it reaches: plugin-react's generated
  Vite config compiles `@fcalell/*` under `node_modules` in a consumer's build (`e23d17fc`). It does
  not reach the web dev server, whose optimizer pre-bundles the packages, nor the phone, whose Expo
  preset never compiles `node_modules`; so rows keep their explicit `memo`, and the render-count
  stories (a first answer, a pressed act, a saved control) run in the showcase.
- **Streams and live channels** are queries written with `setQueryData` (or `streamedQuery`). The
  turn being written has its own key; the thread's key changes only when a turn completes, so a
  token renders the streaming turn and nothing scans the thread. A live channel's connection is a
  read of its own (connected, reconnecting, lost), whose root holder draws the line. Stead's
  `Live<T>` and the hand-built Thread queries go away.

| Event | Renders |
| --- | --- |
| first answer | each leaf whose slice differs from the placeholder and each frame's phase, in one settle frame |
| refetch, same data | the busy mark, on and off |
| refetch, one field changed | the leaves selecting it; the rows whose item changed |
| refetch fails with data | the root holder (its stale line); leaves keep their data |
| stream token | the streaming turn |
| act pressed | that act's host |
| act rejected | its host's line, or a failed toast; nothing else |
| act pressed offline | refused at its press, nothing sent: its host's line ("No connection.") |
| control saved | that control; then the leaves selecting what the write invalidates (the field hosts it when the control stands in one) |
| control's save rejected | that control (its value back) and its field's line, or a failed toast for a bare control |

## 7. Long collections

Built on the web (phase 7, extended in phase 9); the phone's half is owed to a device, the owner's explicit waiver of "web and native in one commit" and "long lists virtualized" for the phone's windowing alone (§15, "Changed while building phase 7" and "phase 9").

A collection windows from `VIRTUAL_FROM` loaded rows under a scroller, with no prop: it mounts only
the rows near the view and `OVERSCAN` (8) past each edge, spacers holding the room of the rest.

- **Web (built):** TanStack Virtual (`@tanstack/react-virtual`) over a `Scroller` context of
  identity (the Pane body, Sheet body, docked Sheet body, Gate page, Thread log; the nearest wins),
  in react-ui's `lib/window`; the count and the slot arithmetic are ui-core's `window`. `Window`
  takes `count`, `keyOf` and `row(index)` and builds only the mounted indices, so the rows off screen
  are never built or rendered. List (flat), Group's list, Table at both widths and Thread window,
  and so do trees (the tab stop's row kept mounted, keys moving by index over the visible rows),
  an OptionList's groups, a Picker's sheet and its desktop search list (Base UI's virtualized
  combobox from `VIRTUAL_FROM` options), Comparison (its facts behind a kept head row) and
  BarChart (past `VIRTUAL_FROM` bars it keeps a bar's width and scrolls sideways under its axis,
  windowing along x). A standalone Select does not window: Base UI's Select has no virtualization.
  Painted forms are `PAINT_ROWS` (4) and never window, so "waiting rows fill the viewport" is cut. The focused row and a Table's cursor
  row stay mounted; the grid carries `aria-rowcount` and `aria-rowindex`. Find in page and print
  reach mounted rows only: the accepted cost. The virtualizer is the one scroll anchor; Thread
  opens at the end and follows it as before. The settle and moves name only mounted rows (rows
  carry no names, so nothing changed).
- **The count:** measured on Chromium (Playwright, a production build, 1280 px, a 4x CPU throttle
  through CDP `Emulation.setCPUThrottlingRate`): the time from `flushSync` of the mount through
  forced layout of N unwindowed ListRows, the median of 18 warm runs.

  | rows | 1x | 4x |
  | --- | --- | --- |
  | 1 | 1.9 ms | 6.8 ms |
  | 10 | 4.9 ms | 14.5 ms |
  | 50 | 15.1 ms | 46.6 ms |
  | 100 | 18.7 ms | 82.6 ms |
  | 300 | 78.8 ms | 245.5 ms |
  | 1000 | 161.9 ms | 859.7 ms |

  The dev build (Storybook dev) is 4 to 5 times slower still (4x: 100 rows 391 ms, 300 rows
  1145 ms, 1000 rows 3277 ms). 100 rows exceed 16 ms, so the rule that set the measurement (lower the count to
  the largest that fits) would give about 10. `VIRTUAL_FROM` stays 100 until the owner decides
  that rule: at 10 rows a window draws less than a screen and every list over ten rows loses find
  in page. The 16 ms frame is also a hard bar for a one-time mount, which a window pays on top of.
- **Phone (owed):** a recycling list cannot sit inside the Pane's ScrollView, and the Pane cannot
  know that a List deep in its children is long (rules 9, 11, 12). The spike decides between
  windowing on the Pane's own ScrollView through a scroller-identity context (mounts and unmounts,
  does not recycle) and a recycling list as the Pane's scroller, given as an explicit prop; for
  Thread, FlashList v2 against its inverted ScrollView. Until then the phone draws every row.
- **Cut:** Thread's history paging and the anchor on a prepend (no thread pages), `aria-setsize`
  on lists (they carry no list role) and on an OptionList's checkboxes (its radios carry their place
  in the group).

Open on the phone: the libraries (FlashList v2, LegendList as the fallback; none is installed),
the Pane design and the count, settled by a spike on a mid-range Android: the Pane first (1000
rows under a Section header, both designs), then the Thread.

## 8. States beyond the first read

Built (phase 3).

- **busy**: the root holder's quiet mark after the delay: the `Spinner` in meta ink after the
  frame's heading (a frame with no heading shows none), `aria-busy` for the first wait alone. The
  scramble glyph waits for `theme.loading`. The data stays.
- **stale** and **paused**: one line under the heading row, "Couldn't refresh." with Retry or
  "Waiting for a connection." with no act.
- **still**: idle, or paused while waiting; the loaded form painted, inert, no mark.
- **more**: stack's paginated envelope only (`.pages(input)`, a flat value). The collection draws
  "Show more", pressed by the viewer; the next page waits as painted rows after the loaded ones
  and does not run the frame's clock; a failed page is the collection's line. The frame draws no
  count while more remains, and an empty first page with more is not empty: the next page is
  fetched at once.
- **streaming**: the turn being written is a read the app declares (`Thread reply`), drawn by its
  own part; a stream that fails is data on its turn (the partial message, "The reply stopped." and
  Retry), never the thread's state. A WebSocket channel is one such read
  (`@fcalell/plugin-node/live`); a socket down past two seconds pauses its reads. The socket's own
  status is a read too, `ws.connection` (`connecting`, `open` or `lost`), which guards acts (§9)
  and which an app's banner may select.
- **permissions**: the org's rules are an ambient read (`ability(orgId)`); a gated act in a head is
  a selection (`rules.at((a) => …)`) and a row's act is `act: (row) => rules.at((a) => …)`, so the
  list never waits on the rules. The act paints its box while the rules load, stands still with
  no sentence when they are not asked for, and is blocked with the failed sentence once that read
  failed or went missing, never a false yes.
- **the phone** wires TanStack's online and focus managers, or it would never pause or refetch on
  focus.

## 9. Acts and saves

Built (phase 4); §15 records what changed in building it.

- **One contract: `onAct` returns a promise.** An act is `ActBase { onAct; failed? }` (Act, IconAct,
  MenuItem and ConfirmAct extend it) and `loading` is on none of them. Every act renderer holds its
  own run: inert at the press, the pending look only after `ACT_DELAY` (300 ms, `--act-delay`),
  ready the moment its promise settles. A host takes over its acts' run: an ActionBar pends one act
  and the rest stand inert, a Sheet holds its head submit, foot bar and form bar and its
  dismissal with them, ConfirmSheet stays open on a rejection. `FormContext`, the form's submitting
  `aria-busy`, `SheetBase.busy`, ConfirmSheet's swallowing and the app's `loading: m.isPending` go.
- **A failure is drawn by its host,** in its own line (ActionBar's kept line, a Sheet's line over
  its acts or under its head submit, a standing Button's reason line, a field's error) and, where
  the host has none (an IconButton in a row, a Switch standing alone), in a failed toast whose Retry
  runs the whole `onAct` again, the rest of the app's act included (a navigate, a sheet closing).
  The sentence is `refusal(error) ?? act.failed ?? words.actFailed`; `refusal` is an ORPCError's
  own message for a 4xx other than 401, 403, 404 and 429. Stead's `useAct` and `actFailed` go
  (`asSentence` moved into `refusal`); there is no MutationCache failure handler, which runs before
  the caller's promise rejects and cannot know whether the host drew it. Two dev checks stand in for
  it: a mutation an act started without returning its promise, and a mutation failure nothing drew
  (a mutation with its own `onError` is exempt).
- **No act queues.** `createQueryClient`'s mutation cache runs `guardReach` in `onMutate`: while
  `onlineManager` is offline, or a cached read's `meta.reach` says the server is out of reach
  (plugin-node's `ws.connection`, `lost` after `PAUSE_AFTER`, with the app's `createWsClient({
  unreachable })` sentence), the mutation throws `Unreached` before any fetch, so it never pauses and
  never fires on reconnect. The act's host draws `sentence ?? words.offline` ("No connection.") as
  its failure line with no Retry, siblings stay live and a sheet can be dismissed; the act looks
  live until it is pressed. A server that is down while the client is online is a failed act.
  `blocked` stays the one encoding for a reason that is not the connection; whether an act also
  looks blocked before any press waits on the owner (§15, Open). A caller-supplied `mutationCache`
  calls `guardReach` itself.
- **A control's `onChange`/`onCommit` may return a promise.** The control holds the viewer's value
  (a selection's or a constant's) while the latest save pends and draws no saving mark. The latest
  change wins: each save carries a sequence number and only the latest's outcome counts. Resolved,
  the hold waits for the refetch the write's invalidation started on the control's own reads, then
  follows its datum unless edited since. Rejected, the value rolls back and the reason is drawn by
  whoever hosts the save: a control in a `FormField` is handed the field's draft (`useFieldDraft`),
  and the field holds the refusal in its own state and draws it in its line (FileInput's type
  refusal and InputOtp's check refusal draw in each control's own line); a bare control holds its
  own draft and toasts the reason with Retry, which saves the same value again. The app's revert
  code goes, and nothing reports up to a parent. Invalidation itself is not awaited, or a delete
  that navigates would draw its record's stale line before leaving.
- **Forms read like frames.** `Form read={deploy}` gives its fields their initial values through
  selections; a field follows its selection until the viewer edits it and never after, so a
  refetch never overwrites what is being typed. The form's bar is a host: pressing it ends the
  edit, a rejection puts the edit back, and its filled act waits only on what it submits: it paints
  while the form's own read (or its sheet's) waits and stands blocked with the failed sentence once
  that read ended. A group's read never touches the bar; a field that is not picked is covered by
  the app's own `blocked` reason.
- **Writes need no mark of their own:** a mutation's invalidation refetches the reads it touched,
  and their busy flag already shows. There is no done mark and no client undo (a toast is
  client-owned); a window the server holds stays PendingBar `until`, with an Undo act that holds its
  own run.
- **Names.** `loading` is retired: reads derive their state, acts theirs from the promise, and
  `pending` remains the act's state and the work started elsewhere (a deploy running on the server,
  PendingBar's `until`). Inert stays one encoding (`blocked` with a reason, focus kept) across Button,
  IconButton, Picker and SegmentedControl.

## 10. Copy

A frame's failed, missing and empty sentences are generic, in `words` ("This didn't load.",
"This no longer exists.", "Nothing here yet."), and a frame overrides any of them with its own
sentence. A frame's `empty` is `Empty`, `{ sentence, act? }`, drawn only when the frame's own read is
empty, so a frame with no read has none; the icon, the title, the children and a no-read toggle are
not part of it. A collection draws the generic sentences. A failed act or control save says the
server's refusal, then the act's own `failed`, then the generic "That didn't go through.". Sentences are not composed from nouns: procedures read several tables, so there is no
one entity to name, a composed sentence breaks gendered and inflected languages, and an empty
sentence depends on the filter the app applied.

## 11. Navigation

Built (phase 5). A route warms what its screen reads in its TanStack Router `loader`,
`loader: ({ params }) => preload(project(params.projectId))`, over a handle that one function builds
and the component calls too, so the key is written once. Components keep building their own reads;
nothing is handed down from the route. `preload` starts each distinct read through the client
`QueryProvider` holds and is never awaited, so a navigation is immediate: most opens are cache hits
and draw no waiting form, and a read that is still on its way shows the painted waiting form.
Waiting remains for cold deep links and slow reads. On the web, one listener for the page
(`pointerover` and `focusin` on a route anchor, held 50 ms) calls `router.preloadRoute`, which runs
the loaders and fetches the route's code; a touch's `pointerover` is the press-in. The phone
preloads nothing: its screens start their reads as they mount, and its press-in preload stays
open with the owner (§15). The extra requests on hover are the
accepted cost, and `staleTime` dedupes them.

## 12. What goes away

- QueryBoundary; the `loading` prop on ~15 components; `LoadingContext`.
- Every hand-built waiting form, both platforms: RowWait, DefinitionWait, OptionWait, CanvasWait,
  MeterWait, FileWait, Table's SkeletonRow, the Stats, ItemHeader and ActionBar waiting forms,
  `field-wait`, `option-wait`, `slider-wait`.
- ui-core: `SKELETON_ROW`, `SKELETON_LANE`, `SKELETON_WIDTHS` and its b5 exception,
  `waitingBars`, `waitingDepth`, `WAITING_ROWS`; `SKELETON` shrinks to the paint's fills; most of
  `listState` and `ListInput` (`sectionLoading`, `hasEmpty`, `known`, `listBusy`), ActionBar's
  `waitCount`.
- Collection props: `query`, `count`, the common `empty`; `items` stays, explicit.
- In Stead: the `loading` props, every `XBody({ view, loading })` and `ready`, the empty checks,
  the list-cache seeding (`listed`, `known`; preload replaces it), `Live<T>`, `useAct`, and its
  two source checks (made unneeded, not moved).

## 13. Checks and tests

- **Verify:** no context carrying changing state or changing a child's form (rule 11).
- **At run time, in dev:** a failure with no holder; a second non-quiet read in one frame, naming
  both keys.
- **ui-core unit tests:** the phase and flags from an observer's result (idle, paused, stale,
  more, missing; a placeholder waits; a retried failure stays failed and busy).
- **plugin-api tests:** P's traps (the epoch, a template string recognised), selections and
  `combine` resolved over real observer results, a throwing selector answering P; `.read` keys
  equal to `queryOptions` keys; `settleReads` flushing a form change through the settle once and
  every other batch as TanStack schedules it.
- **Screens per read.** The reads are the procedures the sidebar Data story called; nothing
  declares them. For a screen of two or more, the run fails each one in turn (its GETs answer a
  server error, every other procedure answers data), resets those queries and runs the overflow
  and walk floors at each width and the console capture, each finding prefixed `with <procedure>
  failed`. That turns the dev no-holder error into a test finding on every screen. The workbench
  keeps its five states over every read. The waiting form comes from the placeholder, so every
  route's loading screen is real, and the shift check (stack's now) compares each Section heading's
  top waiting and loaded at 320, 1280 and 1920 px. The scramble's randomness is seeded under tests.
- **Render counts.** Behaviour stories assert the §6 event table ("refetch with the same data
  renders one component"), in the showcase and in a consumer.

## 14. Build order

Each phase lands web and phone together, with the showcase migrated in the same change.

1. **The read.** plugin-api: `.read` on the utils, `combine`, `useSelections`, `useRead`, P,
   `settleReads` and `QueryProvider`'s `settle` (unwired). ui-core: `readState`. plugin-react: the
   compiler reaching `@fcalell/*`. Tests. Nothing consumes it yet.
2. **Frames and the paint.** react-ui depends on plugin-api, as native-ui does. `createSettle`
   moves to ui-core and each UI plugin passes its `settle`. `Pane`/`Section`/`Sheet`/`Form read`
   (the form's initial values as selections; its saves stay for phase 4), the root and selection
   rule, explicit `items`, each leaf's paint, inert waiting forms, the generic sentences;
   QueryBoundary, `loading`, `LoadingContext`, `useWait` and the waiting trees deleted; screens
   per read and the shift check.
3. **States beyond the first read** (built): busy, stale, more, streaming on its own key, still and
   paused, permissions; live channels as queries; the phone's managers. Long collections moved to
   phase 7.
4. **Acts and saves** (built): the host-held promise, controls with the latest change winning, a
   form's field saves.
5. **Navigation** (built): a route's `loader` preloads its reads, on link intent on the web.
6. **Stead:** its screens moved to frame reads, its workarounds deleted, the pin moved; its six
   channels become `channelRead`s.
7. **Long collections** (web built; the phone is owed to a device): the window of §7 on the web; the spike and the phone's virtualization wait for a device.
8. **Phase 8** (surface holds, lifted shared reads, the Pane that draws no foot): reverted by
   phase 9 where audit ruling 1 differs (§15).
9. **The audit's fixes** (phase 9, built): one read per frame and `or` for enrichments; forms from a
   frame's own selection; acts painted by their own datum; collections and option controls as frames
   of their own read; heads as leaves; memoized rows windowed by index; the field hosting its
   control's save; no act queued offline; live timings with the minimum hold; the window extended
   to trees, OptionList, Picker, Comparison and BarChart on the web. The phone's windowing stays
   deferred by the owner (ruling 8).
10. **Motion** (phase 10, not built; audit ruling 7): the pulse (the breathing loop of the paint),
    the scramble (figures and ids decoding by character), the `theme.loading` config object that
    chooses a loader per component type, and per-component motion definitions. `motion.md` holds
    the design.

## 15. Decisions

Decided 2026-10-14: everything above. Selections are written `read.at(fn)` (a path proxy,
`read.$.commit`, was weighed and left: shorter, but magic; with no seed there is no per-slot
provenance a path would buy). The handle is built by plugin-api, ui-core knows only its interface.

Decided the same day, after the loader demo (`motion.md` §4.2): the paint per slot kind,
`theme.loading = { text, figure, id }`, each `"pulse"` or `"scramble"`, all `"pulse"` by default.

Revised the same day after an adversarial review, with the owner:

- the read runs on TanStack's own observers: a leaf is a `useQuery` with `select` and the shape
  as `placeholderData`, `combine` is `useQueries`, the settle is the notify batch hook and the
  delay a fade on painted slots; there is no store of stack's own and no minimum hold (a store per
  read key, holding the value through a hold, was proposed by the review and dropped once the
  builtins covered it);
- the placeholder is the shape alone, from TypeScript output types at generate; the cache seed,
  the previous data and `.meta({ wait })` are dropped;
- claims and items through context are dropped: the root holder draws the read's states, an array
  selection's holder its count and empty, and collections take `items`;
- the state is a phase with flags; idle and paused are drawn; empty belongs to the frame;
- acts are held by their host, failures drawn there or in a toast; the MutationCache failure home
  and writes marking frames busy are dropped;
- copy is generic sentences with an override; copy from entity nouns is dropped;
- a retried failure stays failed with Retry pending;
- route reads are declared once and prefetched, never awaited, on both platforms;
- the streaming turn has its own key, the second collection model is dropped;
- long collections virtualize (§7);
- the live region is dropped; waiting forms are inert;
- text decodes by crossfade; only figures and ids decode by character (`motion.md` §4.2).

Changed while building phase 1: one runtime placeholder P instead of a generated
shape; approved by the owner on 2026-10-15 (audit ruling 5). With it, a leaf is one `useQueries`
over its values and the settle a scheduler hook installed through `QueryProvider`; §4 and §5 above
describe P and those hooks.

Changed while building phase 2 (2026-10-15); where the sections above differ, this list wins:

1. Collections never hold a read; only frames do (Pane, Section, Sheet, Form and its groups). No
   context reaches a collection, so a List cannot know whether its Section holds the same root, and
   `<Section read={x}><List items={x}/></Section>` would make two root holders. List, Table, Thread,
   OptionList, BarChart and Comparison lose every state branch on both platforms; a list Pane's
   failure fills the page; a collection with no frame raises the dev no-holder error. Cut: a
   standalone `List items` as its own frame, and failure as a standalone frame. *Revised by phase
   9: a collection given a selection is a frame of its own items.*
2. `FormGroup.read` is added: each group is a frame (it replaces `FormGroup.loading`).
3. Gate takes no `read`: its body takes Sections, so `connect` uses a `Section read`.
4. Acts can be data: Pane `actions` and `more`, Section `act`, `more` and `description` take a
   `Datum`; a painted act is inert in its loaded place.
5. The paint is a still fill plus the delayed fade. The breathing loop (`pulse`, one shared clock),
   the scramble and `theme.loading` go to the motion phases; the phone has no fade, its fill snaps
   in after `WAIT_DELAY`.
6. One `PAINT_ROWS = 4` for every collection and every text block of unknown length.
7. A Section's count is never painted while it waits, on either platform.
8. Sentence overrides: `empty` and `failed?: string` on Pane, Section, Form and FormGroup; Sheet
   takes `empty` only until phase 4 (its `failed` is still the act's sentence). No `missing`
   override: the generic sentence stays and the public `Missing` covers a bespoke one. *Revised by
   phase 9: `empty` is `{ sentence, act? }`, drawn only for the frame's own read.*
9. `SKELETON` is replaced wholly by `PAINT` (`glyphs`, `box`, `control`); each component paints its
   own box.
10. The shift check compares Section heading tops, waiting against loaded, at 320, 1280 and 1920 px
    (Stead's method); per-leaf box equality is a showcase behaviour story; "screens per read" is
    deferred to phase 5 (`reads(params)`).
11. A row is wholly painted or wholly loaded: `RowStatus {loading: true}`, the List "known" hybrid
    and `waitingDepth` are gone, and a painted tree draws flat.
12. The dev no-holder error fires only for a read that a leaf paints (registered by
    `useSelections`); a read the app holds with its own `useQuery` is not checked.
13. Canvas keeps a painted stand-in (three painted node cards), since its layout has no geometry
    before the data: the one named exception to "no second tree".
14. FileRow takes no public `Datum`; it paints only through `List file`.
15. Retry pending lands now: the failed form's Retry shows `loading` while the read refetches.
16. The Pane's painted title is a `<p>` in the heading's look, not an empty `h1`; the real `h1`
    stands once the name lands.
17. The showcase routes were reshaped for the shift check: a Section no longer waits behind a
    Banner or a PendingBar (the deploy's conditions stand below every Section), Settings puts its
    Webhooks Section first, Connect lists as many workspaces as it paints, and a wrapping fact line
    or title is short enough to wrap the same painted and loaded.

Changed while building phase 3 (2026-10-15); where the sections above differ, this list wins:

1. **busy** is drawn by the root-holding frame, which renders when busy changes; its children are
   the same elements and bail out. The separate busy-mark subscription is cut. `aria-busy` is the
   first wait only. The glyph is the `Spinner` until `theme.loading` lands; a frame with no heading
   shows none.
2. **stale and paused are one line** under the frame's heading row (`StateLine`); paused has no act.
3. **idle and paused-while-waiting are one frame form**, `still` (`FrameForm` `idle` is renamed).
4. **more** covers stack's paginated envelope only and its value is flat. The more row is pressed
   by the viewer and is the collection's, as is a failed next page. A next-page fetch is not busy
   and the frame draws no count while more remains. Thread's earlier-history paging moves to the
   long-collections phase.
5. **streaming**: the turn is the app's declared read (`Thread reply`); stack builds no oRPC
   `.stream()` or `.live()`, adds `kind: "stream"` and re-exports `streamedQuery`. The turn holds
   its read and draws its failure, and hides once history holds its key.
6. **live channels**: the primitive is plugin-node's `channelRead`. There is no connection read: a
   lost socket pauses each channel read. Stead's connection banner is its own product choice.
   *Revised by phase 9: `ws.connection` is a read of the socket's status.*
7. **permissions**: the org's rules are an ambient read; gated head acts are `Datum` selections and
   row acts are combined into items. A failed rules read leaves its acts painted and inert.
   *Revised by phase 9: a head act and a row act are selections of the rules, and an ended read
   blocks them with the failed sentence.*
8. **long collections** are phase 7, and §7's phone design is reopened: windowing on the Pane's
   ScrollView against the Pane given the list. The count is the spike's.
9. **the phone** wires the online and focus managers (`QueryProvider listen`).
10. `read(options, missing)` is `read(options, { missing, kind })`.

Changed while building phase 4 (2026-10-15); where the sections above differ, this list wins:

1. An act is `ActBase { onAct; failed? }`. `loading` leaves every act and Button, IconButton and
   InputOtp; `failed` is the act's own sentence.
2. Act renderers hold their own run and hosts take over theirs. The failure goes in the host's line,
   otherwise in a failed toast with Retry; the sentence is the server's refusal, then the act's
   own, then the generic `actFailed`. `ActFailed` goes, and Sheet `failed` is now its read's
   override.
3. Invalidation is not awaited. A control's hold waits on its own reads' refetch in flight. "A save
   cancels in-flight fetches" goes, and controls draw no saving mark.
4. Acts are never blocked by the connection. Offline presses wait, the host's line says so and
   nothing is held. *Revised by phase 9: no act queues; a press with no connection is refused
   with the connection's sentence.*
5. There is no client undo; server windows stay PendingBar `until`.
6. Cut: the ItemHeader save fact (with the words `saving`, `saved` and `notSaved`), the Form's
   submitting `aria-busy`, `FormContext` and `SheetBase.busy`.
7. Retry's pending is its own promise (`retry` and `More.fetch` return theirs); a refetch nobody
   pressed is the busy mark alone.
8. A form's bar paints while any of its reads (form, groups, sheet) waits. *Revised by phase 9: the
   bar follows its form's own read (or its sheet's) alone.*
9. `ACT_DELAY = 300` and `--act-delay`, tuned in the `Timings` story; the roster's act state is
   `pending`.
10. Two dev checks: a mutation started without its promise returned, and a mutation failure nothing
    drew (an `onError` of the mutation's own exempts it). A story that trips either fails.

Deviations kept from the build:

- A hosted Button calls its host's handler as it is (`ButtonBase pending`): the host holds the run,
  and a second run in the button would pend twice.
- `useDraft.change` returns its save's promise, never rejecting, so a Retry that saves again holds
  the run and the dev checks stay silent for acts that mutate.
- Slider gained `onCommit`, the value the thumb is let go on; its `onChange` still hears each step.
- `useHeldDraft` (each platform's `lib/act`) is the draft every saving control uses: it sends a
  rejection to `useFailed` (the field's `FieldRefusal`, else a toast with Retry) and clears the
  field's refusal on the next change. *Revised by phase 9: a `FormField` hosts the save of its
  control (`useFieldDraft`) and draws the refusal in its own line; `useHeldDraft` serves a bare
  control and toasts; `useFailed` and `FieldRefusal` are deleted.*
- InputOtp's checking line draws at once, without `ACT_DELAY`: a code is never typed twice, so
  there is no fast answer to spare it for.
- A failed toast stays in the tree: its root sets `aria-hidden={false}` and `aria-live="off"` (its
  own alert is the one announcement) and its close act `aria-hidden={false}`, or Base UI's hidden
  subtree would hold a focusable act.

Changed while building phase 5 (2026-10-15); where the sections above differ, this list wins:

1. There is no `reads(params)`. A route's TanStack Router `loader` calls `preload(...)` over
   handles built by a function its component also calls; components keep building their own reads.
2. Intent on the web is react-ui's single delegated listener (`pointerover` and `focusin` on a
   route anchor, held 50 ms), which calls `router.preloadRoute({ href })` and so loads the route's
   code too; `pointerover` is the touch web's press-in. `defaultPreload` is not set, and
   `defaultPreloadStaleTime: 0` hands freshness to the query cache.
3. `preload` skips stream, idle and dependent reads; a pages read fetches its first page. A failed
   prefetch opens painted waiting, never failed.
4. The phone's press-in preload is cut until a phone list opens a record; the recorded path is
   expo-router's `router.prefetch(href)` on press-in, after a spike.
5. Screens per read: the reads are the procedures the Data story called, observed and never
   declared; the run fails each alone and applies the overflow, walk and console floors. Per-read
   empty, missing, waiting and axe are cut, and the workbench keeps its five states over every read.
6. §4's "a record's title comes from preload" holds for an open the viewer pointed at first; a cold
   deep link paints.
7. The client `QueryProvider` holds is bound for `preload` and the screens run: one cache per app,
   the last provider rendered wins.

Deviation kept from the build: a waiting slot picks over the placeholder where a read has no data
(an idle or failed read's missing data included), so a selector walks P and never meets
`undefined`; found while failing each read in turn.

Changed while building phase 6 (2026-10-15); where the sections above differ, this list wins:

1. **A frame holds the reads of its selection that no enclosing frame holds.** "One root holder per
   read" is revised: a frame given a read holds it unless an ancestor holds it, a frame given
   `x.at(...)` under a holder of `x` holds nothing (as before), and a frame given `combine([a, b,
   c])` under a read-less Pane holds all three. Frames publish the hashes they hold through
   `FrameHolds`, a context of identity only; the context resolves nesting, so the dev "two holders"
   error is gone and sibling frames may each hold a read and draw its state in their own place.
   The no-holder check stays and counts every held read. *Revised by phase 9: a frame holds one
   read.*
2. **`Held.roots[]`** replaces `Held.root`. `frameOf` merges them: the first read failed with no
   data ends the frame (failed, or missing by its own `missing`); busy, stale and paused are any
   one's, and the frame stands still when any is idle or paused. `retry` refetches the held reads.
   A reply (`turnOf`) holds its one read. *Revised by phase 9: a frame holds one read and its form
   comes from its own selection's non-quiet reads.*
3. `createQueryClient`'s default `retry` is one retry of a failure that is not a not-found.

Deviations kept from the build: a failed next page is the collection's line, not the frame's stale
(`planFrame` presents the pages held as success); a `Table` paints its next page as a grid of its
own at the same columns, and the narrow list as rows in the same slots; the Thread roster's
`error` is the stopped turn.

Changed while building phase 7 (2026-10-15); where the sections above differ, this list wins:

1. Long collections are web only for now. The phone draws every row and its Thread stays inverted;
   the phone's libraries, Pane design and count wait for a device.
2. Windowing is automatic from `VIRTUAL_FROM` loaded rows under a `Scroller`: TanStack Virtual, no
   prop. Painted forms stay `PAINT_ROWS`, and "fill the viewport" is cut.
3. The collections that window: List (flat), Group's list, Table at both widths, Thread. Cut:
   trees, Comparison, BarChart, OptionList, Thread's history paging and the anchor on a prepend.
   *Revised by phase 9: trees, OptionList, Picker, Comparison and BarChart window on the web.*
4. Focus stays mounted: the focused row and Table's cursor row. The grid carries `aria-rowcount`
   and `aria-rowindex`. Find in page and print stop at mounted rows.
5. The virtualizer is the one scroll anchor. Thread opens at the end and follows it as before.
6. The settle and the shift check are unchanged, since rows carry no names.
7. Open keeps the phone's libraries and its Pane design; the count is the web's, and the phone
   re-checks it on a device.

Deviations kept from the build:

- **The count was measured and the plan's rule was not applied** (§7): 100 unwindowed rows take
  83 ms under a 4x throttle, so the rule would set about 10. `VIRTUAL_FROM` is still 100, owed a
  decision.
- **`Scroller` holds a holder, not the element.** A Pane's collection mounts in the same commit
  that attaches the body, so a state-held element would be null in its first draw. `useScroller`
  gives one stable ref function (a `useCallback`, so a render never detaches the holder from
  under a Window that measures in the same commit) and the node in state for `useScrolls`. A
  Window rendering before the element has arrived ranges from the viewport's size, then renders
  once more to measure against the element (the plan had "the box ref is not attached on mount"
  and the scroller's client size).
- **TanStack's timing:** the virtualizer reads its `gap` and estimate when it is created, so
  `Window` holds the box's gap and the first row's height in state and calls `measure()` once it
  has them, before any row has been measured. The mounted rows are measured by `resizeItem` after
  each commit and by one ResizeObserver.
- **Scroll adjustments are increments.** The virtualizer's adjustment (rows above the view
  measured) is applied from the scroller's position now, less what has already been applied since
  the last offset report, so a scroll the browser made in between (a focus) is not undone. A
  scroll to an offset converts box-relative to the scroller's own.
- **Disconnected ResizeObserver entries** are ignored: a row just unmounted is reported once more
  at no height, which would have set its size to zero.
- **`keep` is in the range extractor's dependencies**, so a new cursor row is a new extractor and
  ranges again; the focused row is read from a ref at the moment of ranging.
- **First-render windowing from the viewport.** A collection mounting with its Pane windows in its
  first draw, from `window.innerWidth` and `innerHeight`
  until the scroller is measured.
- **Table's first commit.** The cursor moves first and the cell takes focus in a layout effect
  once the window has drawn its row (`focusCell` sets the cursor and a `wanted` cell), since a
  `querySelector` on a row not yet mounted found nothing; the grid's rows are built once and
  handed to `Window`.
- **A spacer is `aria-hidden`**, a `div` or, in the grid, a `tr` holding one empty cell; zero
  heights are omitted.

Open: `WAIT_DELAY` and `ACT_DELAY` (tuned live), and whether a minimum is needed after all; the phone's text bar as a nested `Text`
(a device check); the phone's virtualizing libraries, its count and its Pane's scroll with a long
collection (a spike on a device); and `VIRTUAL_FROM` itself (above).

Changed while building phase 8 (2026-10-15); where the sections above differ, this list wins:

1. *Reverted by phase 9 (audit ruling 1).* A read's states draw once per surface. The frame
   enclosing every region that draws a read holds it, written `combine([value, ...shared], (value)
   => value)`. This revises phase 6's "sibling frames may each hold a read".
2. *Reverted by phase 9 (audit ruling 1).* A Pane and a Sheet are surfaces (`Holds.surface`). In dev two holders of one key on one surface
   are an error; a Pane's foot and docked sheet stand inside its holds.
3. *Reverted by phase 9 (audit ruling 1).* `Frame.inert` replaces `Frame.waits` for acts: they paint inert while the frame has no data
   (waiting, still, failed, missing).
4. *Reverted by phase 9 (audit ruling 1).* A failed or missing Pane draws no foot and no docked
   sheet.
5. A selector's throw over the placeholder is silent. *Stands as built; phase 9 reverts #1 to #4
   only.*
6. Done: the DefinitionRow label (`6ccc916d`) and the Datum picks (`6bcdb19f`, `53b971ab`). Cut:
   ListRow facts as a Datum (a fact from a read the row does not own is absent on failure, which is
   control flow, so `useRead` is right).

Changed while building phase 9 (2026-10-15), after the audit and the owner's rulings; where the
sections above differ, this list wins:

1. A frame holds one read: the one non-quiet read of its selection that no enclosing frame holds.
   A second is a dev `console.error` naming both keys (production holds the first). A frame's form
   (waiting, still, failed, missing, empty, ready) comes from its own selection alone, and
   `HoldsContext` places only the flags (which frame draws busy, stale, paused and `aria-busy`, the
   dev registry, what Retry refetches). `Holds.surface`, `surfaces`, the "side by side" error and the
   lifted `combine([value, ...shared], …)` idiom go; sibling frames each hold and fail in place.
   Revises phase 6 #1 and #2 and reverts phase 8 #1 and #2.
2. `selection.or(fallback)` is for enrichments: real data, else the fallback in every state, never
   painting, holding or failing a frame. A read used only through `or` is quiet.
3. `Drawn.phase` says why a painted value has no data (waiting, still, failed, missing). `Frame.inert`
   goes. A constant act is live in every form. An act given as a selection (Pane actions and more,
   Section act and more, Banner act, row act and more) paints while its read waits, stands still
   with no sentence when it is idle or paused with no data, and stands blocked with the failed
   sentence (or `words.missing`) once the read ended. A Section's count shows only when its form is
   ready or empty. Reverts phase 8 #3.
4. A Pane's foot and docked sheet are never made inert or removed by the frame; a failed Pane keeps
   them. A Sheet, a Pane's dock, a docked sheet and a Thread's foot start with no holds. Reverts
   phase 8 #4.
5. Collections and option controls are frames of their own read: List (and Group's list), Table,
   Thread, BarChart, Comparison, Canvas (`nodes`) and Diff (`hunks`) through `useCollection`;
   Picker, Select and OptionList through `useOptions`, which registers as the holder of the options'
   read and draws its failure and Retry in a line under the control, with no busy or stale flag.
   They draw the generic sentences. Revises phase 2 #1.
6. A frame's `empty` is `Empty`, `{ sentence, act? }`, for the frame's own read alone: a Pane or a
   Section given `empty` with no `read` does not type-check, and the icon, the title, the children
   and the no-read toggle are gone. Gate's first run keeps its title and children as
   `GateFirstRun`, a page and not a read's empty state. Canvas keeps its caption prop. Revises
   phase 2 #8.
7. Heads are leaves: `PaneHead` and `SectionHead` subscribe to their title, acts, more and
   description, so one of them changing renders the head and nothing under the body.
   `usePainted(values)` is a `useQueries` whose `combine` answers one boolean.
8. A form's bar (and a Sheet's submit) waits only on what it submits: its own read, or its Sheet's.
   It paints while that waits and is blocked with the failed sentence once it ended. A group's read
   never touches it, and `formReads` goes. Revises phase 4 #8.
9. Each row kind (ListRow, Meter, DefinitionRow, FileRow) is one `memo` component taking `item`,
   `index`, the descriptor and `painted`, and calls `onOpen(item)` itself; `Window({ count, keyOf,
   row })` builds only the mounted indices. A row's act and more may be selections. The §6 claim
   that a refetch renders only the rows whose item changed holds, with render-count stories for a
   first answer, a pressed act and a saved control.
10. The field hosts its control's save. `FormField` gains `input`, `textArea` and `picker`
    descriptors beside the others; it runs `useFieldDraft`, holds the refusal in its own state and
    renders the control's Base with the draft. A bare control holds its draft (`useHeldDraft`) and
    toasts a rejection with Retry. FileInput's type refusal and InputOtp's check refusal draw in
    each control's own line. `FieldRefusal` and `useFailed` are deleted. Revises phase 4's
    `useHeldDraft` deviation.
11. No act queues offline. `createQueryClient`'s mutation cache runs `guardReach`; plugin-node's
    `ws.connection` is a read of the socket's status (`networkMode: "always"`, `gcTime: Infinity`,
    never opening the socket) whose `meta.reach` carries the app's `createWsClient({ unreachable })`
    sentence; the host draws `sentence ?? words.offline` ("No connection.") with no Retry.
    `useRun.paused` and `pausedStore` go. Revises phase 3 #6 and phase 4 #4.
12. Live timings: `timings` and `holdFor` in ui-core, `QueryProvider hold` (`withHold` merges it into
    a caller's client and keeps the client's other defaults), the hold wrapping `read()`'s `queryFn`
    and `channelRead`'s first snapshot. A refetch or a later page is not held. `waitMin` stays 0.
13. The atoms Banner, Status, Count, Chip and Avatar take selections and paint as a whole.
14. On the web the window extends to trees, an OptionList's groups, a Picker's sheet and desktop
    search list, Comparison and BarChart. `Window` gains a horizontal axis, and Comparison and
    Group share `GroupCard`. Revises phase 7 #3. The phone's windowing stays deferred (ruling 8).
15. Phase 8 #1 to #4 are reverted (ruling 1); #5 and #6 stand. The connection banner is Stead's
    (ruling 2), the generic toast "That didn't go through." stays (ruling 4), and the phone's
    press-in preload stays open (§11).

Deviations kept from the build:

- **`holdFor` lives in ui-core**, which the plan did not name: one copy serves each platform's
  generated `QueryProvider`, with `withHold` and `holdOf` in plugin-api's `read.ts`.
- **`ListEmpty`** stays exported from List on both platforms (`Empty` with the first run's `icon`
  and `title`), the list's former empty shape, though a list draws the generic empty form and takes
  no `empty`.
- **The Picker windows** (its touch sheet, and its desktop search list through Base UI's virtualized
  combobox from `VIRTUAL_FROM` options), beyond the collections the plan named.
- **BarChart past `VIRTUAL_FROM` bars keeps a bar's width and scrolls sideways under its axis**: a
  look change, awaiting the owner (below).
- **A standalone Select does not window.** Base UI's Select has no virtualization; windowing it
  would make it a combobox.
- **An OptionList's checkboxes carry no set size**; its radios carry their place in the group.
- **A selection act over a read no frame holds** may log the dev no-holder error when that read fails:
  a blocked act is not registered as a holder.
- **The one-read dev error is runtime only**, so Stead's console pass and stack's screens run are
  the net.

Open with the owner (nothing below is built beyond what both answers share):

1. **Acts' own failure sentences.** Ruling 4 keeps the generic toast; the plan applied it to control
   saves. Act sentences such as "The page was not saved." and "Could not end it." stay as built. If
   the ruling covers them, they go.
2. **What "blocked" looks like before a press.** Ruling 3 blocks offline acts, and stack cannot know
   beforehand which acts need the server. Either (a) refused at its press, the act looking live
   until then (built), or (b) a per-act flag draws it blocked before the press.
3. **Collection sentences.** Either (a) collection frames take `empty?: Empty` and `failed?: string`,
   drawn only from their own read, or (b) generic only (built).
4. **Gate's first run.** Either (a) rename it `first` and keep its title and children, or (b)
   reduce it to `{ sentence, act? }`. It stays as built, `GateFirstRun`.
5. **Canvas's caption.** Either (a) rename it `hint`, a caption the app gives, or (b) drop it. It
   stays as built.
6. **The phone's press-in preload.** Either (a) `router.prefetch` with a press-in delay (it mounts
   the whole screen), (b) a route `preload` export the phone link calls, or (c) none (built).
7. **`VIRTUAL_FROM`** stays 100 against the measured rule of about 10 (§7).
8. **BarChart's sideways scroll** for 100 or more bars is a look change; `bar-chart/index.tsx`
   reverts if the owner rejects it.
9. **The standalone Select** does not window; it would have to become a combobox.
