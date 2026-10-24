# Build a screen

A screen is the app's route file, composed from the roster: you choose components, props and
order, and the look is the roster's, decided in [voice](./voice.md). Work the steps in order; a
phone screen follows `node_modules/@fcalell/plugin-expo/guide/add-a-phone-screen.md`.

## 1. Read the app

Read the app's `ui/` directory and two existing screens, so a product molecule is reused.

## 2. Pick the anchor screen

Open the voice page's pinned screen of the pattern the screen implements (a list, a record, a
settings column, a form). Where no pinned screen fits, search Mobbin for Linear's screen of that
pattern, one query, and pin it on the voice page with the pattern it answers. The pinned screen is
what the render is stood beside at the end.

## 3. Map every part to the roster

The platform's rules page is `node_modules/@fcalell/plugin-react-ui/guide/rules.md` (or `plugin-native-ui`'s), the tokens are `node_modules/@fcalell/ui-core/DESIGN.md`, and a gap is defined in `node_modules/@fcalell/cli/guide/gap.md`.

## 4. Compose

```tsx
const projects = orpc.projects.list.read();

<Section
  title="Active"
  items={projects.at((rows) =>
    rows.map((p) => ({ key: p.id, title: p.name, href: `/projects/${p.id}` })),
  )}
  empty={{ sentence: "No project yet.", act: { label: "New project", onAct: create } }}
/>
```

A route's `loader` warms what the screen reads: `node_modules/@fcalell/plugin-react/guide/routes.md`.

## 5. Draw every state

**Check:** each state is reachable by a route, a fixture or a control, written down.

## 6. Look

Start `pnpm dev` (or `stack screens dev`, when the app has fixtures) and open the screen at 1440
in light and dark, then at 320 and 1920. Put the render beside the anchor screen from step 2 and
check the voice page's floors by looking. Screenshot each state from step 5. A part that looks
wrong on the screen but right on the specimen is a composition finding; one that looks wrong on
the specimen too is a stack finding, fixed on the specimen first.

**Check:** the floors hold, and every state was seen.

## 7. Show

Present the screenshots beside the anchor screen with one question: which looks better. "Theirs"
comes back with the three largest differences, each a composition finding (yours, back to step 4)
or a roster finding (stack's, filed as a gap). Repeat until the answer is "ours" or "the same".

**Check:** the maintainer's answer.
