# @fcalell/plugin-native-ui

React Native design-system plugin for the `@fcalell/stack` framework. It renders
`@fcalell/ui-core`'s contract into the uniwind stylesheet, embeds the font files, composes the
app's providers, and ships the roster: 54 components in four
layers. Requires
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
`WordsProvider` when `words` is set → `QueryProvider` → `AuthProvider`). Theming is CSS-first: switch modes at runtime with `setTheme("dark")` from
`@fcalell/plugin-native-ui/lib/theme`.

The app's icon set is a runtime map: wrap the screens in `IconsProvider` from
`@fcalell/plugin-native-ui/lib/icons` with `{ name: LucideIcon }`, and every `icon` prop names a
key of it.

## Config options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `Theme` | the calibrated defaults | ui-core's contract: the knobs (`accentHue`, `neutralHue`, `neutralChroma`, `okHue`, `warnHue`, `dangerHue`, `primary`, `space`, `radius` (0 squares everything), `text`, `elevation` (`soft` \| `flat`), `density` (accepted and ignored: native is touch-only, so every control keeps the 44 px floor), `fonts`, `widths`, `breakpoints`), `overrides.colors` / `overrides.scales` for the single token off its ratio, and `defaultMode` (set, the app starts in that mode through a generated `Uniwind.setTheme` call; unset, it follows the system). |
| `words` | `Words` | English | Every word a molecule draws on its own; every key required, so a translation that misses one fails `tsc`. |
| `fonts` | `{ family, source }[]` | none | Font files to embed through expo-font. The families are named by `theme.fonts` (`sans`, `mono`); an entry only brings the file. |
| `authClientModule`, `queryClientModule` | `{ source, export }` | `src/lib/auth`, `src/lib/query` | Where the generated entry imports the native clients from. |

### The words

`active`, `waiting`, `done`, `attention`, `failed`, `idle` (the six `Status` words),
`recommended`, `copy`, `copied`, `back`, `close`, `more`, `send`, `stop`, `attach`, `search`,
`loading`, `retry`, `add`, `remove`, `duplicate`. A sentence that belongs to the app is a prop on the molecule that draws it
(`placeholder`, `notice`, every `sentence`, every `label`), never a word here.

## The roster

Every component is imported from its own subpath, `@fcalell/plugin-native-ui/components/<name>`
in kebab case (`components/list-row`). Every props type closes `class`, `className`, `classList`,
`style` and uniwind's per-prop class channels as `?: never`; a look the matrices do not cover is a
matrix cell in ui-core or a primitive under the app's `ui/`, never a prop. The prop names are the
roster in `@fcalell/ui-core/roster`, the same on both platforms; the verify suite reads each
component's props type against it.

`confirm({ title, sentence, act, confirmName? })` (`lib/confirm`) asks a decision from anywhere and
resolves to whether the act was taken; the `Shell` draws it as a bottom sheet, dismissing it
declines, and `confirmName` blocks the act until the viewer types the named value. A `FormField`
takes any `FieldBinding` as `field`; native ships no form hook, so the binding comes from the
app's form state (the web's `useApiForm(...).bind(name)` has no native twin yet).

`native-ui` draws the phone layout at every width: `Split` shows one slot (the deepest present),
`Columns` stacks, `Diff` is unified, `Sheet` is a bottom sheet, `Shell` draws the tab bar and no
sidebar. Pull to refresh is the phone's.

### Atoms

| Component | Props |
| --- | --- |
| `Text` | `role` (`display`, `title`, `heading`, `body`, `meta`, `label`, `mono`), children |
| `Icon` | `name`, from the app's icon set |
| `Button` | `act` (`primary`, `secondary`, `destructive`), `label`, `onAct`, `loading`, `spinner` (the busy glyph), `blocked` (the reason, drawn under it once pressed or once its form or sheet has taken input) |
| `IconButton` | `icon`, `label` (read aloud), `onAct` |
| `Count` | `value` |
| `Status` | `state` (`active`, `waiting`, `done`, `attention`, `failed`, `idle`), `label`, `onOpen` |
| `Chip` | `label`, `family` (`1` to `6`, the `chip-n` fill the app gives a family of values); no act |
| `Input` | `kind` (`text`, `search`, `secret`, `source`, `number`, `email`: the email keyboard, the system's saved address, never corrected or capitalized), `value`, `onChange`, `onCommit` (the value once the viewer leaves the field or presses return, only when it changed since focus; a hardware Escape then puts back the value at focus), `placeholder`, `unit`, `act` |
| `TextArea` | `kind` (`prose`, `source`), `value`, `onChange`, `onCommit` (the value once the viewer leaves the field having changed it; return is a new line), `placeholder`, `budget` (words) |
| `InputOtp` | `length` (boxes), `value` (the digits), `onChange`, `onComplete` (the code once its last digit lands), `loading` (holds the boxes while the code is checked); it takes focus when it is drawn unless another input holds it, so the code step a sent code opens needs no tap; one invisible input over the boxes: the number pad, the system's one-time-code suggestion, a pasted code; inside a `FormField` its error is the field's line |
| `EnumInput` | `value` (`string[]`), `onChange`, `placeholder`; each value on a `source` cell with a remove act, then a `source` field whose act adds the draft; a value already listed is refused, `words.duplicate` under the field |
| `Slider` | `label`, `value`, `onChange`, `min`, `max`, `step`, `unit` (an Intl unit identifier such as `percent`) |
| `Switch`, `Checkbox` | `checked`, `onChange`, `label` |
| `Spinner` | `kind` (`circle` \| `scramble`; `scramble` cycles mono glyphs and holds still under reduced motion) |
| `Avatar` | `name`, `src` |
| `Link` | `href`, children |

### Layout molecules

| Component | Props |
| --- | --- |
| `Place` | `title`, `actions` (at most two circles; the rest open under a more circle), `act`, `more`, `bleed` (the body is the whole box under the top bar, with no inset and no scroll, for a child that pans and scrolls itself), children |
| `Screen` | `title`, `back` (a route), `actions`, children; an `ActionBar` child is pinned above the home indicator |
| `Split` | `list`, `main`, `pane`, `empty` (the desktop's, never drawn) |
| `Section` | `title` (a part), `count`, `description`, `folded` (set, it folds: the label is a button with a chevron), `onToggle` (its new state on each open and close), `act` (a blocked one says its reason under it once pressed or once its form or sheet is touched, as `Button` does), `loading`, children |
| `Group`, `List` | `loading`, children |
| `Form` | `onSubmit`, children |
| `Toolbar`, `ActionBar`, `Columns` | children |
| `Shell` | `places` (`{ route, label, icon, count }`), `banner`, the toast queue and the `confirm()` decisions, `switcher` (what switches what the app is looking at, an organization or a project: it starts each `Place`'s top bar, never a `Screen`'s), children |

### Shared molecules

| Component | Props |
| --- | --- |
| `ListRow` | `leading` (`{ icon }` or `{ status }`), `title`, `meta` (parts, one or two lines), `trailing` (`{ age }`, `{ count }` or `{ value }`), `marks` (`{ icon, label }[]`), `act`, `more` (the row's `Menu` items, a more circle at its end), `href` or `onOpen` |
| `DefinitionRow` | `label`, `description`, `value` (a string, `{ status, label }` or an in-place control), `copyable`, `act`, `href` or `onOpen`; a `Picker` value stacks the row, as the web's under tablet: the label and the description, then the picker across the row with the act at its end |
| `FormField` | `label`, `description`, `error`, `field` (a `FieldBinding`: the error is the field's and children is `(control) => …`, the control's value, handler and, for an autosaving binding, `onCommit`), one typing control as children |
| `ItemHeader` | `overline` (parts), `title`, `facts` (parts and statuses), `loading` |
| `SegmentedControl` | `options` (`{ value, label }[]`), `value`, `onChange` |
| `Sheet` | `open`, `onClose`, `title`, `description`, `back`, `submit` (`{ label, onAct, blocked }`, top right), `foot`, children; `submit` and an `ActionBar` child exclude each other; the title names a typing control inside that no `FormField` labels; a new `title` or `description` is a new page, its blocked `submit` silent until pressed or touched again |
| `Picker` | `label`, `options` (`{ value, label, description }[]`, or `{ label, options }[]` groups, each under its label), `value`, `onChange`; generic over its value, read off `options` alone, so an enum's options pick that enum and a value outside them is a type error; no `value`: nothing selected, the placeholder, and `onChange` still hears a value; a `null` option: the explicit empty choice, drawn as the placeholder is, in `ink-meta`, which makes the pick nullable and `onChange` hear `null`; a search field above six options |
| `Menu` | `label` (read aloud on its more circle, the sheet's title), `items` (`{ label, onAct, icon, destructive, blocked }[]`, or a list of such lists for groups under hairlines); the phone's menu is a sheet of one-line acts, a destructive one in `danger`, a blocked one faded with its reason under it; the more circle of `Place` and `Screen` is the same sheet |
| `QueryBoundary` | `query` (a `useQuery` result or a tuple of them), `sentence`, children (`(data) => …`, one value per query): the loading form while pending, the `EmptyState` with a retry act on error |
| `OptionList` | `options` (`{ value, label, description, recommended }[]`), `value`, `onChange`, `loading`, children under the chosen option |
| `EmptyState` | `title`, `sentence`, `act`, children |
| `Toast` | `sentence`, `state` (`done`, `attention`, `failed`: the state's glyph on its `-soft` fill; without it the dark pill), `act`; `toast(sentence, { state, act })` queues one and the `Shell` draws the queue |
| `Banner` | `kind` (`note`, `warn`, `danger`), `sentence`, `act` |
| `PendingBar` | `sentence`, `until` (a `Date`; a countdown fills the bar), `spinner`, `act` |

A part is a string or `{ quoted: string }`: typographic quotes around it, cut at 40 characters in
a `meta` line, wrapped to two lines in a title.

### Content molecules

All take `loading` and draw three row forms.

| Component | Props |
| --- | --- |
| `Prose` | `markdown` |
| `Code` | `text`, `title` (what the text is, a file's name or the tool it goes into; the copy act sits in its row), `tail` (lines shown before a tap unfolds the rest), `copy` |
| `Diff` | `hunks`, or `before` and `after` (two texts diffed by line, three lines of context); the phone draws unified |
| `Table` | `columns`, `rows`, `selected`, `onOpen`, `onEdit`, `empty`, `loading`, the web's types: a grid does not fit a phone, so each row is a `ListRow` from the same columns (the first column its title, the first `status` its leading glyph, the first `age` its trailing age, the rest its meta line), a tap opens it through `onOpen` and its cells edit in the pane it opens; the phone draws no selection, since it never shows the pane beside the list, and does not sort or edit in place |
| `FileRow` | `path`, `added`, `removed`, `seen`, `href` or `onOpen` |
| `ProseDiff` | `before`, `after` |
| `Comparison` | `rows` (`{ label, cells: [{ label, value }], chips }`) |
| `Message` | `author` (`you`, `other`, `system`), `name`, `body`, `at`, `onOpen` (a `system` line that opens something becomes the act), `loading` |
| `MessageInput` | `value`, `onChange`, `attachments`, `onAttach`, `placeholder`, `notice` (`{ sentence, act }`), `working`, `onSend`, `onStop` |
| `Meter` | `label`, `value`, `max`, `meta` |
| `BarChart` | `series` (`{ label, value, parts, at }[]`), `unit` |
| `QrCode` | `value` |

## The boundary

Every look outside the app's `ui/` directory is a roster molecule: no component takes a
`className` or `style`, so a class attribute there sits only on a `View`, `Pressable`,
`ScrollView` or `Animated.View` and carries layout plumbing, never a look. A molecule whose
props are the app's nouns lives in the app's `ui/`, composed from these molecules and never from a
host element. Nothing here carries a product noun in a prop, an enum word or a string.

## Verify

`pnpm --filter @fcalell/plugin-native-ui verify` renders the sheet, compiles it through uniwind's
own compiler and a Tailwind build, reads the matrices back off ui-core's cvas, holds the overlay
allowlist equal to the swept sources, proves the closure with the fixture under
`scripts/fixture/closure.tsx`, and reads every component's props type against the roster.
