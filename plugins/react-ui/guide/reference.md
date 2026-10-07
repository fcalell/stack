# Web UI reference

`reactUi()` renders the `@fcalell/ui-core` contract into the web app's stylesheet, loads the
fonts, sets the mode before first paint and mounts the words. It sits beside `vite()` and
`react()` in `stack.config.ts`.

## Components

Each roster component is imported from its own subpath, its name in kebab case:

```tsx
import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { useWords } from "@fcalell/plugin-react-ui/lib/words";
```

`toast(sentence, { state, act })` queues a toast, `state` being how the act it reports ended
(`done`, `attention` or `failed`), and `confirm(confirmation)` (`lib/confirm`) asks for a decision
in a sheet; only a page inside the `Shell` can call either, since the `Shell` draws both.
`age(moment, now)` (`lib/age`) words an ISO moment as its age from `now` ("2 minutes ago") and
`ageShort(moment, now)` in its short form ("2 min", for a meta like "Waiting for you · 12 min");
read `now` from the shared clock, `useClock((now) => age(moment, now))` (`lib/clock`), and the age
ticks on its own, the part drawing again only when its words change. A row's trailing age takes
the ISO moment itself, `trailing: { age: item.madeAt }`: the row words it short and ticks it, so
pass the moment, never a worded string. `useTouch()` (`lib/media`) says whether the touch density is
drawing. The icon set is Lucide, drawn from `lucide-react`: every `icon` a component takes is an
`IconName`, a Lucide PascalCase name.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `theme` | the calibrated defaults | Four knobs: `accentHue` (264), `castHue` (the neutrals' hue; `accentHue` unless set), `fonts` (`{ sans?, mono? }` family names; IBM Plex Sans and IBM Plex Mono unless set) and `defaultMode` (where a viewer with no stored choice starts, ahead of `prefers-color-scheme`). |
| `words` | English | Every word a component draws on its own, every key required. Read with `useWords()`. |
| `fonts` | IBM Plex Sans upright and italic on the `wght` axis, IBM Plex Mono at 400, 500 and 600 | The font files to load, each preloaded with a metric fallback face; `[]` loads none. Which family binds to `sans` or `mono` is `theme.fonts`. `plexSans` and `plexSansItalic` come from `@fcalell/plugin-react-ui/node/fonts`. |

```ts
reactUi({
  theme: { accentHue: 120, defaultMode: "dark" },
  words: { ...ENGLISH, back: "Zurück" },
});
```

`ENGLISH` is the default words record, from `@fcalell/ui-core/tokens`.

## Density

Density is no option. The desktop set draws where the pointer is fine and the viewport is at
least `tablet` wide; the touch set draws everywhere else, so a narrow desktop window draws the
touch sizes and structure. A `data-density` attribute on `<html>` pins one: `desktop` or `touch`.
Sizes, spacing roles and type roles follow density on their own; a molecule whose structure
differs by density reads it itself.

A screen read from across a room is the one set a page declares, `Place`'s `distance="room"`: its
`Place` sets `data-density="room"` on itself, so the touch set at a 960 × 540 canvas scaled to the
window draws inside it (`--room-unit` holds the scale), with the touch structure. A layer that
portals (a menu, a picker, a sheet) draws outside that scope, which is why a room `Place` takes no
`context`, `more` or `foot`.

## The page container

A `Place` or a `Screen` is the `page` size container. A `Split` decides its regions by the page's
width, never the viewport's: one region below `tablet`, the list beside the main from it, the pane
beside both from `wide`, so a record keeps its room beside the sidebar at any window width. A
record the main opened (`beside`) stands beside the main from `wide`, the two sharing what the
list leaves, and in the main's place below it.

## Modes

The `dark` class on `<html>` is the mode; `.light` on an element inside it restores the light
colours for that subtree. The mode script sets `dark` before first paint from the stored choice,
else `theme.defaultMode`, else the system. Under `prefers-reduced-motion: reduce` every
transition duration is 0 ms.

## Auditing with axe

Run every axe rule except the document-structure ones (landmarks, heading order, skip links): screen readers are not a target. Exclude `[data-base-ui-focus-guard]` from an audit, as in
`new AxeBuilder({ page }).exclude("[data-base-ui-focus-guard]")`. Base UI 1.8.0 draws its focus
guards, the spans that relay Tab between a trigger and its portaled popup, as focusable and
`aria-hidden` by design, so `aria-hidden-focus` flags each one; no prop turns them off. Each guard
moves focus on `onFocus`, so no focus rests on hidden content. Drop the exclude once Base UI ships
guards that are not focusable or not hidden. The showcase excludes it once in its Storybook preview
(`a11y.context`) and the screens floors do the same, so a consumer screen with an open popup is
judged alike.

## Safe areas

The touch tab bar clears a phone's home indicator by itself: the document sets
`viewport-fit=cover`, and the bar pads its bottom by the safe-area inset.
