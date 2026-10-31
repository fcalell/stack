# Web UI reference

`reactUi()` renders the `@fcalell/ui-core` contract into the web app's stylesheet, loads the
fonts, sets the mode before first paint and mounts the words. It sits beside `vite()` and
`react()` in `stack.config.ts`.

## Components

Each roster component is imported from its own subpath, its name in kebab case:

```tsx
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { useWords } from "@fcalell/plugin-react-ui/lib/words";
```

`navigate(route)` (`lib/navigate`) opens a route of the app from a handler the way a `Button` with an `href` does, in the router with no document load. `toast(sentence, { tone, act })` queues a toast for what no act started (an act's `done` toasts its own), `tone` being how the thing it reports ended
(`done` by default, `attention` or `failed`), and `confirm(confirmation)` (`lib/confirm`) asks for a decision no act starts (an act's `confirm` asks its own)
in a sheet; only a page inside the `Shell` can call either, since the `Shell` draws both.
`age(moment, now)` (`lib/age`) words an ISO moment as its age from `now` ("2 minutes ago") and
`ageShort(moment, now)` in its short form ("2 min", for a meta like "Waiting for you · 12 min");
read `now` from the shared clock, `useClock((now) => age(moment, now))` (`lib/clock`), and the age
ticks on its own, the part drawing again only when its words change. A row's trailing age takes
the ISO moment itself, `trailing: { age: item.madeAt }`: the row words it short and ticks it, so
pass the moment, never a worded string. `useTouch()` (`lib/media`) says whether the touch density is
drawing. The icon set is Lucide, drawn from `lucide-react`: every `icon` a component takes is an
`IconName`, a Lucide PascalCase name.

The tabs of a place are a `Picker` in `fit: segments` whose options are `{ label, href }` and carry no value: the option
whose `href` is the location's path, or its nearest parent, is the selected one, and a plain press opens its `href` in
the router like a `Link`. A `Toolbar` takes the same array as `tabs`.

## Reads

The web needs no `QueryProvider listen`, since TanStack reads the window's online and visibility events.

## Long collections

A collection windows by itself: from `VIRTUAL_FROM` loaded rows (`@fcalell/ui-core/window`) under
a scroller, only the rows near the view and `OVERSCAN` past each edge are drawn, spacers holding
the room of the rest. No prop turns it on or off. The scrollers are a `Pane`'s body, a `Sheet`'s
body (docked or not), a `Gate`'s page and a `Thread`'s log, the nearest one winning, so a `Section`'s
sheet in a `Sheet` windows against the `Sheet`. A `Section`'s sheet (rows, labelled or not, flat
or a tree), a `Table` at both widths, a `Thread`, trees, a `Picker`'s options (its `list` fit included),
and a `BarChart` (sideways, at a fixed bar width) window. A row is exactly one element. A collection that crosses the count
(a Show more) keeps the rows it drew.

## Acts

`refusal(error)` comes from `@fcalell/plugin-api/acts`; `useRun()` and
`useDraft` from `@fcalell/plugin-api/tanstack-query`. The pending look waits `ACT_DELAY` (300 ms,
`--act-delay`, from `@fcalell/ui-core/paint`).

An `Act` (`@fcalell/ui-core/descriptors`) carries its wiring as data: `confirm` (`{ title, sentence }`, asked
first), `done` (a sentence toasted once `onAct` resolves) and `to` (a route gone to after), and the web
`Act` type (`Act`, `IconAct` and `MenuEntry` from `lib/act`) adds `sheet` (a `Sheet`'s props but `open` and
`onClose`, opened by the press in place of `onAct`). The host that draws the act sequences them (confirm,
run, toast, go) and holds the sheet's open state; the app writes none of it by hand. A sheet no act opens
is a `sheet` search param on its route. A `Pane`'s `back` defaults to the parent route TanStack Router gives (the nearest ancestor route that is a page, `lib/navigate`'s `useParentRoute`), and `back={false}` leaves it off.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `theme` | the calibrated defaults | Five knobs: `hue` (`{ accent?, cast? }`; the accent 264, the cast the neutrals' hue, the accent's unless set), `radius` (the control's corner radius in px, 6; a layer takes a third more), `fonts` (`{ sans?, mono? }` family names; IBM Plex Sans (sans) and IBM Plex Mono (mono) unless set), `defaultMode` (where a viewer with no stored choice starts, ahead of `prefers-color-scheme`) and `loading` (`{ text?, figure?, id? }`, each `"pulse"` or `"scramble"`: how that kind of waiting slot is painted, the skeleton's breath or generated characters; omitted, all pulse. A technical voice scrambles figures and ids, `{ figure: "scramble", id: "scramble" }`; a shape always pulses). |
| `words` | English | Every word a component draws on its own, every key required. Read with `useWords()`. |
| `fonts` | IBM Plex Sans upright and italic on the `wght` axis, IBM Plex Mono at 400, 500 and 600 | The font files to load, each preloaded with a metric fallback face; `[]` loads none. Which family binds to `sans` or `mono` is `theme.fonts`. `inter` and `interItalic` come from `@fcalell/plugin-react-ui/node/fonts`. |

```ts
reactUi({
  theme: { hue: { accent: 120 }, defaultMode: "dark" },
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

A desktop window narrower than `tablet` with a fine pointer (a browser extension's popup, about
420 px) draws the touch set: width is the structure rule, and the pin is the supported answer. Set
`data-density="desktop"` on `<html>` for a page that stands in such a window, in its HTML or with
`document.documentElement.dataset.density = "desktop"` before the first render (the `no-density`
lint rejects the attribute as JSX, so it is never on an element of the app's own). The page
does not use the `Shell`, whose desktop form is a 220 px sidebar that a 420 px window cannot hold
beside a page: a pinned page is a `Gate` alone.

A screen read from across a room is the one set a page states, `distance="room"` on the `Place` it
draws outside the `Shell` (`import { Place } from "@fcalell/plugin-react-ui/components/shell"`; the
showcase's `/tv` page; the `Shell` takes none): that place sets `data-density="room"` on
itself, so the touch set at a 960 × 540 canvas scaled to the window draws inside it (`--room-unit`
holds the scale), with the touch structure. A layer that portals (a menu, a picker, a sheet) draws
outside that scope, which is why a room place's `Pane` takes no `more` or `foot`. A room page with
no data to show (signed out, the server not answering) draws its `Gate` inside the same `Place`, so
the Gate fills it at the room set and stands its step in the middle of the screen (the showcase's
`/tv-offline`). Inside a room place the board takes the room's own forms: a `Pane`'s head stands a
`pad` off the top, on the table, over a bar of its own; a row whose only mark is a `status` draws
one line, the status after the meta at the end group's start, whole whatever its word, the meta taking
the room it leaves; a `Stats` strip is the rows' width, its cells sharing it in proportion, so it
reads as one column with the rows under it. The showcase's `/tv` draws the strips and `/tv-board`
thirty rows at 960 × 540.

## The page container

The place the `Shell` draws is the `place` size container and each `Pane` the `page` one. The place
decides which `Pane`s stand by its own width, never the viewport's: only the last below `tablet`,
every `Pane` from it, so a record keeps its room beside the sidebar at any window width. What stands
in a `Pane` reads the `Pane`'s width. On the desktop the place is a raised panel an `gap` gap from the canvas
at its top, end and bottom and against the 220 px sidebar (a dark slate column, pinned dark in both modes); on touch it fills the column.

## Modes

The `dark` class on `<html>` is the mode; `.light` on an element inside it restores the light
colours for that subtree. The mode script sets `dark` before first paint from the stored choice,
else `theme.defaultMode`, else the system; a mode that came from the system follows it while the
page is open (a screen on a dark schedule changes with it), unless a choice is stored by then. Under
`prefers-reduced-motion: reduce` every transition duration is 0 ms.

## Shots at rest

A review that shoots screens (`stack screens test` does, and so may an app's own browser driver) holds
motion still with the one setup stack's own run uses: emulate `prefers-reduced-motion: reduce` (every
rung is 0 ms and the pulse stills; Playwright's `reducedMotion: "reduce"`, or CDP's
`Emulation.setEmulatedMedia` with the feature `prefers-reduced-motion: reduce`). The spinner keeps
turning under it, which is no motion a shot can hold; a driver that wants it still too injects, once
per page, unlayered:

```css
*, *::before, *::after { transition: none !important; animation: none !important; }
```

That rule does not reach an animation that carries state rather than motion. One is a scroll-driven
animation that decides whether something stands (a record's touch-bar name, `touch:record-name-waits`,
hidden until the head's name has scrolled under the bar): it has no duration for reduced motion to
zero, and a shot with it off would show only its fallback, the name always standing. Such an
animation is written `!important` in a cascade layer (the component's utility is in `utilities`), and
an important declaration in a layer beats an unlayered important one, so the setup above leaves it
running without knowing its name. A driver injects its rule unlayered, never into a `@layer`, and a part
that adds an animation that carries state does the same.

The marks that change are no such animation: a swapped mark's old one and an act's fading glyph are
hidden in their own style and animate `from` their rest, and the new mark and the pending spinner
animate `from` hidden, so a setup that turns animations off draws the new mark and the spinner alone,
never the old one under it, and an old mark whose removal a busy page delays is already invisible. A
part that adds an exit writes it so (a `from` keyframe over an end state in its style), never a `to`
keyframe that leaves the part standing once animations are off.

## Auditing with axe

Run every axe rule except the document-structure ones (landmarks, heading order, skip links): screen readers are not a target. Exclude nothing for an open popup: a Menu or a Picker takes `aria-hidden` off the focus guards Base UI draws around it (the spans that relay Tab between a trigger and its portaled popup, focusable and `aria-hidden` in Base UI 1.8.0, which `aria-hidden-focus` would flag; each moves focus the moment it takes it, so nothing rests on one), so an open menu audits clean.

## Safe areas

The touch places layer clears a phone's status bar and home indicator by itself: the document
sets `viewport-fit=cover`, and the layer pads its top and bottom by the safe-area insets. The Shell's column pads
its top by the safe-area inset, so a banner or a page's head clears a notch or a status bar.
