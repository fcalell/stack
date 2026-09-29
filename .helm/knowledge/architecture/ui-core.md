# ui-core, the design contract

`@fcalell/ui-core` is the design contract both UI plugins render from: the token contract with its
parametric derivation, the words the molecules speak, the shared `cn()` merge config, the
platform-invariant variant matrices, the component roster, and the shared descriptor types. It
is a preset library like `biome-config`: no `plugin()` factory, no slots, and no
framework dependency. The normative laws (the
canon, the sharing line, the `cn` ordering rule, the roster) live in the package README and are
pinned by the package's verify suite; this entry holds the architecture and its rationale.

## Tokens and theming

- The contract is the approved Stage 1 sheet, held as data in `tokens.ts` and diffed against
  `plugins/react-ui/design/foundations.css` by the verify script, so the emitted `app.css`
  carries exactly what was approved. Eleven namespaces are zeroed (`--color-*`, `--radius-*`,
  `--text-*`, `--leading-*`, `--tracking-*`, `--shadow-*`, `--font-*`, `--container-*`,
  `--breakpoint-*`, `--transition-duration-*`, `--ease-*`), so an off-contract utility compiles
  to nothing and `tablet:`, `desktop:` and `wide:` are the only responsive variants. The numeric
  `--spacing` base stays live because dimension utilities derive from it, so no build check can
  tell a role from a numeric; the matrices pin their cell strings verbatim and the closed props
  keep a numeric off a call site.
- `mono` draws with its ligatures off (`--font-mono--font-feature-settings`), so code reads
  character for character: `!==` never becomes `≢`.
- Four knobs and nothing else: `accentHue` (264), `density` (`desktop` or `touch`), `fonts`
  (the two family names) and `defaultMode`. Every other value is the sheet. Rejected, from the
  first contract: a knob per scale (`space`, `radius`, `text`, `motion`, `elevation`, the
  status and neutral hues, `primary`) and per-token `overrides`; a consumer that moved one
  re-tuned a system it had not designed, and every pair the contract measures had to be re-checked
  by hand. The ink act is a component variant (`act-ink`), not a knob.
- The derivation is internal structure, kept so the numbers stay explainable: one base per scale
  (the body size per density, the 4 px space base, the accent hue) and each token a ratio or a
  rule of it. Colors are declared as a light and a dark OKLCH value, an alias of another role, a
  `veil` (a role at an alpha: the washes are the body ink at 5 to 15 %) or a `mix` (a role
  blended toward another in OKLab: the act fills' hover, press and pending states, the switch's
  hover), so what the sheet wrote as `color-mix()` is emitted as a literal both platforms parse.
  A role may carry `holds`, a contrast contract against named grounds: the derivation moves its
  lightness from the declared one until each holds at the knob's hue, and clamps every accent
  value's chroma inside sRGB at its lightness, so a re-hued accent keeps its luminance and its
  contrasts (the verify sweeps all 360 hues) and loses saturation rather than clipping. At the
  sheet's own hue nothing moves.
- Color roles name the place they draw: surfaces (`canvas`, `surface`, `group`, `raised`,
  `edge`, `edge-raised`, `edge-strong`, `scrim`), three inks (`ink-body`, `ink-meta`,
  `ink-faint` for disabled text only), the accent (`accent`, `on-accent`, `accent-soft`,
  `accent-ink` for a link and the ring), three status families with `-soft` and `on-danger`,
  six chip families by hue name each with a mark, a `-soft` ground and an `-ink`, eight avatar
  steps each with an `-ink`, six washes, six place aliases (`ring`, `selected-outline`,
  `edge-hover`, `edge-error`, `ink-error`, `ink-disabled`), the two act fills with their
  states and the switch's five. `COLOR_GROUPS` holds the roles by those groups and `COLOR_NAMES`
  is its flattening. The dark hairline is two tokens because the dark ladder spans more
  than one hairline can straddle: a group or a lifted layer re-points `--color-edge` to
  `edge-raised` for everything inside it, so a part never picks between them. Rejected: a hue
  computed per avatar name (neither a token nor a cell); chip hues stepped off the accent (a
  family must never wear the accent, so the six are fixed and the accent's band is left out);
  `Status` with a family mode (a state and a data value are two concepts, so two names).
- Density is a theme, never a breakpoint, and it moves three scales: the type roles (body 13 on
  the desktop set, 16 on touch, each role a ratio rounded to the pixel, its line box to the even
  pixel), the eight spacing roles (multiples of 4, one rung looser on touch except the page
  inset) and the sixteen sizes (control 32/44, field 38/48, target 24/44, the switch, the
  avatar). `themeTokens` seeds the touch set on both platforms; under `density: "desktop"` the
  web overrides it with `finePointerTokens` in a `(pointer: fine)` `:root` rule in
  `@layer base`, the cascade the dark layer rides, so no cell and no component carries a density
  class: a non-inline `@theme` utility reads its variable, so `text-body` and
  `min-h-control` follow. `data-density` on the web root pins either set on any device. Native
  is touch-only and ignores the knob. Rejected: a `fine:` variant in the cells (an interaction
  condition in a shared cell, meaningless on native) and one type scale at every density (13 on
  a phone is unreadable and 16 on a desktop row wastes the row).
- Emission returns token records, never CSS text (`themeTokens`, `rootTokens`, `modeTokens`,
  `densityTokens`, `finePointerTokens`, `reducedMotionTokens`, `shadowUtilities`): records
  validate per key, need no escaping, and keep ui-core free of `@fcalell/cli`. `modeTokens`
  carries every color and the two shadows by full custom-property name; both plugins wrap the two
  shadows in `@utility` rules reading `var(--shadow-<level>)`, because the `--shadow-*` theme
  namespace does not resolve into RN's `boxShadow` and a shadow is per mode. The web keys each
  mode on a class scope, `.dark` on the root and `.light` below it restoring the light set, so a
  light subtree renders light under a dark page; `rootTokens` puts the hairline, the ring and the
  light shadows on `:root` outside `@theme`, since no utility reads them.
- Fonts split by fact: the theme names the families (`--font-sans`, `--font-mono`, each ahead of
  its platform fallback), each plugin's `fonts` option carries the files (a woff2 with fallback
  metrics on web, an expo-font source on native). The metric fallback face's name is one rule,
  `fallbackFace(family)` in `./tokens`, which the family stack names second and the web plugin
  declares its `@font-face` under, so the two cannot disagree. Rejected: a `role` on the file entry, which
  put the same fact in two places and let the two disagree.

## Words

Every word a molecule draws or reads aloud on its own (the six `Status` words, `recommended`,
`copy`, `copied`, `back`, `close`, `more`, `send`, `stop`, `attach`, `search`, `loading`, `retry`, `add`, `remove`, `duplicate`) comes
from `words`, a closed typed object with English defaults. The `Words` type requires every key
and `wordsSchema` is strict, so a translation missing a word fails `tsc` and the schema. It is a
plugin option beside `theme`; each plugin contributes a `WordsProvider` into the generated entry
through its platform's `providers` slot, so the value reaches the components with no consumer
glue, and the context defaults to English when no provider is mounted. A consumer's sentence is a
prop on the molecule that draws it, never a key.

## Matrices and the sharing line

- `FAMILIES` (`./variants`) registers every matrix by its table's name with its axes read off the
  table, and `matrixCells` enumerates them into cells (`BUTTON.act.primary`): the verify suites and
  react-ui's showcase read the same list.
- The emitted `app.css` carries every contract utility whether or not a source spells it:
  react-ui contributes one `@source inline()` pattern per utility family over the token lists
  (colours as fill, ink, border and outline; spacing roles as paddings, gaps and widths; sizes as
  heights, widths and minimums; widths; type roles; tracking; radii; shadows; durations;
  easings). Tailwind reads source text, and a Stage 2 artboard is drawn on the emitted sheet in
  contract classes before any component spells them; the showcase's foundations page builds its
  classes from the token names for the same reason. The cost is the whole contract in every
  consumer's sheet, about 7.5 kB gzipped.
- Matrices hold the platform-invariant cells only: fills, borders, ink, spacing roles, radius,
  type role, weight, family, and a control's size. Display, alignment, and every interaction state
  are platform overlays composed through `cn()` (RN is flex by default and web is not, so a
  shared `flex-row` would be wrong on one). A type role's cell carries its ink and, for `mono`,
  its family, since RN Text inherits nothing and both platforms bind `--font-mono`.
- No arbitrary values in a cell, in either spelling. A control pads across on `control-x`, stands
  on a size (`min-h-control`, `min-h-field`) and insets on a spacing role; density moves all
  three through the variables.
- No behavior in ui-core, ever. A cell that needs a platform conditional belongs in the overlay;
  the spinner is the recorded example (native colors a prop, not a class, so it ships with no
  matrix and `ContentTone` is its shared contract). So is a line diff: `Diff`'s `before` and
  `after` are diffed in each plugin with the `diff` package both already carry, never here.
- A table cell is the field's box (`TABLE_CELL`: `min-h-field` and `px-control-x` behind a
  transparent side border), so a cell and the `Input` that edits it in place put their text in
  one place and the row keeps its height at either density. The row (`TABLE_ROW`) is a hairline
  and the open row's selection wash; the wash is the body ink at an alpha, so every ink the sheet
  measures on the surface keeps its ratio on it.

## The canon, the roster and the closed props

- The canon binds every component either UI plugin ships: one name per concept (`label`,
  `loading`, `onChange`, `onAct`, `act`, `blocked`, `sentence`), composed regions as typed
  descriptors (`Act`, `Mark`, `PlaceSpec`, `Option`, `OptionGroup`, `Part`, `FieldBinding`,
  `Confirmation`, `MenuItem`, `TableColumn`, `TableRow`) instead of node slots, and no
  `class` / `className` / `classList` / `style` prop. Laws live in the README under `## The
  canon`. A descriptor is generic only in `TIcon` (the icon is the one framework type) or, for a
  field binding, in the value its field holds, which is data: `FieldBinding<V>` is how a bound
  `FormField` types its control by the field, and `useApiForm(...).bind(name)` produces it on the
  web from TanStack Form's store, one binding per name under the form's owner. Rejected: optional
  `value` and `onChange` on every control read from the field's context, which would compile a
  control with no value anywhere and could not type a boolean field against an `Input`.
- The roster is data: `ROSTER` in `packages/ui-core/src/roster.ts` names 54 components in four
  layers (atoms, layout molecules, shared molecules, content molecules) with their prop names,
  the matrix families each draws and the states it has a form for, the same in both plugins; the
  showcase draws exactly those cells and states. Each plugin's verify suite reads every component's exported props type
  against it with ts-morph, so a prop added on one platform, renamed, or a style channel reopened
  fails by name. A component's directory is `componentDir(name)` (`ListRow` → `list-row`).
- Closure mechanics: every closed prop is declared `?: never` on a plain object type, never on a
  host's props type, so the key set is closed and a call site gets a readable error. The closed
  props are the guardrail: a look the matrices do not cover is a matrix cell or a consumer
  primitive under `ui/`, never a class on a call site. The named holes stay open on purpose:
  consumer CSS targeting plugin class names, and any class built from a variable; the size of a
  consumer's `ui/` directory is the number that says whether the matrices cover enough.
- The boundary: a molecule lives in stack when its prop names and enum words are product-free. A
  molecule whose props are a product's nouns lives in that product's `ui/`, composing stack
  molecules and never a host element. Both suites fail on a product noun in source.

## Enforcement

Two verify suites (ui-core and native-ui) are the design system's enforcement layer:
the derivation diffed against the approved foundations sheet and swept over every accent hue,
matrices asserted verbatim over their full axis products, the roster compared against every
component's props type, closure fixtures that compile every component's `?: never` props, word
and product-noun scans over the sources, class-literal set-equality against the native overlay
allowlist. A new
matrix that skips a registry, a component the roster does not name, a literal that duplicates a
cell, or a drawn word outside `words` each fails a named check.
