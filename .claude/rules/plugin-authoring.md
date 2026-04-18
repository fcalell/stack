# Plugin authoring

Short, concrete guide for writing a `@fcalell/stack` plugin. Conventions on folder layout, hash imports, `worker/` vs `node/` split, and testing live in `.claude/rules/conventions.md` — not repeated here.

## The `createPlugin` contract

```ts
import { callback, createPlugin } from "@fcalell/cli";
import { Codegen, Composition, Dev, Init, Remove } from "@fcalell/cli/events";

export const auth = createPlugin("auth", {
  label: "Authentication",
  implicit: false,               // true = never listed in user config, auto-pulled by depends
  package: undefined,            // default: `@fcalell/plugin-${name}`. Override for third-party.
  events: ["SchemaReady"],       // plugin-scoped events others can depend on
  depends: [db.events.SchemaReady],
  callbacks: {
    sendOTP: callback<{ email: string; code: string }>(),
  },
  commands: {
    push: {
      description: "Push schema",
      handler: async (ctx, flags) => { /* ... */ },
    },
  },
  config(options) { return { ...defaults, ...options }; },
  register(ctx, bus, events) { /* event handlers */ },
});
```

`register` is the heart of the plugin. It subscribes to lifecycle events and mutates the payload each one carries. `ctx` is a `RegisterContext` with `options`, `cwd`, `app`, `hasPlugin`, `readFile`, `fileExists`, `log`, `prompt`. `events` is the plugin's own typed event map (from `events: [...]`).

The returned object is a callable config factory (`auth({ ... })`) plus metadata: `.events`, `.cli`, `.name`, and — if callbacks are declared — `.defineCallbacks(impl)` for consumer callback files.

## Event lifecycle at a glance

| Event | Payload shape | When to listen |
|---|---|---|
| `Init.Prompt` | `{ configOptions }` | Interactive prompts during `stack init` / `stack add` |
| `Init.Scaffold` | `{ files: ScaffoldSpec[]; dependencies; devDependencies; gitignore }` | Copy template files and declare npm deps |
| `Generate` | `{ files: GeneratedFile[] }` | Emit plain generated files (e.g. api route barrel) |
| `Codegen.Worker` | `{ imports; base; middlewareChain; handler; domain; cors }` | Contribute to `.stack/worker.ts` |
| `Codegen.Wrangler` | `{ bindings: WranglerBindingSpec[]; routes; vars; secrets; compatibilityDate }` | Contribute `wrangler.toml` bindings / secrets |
| `Codegen.Env` | `{ fields }` | Add typed `Env` interface fields |
| `Codegen.ViteConfig` | `{ imports; pluginCalls; resolveAliases; devServerPort }` | Inject framework Vite plugins |
| `Codegen.Entry` | `{ imports; mountExpression }` | Control `.stack/entry.tsx` bootstrap |
| `Codegen.Html` | `{ shell; head: HtmlInjection[]; bodyEnd: HtmlInjection[] }` | Inject into `.stack/index.html` head/body |
| `Codegen.AppCss` | `{ imports: string[]; layers }` | Contribute CSS imports to `.stack/app.css` |
| `Codegen.RoutesDts` | `{ pagesDir }` | Typed route declarations (currently owned by plugin-solid) |
| `Composition.Providers` | `{ providers: ProviderSpec[] }` | Add JSX wrappers / siblings to `.stack/virtual-providers.tsx` |
| `Composition.Middleware` | `{ entries: MiddlewareSpec[] }` | Contribute Hono middleware to the worker chain |
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

```ts
bus.on(Codegen.Wrangler, (p) => {
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
bus.on(Codegen.Html, (p) => {
  p.shell = new URL("../templates/shell.html", import.meta.url);
  p.head.push({ kind: "title", value: ctx.app.title ?? ctx.app.name });
  p.head.push({ kind: "html-attr", name: "lang", value: ctx.app.lang ?? "en" });
  p.head.push({ kind: "meta", name: "theme-color", content: "#000" });
  p.bodyEnd.push({ kind: "script", src: "/entry.tsx", type: "module" });
});
```

Kinds: `title`, `meta`, `link`, `script`, `html-attr`.

### `ProviderSpec` — composition providers

Wraps `virtual:stack-providers` children with a JSX component and/or renders siblings alongside. `order` controls nesting (lower = outer).

```ts
bus.on(Composition.Providers, (p) => {
  p.providers.push({
    imports: [
      { source: "@fcalell/ui/meta", named: ["MetaProvider"] },
      { source: "@fcalell/ui/components/toast", named: ["Toaster"] },
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
bus.on(Composition.Middleware, async (p) => {
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
import { createEventBus, Codegen } from "@fcalell/cli/events";
import { createMockCtx } from "@fcalell/cli/testing";
import { describe, expect, it } from "vitest";
import { db } from "./index";

describe("plugin-db Codegen.Wrangler", () => {
  it("pushes a d1 binding when dialect is d1", async () => {
    const bus = createEventBus();
    const ctx = createMockCtx({
      options: { dialect: "d1", databaseId: "abc", binding: "DB_MAIN" },
    });
    db.cli.register(ctx, bus, db.events);

    const payload = await bus.emit(Codegen.Wrangler, {
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
5. Dependencies are typed event tokens (`depends: [otherPlugin.events.SomeEvent]`), not string names.
6. Every `register` handler is covered by a co-located test that emits the event and asserts on payload mutation.
