# CLI commands & procedures

The `stack` CLI surface and what each command resolves. There is no event lifecycle: each command
resolves a fixed set of root slots from the graph and acts on the result.

## Consumer-facing surface

```bash
stack init [dir]             # Interactive project scaffold (pick plugins)
stack add <plugin>           # Add a plugin to an existing project
stack remove <plugin>        # Remove a plugin (checks dependents)
stack generate               # Regenerate .stack/ files from config
stack dev [--studio]         # Plugin-driven dev (processes, watchers, schema push)
stack build                  # Plugin-driven production build
stack deploy                 # Plugin-driven deploy (migrations, wrangler)
stack <plugin> <command>     # Plugin subcommands (e.g. stack db push)
```

## Command procedures

| Command | Roots resolved (order shown matches procedure) |
|---------|-----------------------------------------------|
| `stack init` / `stack add` | `cliSlots.initPrompts` → render `stack.config.ts` → `cliSlots.initScaffolds` + `initDeps` + `initDevDeps` + `gitignore` → run `generate` |
| `stack generate` | `cliSlots.artifactFiles` → write each `{ path, content }` → resolve `cliSlots.postWrite` → await each |
| `stack dev` | `generate` → `cliSlots.devProcesses` (spawn) → `cliSlots.devReadySetup` (post-ready) → `cliSlots.devWatchers` (chokidar) |
| `stack build` | `generate` → `cliSlots.buildSteps` (sorted by phase + order) → exec sequentially |
| `stack deploy` | `build` → `cliSlots.deployChecks` (display + confirm) → `cliSlots.deploySteps` → exec sequentially |
| `stack remove` | `cliSlots.removeFiles` + `removeDeps` + `removeDevDeps` filtered to target plugin → patch config → `generate` |
| `stack <plugin> <command>` | Plugin's own `commands[name].handler(ctx)` — `ctx.resolve(slot)` is the escape hatch to pull arbitrary slot values |

The generate procedure is just "resolve every artifact file, write it, then run any postWrite
hooks". `plugin-cloudflare` contributes a `postWrite` hook that shells out to `wrangler types`
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
