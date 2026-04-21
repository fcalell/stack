# Plugin authoring

Short, concrete guide for writing a `@fcalell/stack` plugin. Conventions on folder layout, hash imports, `worker/` vs `node/` split, and testing live in `.claude/rules/conventions.md` — not repeated here.

## Design paradigm

A plugin's job is to take a domain (db, auth, UI, …) and make it invisible to the consumer. Keep these paradigms in mind every time you add a new plugin or feature:

- **Automate by default.** If the plugin can generate, infer, default, or auto-wire a value, do it — don't expose an option. The target is zero hand-written glue in the consumer's repo. A new consumer-facing option is the last resort, and every option needs a sensible default.
- **Contribute, don't coordinate.** You talk to the CLI, never to other plugins. Push typed payloads into the owning plugin's codegen events (`api.events.Worker`, `cloudflare.events.Wrangler`, `solid.events.Html`, …) and into the core `Generate` / `Init.*` / `Dev.*` / `Build.*` / `Deploy.*` / `Remove` events, then let each aggregator merge. If you need a value from another plugin, order yourself after an event it declares (`after: [otherPlugin.events.Foo]`) or read the shared payload you both contribute to. Never import another plugin's internals at runtime.
- **Speak the shared contract.** `createPlugin`, `RegisterContext`, typed event payloads, and AST specs are the only surface. Don't introduce a sibling mechanism (custom file formats, plugin-to-plugin hooks, globals). A third-party plugin shipped outside this repo must be able to do everything a first-party plugin does with the same interface.
- **Own the domain end-to-end.** Anything domain-specific — option types, codegen, runtime factories, CLI subcommands — lives in the plugin. Never leak a domain type into `@fcalell/cli`. If you catch yourself editing `packages/cli/src/` to land a feature, stop and move it.

## The `createPlugin` contract

```ts
import { callback, createPlugin } from "@fcalell/cli";
import { Dev, Generate, Init, Remove } from "@fcalell/cli/events";

export const auth = createPlugin("auth", {
  label: "Authentication",
  package: undefined,            // default: `@fcalell/plugin-${name}`. Override for third-party.
  events: ["SchemaReady"],       // plugin-scoped events others can depend on
  after: [db.events.SchemaReady],
  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
  },
  commands: {
    push: {
      description: "Push schema",
      handler: async (ctx, flags) => { /* ... */ },
    },
  },
  schema: authOptionsSchema,           // Zod schema — validates + pins `TOptions`
  register(ctx, bus, events) { /* event handlers */ },
});
```

`register` is the heart of the plugin. It subscribes to lifecycle events and mutates the payload each one carries. `ctx` is a `RegisterContext` with `options`, `cwd`, `app`, `hasPlugin`, `readFile`, `fileExists`, `log`, `prompt`. `events` is the plugin's own typed event map (from `events: [...]`).

The returned object is a callable config factory (`auth({ ... })`) plus metadata: `.events`, `.cli`, `.name`, and — if callbacks are declared — `.defineCallbacks(impl)` for consumer callback files.

### Options via `schema`

Plugin options are declared as a Zod schema. `createPlugin` validates the caller's input through it, applies defaults, and — because `schema?: z.ZodType<unknown, TOptions>` pins `TOptions` to `z.input<typeof schema>` — automatically types `ctx.options` and every command handler's `ctx.options`. No extra generic or annotation is needed in the plugin body.

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

## Event lifecycle at a glance

| Event | Payload shape | When to listen |
|---|---|---|
| `Init.Prompt` | `{ configOptions }` | Interactive prompts during `stack init` / `stack add` |
| `Init.Scaffold` | `{ files: ScaffoldSpec[]; dependencies; devDependencies; gitignore }` | Copy template files and declare npm deps |
| `Generate` | `{ files: GeneratedFile[]; postWrite: Array<() => Promise<void>> }` | Emit plain generated files (and enqueue post-write hooks such as `wrangler types`) |
| `api.events.Worker` | `{ imports; base; pluginRuntimes; middlewareChain; handler; cors }` | Contribute to `.stack/worker.ts` (owned by `plugin-api`) |
| `api.events.Middleware` | `{ entries: MiddlewareSpec[] }` | Contribute Hono middleware to the worker chain (owned by `plugin-api`) |
| `cloudflare.events.Wrangler` | `{ bindings: WranglerBindingSpec[]; routes; vars; secrets; compatibilityDate }` | Contribute `wrangler.toml` bindings / secrets. `plugin-cloudflare` owns this event, aggregates contributions into `.stack/wrangler.toml`, and shells out to `wrangler types` via `Generate.postWrite` to produce `.stack/worker-configuration.d.ts`. Declare `after: [cloudflare.events.Wrangler]` if your handler depends on the final binding set being assembled. |
| `vite.events.ViteConfig` | `{ imports; pluginCalls; resolveAliases; devServerPort }` | Inject framework Vite plugins (owned by `plugin-vite`) |
| `solid.events.Entry` | `{ imports; mountExpression }` | Control `.stack/entry.tsx` bootstrap (owned by `plugin-solid`) |
| `solid.events.Html` | `{ shell; head: HtmlInjection[]; bodyEnd: HtmlInjection[] }` | Inject into `.stack/index.html` head/body (owned by `plugin-solid`) |
| `solid.events.Providers` | `{ providers: ProviderSpec[] }` | Add JSX wrappers / siblings to `.stack/virtual-providers.tsx` (owned by `plugin-solid`) |
| `solid.events.RoutesDts` | `{ pagesDir }` | Typed route declarations (owned by `plugin-solid`) |
| `solidUi.events.AppCss` | `{ imports: string[]; layers }` | Contribute CSS imports to `.stack/app.css` (owned by `plugin-solid-ui`) |
| `Dev.Start` | `{ processes: ProcessSpec[]; watchers: WatcherSpec[] }` | Spawn long-running dev processes, register FS watchers |
| `Dev.Ready` | `{ setup; watchers; url; port }` | Run one-shot post-start tasks (e.g. schema push) |
| `Build.Start` | `{ steps: BuildStep[] }` | Push pre/main/post build steps |
| `Deploy.Plan` / `Deploy.Execute` / `Deploy.Complete` | See events.ts | Pre-deploy checks, deploy steps, finalization |
| `Remove` | `{ files; dependencies }` | Files/packages to remove on `stack remove <plugin>` |

## Contributing each spec kind

All codegen payloads carry **typed specs**, not strings. The AST printer (`ts-morph` / `smol-toml` / `node-html-parser`) handles emission.

### `ScaffoldSpec` — Tier B templates (copied once)

Templates live on disk under `plugins/<name>/templates/` as lintable source files. Plugins push `ScaffoldSpec`s into `Init.Scaffold`; the CLI copies them create-once and fails on duplicate targets.

```ts
bus.on(Init.Scaffold, (p) => {
  p.files.push({
    source: new URL("../templates/schema.ts", import.meta.url),
    target: "src/schema/index.ts",
  });
  p.dependencies["@fcalell/plugin-db"] = "workspace:*";
});
```

### `TsImportSpec` — imports in generated TS

Four shapes: default, named, namespace, side-effect.

```ts
// default
{ source: "@fcalell/plugin-db/runtime", default: "dbRuntime" }
// named (optionally type-only + aliases)
{ source: "@cloudflare/workers-types", named: ["D1Database"], typeOnly: true }
// namespace
{ source: "../src/schema", namespace: "schema" }
// side-effect
{ source: "tailwindcss", sideEffect: true }
```

### `TsExpression` — calls, literals, JSX

Structured expression tree. Common patterns:

```ts
// A call expression used as middleware: dbRuntime({ binding: "DB_MAIN", schema })
{
  kind: "call",
  callee: { kind: "identifier", name: "dbRuntime" },
  args: [{
    kind: "object",
    properties: [
      { key: "binding", value: { kind: "string", value: "DB_MAIN" } },
      { key: "schema",  value: { kind: "identifier", name: "schema" }, shorthand: true },
    ],
  }],
}

// JSX element for a sibling provider: <Toaster />
{ kind: "jsx", tag: "Toaster", props: [], children: [] }
```

### `WranglerBindingSpec` — typed wrangler bindings

Contributed through the `cloudflare.events.Wrangler` event, owned by `plugin-cloudflare`. Any plugin that needs bindings, secrets, or vars imports `cloudflare` and declares `after: [cloudflare.events.Wrangler]` so its handler runs before the aggregator assembles `.stack/wrangler.toml`.

```ts
import { cloudflare } from "@fcalell/plugin-cloudflare";
// …
bus.on(cloudflare.events.Wrangler, (p) => {
  p.bindings.push({
    kind: "d1",
    binding: "DB_MAIN",
    databaseName: ctx.options.databaseId,
    databaseId: ctx.options.databaseId,
  });
  p.secrets.push({ name: "AUTH_SECRET", devDefault: "dev-secret-change-me" });
});
```

Binding kinds: `d1`, `kv`, `r2`, `rate_limiter`, `var`. Aggregator catches duplicate binding names and fails fast.

### `HtmlInjection` — `<head>` / `<body>` injections

```ts
import { solid } from "@fcalell/plugin-solid";
// …
bus.on(solid.events.Html, (p) => {
  p.shell = new URL("../templates/shell.html", import.meta.url);
  p.head.push({ kind: "title", value: ctx.options.title ?? ctx.app.name });
  p.head.push({ kind: "html-attr", name: "lang", value: ctx.options.lang ?? "en" });
  p.head.push({ kind: "meta", name: "theme-color", content: "#000" });
  p.bodyEnd.push({ kind: "script", src: "/entry.tsx", type: "module" });
});
```

Kinds: `title`, `meta`, `link`, `script`, `html-attr`.

### `ProviderSpec` — composition providers

Wraps `virtual:stack-providers` children with a JSX component and/or renders siblings alongside. `order` controls nesting (lower = outer).

```ts
import { solid } from "@fcalell/plugin-solid";
// …
bus.on(solid.events.Providers, (p) => {
  p.providers.push({
    imports: [
      { source: "@fcalell/plugin-solid-ui/meta", named: ["MetaProvider"] },
      { source: "@fcalell/plugin-solid-ui/components/toast", named: ["Toaster"] },
    ],
    wrap: { identifier: "MetaProvider" },
    siblings: [{ kind: "jsx", tag: "Toaster", props: [], children: [] }],
    order: 100,
  });
});
```

### `MiddlewareSpec` — ordered Hono middleware

Phase controls where in the chain it runs; `order` breaks ties within a phase.

```ts
import { api } from "@fcalell/plugin-api";
// …
bus.on(api.events.Middleware, async (p) => {
  if (!(await ctx.fileExists("src/worker/middleware.ts"))) return;
  p.entries.push({
    imports: [{ source: "../src/worker/middleware", default: "middleware" }],
    call: { kind: "identifier", name: "middleware" },
    phase: "before-routes",
    order: 100,
  });
});
```

Phases: `before-cors`, `after-cors`, `before-routes`, `after-routes`.

## Testing

Co-locate tests as `*.test.ts` next to the source. Drive handlers by emitting events against a real bus; assert on returned payload mutations.

```ts
import { createEventBus } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { cloudflare } from "@fcalell/plugin-cloudflare";
import { describe, expect, it } from "vitest";
import { db } from "./index";

describe("plugin-db cloudflare.events.Wrangler", () => {
  it("pushes a d1 binding when dialect is d1", async () => {
    const bus = createEventBus();
    const ctx = createMockCtx({
      options: { dialect: "d1", databaseId: "abc", binding: "DB_MAIN" },
    });
    db.cli.register(ctx, bus, db.events);

    const payload = await bus.emit(cloudflare.events.Wrangler, {
      bindings: [], routes: [], vars: {}, secrets: [], compatibilityDate: "",
    });

    expect(payload.bindings).toContainEqual(
      expect.objectContaining({ kind: "d1", binding: "DB_MAIN", databaseId: "abc" }),
    );
  });
});
```

`createMockCtx` (from `@fcalell/cli/testing`) returns a fully-stubbed `RegisterContext`; pass `options` and any overrides you need. The plugin's `register` is invoked via `plugin.cli.register(...)`.

## Checklist before publishing a plugin

1. Templates live on disk under `templates/` and are listed in `package.json` `files`.
2. `node/` and `worker/` are split; no cross-imports.
3. Runtime (if any) is exported from `./runtime` and takes plain options, not `PluginConfig`.
4. Commands are routable via `stack <plugin> <command>`.
5. Ordering is declared with typed event tokens (`after: [otherPlugin.events.SomeEvent]`), not string names.
6. Every `register` handler is covered by a co-located test that emits the event and asserts on payload mutation.
