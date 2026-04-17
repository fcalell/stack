# @fcalell/plugin-solid-ui

Design system CLI plugin for the `@fcalell/stack` framework. Manages `@fcalell/ui` as a dependency, scaffolds UI-rich templates, and wires up the CSS import. This plugin enhances the templates provided by `plugin-solid` with design system components.

## Install

```bash
pnpm add @fcalell/plugin-solid-ui
```

## Usage

### Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
  plugins: [
    solid(),
    solidUi(),
  ],
});
```

`plugin-solid` (and transitively `plugin-vite`) are auto-resolved as dependencies.

## How it works

`plugin-solid-ui` depends on `plugin-solid` via `solid.events.SolidConfigured`. Because it registers after `plugin-solid` in the event bus, its scaffold templates override the bare ones from `plugin-solid` (last writer wins).

### Template override

| Path | `plugin-solid` template | `plugin-solid-ui` template |
|------|------------------------|---------------------------|
| `src/app/pages/_layout.tsx` | Bare pass-through layout | Layout with `<Toaster />` |
| `src/app/pages/index.tsx` | Plain `<h1>Welcome</h1>` | `Card` with `Card.Title` + `Card.Description` |

### Additional scaffold files

| File | Purpose |
|------|---------|
| `src/app/app.css` | Imports `tailwindcss` and `@fcalell/ui/globals.css` |

### Dependencies added

- `@fcalell/ui` -- the design system runtime

## Config options

No options. The plugin is configured by adding it to the plugins array:

```ts
solidUi()
```

## Dependencies

`plugin-solid-ui` depends on `plugin-solid` via `solid.events.SolidConfigured`. The CLI auto-resolves `plugin-solid` (and `plugin-vite`) when `plugin-solid-ui` is present.

## Lifecycle

### Init / Scaffold

Pushes UI-rich templates that override `plugin-solid`'s bare versions:

- `src/app/pages/_layout.tsx` -- layout with `<Toaster />` from `@fcalell/ui/components/toast`
- `src/app/pages/index.tsx` -- index page using `Card` and `Text` components
- `src/app/app.css` -- Tailwind + design system CSS imports

Adds `@fcalell/ui` as a dependency.

### Remove

Removes `@fcalell/ui` from dependencies. Does not delete `src/app/` -- that directory is owned by `plugin-solid`.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-solid-ui` | `solidUi()`, `SolidUiOptions` |

## License

MIT
