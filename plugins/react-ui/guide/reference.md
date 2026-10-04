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
`age(moment)` (`lib/age`) words an ISO moment as its age from now, the string a row's age
takes. `useTouch()` (`lib/media`) says whether the touch density is
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
touch sizes and structure. A `data-density` attribute on `<html>` pins either one: `desktop` or
`touch`. Sizes, spacing roles and type roles follow density on their own; a molecule whose
structure differs by density reads it itself.

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

## Safe areas

The touch tab bar clears a phone's home indicator by itself: the document sets
`viewport-fit=cover`, and the bar pads its bottom by the safe-area inset.
