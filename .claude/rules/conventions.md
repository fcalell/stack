## Package conventions

Each package must be small, single-purpose, and independently consumable.

Packages export via subpath exports in package.json — never a barrel index that re-exports everything.

Use `#` hash imports for internal paths within a package. Use subpath exports for the public API.

All packages use `workspace:*` to depend on sibling `@fcalell/*` packages.

TypeScript configs extend `@fcalell/typescript-config` — never define compiler options directly.

## Plugin conventions

Each plugin lives in `plugins/<name>/` and is published as `@fcalell/plugin-<name>`.

Config factory function name matches plugin name: `db()`, `auth()`, `api()`, `app()`. Config factory returns `PluginConfig<Name, Options>` with the `__plugin` brand. Validation of options happens inside the factory.

`requires` array declares plugin dependencies (e.g. `auth()` returns `requires: ["db"]`). The CLI and `defineConfig().validate()` enforce this.

CLI plugin is exported from the `./cli` subpath as the default export. It implements the `CliPlugin<TOptions>` interface from `@fcalell/config/plugin`.

Runtime plugin (if any) is exported from the `./runtime` subpath. The `WorkerContribution.runtime` field points to this subpath and names the factory function.

`stack-plugin` field in `package.json` declares the plugin name, label, and CLI entry point for CLI discovery:

```json
{
  "stack-plugin": {
    "name": "db",
    "label": "Database",
    "cli": "./src/cli.ts"
  }
}
```

Plugin tests are co-located as `*.test.ts` next to source files. Plugin CLI tests mock `PluginContext` — no real filesystem operations.

Callback files for plugins live in `src/worker/plugins/<name>.ts` in the consumer project. Plugins declare callbacks via `WorkerContribution.callbacks` and export a `define<Name>Callbacks` helper.

## Code style

Only comment non-obvious code; never use JSDoc.

Keep exports minimal — only expose what consumers actually need.

Prefer factory functions over classes for configuration (e.g., `createAuthClient()` not `new AuthClient()`).
