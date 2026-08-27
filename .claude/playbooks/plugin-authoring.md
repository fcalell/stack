# Plugin authoring

> **Load when:** writing or modifying a plugin: its `plugin()` definition, slots, contributions,
> commands, callbacks, templates, or runtime. Folder layout and placement rules live in
> `conventions.md`; slot semantics in `.knowledge/architecture/slot-graph.md`; the full slot
> registry and spec types in `.knowledge/architecture/slot-catalog.md`.

## Design paradigm

A plugin's job is to take a domain (db, auth, UI, …) and make it invisible to the consumer. Keep
these paradigms in mind every time you add a plugin or feature:

- **Automate by default.** If the plugin can generate, infer, default, or auto-wire a value, do it;
  don't expose an option. The target is zero hand-written glue in the consumer's repo. A new
  consumer-facing option is the last resort, and every option needs a sensible default.
- **Contribute, don't coordinate.** You talk to the slot graph, never to other plugins. To hand a
  value to plugin B, contribute to one of B's slots (`B.slots.foo.contribute(fn)`). To read a value
  from plugin B, declare a derived slot with `inputs: { foo: B.slots.foo }`. Never import another
  plugin's internals at runtime; never call into another plugin's functions to coordinate timing.
- **Speak the shared contract.** `plugin()`, `slot.*`, `ContributionCtx`, typed payloads, and AST
  specs are the only surface. Don't introduce a sibling mechanism (custom file formats,
  plugin-to-plugin hooks, globals). A third-party plugin shipped outside this repo must be able to
  do everything a first-party plugin does with the same interface.
- **Own the domain end-to-end.** Anything domain-specific (option types, slot definitions, codegen
  aggregators, runtime factories, CLI subcommands) lives in the plugin. Never leak a domain type
  into `@fcalell/cli`. If you catch yourself editing `packages/cli/src/` to land a feature, stop
  and move it.

## The `plugin()` contract

```ts
import { plugin, slot, callback } from "@fcalell/cli";

export const auth = plugin("auth", {
  label: "Authentication",
  package: undefined,            // default: `@fcalell/plugin-${name}`. Override for third-party.

  schema: authOptionsSchema,     // Zod schema — validates options + pins TOptions

  requires: ["api", "cloudflare", "db"],   // presence-only sibling plugins (nicer error messages)

  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
    // Second type argument = the handler's return type. Defaults to
    // `void | Promise<void>`; declare it when the framework reads the value
    // synchronously instead of awaiting the call.
    generateOTP: callback.optional<{ email: string }, string | undefined>(),
  },

  commands: {
    push: { description: "Push schema", handler: async (ctx, flags) => { /* ... */ } },
  },

  dependencies: { "@fcalell/plugin-auth": "workspace:*" },  // auto-wired into cliSlots.initDeps
  devDependencies: { /* ... */ },                            // auto-wired into cliSlots.initDevDeps
  gitignore: [".wrangler"],                                  // auto-wired into cliSlots.gitignore

  slots: {
    runtimeOptions: /* slot.derived(...) */,
  },

  contributes: (self) => [
    /* ... Contribution<T>[] ... */
  ],
});
```

The returned `auth` is callable (`auth({ cookies: { prefix: "myapp" } })`) and exposes `.slots`,
`.cli`, `.requires`, `.package`. When `callbacks` is declared, it also exposes
`.defineCallbacks(impl)` for consumer callback files. When a plugin has both `callbacks` and a
`./runtime` export, the framework auto-scaffolds `src/worker/plugins/<name>.ts` from a
`templates/callbacks.ts` template.

Key fields:

- `label`: human label used in the CLI picker.
- `schema`: Zod schema for plugin options (see next section).
- `requires`: presence-only sibling-plugin names. The CLI surfaces a missing entry with an
  actionable error; ordering is derived from slot edges, not from this list.
- `slots`: slots owned by this plugin, exposed on the returned factory as `.slots` so other plugins
  can contribute or derive.
- `contributes`: array (or `(self) => array`) of `Contribution`s built via `someSlot.contribute(fn)`.
  The `self` argument carries the plugin's own slots and typed options so the plugin can reference
  them without forward-ref problems.
- `commands`: subcommands routed as `stack <plugin> <command>`.
- `callbacks`: typed callback slots for consumer callback files.
- `dependencies` / `devDependencies` / `gitignore`: auto-wired into `cliSlots.initDeps` /
  `cliSlots.initDevDeps` / `cliSlots.gitignore` (and the matching `cliSlots.removeDeps` /
  `cliSlots.removeDevDeps` for cleanup).

## Options via `schema`

Plugin options are declared as a Zod schema. `plugin()` validates the caller's input through it,
applies defaults, and, because `schema?: z.ZodType<unknown, TOptions>` pins `TOptions` to
`z.input<typeof schema>`, types your options everywhere they're read with the *resolved*
(post-default) shape: command handlers via `ctx.options`, contribution functions via the
`self.options` helper, and a module-level `slot.derived`/`slot.value` via an annotated
`ctx: ContributionCtx<XOptions>` on its `compute`/`seed`. The one place options stay `unknown` is a
raw `ContributionCtx` inside a cross-plugin `.contribute(fn)`: there `ctx.options` belongs to the
*contributing* plugin, so no single type is sound; read your own options through `self.options`
instead.

```ts
// plugins/<name>/src/types.ts
import { z } from "zod";
export const authOptionsSchema = z.object({
  cookies: z.object({ prefix: z.string().optional() }).optional(),
  secretVar: z.string().default("AUTH_SECRET"),
});
export type AuthOptions = z.input<typeof authOptionsSchema>;
```

A plugin that genuinely has no options omits the `schema` field entirely.

## Contributing to a slot

Every `Slot<T>` has a `.contribute(fn)` method. `fn` receives a `ContributionCtx` and returns a
value, or `undefined` to skip (the canonical pattern for conditional contributions).

```ts
import { cloudflare } from "@fcalell/plugin-cloudflare";

contributes: (self) => [
  cloudflare.slots.bindings.contribute(() => {
    if (self.options.dialect !== "d1") return undefined;         // skip on sqlite
    return {
      kind: "d1",
      binding: self.options.binding ?? "DB_MAIN",
      databaseId: self.options.databaseId,
    };
  }),

  // List slots also accept arrays — push many in one shot.
  cloudflare.slots.secrets.contribute(() => [
    { name: "AUTH_SECRET", devDefault: "dev-secret" },
    { name: "APP_URL", devDefault: "http://localhost:3000" },
  ]),
],
```

**ContributionCtx** carries:

- `app: AppConfig`: top-level identity (`name`, `domain`, `origins`).
- `options: TOptions`: this plugin's validated options (typed via the plugin's schema).
- `cwd: string`: consumer's working directory.
- `fileExists(path)` / `readFile(path)`: relative to `cwd`.
- `template(name): URL`: resolves a path inside this plugin's `templates/` directory.
- `scaffold(name, target): ScaffoldSpec`: convenience for
  `{ source: template(name), target, plugin: thisName }`.
- `log: { info, warn, success, error }`: Clack-style logging.
- `resolve<T>(slot): Promise<T>`: pull any slot value during a contribution. Use sparingly; prefer
  declaring a derived slot when a value is structurally needed.

For the "resolve a `*Source` slot, write it under `.stack/`" pattern, use `emitArtifact` (see the
slot-catalog entry) instead of a raw `cliSlots.artifactFiles.contribute`.

## Deriving from other slots

A derived slot reads other slots as inputs. The framework guarantees inputs are fully resolved
before `compute` runs, so cross-plugin reads are deterministic by construction.

```ts
import { slot } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";

const runtimeOptions = slot.derived<
  Record<string, TsExpression>,
  { cors: typeof api.slots.cors; devCors: typeof api.slots.devCorsOrigins }
>({
  source: "auth",
  name: "runtimeOptions",
  inputs: { cors: api.slots.cors, devCors: api.slots.devCorsOrigins },
  compute: (inp, ctx) => {
    const props = literalToProps(ctx.options as Record<string, unknown>);
    if (inp.cors.length > 0) {
      props.trustedOrigins = { kind: "array", items: inp.cors.map((o) => ({ kind: "string", value: o })) };
    }
    if (inp.devCors.length > 0) {
      props.devTrustedOrigins = { kind: "array", items: inp.devCors.map((o) => ({ kind: "string", value: o })) };
    }
    return props;
  },
});
```

This is the structural answer to "how do I order myself after another plugin": you don't. You
declare what you read, and the framework runs you when those reads are ready
(`.knowledge/architecture/slot-graph.md`).

## Templates

Templates live on disk under `plugins/<name>/templates/` as lintable source files. List them in
`package.json` `files` so they're published. Plugins push `ScaffoldSpec`s into
`cliSlots.initScaffolds`; the CLI copies them once and fails on duplicate targets. Use
`slot.value({ override: true })` if you need a slot-driven scaffold that another plugin can replace
(see `solid.slots.homeScaffold`, which `plugin-solid-ui` overrides with the design-system home
page).

```ts
contributes: [
  cliSlots.initScaffolds.contribute((ctx) =>
    ctx.scaffold("schema.ts", "src/schema/index.ts")
  ),
],
```

## Checklist before publishing a plugin

1. Templates live on disk under `templates/` and are listed in `package.json` `files`.
2. `node/` and `worker/` are split; no cross-imports.
3. Runtime (if any) is exported from `./runtime` and takes plain options, not `PluginConfig`.
4. Commands are routable via `stack <plugin> <command>`.
5. Cross-plugin dataflow is expressed via slot imports: `B.slots.foo.contribute(...)` to push,
   `slot.derived({ inputs: { foo: B.slots.foo }, ... })` to read. No `requires:` for ordering (it's
   presence-only).
6. New/renamed/removed slots are reflected in `.knowledge/architecture/slot-catalog.md` in the same
   commit.
