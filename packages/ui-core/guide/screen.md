# Build a screen

A screen is the app's route file, composed from the roster: you choose components, props and
order, and the look is the roster's. Work the steps in order, each closed by its check; a phone
screen follows `node_modules/@fcalell/plugin-expo/guide/add-a-phone-screen.md`.

## 1. Read the spec and the app

Read the story: the screen's purpose, data, acts and states. A region that fetches or acts and
names no loading, empty or error state gets one each; say which you added. Read the
app's `ui/` directory and two existing screens, so a product molecule is reused.

**Check:** every region has its acts and states written down.

## 2. Pick references

Search Mobbin (screens, and flows for a multi-step one) for the screen's pattern on its platform,
one query in dark mode. Start from each pattern's page under `patterns/` and pick two or three
at the calibre of the anchor apps in [references](./references.md), each noted with what it gives.

**Check:** each reference has a link and a reason.

## 3. Map every part to the roster

Open the platform's rules page (`node_modules/@fcalell/plugin-react-ui/guide/rules.md`, or
`plugin-native-ui`'s), `node_modules/@fcalell/ui-core/DESIGN.md` for cells, states and tokens,
and each component's `src/ui/components/<dir>/index.tsx` for its props. Map each part to one
component: the frame (`Shell`, `Place` in the shell holding a `Pane` for each step into a list and
its record, a `cover` `Pane` pushed over it, `Gate` for a page outside the shell: sign-in, a
consent step), the rhythm (`Section` over a `Group` or a `List`), each control and text role.

A part no component composes (a component, variant, token or state the roster lacks) is a gap:
leave it out, compose the rest, and file it by `node_modules/@fcalell/cli/guide/gap.md`.

**Check:** every part names its component, or its gap.

## 4. Compose

Write the screen under the rules page; never edit `node_modules` or a stack package.

```tsx
const projects = orpc.projects.list.read();

<Section
  title="Active"
  read={projects}
  failed="Projects could not load."
  empty={{ sentence: "No project yet.", act: { label: "New project", onAct: create } }}
>
  <List
    items={projects}
    row={{ key: (p) => p.id, title: (p) => p.name, href: (p) => `/projects/${p.id}` }}
  />
</Section>
```

**Check:** `pnpm check` passes.

## 5. Draw every state

Waiting and failure sit at the frame. A `Pane`, `Section`, `Sheet` or `Form` (or a form's group)
given a `read` draws its failure with Retry, its "no longer exists" form with Back when the read
answers not found, and its empty state; give it a read, a selection or a `combine` of reads: it
holds the reads that no enclosing frame holds. Every part below the frame takes a selection
(`deploy.at((d) => d.steps)`, a `Datum`) and, while the read waits, draws its loaded form painted: a
collection paints four rows in the slots its item map declares, a text its filler, a control its box.
So the outline of the screen is written once, for the loaded data, and the waiting form is that
outline painted at the loaded heights, never a second tree; a pending act keeps its box. After the
first answer the frame keeps the data and says what its read does: a spinner after the heading while
it refetches (busy), "Couldn't refresh." with Retry when a refetch failed (stale), "Waiting for a
connection." when it is paused offline, and still (painted, inert, no spinner) for a read not asked
for yet. A paginated read (`.pages`) ends its collection in "Show more", with the next page painted
while it loads and "Couldn't load more." with Retry when it failed, and no count while more remains.
A conversation's turn being written is `Thread reply`, its own read: waiting, writing, written, or
"The reply stopped." with Retry. Empty is
the frame's `empty`, with the act that fills it unless the screen's primary act already does. Error draws where the work happened (a field's error, a banner over the
region, a toast for an act) and keeps what still works.

**Check:** each state is reachable by a route, a fixture or a control, written down; busy, stale, paused,
more and a stopped reply included where the screen has them.

## 6. Judge

Start `pnpm dev`. A fresh session that played no part in composing judges the render by the
[design critique](./design-critique.md) and edits nothing. It gets the route, the patterns, the
states and how to reach each, the references and the files.

**Check:** the verdict is ship.

## 7. Rework until it ships

Findings go back to step 4, then a fresh judge; on reject, re-map from step 3. A finding is the
instruction, never overridden by taste. After three rounds without ship, bring the last report to
fcalell.

**Check:** a fresh verdict follows every rework.

## 8. Sign off

Present the judge's screenshots per width and mode, its numbers beside their ranges, the
references and the files.

**Check:** fcalell's sign-off.
