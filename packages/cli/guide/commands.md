# Commands

`stack` runs every step of the app's lifecycle; the plugins in `stack.config.ts` decide what each
step does. Run a command from the app's root. Every command but `init` takes
`--config <path>` (default `stack.config.ts`).

| Command | Run it when |
| --- | --- |
| `stack init [dir] [--plugins <csv>] [--domain <d>] [-y]` | Starting an app. It scaffolds the project, then runs `generate` |
| `stack add <plugin>` | Adding a plugin: it asks the plugin's questions, writes its files, patches the config and regenerates |
| `stack remove <plugin>` | Dropping a plugin no other plugin requires: it removes the plugin's files and dependencies, patches the config and regenerates |
| `stack generate` | After editing `stack.config.ts`, or when `.stack/` is missing. `dev` and `build` run it first |
| `stack dev` | Working on the app: every plugin's dev process (the worker, the Node server, Vite) runs in one terminal, and the watchers regenerate as files change. Metro is not one: it runs under `stack expo dev` (`node_modules/@fcalell/plugin-expo/guide/builds.md`) |
| `stack build` | Building for production |
| `stack deploy` | Shipping: it builds, shows each pre-deploy check for confirmation, then deploys |
| `stack <plugin> <command>` | A plugin's own command, such as `stack db push` |

The app's `package.json` scripts wrap them (`pnpm dev`, `pnpm build`, `pnpm run deploy`,
`pnpm generate`), and `pnpm check` type-checks and lints the app. `pnpm check` is the check
every change ends with.

## What `init` writes

- `package.json`, `tsconfig.json` (and, for an app with a worker, `tsconfig.app.json` and
  `tsconfig.worker.json`), `biome.json`, `.gitignore` and `stack.config.ts`, each only when
  missing. A plugin a picked plugin requires is picked with it.
- For an app (`vite` or `expo`) with a worker (`api` or `db`), the app and the worker are two
  projects under a solution `tsconfig.json` with no files of its own, so `check-types` is
  `tsc -b`. Type-check with `pnpm check` or `tsc -b`, never `tsc --noEmit`: on the solution it
  checks nothing and passes.
- Each plugin's starter files, such as `src/schema/index.ts` or `src/app/routes/index.tsx`. A file
  that exists is never overwritten.

## What `generate` writes

Everything under `.stack/` is generated and gitignored: never edit it, change the config or the
source it reads and regenerate.

- `.stack/guide.md`, the index of this guide: one line per page, saying when to open it.
- Each plugin's generated files: the worker entry, the Vite or Metro config, the stylesheet, the
  typed routes, the test entry.

**Check:** after `stack generate`, `.stack/guide.md` lists a domain for every plugin in the
config that ships pages.
