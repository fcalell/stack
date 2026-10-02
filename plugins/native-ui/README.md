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
      theme: { accentHue: 200 },
      fonts: [
        { family: "IBM Plex Sans", source: "./assets/IBMPlexSans.ttf" },
        { family: "IBM Plex Mono", source: "./assets/IBMPlexMono.ttf" },
      ],
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

The icon set is Lucide: every `icon` or `name` a component takes is an `IconName` (a Lucide
PascalCase name), drawn from `lucide-react-native`.

## Config options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `Theme` | the calibrated defaults | ui-core's contract, four knobs: `accentHue`, `castHue` (the neutrals' hue; `accentHue` unless set), `fonts` (IBM Plex Sans and IBM Plex Mono unless set) and `defaultMode` (set, the app starts in that mode through a generated `Uniwind.setTheme` call; unset, it follows the system). Native draws the touch density set. |
| `words` | `Words` | English | Every word a molecule draws on its own; every key required, so a translation that misses one fails `tsc`. |
| `fonts` | `{ family, source }[]` | none | Font files to embed through expo-font. The families are named by `theme.fonts` (`sans`, `mono`, IBM Plex unless set); an entry only brings the file, so the app embeds the files of the families its theme names. |
| `authClientModule`, `queryClientModule` | `{ source, export }` | `src/lib/auth`, `src/lib/query` | Where the generated entry imports the native clients from. |

### The words

`active`, `waiting`, `done`, `attention`, `failed`, `idle` (the six `Status` words),
`recommended`, `copy`, `copied`, `back`, `close`, `cancel`, `dismiss`, `more`, `send`, `stop`, `attach`, `search`,
`loading`, `retry`, `add`, `remove`, `details`, `places`, `notifications`. A sentence that belongs to the app is a prop on the molecule that draws it
(`placeholder`, `notice`, every `sentence`, every `label`), never a word here.

## The roster

Every component is imported from its own subpath, `@fcalell/plugin-native-ui/components/<name>`
in kebab case (`components/list-row`). Every props type closes `class`, `className`, `classList`,
`style` and uniwind's per-prop class channels as `?: never`; a look the matrices do not cover is a
matrix cell in ui-core or a primitive under the app's `ui/`, never a prop. The prop names are the
roster in `@fcalell/ui-core/roster`, the same on both platforms; the verify suite reads each
component's props type against it.

`confirm({ title, sentence, act, confirmName? })` (`lib/confirm`) asks a decision from anywhere;
its act's `onAct` runs the work, pending with Cancel and the close act inert, and the sheet closes once that promise resolves and stays open to retry when it rejects. The `Shell`
draws it as a bottom sheet, dismissing it runs nothing, and `confirmName` blocks the act until the viewer types the named value. A `FormField`
takes any `FieldBinding` as `field`; native ships no form hook, so the binding comes from the
app's form state (the web's `useApiForm(...).bind(name)` has no native twin yet).

`native-ui` draws the phone layout at every width: `Split` shows the list or the open record
alone with the pane as a sheet, `Columns` scrolls sideways, `Diff` is unified, `Sheet` is a bottom sheet,
`Shell` draws the tab bar and no sidebar. Pull to refresh is the phone's.

### Atoms

| Component | Props |
| --- | --- |
| `Text` | `role` (`display`, `title`, `heading`, `body`, `meta`, `label`, `mono`), children |
| `Icon` | `name`, from the app's icon set; `fit` (`meta`, `body`, `control`: what it sits beside, which picks `icon-meta`, `icon` or `icon-control`) |
| `Button` | `act` (`primary`, `secondary`, `destructive`), `label`, `count` (a number in a pill after the label), `onAct`, `loading` (the busy ring), `blocked` (the reason, drawn under it once pressed or once its form or sheet has taken input) |
| `IconButton` | `icon`, `label` (read aloud), `onAct` |
| `Count` | `value` |
| `Status` | `state` (`active`, `waiting`, `done`, `attention`, `failed`, `idle`), `label`; a mark, a status that moves being a `Picker` over options carrying states |
| `Chip` | `label`, `family` (`red` … `pink`, the family the app gives a kind of values); `onRemove` (a trailing remove act, read aloud as `words.remove`) |
| `Input` | `kind` (`text`, `search`, `secret`, `source`, `number`, `email`: the email keyboard, the system's saved address, never corrected or capitalized), `value`, `onChange`, `onCommit` (the value once the viewer leaves the field or presses return, only when it changed since focus; a hardware Escape then puts back the value at focus), `placeholder`, `unit`, `act` |
| `TextArea` | `kind` (`prose`, `source`), `value`, `onChange`, `onCommit` (the value once the viewer leaves the field having changed it; return is a new line), `placeholder`, `budget` (words) |
| `InputOtp` | `length` (boxes), `value` (the digits), `onChange`, `onComplete` (the code once its last digit lands), `loading` (holds the boxes while the code is checked); it takes focus when it is drawn unless another input holds it, so the code step a sent code opens needs no tap; one invisible input over the boxes: the number pad, the system's one-time-code suggestion, a pasted code; inside a `FormField` its error is the field's line |
| `Select` | `value`, `onChange`, `options` (`{ value, label, description }[]`, or `{ label, options }[]` groups), `placeholder`; generic over its value like `Picker`; the field box showing the chosen label and a chevron, whose tap opens `Picker`'s option sheet; no `value`, or the `null` option, draws the placeholder |
| `Slider` | `label`, `value`, `onChange`, `min`, `max`, `step`, `unit` (an Intl unit identifier such as `percent`) |
| `Switch`, `Checkbox` | `checked` (a checkbox's is `mixed` over a partly checked set, and a press checks it), `onChange`, `label` (read aloud; the row around it draws the visible label); disabled by the field around it |
| `Spinner` | none: the busy ring in the meta ink |
| `Avatar` | `name`, `src` |
| `Link` | `href`, children |

### Layout molecules

| Component | Props |
| --- | --- |
| `Place` | `title` (on its own line under the top bar), `actions` (icon acts in the top bar, after the shell's switcher), `act` (the create act, with its plus, floating over the body's end), `more` (`MenuItem`s under the more circle, a destructive one in `danger`), `bleed` (the body is the whole box under the title, with no side inset and no scroll, for a child that scrolls itself), children |
| `Screen` | `title`, `back` (a route), `actions`, `more` (as `Place`'s), children; it covers the `Shell`'s tab bar |
| `Split` | `list`, `main` (set, the record stands alone), `pane` (with a record, a Details act in its `Place`'s or `Screen`'s top bar opens it as a sheet), `empty` (the desktop's, never drawn); it sits in a bleeding `Place` and scrolls itself |
| `Section` | `title` (a part), `count`, `description`, `folded` (set, it folds: the label is a button with a chevron), `onToggle` (its new state on each open and close), `act` (an `Act`, or an `IconAct` drawn as an `IconButton`; a blocked `Act` says its reason under it once pressed or once its form or sheet is touched, as `Button` does), `loading`, children |
| `Group`, `List` | `loading` (a loading `Section` sets it for the `Group` or `List` in its body), children |
| `Form` | children (its `ActionBar`'s filled act runs its `onAct`, and the form is busy while that promise pends; native has no implicit submission) |
| `Toolbar`, `Columns` | children |
| `ActionBar` | `acts` (`Act[]`, full width and stacked at the `acts` gap, the last one the filled act, drawn on top; a destructive act is `danger` filled, the hairline form otherwise), `fit` (`end`, `full`: the acts at the control or the field height) |
| `Shell` | `places` (`{ route, label, icon, count }`; past five, four tabs and a More tab that opens a page of the rest, each a row with its glyph, its count and its route), `banner`, the toast queue (standing above a `Place`'s floating act) and the `confirm()` decisions, `switcher` (a pick of what the app is looking at, an organization or a project, its options with avatars and its create act: it starts each `Place`'s top bar, never a `Screen`'s), children |

### Shared molecules

| Component | Props |
| --- | --- |
| `ListRow` | `leading` (`{ icon }`, `{ status }` or `{ avatar }`, one slot at the avatar's size), `title`, `meta` (parts on one line), `trailing` (`{ age }`, `{ count }` or `{ value }`, or `{ pick }`: a `Picker` at the row fit), `status` and `chip` (marks on the meta line), `more` (the row's `Menu` items, a more act at its end), `href` (the row selected at it) or `onOpen`; in a `Group` edge to edge at the card's inset, elsewhere a list's row, square |
| `DefinitionRow` | `label`, `description`, `value` (a string, `{ status, label }` or an in-place control), `copyable`, `act`, `href` or `onOpen`; the act an `IconAct`, or a link's chevron in its square, at the row's end |
| `FormField` | `label`, `description`, `error`, `field` (a `FieldBinding`: the error is the field's and children is `(control) => …`, the control's value, handler and, for an autosaving binding, `onCommit`), one typing control as children |
| `ItemHeader` | `overline` (parts), `title`, `facts` (parts and statuses), `loading` |
| `SegmentedControl` | `label` (the group's name), `options` (`{ value, label }[]`), `value`, `onChange` |
| `Sheet` | `open`, `onClose`, `title`, `description`, `back` (a second page's way back, in the close act's place), `submit` (an `Act` at the head's end, a blocked one's reason under the head), `foot` (a sentence in the foot), `fit` (`form`, `pane`: on the phone a pane's title steps down to body 500), children; a bottom sheet over the scrim, entering and leaving on the contract's motion (reduced motion honoured); the title names a typing control inside that no `FormField` labels; a new `title` or `description` is a new page, its blocked `submit` silent until pressed or touched again |
| `Picker` | `label`, `options` (`{ value, label, description }[]` (an option carrying `status` draws as that Status, in the sheet its dot leading the label), or `{ label, options }[]` groups, each under its label), `value`, `onChange`; generic over its value, read off `options` alone, so an enum's options pick that enum and a value outside them is a type error; no `value`: nothing selected, the trigger showing `label` in the placeholder's ink, and `onChange` still hears a value; a `null` option: the explicit empty choice, drawn as the placeholder is, in `ink-meta`, which makes the pick nullable and `onChange` hear `null`; an option carrying `avatar` leads its sheet row with its avatar; a search field above six options; `fit` (`field`, the field box; `row`, a row's value and chevron in a pill); `act` (an icon act, the act that makes a new option, under a hairline after the options) |
| `Menu` | `label` (read aloud on its more act, the sheet's title), `items` (`{ label, onAct, icon, destructive, blocked }[]`, the destructive ones last under a hairline); the phone's menu is a sheet of rows with its close act, a destructive one in `danger`, a blocked one inert with its reason under it, the more act holding the press wash while it is open; the more act of `Place`, `Screen` and `ListRow` is a `Menu` |
| `QueryBoundary` | `query` (a `useQuery` result or a tuple of them), `sentence`, children (`(data) => …`, one value per query): while pending, in a `Section` the Section busy over a loading `Group`, elsewhere a loading `List`; on error the failed `EmptyState` with a retry act |
| `OptionList` | `options` (`{ value, label, description, recommended }[]`), `value`, `onChange`, `loading`, children under the chosen option |
| `EmptyState` | `icon` (in the mark's disc), `title`, `sentence`, `act`, children; its form by where it stands: on a `Place` or `Screen` body centred in what the body leaves (its act the filled one with the plus), in a `Section` in a hairline frame (the hairline act), anywhere else a first run (its acts stacked across the column) |
| `Toast` | `sentence`, `state` (`done`, `attention`, `failed`: the state's glyph in its ink), `act` (a hairline Button), then the dismiss act; `toast(sentence, { state, act })` queues one and the `Shell` stands the queue at the screen's foot, each toast rising in and fading out, the stack closing up |
| `Banner` | `kind` (`note`, `warn`, `danger`), `sentence`, `act` (a hairline Button under the line) |
| `PendingBar` | `sentence`, `until` (a `Date`; a line along the track's foot fills toward it beside the time left, else the busy ring), `act` (a hairline Button under the track) |

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
| `MessageInput` | `value`, `onChange`, `attachments`, `onAttach`, `onDetach` (`(id) => void`), `placeholder`, `notice` (`{ sentence, act }`), `working`, `onSend`, `onStop` |
| `Meter` | `label`, `value`, `max`, `unit`, `meta` |
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
