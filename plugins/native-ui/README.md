# @fcalell/plugin-native-ui

React Native design-system plugin for the `@fcalell/stack` framework: the native sibling of
`@fcalell/plugin-solid-ui`. It renders `@fcalell/ui-core`'s contract into the uniwind stylesheet,
embeds the font files, composes the app's providers, runs the geometry gate at build, and ships
the roster: 48 components in four layers, the same names and props as the web plugin. Requires
`expo` (it contributes into `plugin-expo`'s slots) plus `api` and `auth` (the wired Query and Auth
providers import their native subpaths).

## Install

```bash
pnpm add @fcalell/plugin-native-ui
```

## Usage

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { expo } from "@fcalell/plugin-expo";
import { nativeUi } from "@fcalell/plugin-native-ui";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [
    api(),
    auth(),
    expo({ scheme: "myapp" }),
    nativeUi({
      theme: { accentHue: 200, primary: "accent" },
      fonts: [{ family: "JetBrains Mono Variable", source: "./assets/JetBrainsMono.ttf" }],
    }),
  ],
});
```

`nativeUi` contributes everything the native UI layer needs into `plugin-expo`: the
`withUniwindConfig` Metro wrapper pointing at the generated `.stack/global.css`, an `expo-font`
config plugin embedding the font files, the provider stack around the app root
(`GestureHandlerRootView` → `KeyboardProvider` → `SafeAreaProvider` → `BottomSheetModalProvider` →
`WordsProvider` when `words` is set → `QueryProvider` → `AuthProvider`), and the pre-build
geometry gate. Theming is CSS-first: switch modes at runtime with `setTheme("dark")` from
`@fcalell/plugin-native-ui/lib/theme`.

The app's icon set is a runtime map: wrap the screens in `IconsProvider` from
`@fcalell/plugin-native-ui/lib/icons` with `{ name: LucideIcon }`, and every `icon` prop names a
key of it.

## Config options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `Theme` | the calibrated defaults | ui-core's contract: the knobs (`accentHue`, `neutralHue`, `neutralChroma`, `okHue`, `warnHue`, `dangerHue`, `primary`, `space`, `radius`, `text`, `fonts`, `widths`, `breakpoints`), `overrides.colors` / `overrides.scales` for the single token off its ratio, and `defaultMode`. A consumer with both platforms passes the same object to `solidUi`. |
| `words` | `Words` | English | Every word a molecule draws on its own; every key required, so a translation that misses one fails `tsc`. |
| `fonts` | `{ family, source }[]` | none | Font files to embed through expo-font. The families are named by `theme.fonts` (`sans`, `mono`); an entry only brings the file. |
| `authClientModule`, `queryClientModule` | `{ source, export }` | `src/lib/auth`, `src/lib/query` | Where the generated entry imports the native clients from. |

### The words

`active`, `waiting`, `done`, `attention`, `failed`, `idle` (the six `Status` words),
`recommended`, `copy`, `copied`, `back`, `close`, `more`, `send`, `stop`, `attach`, `search`,
`loading`, `retry`. A sentence that belongs to the app is a prop on the molecule that draws it
(`placeholder`, `notice`, every `sentence`, every `label`), never a word here.

## The roster

Every component is imported from its own subpath, `@fcalell/plugin-native-ui/components/<name>`
in kebab case (`components/list-row`). Every props type closes `class`, `className`, `classList`,
`style` and uniwind's per-prop class channels as `?: never`; a look the matrices do not cover is a
matrix cell in ui-core or a primitive under the app's `ui/`, never a prop. The prop names are the
roster in `@fcalell/ui-core/roster`, the same on both platforms; the verify suite reads each
component's props type against it.

`native-ui` draws the phone layout at every width: `Split` shows one slot (the deepest present),
`Columns` stacks, `Diff` is unified, `Sheet` is a bottom sheet, `Shell` draws the tab bar and no
sidebar. Pull to refresh is the phone's.

### Atoms

| Component | Props |
| --- | --- |
| `Text` | `role` (`display`, `title`, `heading`, `body`, `meta`, `label`, `mono`), children |
| `Icon` | `name`, from the app's icon set |
| `Button` | `act` (`primary`, `secondary`, `destructive`), `label`, `onAct`, `loading`, `blocked` (the reason, drawn under it) |
| `IconButton` | `icon`, `label` (read aloud), `onAct` |
| `Count` | `value` |
| `Status` | `state` (`active`, `waiting`, `done`, `attention`, `failed`, `idle`), `label`, `onOpen` |
| `Input` | `kind` (`text`, `search`, `secret`, `code`, `number`), `value`, `onChange`, `placeholder`, `act` |
| `TextArea` | `kind` (`prose`, `source`), `value`, `onChange`, `placeholder`, `budget` (words) |
| `Slider` | `label`, `value`, `onChange`, `min`, `max`, `step` |
| `Switch`, `Checkbox` | `checked`, `onChange`, `label` |
| `Spinner` | none |
| `Avatar` | `name`, `src` |
| `Link` | `href`, children |

### Layout molecules

| Component | Props |
| --- | --- |
| `Place` | `title`, `actions` (at most two circles; the rest open under a more circle), `act`, children |
| `Screen` | `title`, `back` (a route), `actions`, children; an `ActionBar` child is pinned above the home indicator |
| `Split` | `list`, `main`, `pane` |
| `Section` | `title`, `count`, `description`, `folded`, `act`, `loading`, children |
| `Group`, `List` | `loading`, children |
| `Form` | `onSubmit`, children |
| `Toolbar`, `ActionBar`, `Columns` | children |
| `Shell` | `places` (`{ route, label, icon, count }`), `banner`, children |

### Shared molecules

| Component | Props |
| --- | --- |
| `ListRow` | `leading` (`{ icon }` or `{ status }`), `title`, `meta` (parts, one or two lines), `trailing` (`{ age }`, `{ count }` or `{ value }`), `marks` (`{ icon, label }[]`), `act`, `href` or `onOpen` |
| `DefinitionRow` | `label`, `description`, `value` (a string, `{ status, label }` or an in-place control), `copyable`, `act`, `href` or `onOpen` |
| `FormField` | `label`, `description`, `error`, one typing control as children |
| `ItemHeader` | `overline` (parts), `title`, `facts` (parts and statuses), `loading` |
| `SegmentedControl` | `options` (`{ value, label }[]`), `value`, `onChange` |
| `Sheet` | `open`, `onClose`, `title`, `description`, `back`, `submit` (`{ label, onAct, blocked }`, top right), `foot`, children; `submit` and an `ActionBar` child exclude each other |
| `Picker` | `label`, `options` (`{ value, label, description }[]`), `value`, `onChange`; a search field above six options |
| `OptionList` | `options` (`{ value, label, description, recommended }[]`), `value`, `onChange`, children under the chosen option |
| `EmptyState` | `title`, `sentence`, `act`, children |
| `Toast` | `sentence`, `act`; `toast(sentence, act)` queues one and the `Shell` draws the queue |
| `Banner` | `kind` (`note`, `warn`, `danger`), `sentence`, `act` |
| `PendingBar` | `sentence`, `until` (a `Date`; a countdown fills the bar), `act` |

A part is a string or `{ quoted: string }`: typographic quotes around it, cut at 40 characters in
a `meta` line, wrapped to two lines in a title.

### Content molecules

All take `loading` and draw three row forms.

| Component | Props |
| --- | --- |
| `Prose` | `markdown` |
| `Code` | `text`, `tail` (lines shown before a tap unfolds the rest), `copy` |
| `Diff` | `hunks`, `layout` (the phone draws unified) |
| `FileRow` | `path`, `added`, `removed`, `seen`, `href` or `onOpen` |
| `ProseDiff` | `before`, `after` |
| `Comparison` | `rows` (`{ label, cells: [{ label, value }], chips }`) |
| `Message` | `author` (`you`, `other`, `system`), `name`, `body`, `at` |
| `MessageInput` | `value`, `onChange`, `attachments`, `onAttach`, `placeholder`, `notice` (`{ sentence, act }`), `working`, `onSend`, `onStop` |
| `Meter` | `label`, `value`, `max`, `meta` |
| `BarChart` | `series` (`{ label, value, parts, at }[]`), `unit` |
| `QrCode` | `value` |

## The boundary

A class attribute outside the app's `ui/` directory may sit only on `View`, `Pressable`,
`ScrollView` or `Animated.View`, and only from the closed geometry vocabulary in ui-core's gate;
`stack build` fails on anything else, naming the file, the line and the token. A molecule whose
props are the app's nouns lives in the app's `ui/`, composed from these molecules and never from a
host element. Nothing here carries a product noun in a prop, an enum word or a string.

## Verify

`pnpm --filter @fcalell/plugin-native-ui verify` renders the sheet, compiles it through uniwind's
own compiler and a Tailwind build, reads the matrices back off ui-core's cvas, holds the overlay
allowlist equal to the swept sources, proves the closure with the fixture under
`scripts/fixture/closure.tsx`, reads every component's props type against the roster, and runs
the geometry gate over its fixture trees.
