# @fcalell/plugin-react-ui

The web half of the stack design system: the CLI plugin that renders `@fcalell/ui-core`'s
contract into `.stack/app.css` on Tailwind v4, loads the fonts, sets the mode before first paint,
and mounts the words. It also ships the showcase: one
page that frames every roster component in every cell, state, mode and density.

## Install

```bash
pnpm add @fcalell/plugin-react-ui
```

Peer dependency: `react ^19.3`. `plugin-react` and `plugin-vite` are listed alongside. The
consumer declares `tailwindcss` and `lucide-react` (the plugin's `dependencies`) and
`@tailwindcss/vite` (its `devDependencies`), since the generated config and stylesheet import them.

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { react } from "@fcalell/plugin-react";
import { reactUi } from "@fcalell/plugin-react-ui";
import { vite } from "@fcalell/plugin-vite";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [vite(), react(), reactUi()],
});
```

## Config options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `theme` | `Theme` | the calibrated defaults, `sans` Inter | The ui-core contract, flat knobs: `accentHue`, `neutralHue`, `neutralChroma`, `okHue`, `warnHue`, `dangerHue`, `primary` (`ink` \| `accent`), `space`, `radius` (0 squares everything), `text`, `elevation` (`soft` \| `flat`), `motion` (the base duration in ms, 200 by default), `density` (`touch` \| `desktop`: `desktop` draws rows, controls and headers on a 32 px floor where the primary pointer is fine, and keeps 44 px on touch), `fonts` (`{ sans?, mono? }` family names; `sans` defaults to Inter Variable while its file loads), `widths`, `breakpoints`, `defaultMode` (a viewer with no stored choice starts in it, ahead of `prefers-color-scheme`), `overrides`. Every value resolves through `deriveTheme` and lands in the `@theme` block of `.stack/app.css`. |
| `words` | `Words` | English | Every word a molecule draws on its own, every key required. Mounted into the generated providers as a `WordsProvider` (`@fcalell/plugin-react-ui/lib/words`, read with `useWords()`). |
| `fonts` | `FontEntry[]` | `defaultFonts` | The font files to load: each is preloaded and gets an `@font-face` with fallback metrics. The default is Inter Variable (its `opsz` and `wght` axes, `interVariable` from `./node/fonts`) and JetBrains Mono Variable; `[]` loads none. Which family the contract binds to `sans` or `mono` is `theme.fonts`. |

The consumer's icon set is typed `IconSet`: a closed map of names to `lucide-react` glyphs.

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/app.css` | `reactUi.slots.appCssSource` | `tailwindcss` with `source(none)`, the plugin's `globals.css`, `@source "../src"`, the `@theme` tokens and shadow utilities from ui-core, and `@layer base` for the mode scopes, reduced motion and density |

`.stack/entry.tsx` imports `./app.css`; `.stack/vite.config.ts` gains `tailwindcss()`,
`themeFontsPlugin` (the preloads and `@font-face` rules) and `themeModePlugin` (the script that
sets the `dark` class from the stored choice, the theme's `defaultMode`, else the system).

A `data-density` attribute on `<html>` pins a density whatever the knob: `desktop` draws the
compact set, `touch` the touch set.

The modes are class scopes: `.dark` on `<html>` is the mode, and `.light` on any element
inside it restores the light colors and `color-scheme` for that subtree, as the showcase's light
frames do. Under `prefers-reduced-motion: reduce` every `--transition-duration-*` rung is 0ms, so
no transition or animation that reads one moves. Each `@font-face` gets a metric fallback face
named by ui-core's `fallbackFace` (`"Inter Variable Fallback"`), the name the contract's family
stack carries second.

## The showcase

`Showcase` (`@fcalell/plugin-react-ui/showcase`) is a page generated from data: for every roster
component, one frame per matrix cell it draws (the families its roster entry's `draws` names,
enumerated by `matrixCells`) and state its roster entry's `states` lists, light and dark side by
side, each frame scoped by its mode's class, at one density. The URL decides
the view (`?mode=dark&density=desktop`) and the page's toggles rewrite it, storing nothing. Every
frame carries `data-cell="<component>/<cell>/<state>/<mode>/<density>"`; `showcaseCells()` lists
every id over both densities, so a density's page draws half of them. A component without a
registered renderer draws its name and its cell's classes.

## Slots

The table lives in [`slot-catalog.md`](../../.helm/knowledge/architecture/slot-catalog.md).

## License

MIT
