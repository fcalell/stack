# Commands

`stack` runs every step of the app's lifecycle; the plugins in `stack.config.ts` decide what each
step does. Run a command from the app's root. Every command but `init` takes
`--config <path>` (default `stack.config.ts`).

| Command | Run it when |
| --- | --- |
| `stack init [dir] [--plugins <csv>] [--domain <d>] [-y]` | Starting an app. It writes `package.json` and `pnpm-workspace.yaml`, installs, scaffolds the project, then runs `generate` |
| `stack add <plugin>` | Adding a plugin: it installs the plugin, asks its questions, writes its files, patches the config and regenerates. A plugin that takes the place of one the app has replaces it: `stack add node` on a cloudflare app switches the server target to node, after asking |
| `stack remove <plugin>` | Dropping a plugin no other plugin requires: it removes the plugin's files and dependencies, patches the config and regenerates |
| `stack generate` | After editing `stack.config.ts`, or when `.stack/` is missing. `dev` and `build` run it first |
| `stack dev` | Working on the app: every plugin's dev process (the worker, the Node server, Vite) runs in one terminal, and the watchers regenerate as files change. Metro is not one: it runs under `stack expo dev` (`node_modules/@fcalell/plugin-expo/guide/builds.md`) |
| `stack screens dev [--port 6006]` | Designing or changing a web screen: it serves every route in each of its query states from `src/app/fixtures.ts`, with no backend (`node_modules/@fcalell/plugin-screens/guide/screens.md`) |
| `stack build` | Building for production |
| `stack deploy` | Shipping: it builds, shows each pre-deploy check for confirmation, then deploys |
| `stack <plugin> <command>` | A plugin's own command, such as `stack db push` |

The app's `package.json` scripts wrap them (`pnpm dev`, `pnpm build`, `pnpm run deploy`,
`pnpm generate`), and `pnpm check` type-checks, tests (`node --test` over `src/**/*.test.ts`)
and lints the app. `pnpm check` is the check every change ends with.

## Updating stack

`pnpm-lock.yaml` pins every `@fcalell/*` package to one commit of stack's repository; the
specs in `package.json` carry none. `pnpm update "@fcalell/*"` moves them all to stack's latest
commit together. Never edit a spec or the lockfile by hand.

**Check:** every `@fcalell/*` entry in `pnpm-lock.yaml` names the same commit.

## What `init` writes

- `package.json` and `pnpm-workspace.yaml`, then the install: every `@fcalell/*` package comes
  from stack's repository, at the commit `pnpm-lock.yaml` records.
- `tsconfig.json` (and, for an app with a worker, `tsconfig.app.json`, `tsconfig.worker.json`
  and `tsconfig.test.json`), `biome.json`, `.gitignore` and `stack.config.ts`, each only when
  missing. A plugin a picked plugin requires is picked with it. When a plugin needs exactly one
  of several (the API needs a server target, cloudflare or node), init asks which; init run
  with flags or without a terminal, and `stack add`, take the plugin's default, cloudflare for
  the API.
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
