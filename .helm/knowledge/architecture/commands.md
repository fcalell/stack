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
the app's plugins so a one-of the app meets adds nothing. `init` validates the finished closure,
so a selection meeting a one-of twice fails before the scaffold. The default lives in the
requiring plugin's declaration, so the CLI names no domain.
In an app inside stack's own workspace, every `@fcalell/*` spec becomes `workspace:*` instead,
no `pnpm-workspace.yaml` or `biome.json` is written, and the workspace root installs
([consumer-project](./consumer-project.md#inside-stacks-workspace)).
The scaffold then runs in the app's installed `@fcalell/cli`, imported from the app's root,
which need not be the copy that started `init`: slots match by identity, and the installed
plugins import the app's copy. It writes the CLI-owned base files (the tsconfigs, `biome.json`,
`.editorconfig`, `.gitignore`, each only when missing) and makes `CLAUDE.md` import `@.stack/guide.md`: the file
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
`log`, `prompt`, and `resolve(slot)`.

## Limits

- Every install builds the stack workspace once per git package (see [consumer-project](./consumer-project.md#from-github)), so a first `stack init` takes about eight minutes, one prepare at a time.
