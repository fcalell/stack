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

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/app.css` | `reactUi.slots.appCssSource` | `tailwindcss` with `source(none)`, the plugin's `globals.css`, `@source "../src"`, the `@theme` tokens and shadow utilities from ui-core, the `touch:` and `page-*` custom variants, the `pb-safe` utility, and `@layer base` for the mode scopes, reduced motion and density |

`.stack/entry.tsx` imports `./app.css`; `.stack/vite.config.ts` gains `tailwindcss()`,
`themeFontsPlugin` (the preloads and `@font-face` rules) and `themeModePlugin` (the script that
sets the `dark` class before first paint).

The density rule is one query (`./density`) that the density layer, the `touch:` variant and
`useTouch` (`lib/media`) all read. The `touch:` variant applies under `data-density="touch"`,
and with no `desktop` pin where the pointer is not fine or the viewport is narrower than
`tablet`, so a molecule's structure follows density (an action bar at natural width on the
desktop, full width on touch); a molecule whose tree differs by density (the Shell's sidebar or
tab bar) reads `useTouch`. A token never needs it: a size, a spacing role and a type role follow
density through their variables. The room set is the one scope a `Place` declares
(`distance="room"`): `[data-density="room"]` in the density layer (`ROOM_SCOPE`) holds
`--room-unit` and every room value as a `calc` over it, the `touch:` variant matches inside it,
and `useTouch` reads the Place's `DistanceContext` as well as the query.

`page-<breakpoint>:` and `page-max-<breakpoint>:` draw from or below a breakpoint's width of the
`page` container (`@container/page`), emitted from the contract's breakpoint values. `pb-safe`
pads by `env(safe-area-inset-bottom)`, non-zero under the react plugin's `viewport-fit=cover`.
Each `@font-face` gets a metric fallback face named by ui-core's `fallbackFace`
(`"IBM Plex Sans Fallback"`), the name the contract's family stack carries second.

The plugin also hands the CLI ui-core's guide pages (`cliSlots.guide`), as native-ui does;
the index lists each page once.

## Components

Each roster component lives in `src/ui/components/<componentDir(name)>/index.tsx` and is
imported as `@fcalell/plugin-react-ui/components/<dir>`. The file exports the component and its
`XProps` interface, which extends `Closed` (`./lib/closed`: `class`, `className`, `classList`
and `style` as `?: never`) and declares exactly the roster's prop names.

- **Look.** A part's `className` is `cn(cell(props), OVERLAY)`: the ui-core cva (or single-cell
  constant) first, then the overlay, so an overlay colour replaces the cell's. `cn` is
  `@fcalell/ui-core/cn`. An overlay is a module constant spelled verbatim from
  `.helm/research/design-system/atoms-overlays.md`, never a class built from a variable, and
  every overlay class other than a state variant over a token is listed in
  `scripts/overlays.ts`.
- **States.** Hover, press and focus are the web variants `hover:`, `active:` and
  `focus-visible:`; a disabled control `disabled:` or `aria-disabled:`, a pending act
  `aria-busy:`. The focus ring is the base `:focus-visible` rule in `globals.css`
  (`--focus-ring` in `--color-ring` at `--focus-ring-offset`), so a component spells nothing for
  it; a control inside a control rings inset with `focus-visible:-outline-offset-2`.
- **Behaviour.** `@base-ui/react` supplies behaviour and accessibility (a button, a switch, a
  checkbox, a slider, a field, a select) through its per-component subpaths
  (`@base-ui/react/switch`); its parts take the component's classes, never Base UI's look.
- **Composition.** A component that draws another's place takes its pattern, never a copy:
  `Select`'s trigger is `Input`'s box (`BOX`, `BOX_HOVER`, `BOX_DISABLED`, exported from
  `components/input`) and its open list a popover (`POPOVER`) of rows (`ROW`, `highlighted`
  under Base UI's highlight). A popup mounts in the body unless a `PortalContainer`
  (`lib/portal`) names an element: a surface that scopes its own mode (a showcase frame).
- **Words.** A word the component draws on its own comes from `useWords()`; a sentence is a prop.

`Text` is the worked example: a `<p>` in `text({ role })` with the `max-w-measure` overlay.

## Verify

`pnpm --filter @fcalell/plugin-react-ui verify` resolves `.stack/app.css` through the plugin
graph, compiles it with the Tailwind CLI in `scripts/fixture/`, and holds the components to it:

| Check | Asserts |
| --- | --- |
| `a6` | every class a component spells is emitted by the built sheet, so an off-contract utility fails by name |
| `b5` | the overlay classes the components spell equal `scripts/overlays.ts`, both ways; a state variant over a contract token is held by `b-owns` instead; the skeleton fraction widths (`SKELETON_WIDTHS`) are accepted without being required, only in a class literal that spells `bg-skeleton`, or in a literal of widths alone in a file that draws the line cell (`skeleton({ kind: "line" })`) |
| `b-owns` | every token a component spells is one its roster entry `owns` |
| `b6` | every props type extends `Closed`, no class channel or props spread survives |
| `b7` | `scripts/fixture/closure.tsx` passes each closed channel to every component under `@ts-expect-error` and compiles |
| `b-roster` | every component directory is a roster name and its props type carries exactly the roster's props |
| `b-words` | no JSX text or labelling attribute is a literal word |
| `b-nouns` | no product noun in `src` |
| `b-exports` | every component and lib subpath resolves through `exports` to its own file |

- **A page outside the shell.** `Gate` is the layout frame of a sign-in or a consent step:
  one column at the `auth` width on the surface, centred across and down the viewport, holding a
  `banner`, the `mark` (`{ name, src? }`), an optional `step` (`StepCount`), the `title` (the page's one
  `h1`), a `description` (a `Sentence`: runs with `{ strong }` parts) and the body. It mounts the
  same `FrameHost` as the `Shell` (`components/shell/host.tsx`: the `toast()` queue, the `confirm()`
  decisions, the popup layer). The first field of a step takes focus as the page opens and as `title`
  changes (`focusFirst` in `./lib/focus`), and it sets `FormStands` to `auth`, so an `ActionBar` with
  no `fit` reads `full`.

## The showcase

`Showcase` (`@fcalell/plugin-react-ui/showcase`) is a page generated from data: for every roster
component, one frame per matrix cell it draws (the families its roster entry's `draws` names,
enumerated by `matrixCells`) and state its roster entry's `states` lists, light and dark side by
side, each frame scoped by its mode's class, at one density. The URL decides
the view (`?mode=dark&density=desktop`) and the page's toggles rewrite it, storing nothing. Every
frame carries `data-cell="<component>/<cell>/<state>/<mode>/<density>"`; `showcaseCells()` lists
every id over both densities, so a density's page draws half of them.

A component's frames are drawn by one function in `src/ui/showcase/frames/<dir>.tsx`, registered
under its roster name in `registry.ts`: it takes the frame and returns the real component in that
cell and state, or `undefined` for a cell the component has no form for. The frames stay out of
the component directory, so a component never depends on the showcase. A component without a
registered function, or a cell it returns `undefined` for, draws its name and its cell's classes.
A state the component takes as a prop (`disabled` through `blocked`, `loading`, `error`,
`selected`, `empty`) is drawn by passing it. The pointer and focus states are forced: each frame
carries `data-force-state="<state>"`, and `globals.css` redefines the `hover`, `active` and
`focus-visible` variants to match inside `[data-force-state=hover|active|focus]` as well as on the
real pseudo-class, and draws the focus ring on every tabbable element in a `focus` frame. The
component's own overlay classes then draw the state, with nothing showcase-only in it.

## Slots

The table lives in [`slot-catalog.md`](../../.helm/knowledge/architecture/slot-catalog.md).

## License

MIT
