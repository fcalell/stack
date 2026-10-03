# Build a screen

A screen is the app's own code: a route or screen file composed from the roster installed at
this project's pin, rendered, judged and signed off. There is no artboard, and stack composes no
product screen. You design by choosing roster components, their props and their order; the look
belongs to the roster. Work the steps in order; each ends with the check that proves it. A phone
screen follows `node_modules/@fcalell/plugin-expo/guide/add-a-phone-screen.md`, which runs these
steps with the phone's pages.

## 1. Read the spec and the app

Read the story, issue or message: the screen's purpose, the data it shows, its acts and the
states it names. A region that fetches or acts and names no loading, empty or error state gets
one each; say which you added. Then read the app's `ui/` directory, if it has one, and two of its
existing screens, so a product molecule already there is reused rather than composed again.

**Check:** every region of the spec has its acts and its states written down.

## 2. Pick references

Search Mobbin (screens, and flows for a multi-step screen) for the screen's pattern on its
platform, web or phone, one query in dark mode. Start from the executions on the page under
`patterns/` of each pattern the screen implements, and pick two or three at the calibre of the
anchor apps in [references](./references.md); note each link with the one thing this screen
takes from it.

**Check:** each reference has a link and a reason.

## 3. Map every part to the roster

Open the platform's rules page (the web's is `node_modules/@fcalell/plugin-react-ui/guide/rules.md`,
the phone's `node_modules/@fcalell/plugin-native-ui/guide/rules.md`),
`node_modules/@fcalell/ui-core/DESIGN.md` for each component's cells, states and tokens,
`node_modules/@fcalell/ui-core/src/roster.ts` for its props, and the UI plugin's
`src/ui/components/<dir>/index.tsx` for each component you use. Map each part of the spec to one
component: the frame that owns the page (`Shell`, `Place` for a page in the shell, `Screen` for a
page pushed over one, `Split` for a list beside its record), the rhythm (`Section` over a `Group`
or a `List`), each control and each text role.

A part no component composes (a component, a variant, a token or a state the roster lacks) is a
gap: leave it out, compose the rest, and file it by the gap recipe
(`node_modules/@fcalell/cli/guide/gap.md`). Write each gap up as what is missing, the components
tried and where each falls short, the reference that shows the part, and where it sits.

**Check:** every part names its component, or its gap.

## 4. Compose

Write the screen under the rules page: a class only on an intrinsic host element and only for
geometry, every colour, size, radius and space reached through a component's props, copy through
the text roles and the app's words. Never edit `node_modules` or a stack package.

```tsx
<Place title="Projects" act={{ label: "New project", onAct: create }}>
  <Section title="Active" count={projects.length}>
    <QueryBoundary query={query} sentence="Projects could not load.">
      {(rows) => <List>{rows.map((p) => <ListRow key={p.id} title={p.name} />)}</List>}
    </QueryBoundary>
  </Section>
</Place>
```

**Check:** `pnpm check` passes.

## 5. Draw every state

Loading draws each region's loaded form in skeleton: a `QueryBoundary` or a loading `Section`,
`Group` or `List` stands skeleton rows at the loaded rows' heights, so nothing moves when the
data lands, and a pending act keeps its box. Empty draws the region's `EmptyState` with the one
act that fills it. Error draws the failure where the work happened (a field's error, a banner over
the region, a toast for an act) and keeps what still works on screen.

**Check:** each state is reachable by a route, a fixture or a control, written down beside it.

## 6. Judge

Start `pnpm dev`. A fresh session that played no part in composing judges the render, following
the [design critique](./design-critique.md), and edits nothing. It gets the route, the patterns,
the states from step 5 and how to reach each, the references and the files.

**Check:** the verdict is ship.

## 7. Rework until it ships

On rework the findings go back to step 4, and a fresh judge renders again; on reject, re-map from
step 3. A finding is the instruction: never override it with taste. After three rounds without
ship, stop and bring the last report to fcalell.

**Check:** a fresh verdict follows every rework.

## 8. Sign off

Present the judge's screenshots for each width and mode, its measured numbers beside their
ranges, the references and the files. fcalell signs off on the render; until then the screen is
not done.

**Check:** fcalell's sign-off.
