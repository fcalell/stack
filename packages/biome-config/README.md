# @fcalell/biome-config

Shared Biome formatter and linter configuration for the `@fcalell/stack` framework.

## Install

```bash
pnpm add -D @fcalell/biome-config
```

## Usage

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@fcalell/biome-config/shared.json"]
}
```

The `$schema` path is the installed biome's own, so it never lags the version. Biome also
reads the repo's `.editorconfig`, which `stack init` writes.

## What it configures

- **Formatter:** enabled, tab indentation
- **Linter:** enabled with default rules; `useValidAriaRole` is an error that skips non-DOM
  components, so React Native's `role` props pass
- **CSS:** Tailwind directives support enabled
- **Import organization:** automatic via `organizeImports` assist
- **VCS:** git, so every `.gitignore` entry is excluded
- **Excluded paths:** `dist`, `build`, `node_modules`, `.turbo`, `.wrangler`, `.output`, `.stack`,
  `.claude/worktrees`, `storybook-static`, `coverage`, `routeTree.gen.ts`, `*.d.ts`
- **Extending:** a `files.includes` of your own replaces this list, so restate `**` and
  `!**/*.d.ts` beside your own exclusions

## License

MIT
