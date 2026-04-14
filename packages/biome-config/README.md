# @fcalell/biome-config

Shared Biome formatter and linter configuration for the `@fcalell/stack` framework.

## Install

```bash
pnpm add -D @fcalell/biome-config
```

## Usage

```json
{
  "extends": ["@fcalell/biome-config/shared.json"]
}
```

## What it configures

- **Formatter:** enabled, tab indentation
- **Linter:** enabled with default rules
- **CSS:** Tailwind directives support enabled
- **Import organization:** automatic via `organizeImports` assist
- **Excluded paths:** `dist`, `build`, `node_modules`, `.turbo`, `.wrangler`, `.output`, `storybook-static`, `coverage`, `*.d.ts`

## License

MIT
