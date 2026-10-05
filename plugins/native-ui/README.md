# @fcalell/plugin-native-ui

The phone half of the stack design system: the CLI plugin that renders `@fcalell/ui-core`'s
contract into the uniwind stylesheet, embeds the font files, composes the app's providers, and
ships the roster: 62 components in four layers. Requires `expo` (it contributes into
`plugin-expo`'s slots) plus `api` and `auth` (the wired Query and Auth providers import their
native subpaths).

## Install

```bash
pnpm add @fcalell/plugin-native-ui
```

`stack add native-ui` adds `nativeUi()` to `stack.config.ts`, beside `expo()`, `api()` and
`auth({ expo: true })`.

## Guide

How to build on the plugin lives in `guide/`, indexed into a consumer's `.stack/guide.md`:
[`rules.md`](./guide/rules.md), what every phone `.tsx` follows, and
[`reference.md`](./guide/reference.md), the components' subpaths, the options, the scaffolded
clients, the phone layout and the modes. The screen recipe and the design standard are
ui-core's pages; the plugin hands the CLI those too (`cliSlots.guide`), as react-ui does.

## What it contributes

- `.stack/global.css`: the uniwind entry stylesheet, with `@source` roots in the app's `src`, this
  plugin's `src` and ui-core's `src`, so the matrix cell strings are scanned.
- `withUniwindConfig` around the Metro config (outermost, `order: 100`), pointing at
  `.stack/global.css` and `.stack/uniwind-types.d.ts`.
- An `expo-font` config plugin embedding the `fonts` files, when there are any.
- The provider stack around the expo-router root, outer to inner: `GestureHandlerRootView` →
  `KeyboardProvider` → `SafeAreaProvider` → `WordsProvider` (only when `words` is set) →
  `QueryProvider` → `AuthProvider` → `BottomSheetModalProvider`. gorhom draws a sheet's content in
  its provider's host, so every context a sheet body reads wraps that provider. It hosts the sheets
  of the screens with no `Shell`; a `Shell` holds its own provider, under which every sheet opened
  inside it stands, and draws its toasts after that provider's host so a toast stands over an open
  sheet. Theming is CSS-first, so there is no theme provider. `AppProviders` (`./app`) composes the
  UI half of the same stack for use outside the generated entry.
- `.stack/native-auth.ts`: the resolved `scheme` and `cookiePrefix` the scaffolded auth client
  imports, so the client always matches the app config and the worker's cookies.
- `.stack/native-theme.ts`: `Uniwind.setTheme(defaultMode)`, imported by the entry, only when
  `theme.defaultMode` is set.
- `uniwind/types` in the consumer's tsconfig `types`, since the consumer compiles this plugin's
  `.tsx` source.

## Components

Every props type extends `Closed` (`./lib/closed`): `class`, `className`, `classList`, `style`
and uniwind's per-prop class channels as `?: never`. A look the matrices do not cover is a matrix
cell in ui-core or a primitive under the app's `ui/`, never a prop. The prop names are the roster
in `@fcalell/ui-core/roster`; the verify suite reads each component's props type against it.
Inside a component, a class sits only on a `View`, `Pressable`, `ScrollView` or `Animated.View`
and carries layout plumbing; nothing carries a product noun in a prop, an enum word or a string.

A raised ground re-points the hairline as the web's does: `RaisedGround` (`lib/raised`) scopes
`--color-edge` to the mode's `edge-raised` through uniwind's `ScopedVariables`, so a part's
`border-edge` inside a sheet (its head, body and foot, a `Menu`'s and a Picker's sheet with it) or a
toast draws the raised hairline. A ground on `group` holds no part that draws `edge`, so none wraps
it. `QrCode`'s tile is a light scope (uniwind's `ScopedTheme`). `Image`'s full view is the sheet
base's `view` form: a gorhom modal at the screen's height inside the safe area, with no handle,
ground, body or foot, so a sheet's chrome never takes the picture's room. It stands under the toasts
like every sheet, and it draws the picture contain-fit with no pinch-zoom.

## Verify

`pnpm --filter @fcalell/plugin-native-ui verify` renders the sheet, compiles it through uniwind's
own compiler and a Tailwind build, checks a raised ground's hairline re-point on the compiled
sheet, reads the matrices back off ui-core's cvas, holds the overlay allowlist equal to the swept
sources, proves the closure with the fixture under `scripts/fixture/closure.tsx`, and reads every
component's props type against the roster.

## Slots

The table lives in [`slot-catalog.md`](../../.helm/knowledge/architecture/slot-catalog.md).

## License

MIT
