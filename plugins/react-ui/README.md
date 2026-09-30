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
| `theme` | `Theme` | the calibrated defaults | The ui-core contract, four flat knobs: `accentHue` (264), `castHue` (the neutrals' hue; `accentHue` unless set), `fonts` (`{ sans?, mono? }` family names; IBM Plex Sans and IBM Plex Mono unless set) and `defaultMode` (a viewer with no stored choice starts in it, ahead of `prefers-color-scheme`). Every value resolves through `deriveTheme` and lands in the `@theme` block of `.stack/app.css`. |
| `words` | `Words` | English | Every word a molecule draws on its own, every key required. Mounted into the generated providers as a `WordsProvider` (`@fcalell/plugin-react-ui/lib/words`, read with `useWords()`). |
| `fonts` | `FontEntry[]` | `defaultFonts` | The font files to load: each is preloaded and gets an `@font-face` with fallback metrics, one per family. The default is IBM Plex Sans (its `wght` axis, `plexSans` from `./node/fonts`) and IBM Plex Mono at 400, 500 and 600; `[]` loads none. Which family the contract binds to `sans` or `mono` is `theme.fonts`. |

The consumer's icon set is typed `IconSet`: a closed map of names to `lucide-react` glyphs.

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/app.css` | `reactUi.slots.appCssSource` | `tailwindcss` with `source(none)`, the plugin's `globals.css`, `@source "../src"`, the `@theme` tokens and shadow utilities from ui-core, and `@layer base` for the mode scopes, reduced motion and density |

`.stack/entry.tsx` imports `./app.css`; `.stack/vite.config.ts` gains `tailwindcss()`,
`themeFontsPlugin` (the preloads and `@font-face` rules) and `themeModePlugin` (the script that
sets the `dark` class from the stored choice, the theme's `defaultMode`, else the system).

Density is no option: the desktop set draws under `(pointer: fine)` and the touch set
everywhere else. A `data-density` attribute on `<html>` pins either on any device: `desktop`
draws the compact set, `touch` the touch set.

The modes are class scopes: `.dark` on `<html>` is the mode, and `.light` on any element
inside it restores the light colors and `color-scheme` for that subtree, as the showcase's light
frames do. Under `prefers-reduced-motion: reduce` every `--transition-duration-*` rung is 0ms, so
no transition or animation that reads one moves. Each `@font-face` gets a metric fallback face
named by ui-core's `fallbackFace` (`"IBM Plex Sans Fallback"`), the name the contract's family
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

## The artboards

`design/` holds the design artboards: the Stage 1 token sheet `foundations.css` with its boards,
and from Stage 2 one `.dc.html` per component group on the real contract. `pnpm design` at the
repo root builds the showcase, then `scripts/design.ts` copies the default fonts to
`design/files/`, writes their `@font-face` rules to `design/fonts.css`, and compiles
`design/board.css` (the showcase's emitted `app.css` plus every file under `design/` as a source)
to `design/app.css`, the stylesheet a Stage 2 board links. The three outputs are gitignored.

## Slots

The table lives in [`slot-catalog.md`](../../.helm/knowledge/architecture/slot-catalog.md).

## License

MIT
