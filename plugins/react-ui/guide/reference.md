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

## Reads

A frame's `read` draws its states from `useFrame` (`lib/read`); a part of your own that stands in
a frame can draw the same: `BusyMark`, `StateLine` (a meta sentence with an optional quiet act)
and `FrameLine` (the stale and paused lines) take the `Frame` it returns. A paginated read's
"Show more" row is `MoreRow` (`lib/more`), which the collections draw; the web needs no
`QueryProvider listen`, since TanStack reads the window's online and visibility events.

## Long collections

A collection windows by itself: from `VIRTUAL_FROM` loaded rows (`@fcalell/ui-core/window`) under
a scroller, only the rows near the view and `OVERSCAN` past each edge are drawn, spacers holding
the room of the rest. No prop turns it on or off. The scrollers are a `Pane`'s body, a `Sheet`'s
body (docked or not), a `Gate`'s page and a `Thread`'s log, the nearest one winning, so a `List` in
a `Sheet` windows against the `Sheet`. A `List` (rows, files, meters and definitions, flat), a
`Group`'s list, a `Table` at both widths, a `Thread`, trees, an `OptionList`, a `Picker`'s options,
a `Comparison` and a `BarChart` (sideways, at a fixed bar width) window; a standalone `Select` draws
every option. A row is exactly one element. A collection that crosses the count
(a Show more) keeps the rows it drew. A part of your own that scrolls and holds a long collection
provides `Scroller` (`lib/window`) with `useScroller`; one that draws its own rows from a long
list uses `Window` (`lib/window`), given `count`, `keyOf`, `row(index)` (built only for the mounted indices) and the box the rows stand in.

## Acts

An act's holder reads from `useAct(where)` (`lib/act`): `pending` (which act runs), `holds` (it
runs, so siblings stand inert), `line` (its rejection's sentence, or "No connection." / the app's
`unreachable` sentence for an act refused for the connection), and `run(key, act)`. `where` is `"line"` for a holder that draws the
sentence itself, as the `ActionBar` and `Sheet` do, or `"toast"` for a failed toast with Retry. A
control of your own that saves as it changes takes `useHeldDraft(value)` (the draft that holds its
value while a save pends and toasts a refusal, whose Retry saves it again; a `FormField`'s own descriptors are hosted by the field instead, which draws the refusal in its line); `draft.change(next, () =>
save(next))` returns the save's promise, never rejecting. `refusal(error)` comes from `@fcalell/plugin-api/acts`; `useRun()` and
`useDraft` from `@fcalell/plugin-api/tanstack-query`. The pending look waits `ACT_DELAY` (300 ms,
`--act-delay`, from `@fcalell/ui-core/paint`).

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
portals (a menu, a picker, a sheet) draws outside that scope, which is why a room `Place`'s `Pane`
takes no `more` or `foot`.

## The page container

A `Place` is the `place` size container and each `Pane` the `page` one. The `Place` decides which
`Pane`s stand by its own width, never the viewport's: only the last below `tablet`, every `Pane`
from it, so a record keeps its room beside the sidebar at any window width. What stands in a `Pane`
reads the `Pane`'s width.

## Modes

The `dark` class on `<html>` is the mode; `.light` on an element inside it restores the light
colours for that subtree. The mode script sets `dark` before first paint from the stored choice,
else `theme.defaultMode`, else the system. Under `prefers-reduced-motion: reduce` every
transition duration is 0 ms.

## Auditing with axe

Run every axe rule except the document-structure ones (landmarks, heading order, skip links): screen readers are not a target. Exclude nothing for an open popup: a Menu, a Picker or a Select takes `aria-hidden` off the focus guards Base UI draws around it (the spans that relay Tab between a trigger and its portaled popup, focusable and `aria-hidden` in Base UI 1.8.0, which `aria-hidden-focus` would flag; each moves focus the moment it takes it, so nothing rests on one), so an open menu audits clean.

## Safe areas

The touch tab bar clears a phone's home indicator by itself: the document sets
`viewport-fit=cover`, and the bar pads its bottom by the safe-area inset. The Shell's column pads
its top by the safe-area inset, so a banner or a page's head clears a notch or a status bar.
