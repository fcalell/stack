# @fcalell/plugin-screens

The screens workbench for `@fcalell/stack`'s web apps: one command serves every route of the app in
each state its queries can take, from typed fixtures, with no backend and no story, harness or
Storybook config in the consumer's repo.

## Install

```bash
stack add screens
```

`stack add screens` writes Storybook, its addons, MSW, and Vitest with Playwright for the test run
into the app's `devDependencies`; they are optional peers of this package, so an app that has
auth or react-ui without `screens()` installs none of them. The oRPC packages the host answers
with are this package's own dependencies. It requires `react` (the routes) and
`api` (the procedures).

## Requirements

- **A browser for the test run.** `stack screens test` drives Chromium through Playwright. Install it
  once with `npx playwright install chromium`, or point `CHROME_PATH` at a Chrome to launch
  instead; with neither, the run fails with that one line and exits non-zero. A `CHROME_PATH`
  that does not exist fails before anything is generated.
- **Storybook 10 and Vitest 5.** The host is Storybook `^10.6` (`@storybook/react-vite`,
  `@storybook/addon-a11y`, `@storybook/addon-vitest`) and the run is Vitest `^5.0` with
  `@vitest/browser-playwright`; `stack add screens` writes those majors, and an app on an
  earlier major of either is unsupported.

## Guide

Using the workbench lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`screens.md`](./guide/screens.md), the two commands, a screen's five states, the fixtures in
`src/app/fixtures.ts`, the test run's checks and the limits.

## Plugin implementation

Requires `react` and `api`. Subpaths: `./vite` (the host's Vite plugins: `screensPlugin` and `storybookHost`), `./storybook` (the
Storybook config), `./node` (`writeStorybookConfig`, below), and, as source the host's Vite compiles, `./fixtures`, `./channels`, `./msw` (the app's MSW,
re-exported for a plugin's handler module), `./preview`, `./floors` (the test run's checks) and `./stories`. The packages
`stack add screens` installs are the plugin's `devDependencies` and the manifest's
`peerDependencies` (every one optional). `src/node/` runs in Node (compiled to `dist`), `src/ui/` in the browser.

### Owned slots

| Slot | Kind | Purpose |
| --- | --- | --- |
| `handlerModules` | list | Module specifiers a plugin contributes for endpoints it owns outside the app's router; each default-exports an array of MSW request handlers |
| `fixtureModules` | list | Module specifiers a plugin contributes for the oRPC procedures it owns; each default-exports a fixtures tree, answered after the app's own `src/app/fixtures.ts`, so the app overrides a plugin's answer per procedure |
| `viteConfig` | derived | `.stack/screens.vite.config.ts`: the app's own config rendered from the same `vite.slots.*` values by `@fcalell/plugin-vite/node`, with the router plugin from `react.slots.routerPlugin` and the host's adaptations; null without routes |
| `storybookMain` | derived | `.stack/screens/main.ts`, Storybook's one config file; null without routes |
| `testMain` | derived | `.stack/screens-test/main.ts`, the same with the floors, which only `stack screens test` loads; null without routes |
| `vitestConfig` | derived | `.stack/screens.vitest.config.ts`: `viteConfig`'s file with one browser project on the Storybook test plugin; null without routes |

### A Storybook that draws components

`writeStorybookConfig({ config, cwd })` from `@fcalell/plugin-screens/node`, called from a Storybook
config of the app's own (the showcase's roster) with its `stack.config.ts`, resolves the slot graph
and writes `.stack/storybook.vite.config.ts` (the app's own plugin calls without the router plugin,
which lives in `vite.slots.appPlugins`, `storybookHost()` in place of `screensPlugin`, no headers,
proxy or port) and returns its path, for Storybook's `viteConfigPath` and Vite's
`loadConfigFromFile`. `stack generate` never writes it.

### How a screen is served

- **Host config.** `viteConfig` reads vite's input slots and react's `routesDir`, `entryImports` and
  `routerBindings`, and renders them with `clientHeaders: {}` (the frame-blocking headers would
  block Storybook's preview iframe), no proxy and no port, plus one host-only plugin call,
  `screensPlugin`, that never reaches the app's `.stack/vite.config.ts`. Vite's root stays
  `.stack/`: every path a contribution hands a plugin is anchored on the config file.
- **Stories.** `stack-screens/` at the app root (gitignored, no dot directory: Storybook's watcher
  ignores those) holds one CSF file per file that declares `createFileRoute("<id>")`, mirroring the
  id (`stack-screens/projects/$id.stories.ts`), written by a `postWrite` hook after every generate
  and, while `stack screens dev` runs, by `screensPlugin` on the routes directory's add, change and
  unlink events. A file is the route's id and its imports, so a route edit rewrites nothing. It
  imports, as side effects, the root route, each layout route above the route, the route, its lazy
  sibling and the fixtures: the screen's import graph, which `vitest --changed` walks. The stories
  render the app's `routeTree` from the virtual module, an edge the walk drops.
- **Check variants.** Beside each state's story the file exports one hidden story (`!dev`, so the
  sidebar omits it and the test run keeps it) per combination of the globals' `checked` values other
  than the defaults, with story-level `globals`: `Data, dark`. react-ui checks `mode` in light and
  dark at the default density.
- **Code splitting.** The host's router plugin runs with `autoCodeSplitting: false`, from
  `react.slots.routerOptions`: the walk drops a split module's id (`?tsr-split=component` fails
  `existsSync`), so a component's edit would reach no screen.
- **A story** renders `createRouter({ routeTree, history: createMemoryHistory({ initialEntries }) })`
  in the app's `virtual:stack-providers`, at the route's full path with its params filled from the
  fixtures, after the entry's own `bindRouter` calls.
- **The answers.** MSW answers every call under the worker's route prefixes in oRPC's wire format
  from the fixtures: data is the fixture, loading holds its queries until the test run's `release()` (the workbench never calls it), error is `INTERNAL_SERVER_ERROR`,
  not found is `NOT_FOUND`, empty is derived from the value (an array answers `[]`, a
  `{ data, nextCursor }` page its envelope with no rows, any other object walked with every array emptied, and a JSON Schema object schema, the format of a stored data layer, its `properties` emptied to `{}`, the rest kept). A forced state applies
  to every query the screen makes, except one a plugin's fixture module answers (the app's own fixture for it overrides and follows the state); a mutation and a plugin-owned procedure always answer from their fixture. A request outside the answered prefixes that reaches for another
  origin or a worker path fails (`onUnhandledRequest`).
- **Channels.** plugin-node contributes `@fcalell/plugin-node/screens` to `handlerModules`: an MSW `ws.link("*/ws")` handler that answers each `{ t: "sub", ch }` with the `{ t: "msg", ch, type, payload }` frame (plugin-node's `ServerFrame`) built by `channelAnswer` from the app's `channels` fixture (the third argument of `defineFixtures`, a map from channel name to `(params) =>` the snapshot payload, or `{ type, payload }` naming another opening message), for the story on screen (`stories.tsx` sets it as the story renders; `./channels` exports both for the handler module). Data sends the frame, loading holds it with the queries, empty applies `emptyOf`, error closes the socket (the protocol has no error frame: the client backs off and pauses the read), not found sends the frame as data (no such frame). A channel with no fixture sends nothing, logs one console error and is a gap of the test run.
- **The worker.** `/mockServiceWorker.js` is served by `screensPlugin` from MSW's package.
- **The test run.** `stack screens test` generates, then runs the app's `vitest run --config
  .stack/screens.vitest.config.ts` (`--changed [<ref>]` unless `--all` or `--screen`,
  `--passWithNoTests`, then the story files `--screen` names). A Vitest killed by a signal (the
  OOM killer's `SIGKILL`) fails the command, naming the signal. `--state`, `--mode`, `--width` and
  `--shots` reach the run in the environment (`STACK_SCREENS_EXCLUDE`, `STACK_SCREENS_WIDTHS`,
  `STACK_SCREENS_SHOTS`, the directory resolved from the app's root), and the floors save a
  `page.screenshot` at each width after its checks when the directory is set: every story
  file carries a tag per state (`state:loading`) and per checked global (`mode:dark`), the config
  hands the storybook plugin the tags to leave out and the floors the widths (`provide`). The config
  spreads `.stack/screens.vite.config.ts`, so the run's host is the workbench's, and runs the Storybook
  test plugin on `.stack/screens-test/`, whose `main.ts` adds `./floors`: axe with every rule on
  (`region`, which the a11y addon turns off, and `target-size`, which axe leaves off), then at each
  of 320, 1280 and 1920 (`page.viewport`, back at the starting size afterwards; a global with
  `byViewport` has its pin taken off meanwhile, so 320 draws the touch density) the overflow check
  and the render walk (`./walk`: the contract's numbers read off the page's computed custom
  properties), and the console check (`console.error`, `console.warn`, window `error`). The browser
  is Playwright's, or `CHROME_PATH` (see Requirements), headless at 1280x800 with two workers at most. The guide page
  (`guide/screens.md`) lists the walk's rules and which run suits which diff.

## License

MIT
