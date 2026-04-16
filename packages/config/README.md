# @fcalell/config

Plugin-based configuration for the `@fcalell/stack` framework. A single `stack.config.ts` with a `plugins` array drives the CLI, code generation, and runtime.

## Install

```bash
pnpm add @fcalell/config
```

## Usage

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/config";
import { db } from "@fcalell/plugin-db";
import { auth } from "@fcalell/plugin-auth";
import { api } from "@fcalell/plugin-api";
import { app } from "@fcalell/plugin-app";
import * as schema from "./src/schema";

export default defineConfig({
  domain: "example.com",
  plugins: [
    db({ dialect: "d1", databaseId: "9a619a0b-...", schema }),
    auth({ cookies: { prefix: "myapp" }, organization: true }),
    api({ cors: ["https://app.example.com"] }),
    app(),
  ],
  dev: { studioPort: 4983 },
});
```

## Config shape

```ts
defineConfig({
  domain?: string,            // Project domain (used by plugins for CORS, cookies, etc.)
  plugins: PluginConfig[],    // Plugin config objects from factory functions
  dev?: {
    studioPort?: number,      // Drizzle Studio port (default: 4983)
  },
})
```

Returns a `StackConfig<T>` with a `.validate()` method that checks for duplicates and unsatisfied `requires`.

## Config variants

```ts
// Full-stack
defineConfig({
  domain: "example.com",
  plugins: [db({ ... }), auth(), api(), app()],
});

// API-only (no frontend)
defineConfig({
  plugins: [db({ ... }), api()],
});

// Frontend-only (no backend)
defineConfig({
  plugins: [app()],
});

// Database + auth only (headless)
defineConfig({
  plugins: [db({ ... }), auth()],
});
```

## `PluginConfig`

Each plugin config factory returns a `PluginConfig<TName, TOptions>`:

```ts
interface PluginConfig<TName extends string, TOptions> {
  readonly __plugin: TName;
  readonly requires?: readonly string[];
  readonly options: TOptions;
}
```

- `__plugin` -- unique plugin identifier (e.g. `"db"`, `"auth"`)
- `requires` -- other plugins that must be present (validated by `defineConfig().validate()`)
- `options` -- plugin-specific configuration

## Plugin extraction

Retrieve a specific plugin's config from the stack config:

```ts
import { getPlugin } from "@fcalell/config";

const dbConfig = getPlugin(config, "db");
// dbConfig.__plugin === "db"
// dbConfig.options -- typed as DbOptions
```

Throws if the plugin is not found. The return type is narrowed by the `ExtractPlugin<T, N>` utility.

## Validation

```ts
const config = defineConfig({ plugins: [auth()] });
const result = config.validate();
// result.valid === false
// result.errors[0].message === 'Requires "db", but it is not in the plugins array.'
// result.errors[0].fix === 'Run: stack add db'
```

## `BindingDeclaration`

Plugins declare the Cloudflare bindings they need. The CLI collects these to generate `env.d.ts` and `wrangler.toml`.

```ts
interface BindingDeclaration {
  name: string;
  type: "d1" | "r2" | "kv" | "queue" | "rate_limiter" | "durable_object" | "service" | "var" | "secret";
  databaseId?: string;
  databaseName?: string;
  bucketName?: string;
  kvNamespaceId?: string;
  className?: string;
  rateLimit?: { limit: number; period: number };
  devDefault?: string;
}
```

## `@fcalell/config/plugin` subpath

Types and interfaces for plugin authors. This subpath defines the CLI plugin contract.

### `CliPlugin<TOptions>`

The interface every plugin's `./cli` export must implement:

```ts
interface CliPlugin<TOptions> {
  name: string;
  label: string;

  detect(ctx: PluginContext): boolean | Promise<boolean>;
  prompt?(ctx: PluginContext): Promise<Record<string, unknown>>;
  scaffold(ctx: PluginContext, answers: Record<string, unknown>): Promise<void>;
  remove?(ctx: PluginContext): Promise<RemovalResult>;

  bindings(options: TOptions): BindingDeclaration[];
  generate(ctx: PluginContext): Promise<GeneratedFile[]>;

  worker?: WorkerContribution;

  dev?(ctx: DevContext): Promise<DevContribution>;
  build?(ctx: BuildContext): Promise<BuildContribution>;
  deploy?(ctx: DeployContext): Promise<void>;
}
```

### `PluginContext`

Provided by the CLI to plugin hooks. Includes filesystem helpers, config access, dependency management, and interactive prompts.

```ts
interface PluginContext {
  cwd: string;
  config: StackConfig | null;
  hasPlugin(name: string): boolean;
  getPluginOptions<T>(name: string): T | undefined;

  writeFile(path: string, content: string): Promise<void>;
  writeIfMissing(path: string, content: string): Promise<boolean>;
  ensureDir(path: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;

  addDependencies(deps: Record<string, string>): void;
  addDevDependencies(deps: Record<string, string>): void;
  addToGitignore(...entries: string[]): void;

  addPluginToConfig(opts: { importSource: string; importName: string; options: Record<string, unknown> }): Promise<void>;
  removePluginFromConfig(name: string): Promise<void>;

  prompt: { text, confirm, select, multiselect };
  log: { info, warn, success, error };
}
```

Extended contexts: `DevContext` adds `getPort(name)`, `BuildContext` adds `outDir`, `DeployContext` adds `env`, `preview`, `dryRun`.

### `WorkerContribution`

Declares how a plugin participates in the virtual worker:

```ts
interface WorkerContribution {
  runtime?: { importFrom: string; factory: string };
  callbacks?: { required: boolean; defineHelper: string; importFrom: string };
  routes?: true;
  middleware?: true;
  handlers?: ("scheduled" | "queue" | "email" | "tail")[];
}
```

### `DevContribution` / `BuildContribution`

```ts
interface DevContribution {
  setup?: () => Promise<void>;
  processes?: ProcessSpec[];
  watchers?: WatcherSpec[];
  vitePlugins?: unknown[];
  banner?: string[];
}

interface BuildContribution {
  preBuild?: () => Promise<void>;
  postBuild?: () => Promise<void>;
  vitePlugins?: unknown[];
}
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/config` | `defineConfig()`, `StackConfig`, `PluginConfig`, `BindingDeclaration`, `getPlugin()`, `ExtractPlugin` |
| `@fcalell/config/plugin` | `CliPlugin`, `PluginContext`, `DevContext`, `BuildContext`, `DeployContext`, `DevContribution`, `BuildContribution`, `WorkerContribution`, `GeneratedFile`, `RemovalResult`, `ProcessSpec`, `WatcherSpec` |

## License

MIT
