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

Shoot the screen: `stack screens test --screen <it> --mode dark --width 320,1920 --state data,empty --shots shots/<round>`,
adding `--open <control text>` for each layer the screen opens. Screenshot each state from step 5
the same way. Nothing is measured by hand: a number that matters is a rule of the render walk, or it
is dropped. A part that looks wrong on the screen but right on the specimen is a composition
finding; one that looks wrong on the specimen too is a stack finding, fixed on the specimen first.

**Check:** the run passes, and a shot exists for every state.

## 7. Judge

A critic that did not build the screen reads the shots and the source with
[critique](./critique.md), and stands the render beside the anchor screen from step 2: which looks
better. A `blocking` finding holds the screen: fix it (a composition finding is yours, back to step
4; a roster finding is stack's, filed as a gap) and shoot again, only what the fix can move. A round
is shoot, look, fix, at most two. A `minor` finding goes on the maintainer's list and starts no
fix. The builder never judges its own shots. The maintainer sees a screen only on `ship`, beside the
anchor screen, with the three largest differences the critic found.

**Check:** the critic's verdict is `ship`.
