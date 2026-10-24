# Add a phone screen

A phone screen is a route file composed from the native roster, fed by the typed client, with
every state drawn. The screen recipe (`node_modules/@fcalell/ui-core/guide/screen.md`) is the
loop; this page is where the phone differs. Work the steps in order; each names the page it needs
and ends with its check.

## 1. Read, reference and map

Run the screen recipe's steps 1 to 3 with the phone as the platform, mapping each part under the
phone's rules page (`node_modules/@fcalell/plugin-native-ui/guide/rules.md`) to a component in
`node_modules/@fcalell/plugin-native-ui/src/ui/components/`.

**Check:** every part names its component, or its gap.

## 2. Add the route

Add the file under `src/app/`: one `Pane` for a route a tab opens (and its entry
in the root layout's `places`), the same with `back` on the `Pane` for a route pushed over one.
Page: [routes](./routes.md).

**Check:** `pnpm check` passes.

## 3. Compose

Write the screen under the phone's rules page, reading each component's props in its
`index.tsx`. Page: `node_modules/@fcalell/plugin-native-ui/guide/reference.md`.

**Check:** `pnpm check` passes.

## 4. Feed it

Read through `orpc` from `src/lib/api.ts` with `orpc.*.read(input)` and act with `useMutation`. The
screen's `Pane`, or the `Section` that stands over the data, takes the read as its `read`; a
collection (a `List`, a `Table`) and every part that shows a value take the read or a selection of
it (`project.at((p) => p.name)`), and paint while it waits. Page: [the API client](./api-client.md).

**Check:** with `stack dev` and `stack expo dev` running, the screen loads its data on a device
or simulator.

## 5. Draw every state

Draw loading, empty, error and not found for each region as the screen recipe's "Draw every state" step says: a
frame's `read` draws the last three, and the loaded form painted is the first.

**Check:** each state is reachable by a route, a fixture or a control, written down beside it.

## 6. Judge and sign off

Start the app on the emulator by the [render page](./phone-render.md), with `stack dev` and
`stack expo dev` running, and run the screen recipe's "Look" and "Show" steps: a fresh session judges the
render on the emulator by the design critique's phone section, at 390 and 320 dp, light and
dark, and edits nothing. It gets the route as a deep link, the patterns, the states from the "Draw every state" step
and how to reach each, the references and the files. A change that adds a native module, a
config plugin or a font takes a new build first.

**Check:** the critique's verdict is ship, and the maintainer signs off.
