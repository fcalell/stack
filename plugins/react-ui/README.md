# @fcalell/plugin-react-ui

The web half of the stack design system: the CLI plugin that renders `@fcalell/ui-core`'s
contract into `.stack/app.css` on Tailwind v4, loads the fonts, sets the mode before first paint,
and mounts the words. It also ships the showcase: one
page that frames every roster component in every cell, state, mode and density.

## Install

```bash
stack add react-ui
```

Peer dependencies: `react` and `react-dom` `^19.2.0`. `plugin-react` and `plugin-vite` are listed alongside. The
consumer declares `tailwindcss` (the plugin's `dependencies`) and
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

## Guide

How to build on the plugin lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`rules.md`](./guide/rules.md), what every web `.tsx` follows, and
[`reference.md`](./guide/reference.md), the components' subpaths, the options, density, the
page container and the modes. The screen recipe and the design standard are ui-core's pages.

## Lint rules

`lint/*.grit` are the web rules' "never" list as Biome GritQL plugins; `guide/rules.md` points at
`LINT_RULES` and the `.grit` headers for which rule enforces which never, the rest staying a
reading of the page. The plugin contributes them to `cliSlots.lintPlugins` with `includes` the
directory its routes sit in (`react.slots.routesDir`'s parent, or `src` with file routing off), so
`stack generate` writes them into `.stack/biome.json` and the app's `biome.json` extends it. A new
rule is a file here, a name in `LINT_RULES` (`src/node/lint.ts`), a row in the page's table. A rule matches
the attribute's text by regex, since Biome's GritQL reads a node's text whole and has no
look-ahead: a reset (`border-0`) is excluded per category.

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/app.css` | `reactUi.slots.appCssSource` | `tailwindcss` with `source(none)`, the plugin's `globals.css`, `@source "../src"`, the `@theme` tokens and shadow utilities from ui-core, the `touch:` and `page-*` custom variants, the `pb-safe` and `pt-safe` utilities, and `@layer base` for the mode scopes, reduced motion and density |

`.stack/entry.tsx` imports `./app.css`; `.stack/vite.config.ts` gains `tailwindcss()`,
`themeFontsPlugin` (the preloads and `@font-face` rules) and `themeModePlugin` (the script that
sets the `dark` class before first paint).

The page carries one inline script, the mode script. The plugin contributes `script-src 'self' 'sha256-…'` (the hash of that script's exact text, computed at generate time from the string `themeModePlugin` injects) to `vite.slots.clientHeaders`, so a consumer's policy needs only `script-src 'self'` plus its own sources. It contributes no `style-src`: a hash on the `@font-face` `<style>` would not cover the inline `style=` attributes React sets, so `style-src` is the consumer's to decide.

The density rule is one query (`./density`) that the density layer, the `touch:` variant and
`useTouch` (`lib/media`) all read. The `touch:` variant applies under `data-density="touch"`,
and with no `desktop` pin where the pointer is not fine or the viewport is narrower than
`tablet`, so a molecule's structure follows density (an action bar at natural width on the
desktop, full width on touch); a molecule whose tree differs by density (the Shell's sidebar or
places layer) reads `useTouch`. A token never needs it: a size, a spacing role and a type role follow
density through their variables. The room set is the one scope a place states
(`distance="room"`, which the `Shell` does not take): `[data-density="room"]` in the density layer (`ROOM_SCOPE`) holds
`--room-unit` and every room value as a `calc` over it, the `touch:` variant matches inside it,
and `useTouch` reads the place's `DistanceContext` as well as the query.

`page-<breakpoint>:` and `page-max-<breakpoint>:` draw from or below a breakpoint's width of the
`page` container (`@container/page`), emitted from the contract's breakpoint values. `pb-safe`
and `pt-safe` pad by `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`, non-zero under the react plugin's `viewport-fit=cover`.
Each `@font-face` gets a metric fallback face named by ui-core's `fallbackFace`
(`"IBM Plex Sans Fallback"`), the name the contract's family stack carries second.

The plugin also hands the CLI ui-core's guide pages (`cliSlots.guide`), as native-ui does;
the index lists each page once.

It hands the generated entry two router bindings (`react.slots.routerBindings`): `bindRouter`
(`lib/navigate`), so an act opens a route in place, and `bindNotFound` (`lib/not-found`), which sets
the router's default not-found page: a `Pane` with the missing form when the miss stands under a
`Shell`, a `Gate` with Back to `/` when it stands at the root. A route of the app's own wins.

## Components

Each roster component lives in `src/ui/components/<componentDir(name)>/index.tsx` and is
imported as `@fcalell/plugin-react-ui/components/<dir>`. The file exports the component and its
`XProps` interface, which extends `Closed` (`./lib/closed`: `class`, `className`, `classList`
and `style` as `?: never`) and declares exactly the roster's prop names.

- **Look.** A part's `className` is `cn(cell(props), OVERLAY)`: the ui-core cva (or single-cell
  constant) first, then the overlay, so an overlay colour replaces the cell's. `cn` is
  `@fcalell/ui-core/cn`. An overlay is a module constant spelled verbatim, never a class built from a variable, and
  every overlay class other than a state variant over a token is listed in
  `scripts/overlays.ts`.
- **States.** Hover, press and focus are the web variants `hover:`, `active:` and
  `focus-visible:`; a disabled control `disabled:` or `aria-disabled:`, a pending act
  `aria-busy:`. The focus ring is the base `:focus-visible` rule in `globals.css`
  (`--focus-ring` in `--color-ring` at `--focus-ring-offset`), so a component spells nothing for
  it; a control inside a control rings inset with `focus-visible:-outline-offset-2`. A field box
  (Input, a Thread's composer, the Picker trigger) rings on its edge
  (`--focus-ring-edge-offset`, -1 px), for the keyboard alone: a click draws the hover edge.
- **Behaviour.** `@base-ui/react` supplies behaviour and accessibility (a button, a switch, a
  checkbox, a slider, a field, a select) through its per-component subpaths
  (`@base-ui/react/switch`); its parts take the component's classes, never Base UI's look.
- **Composition.** A component that draws another's place takes its pattern, never a copy:
  A field's `Picker` trigger is `Input`'s box (`BOX`, `BOX_HOVER`, `BOX_DISABLED`, exported from
  `components/input`) and its open list a popover (`POPOVER`) of rows (`ROW`, `highlighted`
  under Base UI's highlight). An app's popups mount in the body; only a
  showcase stage provides a `PortalContainer` (`lib/portal`), so its popups draw the stage's mode
  from its `.dark` class.
- **Words.** A word the component draws on its own comes from `useWords()`; a sentence is a prop.

`Text` is the worked example: a `<p>` in `text({ role })` with the `max-w-measure` overlay.

- **A page outside the shell.** `Gate` is the layout frame of a sign-in or a consent step:
  one column at the `auth` width on the surface, centred across and down the viewport, holding a
  `banner`, the `mark` (`{ name, src? }`), an optional `step` (its step count), the `title` (the page's one
  `h1`), a `description` (`Runs`: words, `{ strong }`, `{ code }` and `{ quoted }` runs), the body and the `acts` (`Button`s on one wrapping line under the body, start-aligned with the description, the primary first; a first run's body is its `acts`). It mounts the
  same `FrameHost` as the `Shell` (`components/shell/host.tsx`: the `toast()` queue, the `confirm()`
  decisions). The first field of a step takes focus as the page opens and as `title`
  changes (`focusFirst` in `./lib/focus`). Its `form` (a `Form`'s props, over the step's procedure) is drawn in the column by the
  Gate (`components/form/base.tsx`, `in` the auth column), its bar set `full`.

## The showcase

The roster is drawn in Storybook (`apps/showcase`, `pnpm stories`) from data this package exports:

- `@fcalell/plugin-react-ui/showcase/cells`: `showcaseFrames()`, one frame per matrix cell a roster
  component draws (the families its entry's `draws` names, enumerated by `matrixCells`) and drawn
  state its entry's `states` lists (`rest`, `disabled`, `loading`, `error`, `empty`, `selected`; the
  pointer and focus states stay in the roster and draw no frame), in both modes and both densities;
  `showcaseCells()`, every frame's id. Every frame carries
  `data-cell="<component>/<cell>/<state>/<mode>/<density>"`.
- `@fcalell/plugin-react-ui/showcase/frame`: `Frame`, the wrapper a frame is drawn in: its
  `data-cell`, its mode's class and the canvas ground. It takes the frame and
  a drawer, and draws the component's name and the cell's strings where there is none.
- `@fcalell/plugin-react-ui/showcase/frames/<dir>`: one component's drawer, `draw<Name>`.

A component's frames are drawn by one function in `src/ui/showcase/frames/<dir>.tsx`: it takes the
frame and returns the real component in that cell and state, or `undefined` for a cell the
component has no form for. The frames stay out of the component directory, so a component never
depends on the showcase. A state the component takes as a prop (`disabled` through `blocked`,
`loading`, `error`, `selected`, `empty`) is drawn by passing it. A pointer or focus look is drawn
nowhere: the real component takes it from the pointer and the keyboard, and the critique drives it
there.

The other pages (`/foundations`, `/tv`) are `./showcase/foundations` and `./showcase/tv`;
the URL holds `/foundations`' view (`?mode=dark&density=desktop`) and its toggles set those two
parameters, keeping the rest and storing nothing. The places of one app composed from the
components are the showcase app's own routes (`apps/showcase/src/app/routes`), drawn by the screens
workbench.

## Slots

The table lives in [`slot-catalog.md`](../../docs/architecture/slot-catalog.md).

## License

MIT
