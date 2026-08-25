# @fcalell/plugin-native-ui

React Native design-system plugin for the `@fcalell/stack` framework. The native
sibling of `@fcalell/plugin-solid-ui`: it owns styling (uniwind / Tailwind v4),
theme tokens, fonts, and the app's provider composition, and ships a set of
uniwind-styled primitives. Requires `expo` (it contributes into
`plugin-expo`'s slots) plus `api` + `auth` (the wired Query/Auth providers import
their native subpaths).

## Install

```bash
pnpm add @fcalell/plugin-native-ui
```

## Usage

### 1. Add to config

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { api } from "@fcalell/plugin-api";
import { auth } from "@fcalell/plugin-auth";
import { expo } from "@fcalell/plugin-expo";
import { nativeUi } from "@fcalell/plugin-native-ui";
import { fonts } from "./src/ui/fonts";

export default defineConfig({
  app: { name: "WeNauti", domain: "wenauti.app" },
  plugins: [
    // ...cloudflare, db,
    api(),
    auth(),
    expo({ scheme: "wenauti" }),
    nativeUi({ theme: { knobs: { brandHue: 210 } }, fonts }),
  ],
});
```

`nativeUi` contributes everything the native UI layer needs into `plugin-expo`:

- the `withUniwindConfig` Metro wrapper (outermost), pointing at the generated
  `.stack/global.css` + `.stack/uniwind-types.d.ts`;
- an `expo-font` config plugin embedding the configured font files;
- the provider stack wrapping the app root (outer → inner):
  `GestureHandlerRootView` → `KeyboardProvider` → `SafeAreaProvider` →
  `BottomSheetModalProvider` → `QueryProvider` → `AuthProvider`.

There is **no ThemeProvider** — uniwind theming is CSS-first. Switch themes at
runtime with `Uniwind.setTheme("dark")` (also drives RN's `Appearance`).

### 2. Theme (the design surface)

`theme` is `@fcalell/ui-core`'s design contract: seven knobs (six hues plus
`neutralChroma`) and per-token overrides, validated by ui-core's schema. A
consumer with both platforms passes the same object to `solidUi` and
`nativeUi`; omit it for the calibrated defaults. The emitted `.stack/global.css`
zeroes the `--color-*`, `--radius-*`, `--text-*` and `--shadow-*` namespaces,
so an off-contract utility (`text-sm`, `rounded-lg`, `bg-red-500`) compiles to
nothing, exactly as on web.

```ts
nativeUi({
  theme: {
    knobs: { brandHue: 210 },
    overrides: { colors: { light: { canvas: "oklch(0.98 0.004 261)" } } },
  },
});
```

The surface has two modes, `light` and `dark`, emitted as the two uniwind
built-in `@variant` blocks: free `Appearance` sync, the `dark:` variant, and
`setTheme("light" | "dark" | "system")`. Persona is encoded by **fill, not
hue**: emphasis variants share the `accent` token.

### 3. Fonts

```ts
// src/ui/fonts.ts
export const fonts = [
  { family: "Plus Jakarta Sans", role: "sans", source: "./assets/fonts/PlusJakartaSans.ttf" },
  { family: "Geist Mono", role: "mono", source: "./assets/fonts/GeistMono.ttf" },
];
```

Each font with a `source` is embedded natively via `expo-font` and bound to the
matching `--font-<role>` token (so `font-sans` / `font-mono` resolve).

### 4. Native clients

The Query/Auth providers are wired automatically, and `stack init` / `stack add`
scaffold editable starters at `src/lib/query.ts` and `src/lib/auth.ts` (copy-once,
like the auth callback file). The query client works out of the box; the auth
starter just needs the two genuinely per-app values filled in:

```ts
// src/lib/auth.ts (scaffolded)
import * as SecureStore from "expo-secure-store";
import { createAuthClient } from "@fcalell/plugin-auth/expo";
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787",
  scheme: "app",          // match your app.config.ts deep-link scheme
  storage: SecureStore,
});

// src/lib/query.ts (scaffolded)
import { createQueryClient } from "@fcalell/plugin-api/tanstack-query";
export const queryClient = createQueryClient();
```

The module paths default to `src/lib/auth` (`authClient`) and `src/lib/query`
(`queryClient`); point a provider at your own module via
`nativeUi({ authClientModule, queryClientModule })` and that file's scaffold is
skipped (it's yours to own).

### 5. Primitives

```tsx
import { Button } from "@fcalell/plugin-native-ui/components/button";
import { Card } from "@fcalell/plugin-native-ui/components/card";
import { setTheme, useUniwind } from "@fcalell/plugin-native-ui/lib/theme";

function Example() {
  const { theme } = useUniwind();
  return (
    <Card>
      <Button onPress={() => setTheme(theme === "dark" ? "light" : "dark")}>
        Cambia tema
      </Button>
    </Card>
  );
}
```

The plugin ships 30 primitives. They use uniwind `className` internally,
reading the contract tokens, so each renders in light and dark with no
per-component theme code, and persona is encoded by **fill, never hue**. Their
public props carry none of it: `className` and `style` are declared `?: never`
on every primitive, uniwind's per-prop `*ClassName` channels included. A look
the matrices do not cover is a matrix change, or a primitive the consumer owns.

- **Actions** — `Button`, `Stepper`
- **Inputs** — `Input`, `Textarea`, `Field`, `Toggle`, `Checkbox`, `Segmented`,
  `FilterChip`
- **Typography** — `Text`
- **Rhythm** — `Section`, `Stack`, `Row`, `Pair`
- **Containers & data** — `Card`, `RowItem`, `DefRow`, `Badge`, `Separator`
- **Identity** — `Avatar`, `AvatarStack`
- **Chrome** — `TabBar`, `NavBar`, `Footbar`
- **Feedback** — `ProgressBar`, `Spinner`, `Skeleton`, `Toast`
- **Overlays** — `BottomSheet`, `Dialog`

`Button`, `Badge`, `Card`, `Text`, `Input` and `Textarea` compose their look
from ui-core's shared variant matrices: the same cells the web plugin renders,
behind the shared axis props (`emphasis` / `tone` / `size` / `loading` on
`Button`, `tone` on `Badge`, `padding` / `ring` on `Card`, `variant` / `tone` /
`strong` / `mono` on `Text`). `Text`'s `mono` prop maps to `font-mono`; without
a registered mono font it degrades to the system face. `Input` and `Textarea`
take a native-only `state` prop (`"default" | "focused" | "error"`) and track
focus themselves, where web reaches the same matrix cells through
`focus-visible:` / `aria-invalid:` selectors. A busy `Button` renders its
`Spinner` in the label's own ink, read back off the label matrix through
ui-core's `buttonContentTone`.

The rhythm four compose ui-core's `RHYTHM` cells: `Section` gaps a screen's
regions at the section rung, `Stack` is a column of stacked units, `Row` lays
peers inline, and `Pair` glues a micro-pair (`row` lays it inline). Composed
regions are data, not element slots: `RowItem` takes `icon` / `value` /
`badge` / `chevron`, `NavBar` takes `onBack` and an `Action`, `Dialog` renders
its `primary` / `secondary` actions itself, and every `icon` prop is a
`lucide-react-native` component the primitive renders at its own size and tone.

`Toast` is presentational (a screen renders it in its own overlay), with a
`tone` axis (`neutral` / `ok` / `danger`); `Skeleton` is a static block sized
by `width` / `height`; `Spinner` spins in a `ContentTone` (default `ink-1`).
The imperative toast host and the shimmer are a later polish pass, not a
blocker for any screen.

## Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | `Theme` | calibrated defaults | ui-core knobs + per-token overrides (shared with `solidUi`) |
| `fonts` | `NativeFontEntry[]` | `[]` | Fonts to embed + bind to `--font-<role>` |
| `authClientModule` | `{ source, export }` | `../src/lib/auth` / `authClient` | Where the auth client is imported from |
| `queryClientModule` | `{ source, export }` | `../src/lib/query` / `queryClient` | Where the query client is imported from |

`Theme`: `@fcalell/ui-core/schema`'s input type, re-exported here.
`NativeFontEntry`: `{ family: string; role: "sans" | "mono" | "serif"; source?: string }`.

## Plugin implementation

Built with `plugin` from `@fcalell/cli`. Owns the design-system slots and
contributes the native UI wiring into `plugin-expo`.

### Owned slots

| Slot | Kind | Purpose |
|------|------|---------|
| `resolvedTheme` | `derived<ResolvedTheme>` | The `theme` option through ui-core's `deriveTheme`, resolved once |
| `fonts` | `derived<NativeFontEntry[]>` | Consumer `fonts` option |
| `appCssImports` | `list<string>` | Extra `@import`s beyond tailwindcss + uniwind |
| `appCssSource` | `derived<string \| null>` | Final `.stack/global.css` |

### Slot contributions

| Target slot | Behavior |
|-------------|----------|
| `expo.slots.metroConfigImports` | `require("uniwind/metro")` for `withUniwindConfig` |
| `expo.slots.metroPluginCalls` | `withUniwindConfig(config, { cssEntryFile, dtsFile })` — outermost wrapper |
| `expo.slots.expoConfigPlugins` | `expo-font` config plugin (when fonts have a `source`) |
| `expo.slots.providers` | Gesture / Keyboard / SafeArea / BottomSheetModal / Query / Auth providers |
| `cliSlots.artifactFiles` (via `emitArtifact`) | `.stack/global.css` |

### Styling: uniwind (CSS-first)

uniwind 1.8 compiles Tailwind v4 `className` to native StyleSheet at build time
(no runtime style engine, no Babel preset). The generated `.stack/global.css` is
the single token surface — `@import 'tailwindcss'; @import 'uniwind';` followed
by `@source` scan roots, an `@theme` block rendered from ui-core's records
(namespace resets first), the shadow ladder as three `@utility shadow-*` blocks
(the `--shadow-*` namespace does not resolve into RN's `boxShadow`), and
`@layer theme { :root { @variant light … @variant dark … } }` carrying the 26
per-mode colors each. Because it lives in `.stack/`, the `@source` directives
point uniwind at the consumer `src/`, this plugin's primitives, and ui-core's
matrix cell strings so their classNames are detected.

> The exact uniwind `cssEntryFile` / `@source` path resolution is verified on a
> device build during WeNauti Milestone 0 (per the roadmap, device behavior is the
> M0 bring-up gate); the plugin-level wiring is covered by the graph + codegen
> tests here.

## Exports

| Subpath | Purpose |
|---------|---------|
| `@fcalell/plugin-native-ui` | `nativeUi()`, `NativeUiOptions`, `Theme`, `NativeFontEntry` |
| `@fcalell/plugin-native-ui/app` | `AppProviders` — UI-shell providers for tests / Storybook |
| `@fcalell/plugin-native-ui/components/*` | 30 primitives, one per `kebab-case` subpath (`.../components/row-item` → `RowItem`) — see the Primitives list above |
| `@fcalell/plugin-native-ui/lib/cn` | `cn()` — ui-core's className merge, taught the contract's scales |
| `@fcalell/plugin-native-ui/lib/theme` | `Uniwind`, `useUniwind`, `useCSSVariable`, `setTheme`, `ThemeName` |

> Native has no document `<head>` and embeds fonts at build time, so there is no
> `./meta` or runtime `./fonts` export (the web `plugin-solid-ui` analogs); theme
> utilities live in `./lib/theme` and fonts flow through the `fonts` option.

## License

MIT
