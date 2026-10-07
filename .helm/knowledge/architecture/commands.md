# CLI commands & procedures

The `stack` CLI surface and what each command resolves. There is no event lifecycle: each command
resolves a fixed set of root slots from the graph and acts on the result.

## Consumer-facing surface

```bash
stack init [dir]             # Interactive project scaffold (pick plugins)
stack add <plugin>           # Add a plugin to an existing project
stack remove <plugin>        # Remove a plugin (checks dependents)
stack generate               # Regenerate .stack/ files from config
stack dev                    # Plugin-driven dev (processes, watchers, schema push)
stack build                  # Plugin-driven production build
stack deploy                 # Plugin-driven deploy (migrations, wrangler)
stack <plugin> <command>     # Plugin subcommands (e.g. stack db push)
```

## Command procedures

| Command | Roots resolved (order shown matches procedure) |
|---------|-----------------------------------------------|
| `stack init` / `stack add` | write the plugins' packages and `pnpm-workspace.yaml` → `pnpm install` (again until every `requires` is installed) → `cliSlots.initPrompts` → render `stack.config.ts` → `cliSlots.initScaffolds` + `initDeps` + `initDevDeps` + `gitignore` → `pnpm install` → run `generate` |
| `stack generate` | `cliSlots.artifactFiles` → write each `{ path, content }` → resolve `cliSlots.postWrite` → await each |
| `stack dev` | `generate` → `cliSlots.devProcesses` (spawn) → `cliSlots.devReadySetup` (post-ready) → `cliSlots.devWatchers` (chokidar) |
| `stack build` | `generate` → `cliSlots.buildSteps` (sorted by phase + order) → exec sequentially |
| `stack deploy` | `build` → `cliSlots.deployChecks` (display + confirm) → `cliSlots.deploySteps` → exec sequentially |
| `stack remove` | `cliSlots.removeFiles` + `removeDeps` + `removeDevDeps` filtered to target plugin → patch config → `generate` |
| `stack <plugin> <command>` | Plugin's own `commands[name].handler(ctx)` — `ctx.resolve(slot)` is the escape hatch to pull arbitrary slot values |

`stack init` first writes `package.json` (only when missing) and `pnpm-workspace.yaml`, every
`@fcalell/*` spec from the CLI's table ([consumer-project](./consumer-project.md#from-github)),
and installs: a plugin loads only once installed, and its `requires` is known only once loaded.
One-of requirements (api's server target) settle after the named closure, so a plugin any
selected plugin names meets them. One still unmet is asked by interactive `init` and takes the
first of its `oneOf` under flags, without a TTY, and in `stack add`, whose closure starts from
the app's plugins so a one-of the app meets adds nothing. `stack add` of a plugin meeting a
one-of the app already meets replaces the plugin meeting it (`stack add node` on a cloudflare
app): it asks first when interactive, removes the displaced plugin through `remove`'s cleanup
before installing, so a dependency both bring survives, and never runs `remove`'s dependents
check, since the added plugin meets the requirement. `init` validates the finished closure,
so a selection meeting a one-of twice fails before the scaffold. The default lives in the
requiring plugin's declaration, so the CLI names no domain.
In an app inside stack's own workspace, every `@fcalell/*` spec becomes `workspace:*` instead,
no `pnpm-workspace.yaml` is written, its `biome.json` extends the checkout's, and the workspace root installs
([consumer-project](./consumer-project.md#inside-stacks-workspace)).
The scaffold then runs in the app's installed `@fcalell/cli`, imported from the app's root,
which need not be the copy that started `init`: slots match by identity, and the installed
plugins import the app's copy. It writes the CLI-owned base files (the tsconfigs, `biome.json`,
`.editorconfig`, `.gitignore`, each only when missing), runs `generate`, then formats what it wrote
(the app's `biome.json` extends the generated `.stack/biome.json`), and makes `CLAUDE.md` import `@.stack/guide.md`: the file
is created with that line when missing, and the line appended when absent
([consumer-project](./consumer-project.md#the-guide)).

The generate procedure is just "resolve every artifact file, write it, then run any postWrite
hooks". One artifact is the CLI's own: `.stack/guide.md`, rendered from `cliSlots.guide` (the
CLI's `provided`, `config`, `commands` and `gap` pages beside every plugin's), one line per page,
`- <trigger> → node_modules/<package>/guide/<page>.md`, grouped under a heading per domain in
name order, a page two plugins list written once. `plugin-cloudflare` contributes a `postWrite` hook that shells out to `wrangler types`
after `.stack/wrangler.toml` lands.

## Plugin subcommands

Plugins register subcommands via the `commands` field on `plugin()`; the CLI auto-routes
`stack <plugin> <command>`:

```
$ stack db push          # Push schema to local database
$ stack db generate      # Generate migration files
$ stack db apply         # Apply pending migrations
$ stack db reset         # Reset local database
```

Each handler receives a `CommandContext` with `options` (typed from the plugin's schema), `cwd`,
`log`, `prompt`, `resolve(slot)` and `generate()`. `generate()` runs `stack generate`'s own
function in process, against the same config and `cwd`: every artifact is written and every
`postWrite` hook has run when it resolves. A command that reads generated files calls it first
instead of spawning the CLI; `resolve` keeps answering from the graph built before the call.

## Screens

`stack screens dev [--port 6006]` runs `ctx.generate()` (the route tree, the stylesheet, the screens files and the story files must exist), then Storybook on the config directory `.stack/screens/`, whose Vite config is `.stack/screens.vite.config.ts`. The story files in `stack-screens/` at the app root, one per route, are its stories. The Storybook packages are the app's own (`stack add screens` writes them as `devDependencies`, see [consumer-project](./consumer-project.md#from-github)); the handler runs the `storybook` the app installs and the config resolves its framework and addon from the app. The handler resolves no slot: both screens files are `generate` artifacts, `screens.slots.viteConfig` and `storybookMain`. A Storybook of the app's own that draws components (the showcase's roster) runs on a third, `.stack/storybook.vite.config.ts`, which its own config writes by calling `writeStorybookConfig` from `@fcalell/plugin-screens/node`; `generate` never writes it and no command serves it.

`stack screens test [--all]` runs `ctx.generate()` and then the app's own `vitest run --config .stack/screens.vitest.config.ts --passWithNoTests`, adding `--changed` unless `--all`: Vitest reruns the story files whose import graph holds a file with uncommitted changes. It runs on `.stack/screens-test/`, the same Storybook config plus the floors (`@fcalell/plugin-screens/floors`): axe with every rule on (`region` and `target-size` included), no horizontal overflow at 320, 390, 768, 1280 and 1440 px (`horizontal overflow at <w>px: scrollWidth <n>`), and no `console.error`, `console.warn` or window `error`. A test is a story, named for the screen's title, the state and the mode (`Screens/projects/$id`, `Data, dark`).

A story's forced state (loading, error, empty, not found) answers a query only; a mutation always answers from its fixture (or `no fixture for <path>`). The kind is the HTTP method: stack's client sends a query as `GET` and a mutation as `POST` (see [runtime](./runtime.md)), so the answerer reads it off the request, with no header of its own.

## Limits

- Every install builds the stack workspace once per git package (see [consumer-project](./consumer-project.md#from-github)), so a first `stack init` takes about eight minutes, one prepare at a time.
