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

## Config options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `theme` | `Theme` | the calibrated defaults | The ui-core contract, four flat knobs: `accentHue` (264), `castHue` (the neutrals' hue; `accentHue` unless set), `fonts` (`{ sans?, mono? }` family names; IBM Plex Sans and IBM Plex Mono unless set) and `defaultMode` (a viewer with no stored choice starts in it, ahead of `prefers-color-scheme`). Every value resolves through `deriveTheme` and lands in the `@theme` block of `.stack/app.css`. |
| `words` | `Words` | English | Every word a molecule draws on its own, every key required. Mounted into the generated providers as a `WordsProvider` (`@fcalell/plugin-react-ui/lib/words`, read with `useWords()`). |
| `fonts` | `FontEntry[]` | `defaultFonts` | The font files to load: each is preloaded and gets an `@font-face` with fallback metrics, one per family. The default is IBM Plex Sans upright and italic (each on its `wght` axis, `plexSans` and `plexSansItalic` from `./node/fonts`) and IBM Plex Mono at 400, 500 and 600; `[]` loads none. Which family the contract binds to `sans` or `mono` is `theme.fonts`. |

The icon set is Lucide: every `icon` or `name` a component takes is an `IconName` (a Lucide
PascalCase name), drawn from `lucide-react`, the plugin's own dependency.

## Generated files

| File | Slot | Content |
|------|------|---------|
| `.stack/app.css` | `reactUi.slots.appCssSource` | `tailwindcss` with `source(none)`, the plugin's `globals.css`, `@source "../src"`, the `@theme` tokens and shadow utilities from ui-core, the `touch:` and `page-*` custom variants, the `pb-safe` utility, and `@layer base` for the mode scopes, reduced motion and density |

`.stack/entry.tsx` imports `./app.css`; `.stack/vite.config.ts` gains `tailwindcss()`,
`themeFontsPlugin` (the preloads and `@font-face` rules) and `themeModePlugin` (the script that
sets the `dark` class from the stored choice, the theme's `defaultMode`, else the system).

Density is no option: the desktop set draws where the pointer is fine and the viewport is at
least `tablet` wide, and the touch set everywhere else, so a desktop window narrower than
`tablet` draws the touch sizes and structure. The rule is one query (`./density`) the density
layer, the `touch:` variant and `useTouch` all read. A `data-density` attribute on `<html>` pins either on any device: `desktop`
draws the compact set, `touch` the touch set. The `touch:` variant is the same rule for a
class: it applies under `data-density="touch"`, and with no `desktop` pin where the pointer is
not fine or the viewport is narrower than `tablet`, so a molecule's structure follows density (an action bar at natural width on the
desktop, full width on touch); a molecule whose tree differs by density (the Shell's
sidebar or tab bar) reads the same rule through `useTouch` from `lib/media`. A token never needs it: a size, a spacing role and a type role
follow density through their variables.

A Place or a Screen is the `page` size container (`@container/page`), and `page-<breakpoint>:`
and `page-max-<breakpoint>:` draw from or below a breakpoint's width of it, emitted from the
contract's breakpoint values. A Split decides its regions by them (one region below `tablet`,
the list beside the main from it, the pane beside from `wide`), so its record keeps its room
beside the sidebar whatever the viewport.

`pb-safe` pads a bar's bottom by `env(safe-area-inset-bottom)`, so the touch tab bar clears a
phone's home indicator; the react plugin's document sets `viewport-fit=cover`, which makes the inset
non-zero.

The modes are class scopes: `.dark` on `<html>` is the mode, and `.light` on any element
inside it restores the light colors and `color-scheme` for that subtree, as the showcase's light
frames do. Under `prefers-reduced-motion: reduce` every `--transition-duration-*` rung is 0ms, so
no transition or animation that reads one moves. Each `@font-face` gets a metric fallback face
named by ui-core's `fallbackFace` (`"IBM Plex Sans Fallback"`), the name the contract's family
stack carries second.

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
