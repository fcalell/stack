# @fcalell/plugin-solid-ui

The SolidJS half of the stack design system: the roster `@fcalell/ui-core` pins, rendered with
Kobalte and Tailwind v4, and the CLI plugin that wires it into a consumer's `stack dev` /
`stack build` flow: the stylesheet, the fonts, the words, the providers, the geometry gate.

## Install

```bash
pnpm add @fcalell/plugin-solid-ui
```

Peer dependencies: `solid-js ^1.9`, `@tanstack/solid-form ^1.28` (optional). `plugin-solid` and
`plugin-vite` must be listed alongside (`stack init` adds them when you pick the design system).

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [solid(), solidUi()],
});
```

## Config options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `theme` | `Theme` | the calibrated defaults | The ui-core contract, flat knobs: `accentHue`, `neutralHue`, `neutralChroma`, `okHue`, `warnHue`, `dangerHue`, `primary` (`ink` \| `accent`), `space`, `radius`, `text`, `fonts` (`{ sans?, mono? }` family names), `widths`, `breakpoints`, `defaultMode`, `overrides`. Every value resolves through `deriveTheme` and lands in the `@theme` block of `.stack/app.css`. |
| `words` | `Words` | English | Every word a molecule draws on its own, every key required: the six status words, `recommended`, `copy`, `copied`, `back`, `close`, `more`, `send`, `stop`, `attach`, `search`, `loading`, `retry`. Mounted into the generated entry as a `WordsProvider`. |
| `fonts` | `FontEntry[]` | `defaultFonts` (JetBrains Mono Variable) | The font files to load: each is preloaded and gets an `@font-face` with fallback metrics. Which family the contract binds to `sans` or `mono` is `theme.fonts`. |

```ts
solidUi({
  theme: { accentHue: 200, primary: "accent", fonts: { sans: "Inter Variable" } },
  words: { ...ENGLISH, send: "Envoyer" },
  fonts: [interVariable, ...defaultFonts],
});
```

The schema rejects an unknown knob, a hue outside `[0, 360)`, a fractional base, an unknown
width or breakpoint, a color outside the `oklch(L C H)` shape, a scale value that would break
out of its declaration, and a `words` object missing a key, naming the offender.

## The runtime

`createApp` (`@fcalell/plugin-solid-ui/app`) mounts the router, the query client, the meta
provider, the consumer's icon set (`icons: IconSet`, a name to a `lucide-solid` glyph, read by
`Icon`, a row's marks and the shell's places) and, when given, `words`. `useWords()`
(`lib/words`), `useIcon(name)` (`lib/icons`) and `toast(sentence, act?)` (`lib/toast`) are the
three runtime hooks; the `Shell` draws the toast queue.

## The roster

Every component takes exactly the props below and closes `class`, `className`, `classList` and
`style` as `?: never`. A prop named `act` is an `Act` (`{ label, onAct, blocked?, loading? }`)
unless it is a `Button`'s kind; `href` routes and `onOpen` opens; `loading` draws the molecule's
own three-row form. `Part` is a string or `{ quoted }`, drawn in typographic quotes.

### Atoms

| Atom | Props | Notes |
| --- | --- | --- |
| `Text` | `role`, children | the only way to set type; ink and family follow the role |
| `Icon` | `name` | from the consumer's icon set, sized by the role around it |
| `Button` | `act` (`primary` \| `secondary` \| `destructive`), `label`, `onAct`, `loading`, `blocked` | a pill; `blocked` is the reason under it |
| `IconButton` | `icon`, `label`, `onAct` | a 44 px circle; the label is read aloud |
| `Count` | `value` | a number in a pill |
| `Status` | `state`, `label`, `onOpen` | a glyph and the state's word; a chip with `onOpen` |
| `Input` | `kind` (`text` \| `search` \| `secret` \| `code` \| `number`), `value`, `onChange`, `placeholder`, `act` | `search` is a pill; `act` sits inside the field |
| `TextArea` | `kind` (`prose` \| `source`), `value`, `onChange`, `placeholder`, `budget` | `source` is mono; `budget` draws a word counter |
| `Slider` | `label`, `value`, `onChange`, `min`, `max`, `step` | the value beside the thumb |
| `Switch`, `Checkbox` | `checked`, `onChange`, `label` | the label is the hit line |
| `Spinner` | | in the ink around it |
| `Avatar` | `name`, `src` | initials on the ladder fill picked by the name |
| `Link` | `href`, children | inline |

### Layout molecules

| Molecule | Props | Owns |
| --- | --- | --- |
| `Place` | `title`, `actions` (`IconAct[]`, two shown, the rest under more), `act`, children | the large title, the scroll, the floating act |
| `Screen` | `title`, `back` (a route), `actions`, children | the back circle, the compact title on scroll; covers the shell on the phone |
| `Split` | `list`, `main`, `pane` | the columns from desktop, one slot under it |
| `Section` | `title`, `count`, `description`, `folded`, `act`, `loading`, children | the label header, folding |
| `Group` | `loading`, children | the group box with hairlines |
| `List` | `loading`, children | rows on the surface |
| `Form` | `onSubmit`, children | fields at `stack`, its bar in flow |
| `Toolbar` | children | one row of controls |
| `ActionBar` | children | pinned under a `Screen`, in flow under a `Form` or a `Sheet` |
| `Columns` | children | sections side by side from desktop |
| `Shell` | `places` (`PlaceSpec[]`), `banner`, children | the tab bar, the sidebar, the toast queue |

### Shared molecules

| Molecule | Props |
| --- | --- |
| `ListRow` | `leading` (`{ icon }` \| `{ status }`), `title`, `meta` (parts, one or two lines), `trailing` (`{ age }` \| `{ count }` \| `{ value }`), `marks`, `act`, `href`, `onOpen` |
| `DefinitionRow` | `label`, `description`, `value` (a string, `{ status }` or a control), `copyable`, `act`, `href`, `onOpen` |
| `FormField` | `label`, `description`, `error`, children |
| `ItemHeader` | `overline`, `title`, `facts`, `loading` |
| `SegmentedControl` | `options`, `value`, `onChange` |
| `Sheet` | `open`, `onClose`, `title`, `description`, `back`, `submit` (`{ label, onAct, blocked }`), `foot`, children |
| `Picker` | `label`, `options`, `value`, `onChange` |
| `OptionList` | `options`, `value`, `onChange`, children |
| `EmptyState` | `title`, `sentence`, `act`, children |
| `Toast` | `sentence`, `act` |
| `Banner` | `kind` (`note` \| `warn` \| `danger`), `sentence`, `act` |
| `PendingBar` | `sentence`, `until` (a `Date`), `act` |

### Content molecules

| Molecule | Props |
| --- | --- |
| `Prose` | `markdown`, `loading` |
| `Code` | `text`, `tail`, `copy`, `loading` |
| `Diff` | `hunks`, `layout` (`unified` \| `split`), `loading` |
| `FileRow` | `path`, `added`, `removed`, `seen`, `href`, `onOpen`, `loading` |
| `ProseDiff` | `before`, `after`, `loading` |
| `Comparison` | `rows`, `loading` |
| `Message` | `author` (`you` \| `other` \| `system`), `name`, `body`, `at`, `loading` |
| `MessageInput` | `value`, `onChange`, `attachments`, `onAttach`, `placeholder`, `notice`, `working`, `onSend`, `onStop` |
| `Meter` | `label`, `value`, `max`, `meta`, `loading` |
| `BarChart` | `series`, `unit`, `loading` |
| `QrCode` | `value`, `loading` |

## The boundary

A class attribute lives only inside this package and a consumer's `ui/`; the geometry gate
(`@fcalell/ui-core/gate`) fails `stack build` on any other call site naming a class outside the
geometry vocabulary. A product's `ui/` molecule composes these molecules and never a host
element; a look the roster does not cover is a matrix cell in ui-core or a `ui/` primitive, in
that order. No component draws a sentence of its own: every sentence is a prop, every word is
`words`.

## How it works

`plugin-solid-ui` contributes typed values into the slots `plugin-solid` and `plugin-vite` own:
the Tailwind Vite plugin, the fonts plugin, the `MetaProvider` and `WordsProvider` providers,
the `.stack/app.css` artifact (contract tokens, two shadow utilities, the dark layer, a safelist
of the role and rung cells the matrices compose at runtime), the pre-build geometry gate, and
the home-page scaffold. `pnpm --filter @fcalell/plugin-solid-ui verify` reproduces every claim
above against the real plugin graph, a Tailwind build, and the roster.
