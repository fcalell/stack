# @fcalell/plugin-screens

The screens workbench for `@fcalell/stack`'s web apps: one command serves every route of the app in
each state its queries can take, from typed fixtures, with no backend and no story, harness or
Storybook config in the consumer's repo.

## Install

```bash
stack add screens
```

`stack add screens` writes Storybook, its addons, MSW, the oRPC packages the host answers with,
and Vitest with Playwright for the test run into the app's `devDependencies`; they are optional peers of this package, so an app that has
auth or react-ui without `screens()` installs none of them. It requires `react` (the routes) and
`api` (the procedures).

## Guide

Using the workbench lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`screens.md`](./guide/screens.md), the two commands, a screen's five states, the fixtures in
`src/app/fixtures.ts`, the test run's checks and the limits.

## Plugin implementation

Requires `react` and `api`. Subpaths: `./vite` (the host's Vite plugins: `screensPlugin` and `storybookHost`), `./storybook` (the
Storybook config), `./node` (`writeStorybookConfig`, below), and, as source the host's Vite compiles, `./fixtures`, `./msw` (the app's MSW,
re-exported for a plugin's handler module), `./preview`, `./floors` (the test run's checks) and `./stories`. The packages
`stack add screens` installs are the plugin's `devDependencies` and the manifest's
`peerDependencies` (every one optional); `test/peers.test.ts` holds them together. `src/node/` runs in Node (compiled to `dist`), `src/ui/` in the browser and in the
unit tests.

### Owned slots

| Slot | Kind | Purpose |
| --- | --- | --- |
| `handlerModules` | list | Module specifiers a plugin contributes for endpoints it owns outside the app's router; each default-exports an array of MSW request handlers |
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
  from the fixtures: data is the fixture, loading never settles, error is `INTERNAL_SERVER_ERROR`,
  not found is `NOT_FOUND`, empty is derived from the value (an array answers `[]`, a
  `{ data, nextCursor }` page its envelope with no rows, a record as it is). A forced state applies
  to every call the screen makes. A request outside the answered prefixes that reaches for another
  origin or a worker path fails (`onUnhandledRequest`).
- **The worker.** `/mockServiceWorker.js` is served by `screensPlugin` from MSW's package.
- **The test run.** `stack screens test` generates, then runs the app's `vitest run --config
  .stack/screens.vitest.config.ts` (`--changed [<ref>]` unless `--all`, `--passWithNoTests`). The config
  spreads `.stack/screens.vite.config.ts`, so the run's host is the workbench's, and runs the Storybook
  test plugin on `.stack/screens-test/`, whose `main.ts` adds `./floors`: axe with every rule on
  (`region`, which the a11y addon turns off, and `target-size`, which axe leaves off), the overflow
  check (`page.viewport` at 320, 390, 768, 1280 and 1440, back at the starting size afterwards) and
  the console check (`console.error`, `console.warn`, window `error`). The browser is Playwright's,
  or `CHROME_PATH`, headless at 1280x800 with two workers at most.

## License

MIT
