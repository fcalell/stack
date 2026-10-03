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

Add the file under `src/app/`: a `Place` for a route a tab opens (and its entry in the root
layout's `places`), a `Screen` with `back` for a route pushed over one. Page: [routes](./routes.md).

**Check:** `pnpm check` passes.

## 3. Compose

Write the screen under the phone's rules page, reading each component's props in its
`index.tsx`. Page: `node_modules/@fcalell/plugin-native-ui/guide/reference.md`.

**Check:** `pnpm check` passes.

## 4. Feed it

Read through `orpc` from `src/lib/api.ts` with `useQuery`, act with `useMutation`, and wrap each
region that fetches in a `QueryBoundary`. Page: [the API client](./api-client.md).

**Check:** with `stack dev` and `stack expo dev` running, the screen loads its data on a device
or simulator.

## 5. Draw every state

Draw loading, empty and error for each region as the screen recipe's step 5 says.

**Check:** each state is reachable by a route, a fixture or a control, written down beside it.

## 6. Judge and sign off

Run the screen recipe's steps 6 to 8. The design critique judges a render it can script, and
stack has no phone render harness yet, so a phone screen stops after step 5 until the harness
ships. Device screenshots are no substitute for the critique.

**Check:** the critique's verdict is ship, and fcalell signs off.
