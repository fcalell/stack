# @fcalell/plugin-screens

The screens workbench for `@fcalell/stack`'s web apps: one command serves every route of the app in
each state its queries can take, from typed fixtures, with no backend and no story, harness or
Storybook config in the consumer's repo.

## Install

```bash
stack add screens
```

`stack add screens` writes Storybook, its addons, MSW and the oRPC packages the host answers with
into the app's `devDependencies`; they are optional peers of this package, so an app that has
auth or react-ui without `screens()` installs none of them. It requires `react` (the routes) and
`api` (the procedures).

## Guide

Using the workbench lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`screens.md`](./guide/screens.md), the command, a screen's five states, the fixtures in
`src/app/fixtures.ts` and the limits.

## Plugin implementation

Requires `react` and `api`. Subpaths: `./vite` (the host's Vite plugins: `screensPlugin` and `storybookHost`), `./storybook` (the
Storybook config), `./node` (`writeStorybookConfig`, below), and, as source the host's Vite compiles, `./fixtures`, `./msw` (the app's MSW,
re-exported for a plugin's handler module), `./preview` and `./stories`. The packages
`stack add screens` installs are the plugin's `devDependencies` and the manifest's
`peerDependencies` (every one optional); `test/peers.test.ts` holds them together. `src/node/` runs in Node (compiled to `dist`), `src/ui/` in the browser and in the
unit tests.

### Owned slots

| Slot | Kind | Purpose |
| --- | --- | --- |
| `handlerModules` | list | Module specifiers a plugin contributes for endpoints it owns outside the app's router; each default-exports an array of MSW request handlers |
| `viteConfig` | derived | `.stack/screens.vite.config.ts`: the app's own config rendered from the same `vite.slots.*` values by `@fcalell/plugin-vite/node`, with the router plugin from `react.slots.routerPlugin` and the host's adaptations; null without routes |
| `storybookMain` | derived | `.stack/screens/main.ts`, Storybook's one config file; null without routes |

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
- **Stories.** `stories` is the routes directory's glob and a custom indexer turns each file that
  declares `createFileRoute("<id>")` into five stories, whose importPath is a virtual module id.
  `screensPlugin` serves that id as CSF: one `screenStory(<id>, <state>)` per state. No story file
  exists, and Storybook's watcher on the route files re-indexes an added or edited route.
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

## License

MIT
