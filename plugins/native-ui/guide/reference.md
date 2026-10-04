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
foot, over any open sheet. `setTheme("light" | "dark" | "system")` (`lib/theme`) switches the mode at runtime. The
icon set is Lucide, drawn from `lucide-react-native`: every `icon` a component takes is an
`IconName`, a Lucide PascalCase name.

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

The phone draws the touch density set at every width. The roster's structure follows the phone:
the `Shell` draws a tab bar and no sidebar, `Split` shows the list or the open record alone with
the pane as a sheet, `Sheet` is a bottom sheet, `Columns` scrolls sideways and `Diff` is unified.
The `Table` alone reads the window: from `tablet` wide it is a grid, below it one `ListRow` per
record.

## Modes

The app starts in `theme.defaultMode` when it is set, else in the system's mode, and
`setTheme` changes it from then on. The generated app config sets `userInterfaceStyle` to
`automatic`, so the system's light and dark setting reaches the app.
