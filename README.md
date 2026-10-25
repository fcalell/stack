# @fcalell/stack

A plugin-driven TypeScript full-stack framework: Hono on Cloudflare Workers or Node, React on Vite, React Native on Expo, Drizzle, Better Auth — behind one `stack` CLI.

[![status: alpha](https://img.shields.io/badge/status-alpha-orange)](#status)
[![npm](https://img.shields.io/npm/v/@fcalell/cli?label=npm)](https://www.npmjs.com/package/@fcalell/cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> [!WARNING]
> **Alpha.** Stack is under active development. Plugin slots, generated files and CLI commands may change between minor versions; pin exact versions and read each release's notes before upgrading. It runs two in-repo apps and one external consumer today and has no other users yet.

A project is a `stack.config.ts`, a `domain`, a `plugins` array, and its own business logic:

```ts
import { defineConfig } from "@fcalell/cli";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";
import { api } from "@fcalell/plugin-api";
import { vite } from "@fcalell/plugin-vite";
import { react } from "@fcalell/plugin-react";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [
    db({ dialect: "d1", databaseId: "9a619a0b-..." }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api(),
    vite(),
    react({ description: "My app" }),
  ],
});
```

Plugins coordinate through typed slots in a dataflow graph: each plugin contributes typed values into other plugins' slots and derives values from them, and the framework resolves the graph once per command. The order of plugins in the array does not matter. Every plugin must be listed explicitly; `stack init` adds missing dependencies (picking `native-ui` also adds `expo`).

## Quick start

Requires Node 24 or newer and pnpm. Tested on POSIX systems (Linux, macOS); Windows is untested.

```bash
pnpm add -D @fcalell/cli
pnpm exec stack init my-app
```

`stack init` prompts for plugins and plugin-specific options, scaffolds the project, and generates `.stack/`. From inside the project, `stack dev` starts the plugin-driven dev loop (processes, watchers, schema push).

## What you get

- **Database**: Drizzle ORM for Cloudflare D1 and SQLite (`@fcalell/plugin-db`).
- **Auth**: Better Auth integration, RBAC, access control (`@fcalell/plugin-auth`).
- **API**: Hono + oRPC behind a procedure builder with auth, rate limiting, and a typed client (`@fcalell/plugin-api`).
- **Web**: React on Vite with TanStack Router file routes, the React Compiler, and the HTML shell (`@fcalell/plugin-react`).
- **UI**: one design system, `@fcalell/ui-core`. On the web its stylesheet, fonts, words and showcase over Tailwind v4 (`@fcalell/plugin-react-ui`); on the phone its roster in React Native + uniwind (`@fcalell/plugin-native-ui`).
- **Tooling**: one `stack` CLI for init, dev, build, deploy. TypeScript and Biome presets included.

Consumers never install or import `drizzle-orm`, `hono`, `zod`, `vite`, or `tailwindcss` directly. Plugins wrap their domain and re-export only what is needed.

## Packages

| Package | Purpose |
|---------|---------|
| [`@fcalell/cli`](packages/cli) | `defineConfig()`, `plugin()`, `slot.*`, `stack` CLI, slot graph engine, codegen |
| [`@fcalell/ui-core`](packages/ui-core) | The design contract both UI plugins render from: tokens, foundations, words, variant matrices and the component roster |
| [`@fcalell/typescript-config`](packages/typescript-config) | Shared `tsconfig` presets |
| [`@fcalell/biome-config`](packages/biome-config) | Shared Biome formatter and linter config |

## Plugins

| Plugin | Purpose | Factory |
|--------|---------|---------|
| [`@fcalell/plugin-cloudflare`](plugins/cloudflare) | The Cloudflare Workers target: renders the wrangler config from what other plugins contribute, runs `wrangler` for dev, types and deploy | `cloudflare()` |
| [`@fcalell/plugin-node`](plugins/node) | A long-running Node server target: one process serves the API, the built web client and background services | `node()` |
| [`@fcalell/plugin-db`](plugins/db) | Drizzle ORM clients (D1/SQLite), schema tooling, migrations | `db()` |
| [`@fcalell/plugin-auth`](plugins/auth) | Better Auth integration, RBAC, access control | `auth()` |
| [`@fcalell/plugin-api`](plugins/api) | Hono + oRPC, procedure builder, typed client | `api()` |
| [`@fcalell/plugin-vite`](plugins/vite) | Framework-agnostic Vite lifecycle | `vite()` |
| [`@fcalell/plugin-react`](plugins/react) | React on the web: Vite + React Compiler, TanStack Router file routes, the app entry, providers, and the HTML shell with its `<head>` metadata | `react()` |
| [`@fcalell/plugin-react-ui`](plugins/react-ui) | The design system on the web: `.stack/app.css` from the ui-core contract on Tailwind v4, fonts, the mode script, words, and the showcase data Storybook draws the roster from | `reactUi()` |
| [`@fcalell/plugin-expo`](plugins/expo) | Expo/React Native — Metro + app config + expo-router entry + EAS commands | `expo()` |
| [`@fcalell/plugin-screens`](plugins/screens) | The screens workbench: every route in each query state, from typed fixtures, with no backend | `screens()` |
| [`@fcalell/plugin-native-ui`](plugins/native-ui) | The design system on the phone: the ui-core roster in React Native + Expo + uniwind, the phone layout at every width, fonts, words | `nativeUi()` |

See each plugin's README for config options, commands, event handlers, and runtime exports.

## CLI

| Command | Purpose |
|---------|---------|
| `stack init [dir]` | Interactive project scaffold (pick plugins) |
| `stack add <plugin>` | Add a plugin to an existing project |
| `stack remove <plugin>` | Remove a plugin (checks dependents) |
| `stack generate` | Regenerate `.stack/` files from config |
| `stack dev` | Plugin-driven dev |
| `stack build` | Plugin-driven production build |
| `stack deploy` | Plugin-driven deploy (migrations + wrangler) |
| `stack <plugin> <command>` | Plugin-registered subcommand (e.g. `stack db push`) |
| `stack plugin init <name>` | Scaffold a third-party plugin skeleton |

## Status

Stack is alpha. This table says what the two in-repo apps exercise and what nothing does yet.

| Surface | State |
|---------|-------|
| Showcase app (web): `vite`, `react`, `react-ui`, `screens`, `api`, `cloudflare` target | Exercised by an in-repo app |
| Phone app (React Native): `expo`, `native-ui`, `api`, `db`, `auth`, `cloudflare` target | Exercised by an in-repo app |
| `node` target | Exercised by one consumer outside this repo (a long-running server); no in-repo app uses it |
| Windows | Untested |
| Third-party plugins | Less exercised: supported by design, no known plugin outside this repo |
| Installing from npm | Less exercised: first release (`0.1.0`) |

## Designing screens

A consumer's screens are its own, designed in code by ui-core's screen recipe (`packages/ui-core/guide/screen.md`): composed from the installed `@fcalell/ui-core` roster, judged beside the anchor screen the voice page pins (`packages/ui-core/guide/voice.md`), signed off on the render. A part the roster cannot compose takes the nearest one it can; only a bug or a missing feature that matters is reported as a gap (the CLI's `gap.md`). Details: [consumer-project](docs/architecture/consumer-project.md#designing-screens).

## The guide

Every package ships how to build on it as `guide/*.md`, versioned with the installed package. `stack generate` writes `.stack/guide.md`, an index of every page with the trigger that says when to open it, and `stack init` makes the consumer's `CLAUDE.md` import it, so a session loads only the page a step needs.

## Writing a plugin

Third-party plugins are first-class. Scaffold one with:

```bash
pnpm exec stack plugin init my-plugin
pnpm exec stack plugin init my-plugin --package @acme/stack-plugin-foo --dir ./packages/my-plugin
```

The scaffold produces a `plugin()`-based skeleton and a runtime stub exported from `./runtime`. Publish it under any npm name; consumers add it to `stack.config.ts` like any built-in plugin.

## Documentation

- [`docs/architecture/overview.md`](docs/architecture/overview.md): the packages and dependency graph, the slot graph and catalog, command procedures, the runtime, the generated-file layout, the ui-core design contract, coding conventions and plugin authoring.
- [`docs/product.md`](docs/product.md): what the framework is for.
- Each plugin's README, linked in the table above.
- The guide pages, in `packages/*/guide/` and `plugins/*/guide/`.

## Repository commands

```bash
pnpm check            # Type-check every package, run the tests, then lint (Biome)
pnpm build            # Compile every package's src/ to dist/ and build the apps
pnpm showcase         # Build the showcase's dependencies and serve it on :3000
pnpm stories          # Storybook for the roster, on :6006
```

Every package ships compiled `dist/` for what Node runs (Node strips no types under `node_modules`); `.tsx`, `.css` and `src/ui/` entries stay source for the consumer's bundler. Install from npm with `pnpm add`. In this repo `pnpm install` builds everything through each package's `prepare`, so a `link:` consumer sees `dist/` after an install here, and `pnpm turbo run build` after a source change. Taking stack from npm or linking a checkout: [consumer-project](docs/architecture/consumer-project.md#installing-stack).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Report vulnerabilities privately, as [SECURITY.md](SECURITY.md) describes. Do not open a public issue.

## License

[MIT](LICENSE)
