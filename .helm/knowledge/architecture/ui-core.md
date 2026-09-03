# ui-core, the design contract

`@fcalell/ui-core` is the design contract both UI plugins render from: the token contract with its
parametric derivation, the shared `cn()` merge config, the platform-invariant variant matrices, the
primitive API canon, the shared descriptor types, and the geometry gate. It is a preset library
like `biome-config`: no `plugin()` factory, no slots, and no framework dependency, so a future
`plugin-react-ui` adopts it unchanged. The normative laws (the canon, the sharing line, the `cn`
ordering rule) live in the package README and are pinned by the package's verify suite; this entry
holds the architecture and its rationale. Extracted from sailward's Marina design system.

## Tokens and theming

- The contract is a closed list. The `--color-*`, `--text-*`, `--radius-*`, and `--shadow-*`
  namespaces are zeroed, so an off-contract utility compiles to nothing. The numeric `--spacing`
  base stays live because dimension utilities derive from it, so no build check can tell a rung
  from a numeric; the matrices pin their cell strings verbatim instead.
- Derivation runs over seven knobs (six hues plus `neutralChroma`); lightness and per-token chroma
  are fixed from Marina's calibration. The AA contrast contracts hold at the default hues, and
  moving a knob puts the re-check on the consumer. Rungs, radii, and shadows are literals derived
  from no base. Per-token overrides ride two schema maps: `colors` (`shared`/`light`/`dark`) and
  `scales` (full custom-property names).
- One `theme` option, validated by ui-core's zod schema; a two-platform consumer passes the same
  object to `solidUi` and `nativeUi`. Rejected: an `app.theme` field (theme is UI-domain, `app`
  stays identity) and documented CSS-variable overrides (typed options over glue).
- Emission returns token records, never CSS text (`themeTokens`, `modeTokens`,
  `shadowUtilities`): records validate per key, need no escaping, and keep ui-core free of
  `@fcalell/cli`. Each plugin wraps the records in its own entry; both wrap the shadow ladder in
  `@utility` rules because the `--shadow-*` theme namespace does not resolve into RN's
  `boxShadow`.

## Matrices and the sharing line

- Matrices hold the platform-invariant cells only; display, alignment, font family, and every
  interaction state are platform overlays composed through `cn()` (RN is flex by default and web
  is not, so a shared `flex-row` would be wrong on one). RN inherits no text color, so a matrix
  that tints content carries a per-slot label table and web consumes it too. Muted controls fade
  through the one shared `CONTROL_MUTED` constant. The normative member list is the README's
  sharing-line section, harness-pinned.
- No arbitrary values in a cell, in either spelling: one would pass every build check and reopen
  the closed vocabulary. A control's interior padding stays a literal numeric even where a rung
  coincides; surface padding uses rungs.
- No behavior in ui-core, ever. A cell that needs a platform conditional belongs in the overlay;
  the spinner is the recorded example (native colors a prop, not a class, so it ships with no
  matrix and `ContentTone` is its shared contract).

## The canon and the closed props

- The canon binds every primitive either UI plugin ships: one name per concept, composed regions
  as typed descriptors instead of `ReactNode` slots (with a closed named-slot registry), presets
  over private cores, and no `class` / `className` / `style` prop. Laws and registry live in the
  README under `## The canon`.
- Closure mechanics: on Kobalte's polymorphic components, dropping `class` from the own-props type
  re-admits it through `PolymorphicProps`, so every closed prop is declared `?: never`, which also
  gives call sites a readable error.
- The named holes: Kobalte's `as` (deliberate render takeover), consumer CSS targeting plugin
  class names, and any class built from a variable. The gate is a guardrail against drift, not a
  sandbox.

## The geometry gate

- An allowlist, never a denylist: the closed vocabulary lives as data (`GEOMETRY` in
  `packages/ui-core/src/gate.ts`) and unknown classes fail; a denylist passes whatever it has not
  been taught. At a call site, a class attribute is legal only on a raw host element (lowercase
  intrinsics on web; `View` / `Pressable` / `ScrollView` / `Animated.View` on native) and only
  from the vocabulary. A scrollable pane's home is a shipped pane (`ScrollArea` on web, the
  `ScrollView` host on native), with consumer `ui/` the fallback.
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
matrices asserted verbatim over their full axis products, second-opinion family registries with
pinned rosters in both plugins, class-literal set-equality against the native overlay allowlist,
retired-vocabulary and cell-paste-back guards on web, and closure fixtures that compile every
component's `?: never` props. A new matrix that skips a registry, a literal that duplicates a
cell, or a component dir the fixture misses each fails a named check.
