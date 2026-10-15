# Phone UI reference

`nativeUi()` renders the `@fcalell/ui-core` contract into the phone app's uniwind stylesheet,
embeds the font files, wraps the app in its providers and mounts the words. It sits beside
`expo()`, `api()` and `auth()` in `stack.config.ts`, and requires all three.

## Components

Each roster component is imported from its own subpath, its name in kebab case:

```tsx
import { ListRow } from "@fcalell/plugin-native-ui/components/list-row";
import { Place } from "@fcalell/plugin-native-ui/components/place";
import { toast } from "@fcalell/plugin-native-ui/lib/toast";
import { useWords } from "@fcalell/plugin-native-ui/lib/words";
```

A component's props, each with what it draws on the phone, are its props type in
`node_modules/@fcalell/plugin-native-ui/src/ui/components/<dir>/index.tsx`.

`toast(sentence, { state, act })` queues a toast and `confirm(confirmation)` (`lib/confirm`) asks
for a decision; the `Shell` draws each decision as a bottom sheet and the toasts at the screen's
foot, over any open sheet. `age(moment, now)` (`lib/age`) words an ISO moment as its age from `now`
("2 minutes ago") and `ageShort(moment, now)` in its short form ("2 min"); read `now` from the
shared clock, `useClock((now) => age(moment, now))` (`lib/clock`). `setTheme("light" | "dark" | "system")` (`lib/theme`) switches the mode at runtime. The
icon set is Lucide, drawn from `lucide-react-native`: every `icon` a component takes is an
`IconName`, a Lucide PascalCase name.

## Reads

A frame's `read` draws its states from `useFrame` (`lib/read`); a part of your own that stands in
a frame can draw the same: `BusyMark`, `StateLine` (a meta sentence with an optional quiet act)
and `FrameLine` (the stale and paused lines) take the `Frame` it returns. A paginated read's
"Show more" row is `MoreRow` (`lib/more`), which the collections draw. The phone has no window
events, so `nativeUi()` wires TanStack's online and focus managers itself (`expo-network` and
`AppState`, through `QueryProvider listen`): a read pauses offline, shows the paused line, and
refetches when the app returns to the foreground. Pass nothing.

## Long collections

The phone draws every row of a collection for now, whatever its length, and a `Thread` keeps its
inverted log; the web windows a long one (`VIRTUAL_FROM`), the phone's waits on a device.

## Acts

An act's holder reads from `useAct(where)` (`lib/act`): `pending` (which act runs), `holds` (it
runs and does not wait for a connection, so siblings stand inert), `line` (its rejection's sentence,
or "Waiting for a connection."), and `run(key, act)`. `where` is `"line"` for a holder that draws the
sentence itself, as the `ActionBar` and `Sheet` do, or `"toast"` for a failed toast with Retry. A
control of your own that saves as it changes takes `useHeldDraft(value)` (the draft that holds its
value while a save pends and draws a refusal where `useFailed()` does); `draft.change(next, () =>
save(next))` returns the save's promise, never rejecting. `refusal(error)` comes from `@fcalell/plugin-api/acts`; `useRun()` and
`useDraft` from `@fcalell/plugin-api/tanstack-query`. The pending look waits `ACT_DELAY` (300 ms, from
`@fcalell/ui-core/paint`; the phone's fill snaps in).

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `theme` | the calibrated defaults | Four knobs: `accentHue`, `castHue` (the neutrals' hue; `accentHue` unless set), `fonts` (`{ sans?, mono? }` family names; IBM Plex Sans and IBM Plex Mono unless set) and `defaultMode` (the mode the app starts in; unset, it follows the system). An app on both platforms passes the web plugin the same object. |
| `words` | English | Every word a component draws on its own, every key required, so a translation that misses one fails the type-check. Read with `useWords()`. |
| `fonts` | none | The font files to embed, `{ family, source }[]`, `source` a path from the project root. `theme.fonts` names the families; an entry only brings a file, so embed the files of the families the theme names. Without one, the device must already have the family. |
| `queryClientModule`, `authClientModule` | `{ source: "../src/lib/query", export: "queryClient" }`, `{ source: "../src/lib/auth", export: "authClient" }` | Where the generated entry imports the Query and Auth clients from, `source` relative to `.stack/`. Setting one skips scaffolding its default file. |

```ts
nativeUi({
  theme: { accentHue: 200, defaultMode: "dark" },
  fonts: [
    { family: "IBM Plex Sans", source: "./assets/IBMPlexSans.ttf" },
    { family: "IBM Plex Mono", source: "./assets/IBMPlexMono.ttf" },
  ],
});
```

Fonts embed through expo-font's config plugin, so a change to `fonts` takes a new native build;
Expo Go never has them.

## What you edit

`stack init` (or `stack add native-ui`) scaffolds two files once; they are yours to edit.

- `src/lib/query.ts` exports `queryClient`, made by `createQueryClient()` from
  `@fcalell/plugin-api/tanstack-query` with a single retry and a short stale window; pass a
  `QueryClientConfig` to tune it.
- `src/lib/auth.ts` exports `authClient`; the phone's sign-in is
  `node_modules/@fcalell/plugin-expo/guide/native-auth.md`.

## Density and layout

The phone draws the touch density set at every width, and the room set inside a `Place` that
declares `distance="room"`: the touch set at a 960 × 540 canvas scaled to the window, which
`RoomScope` (`lib/room`) computes from the window's size and scopes with uniwind's
`ScopedVariables`. The roster's structure follows the phone:
the `Shell` draws a tab bar and no sidebar, a route renders one `Pane` (a record is a deeper route
pushed in expo-router's stack; `cover` and `wide` change nothing), `Sheet` is a bottom sheet as tall as its content up to the screen under the top inset, the body scrolling past it, `Columns` scrolls sideways at `board` (its sections at their own width, not the web's column width) and stacks at `half`, and `Diff` is unified.
The `Table` alone reads the window: from `tablet` wide it is a grid, below it one `ListRow` per
record.

## Modes

The app starts in `theme.defaultMode` when it is set, else in the system's mode, and
`setTheme` changes it from then on. The generated app config sets `userInterfaceStyle` to
`automatic`, so the system's light and dark setting reaches the app.
