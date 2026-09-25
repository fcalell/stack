# ui-core, the design contract

`@fcalell/ui-core` is the design contract both UI plugins render from: the token contract with its
parametric derivation, the words the molecules speak, the shared `cn()` merge config, the
platform-invariant variant matrices, the component roster, the shared descriptor types, and the
geometry gate. It is a preset library like `biome-config`: no `plugin()` factory, no slots, and no
framework dependency, so a future `plugin-react-ui` adopts it unchanged. The normative laws (the
canon, the sharing line, the `cn` ordering rule, the roster) live in the package README and are
pinned by the package's verify suite; this entry holds the architecture and its rationale. The
calibration is Marina's, renamed by meaning; the structure follows the anchors recorded in
stead's `design/07-interface.md`.

## Tokens and theming

- The contract is a closed list. Nine namespaces are zeroed (`--color-*`, `--radius-*`,
  `--text-*`, `--leading-*`, `--tracking-*`, `--shadow-*`, `--font-*`, `--container-*`,
  `--breakpoint-*`), so an off-contract utility compiles to nothing and `tablet:`, `desktop:`
  and `wide:` are the only responsive variants. The numeric `--spacing` base stays live because
  dimension utilities derive from it, so no build check can tell a rung from a numeric; the
  matrices pin their cell strings verbatim and the geometry gate keeps numerics off call sites.
- Every scale derives from a knob: six color knobs (`accentHue`, `neutralHue`, `neutralChroma`,
  `okHue`, `warnHue`, `dangerHue`) plus `primary` (`ink` | `accent`, what the primary act is
  filled with), `space` (the rungs), `radius` (the radii), `text` (the type roles, sizes rounded
  to the pixel and line boxes to the even pixel), `fonts` (the two family names), `widths` (the
  five `--container-*` values) and `breakpoints` (the three device classes). Lightness and
  per-token chroma are fixed from the calibration, but for the dark `tint`, `ok`, `warn` and
  `danger`, set lighter so a mark drawn inside a group keeps 4.5:1; the AA contracts hold at the
  defaults, the verify script measures each pair, and moving a knob puts the re-check on the
  consumer. The two shadows derive from `neutralHue`,
  converted to sRGB in the derivation because React Native's `boxShadow` takes no oklch. Density
  is a theme, never a breakpoint: no scale changes at a width.
- Color roles are named by use (`canvas`, `surface`, `group`, `edge`, `ink`, `ink-meta`,
  `ink-faint`, `accent`, `accent-soft`, `on-accent`, `tint`, the three states with `-soft`, eight
  `avatar-n` steps off `accentHue`), plus two invariants: `scrim` and `thumb`, the switch's knob,
  the one literal color. `accent` and `accent-soft` are aliases decided by `primary`;
  `on-accent` aliases `canvas`, which keeps AA in both modes by the ladder's symmetry. Rejected:
  a hue computed per avatar name (neither a token nor a cell).
- Per-token overrides ride two schema maps: `colors` (`shared`/`light`/`dark`) and `scales`
  (full custom-property names). One `theme` option, validated by ui-core's zod schema; a
  two-platform consumer passes the same object to `solidUi` and `nativeUi`. Rejected: an
  `app.theme` field (theme is UI-domain, `app` stays identity) and documented CSS-variable
  overrides (typed options over glue).
- Emission returns token records, never CSS text (`themeTokens`, `modeTokens`,
  `shadowUtilities`): records validate per key, need no escaping, and keep ui-core free of
  `@fcalell/cli`. Each plugin wraps the records in its own entry; both wrap the two shadows in
  `@utility` rules because the `--shadow-*` theme namespace does not resolve into RN's
  `boxShadow`.
- Fonts split by fact: the theme names the families (`--font-sans`, `--font-mono`, each ahead of
  its platform fallback), each plugin's `fonts` option carries the files (a woff2 with fallback
  metrics on web, an expo-font source on native). Rejected: a `role` on the file entry, which
  put the same fact in two places and let the two disagree.

## Words

Every word a molecule draws or reads aloud on its own (the six `Status` words, `recommended`,
`copy`, `copied`, `back`, `close`, `more`, `send`, `stop`, `attach`, `search`, `loading`, `retry`) comes
from `words`, a closed typed object with English defaults. The `Words` type requires every key
and `wordsSchema` is strict, so a translation missing a word fails `tsc` and the schema. It is a
plugin option beside `theme`; each plugin contributes a `WordsProvider` into the generated entry
through its platform's `providers` slot, so the value reaches the components with no consumer
glue, and the context defaults to English when no provider is mounted. A consumer's sentence is a
prop on the molecule that draws it, never a key.

## Matrices and the sharing line

- Matrices hold the platform-invariant cells only: fills, borders, ink, rungs, radius, type role,
  weight, family, and a control's minimum size. Display, alignment, and every interaction state
  are platform overlays composed through `cn()` (RN is flex by default and web is not, so a
  shared `flex-row` would be wrong on one). A type role's cell carries its ink and, for `mono`,
  its family, since RN Text inherits nothing and both platforms bind `--font-mono`.
- No arbitrary values in a cell, in either spelling. A control's interior padding stays a literal
  numeric; a row and a surface inset on rungs.
- No behavior in ui-core, ever. A cell that needs a platform conditional belongs in the overlay;
  the spinner is the recorded example (native colors a prop, not a class, so it ships with no
  matrix and `ContentTone` is its shared contract).

## The canon, the roster and the closed props

- The canon binds every component either UI plugin ships: one name per concept (`label`,
  `loading`, `onChange`, `onAct`, `act`, `blocked`, `sentence`), composed regions as typed
  descriptors (`Act`, `Mark`, `PlaceSpec`, `Option`, `Part`) instead of node slots, and no
  `class` / `className` / `classList` / `style` prop. Laws live in the README under `## The
  canon`.
- The roster is data: `ROSTER` in `packages/ui-core/src/roster.ts` names 48 components in four
  layers (atoms, layout molecules, shared molecules, content molecules) with their prop names,
  the same in both plugins. Each plugin's verify suite reads every component's exported props type
  against it with ts-morph, so a prop added on one platform, renamed, or a style channel reopened
  fails by name. A component's directory is `componentDir(name)` (`ListRow` → `list-row`).
- Closure mechanics: every closed prop is declared `?: never` on a plain object type, never on a
  host's props type, so the key set is closed and a call site gets a readable error. The named
  holes: consumer CSS targeting plugin class names, and any class built from a variable. The gate
  is a guardrail against drift, not a sandbox.
- The boundary: a molecule lives in stack when its prop names and enum words are product-free. A
  molecule whose props are a product's nouns lives in that product's `ui/`, composing stack
  molecules and never a host element. Both suites fail on a product noun in source.

## The geometry gate

- An allowlist, never a denylist: the closed vocabulary lives as data (`GEOMETRY` in
  `packages/ui-core/src/gate.ts`) and unknown classes fail; a denylist passes whatever it has not
  been taught. At a call site, a class attribute is legal only on a raw host element (lowercase
  intrinsics on web; `View` / `Pressable` / `ScrollView` / `Animated.View` on native) and only
  from the vocabulary. The gap cells are derived from the spacing rungs.
- The `ui/` carve-out (any path segment) is a fixed convention, never config, and there is no
  per-file skip list.
- Delivery: the scanner sits behind the `./gate` export (ts-morph, imported only from plugin
  `node/` code) and each UI plugin contributes a pre-phase `cliSlots.buildSteps` entry, so every
  consumer picks the gate up on upgrade. Rejected: a template `check:ui` script
  (`patchPackageJson` merges only absent keys), a `stack ui check` subcommand (two UI plugins
  would both claim it), and a Biome GritQL rule (cannot express the allowlist).
- Coverage is literal-only: a class assembled through a variable, a prop, or a template passes
  silently. The size of a consumer's `ui/` directory is the number that says whether the matrices
  cover enough.

## Enforcement

Three verify suites (ui-core, solid-ui, native-ui) are the design system's enforcement layer:
the derivation diffed against the calibration's reference stylesheet under the renamed roles,
matrices asserted verbatim over their full axis products, the roster compared against every
component's props type, closure fixtures that compile every component's `?: never` props, word
and product-noun scans over the sources, class-literal set-equality against the native overlay
allowlist, retired-vocabulary and cell-paste-back guards on web, and the gate fixtures. A new
matrix that skips a registry, a component the roster does not name, a literal that duplicates a
cell, or a drawn word outside `words` each fails a named check.
