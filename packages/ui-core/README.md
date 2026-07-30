# @fcalell/ui-core

The design system both stack UI plugins render from: one closed token contract, a parametric OKLCH
derivation, and the laws that say which token to pick. Everything it exports is build-time data, so
each plugin renders its own CSS from the same records and ui-core stays framework-free.

Seven subpaths:

- `@fcalell/ui-core/tokens`: the contract as data, including the calibrated default values.
- `@fcalell/ui-core/schema`: the zod theme schema and the `Theme` input type.
- `@fcalell/ui-core/derive`: `deriveTheme(theme)` resolves knobs and overrides into final values.
- `@fcalell/ui-core/emit`: `themeTokens`, `modeTokens`, and `shadowUtilities` shape those values
  into the records a plugin renders.
- `@fcalell/ui-core/cn`: `cn()`, the class merger, taught the contract's five scales.
- `@fcalell/ui-core/variants`: the platform-invariant variant matrices, each one a config object
  plus the cva built from it.
- `@fcalell/ui-core/descriptors`: `Action`, `BadgeSpec`, `FooterSpec`, `FooterAction` and
  `FooterDestructive`, all framework-free types.

The contract has two modes, `light` and `dark`. `themeTokens` seeds the default mode's colors into
the `@theme` block as well, because Tailwind v4 generates no utility from a property declared only
inside a variant block.

## The knobs

Six hues in `[0, 360)`: `neutralHue`, `brandHue`, `interactiveHue`, `okHue`, `warnHue`,
`dangerHue`. One scalar, `neutralChroma` in `[0, 2]`, which multiplies the declared chroma of every
token bound to `neutralHue` and nothing else. Set it to 0 for a fully achromatic neutral ladder.

Chroma and lightness are otherwise fixed per token. Chroma ceilings are hue-dependent, so one
multiplier over one ladder would push a hue out of gamut; lightness carries the contrast contracts
below.

## The overrides

Anything the knobs do not reach goes through `overrides`, which is two maps because the values are
two kinds.

`overrides.colors` splits into `shared` (the mode-invariant six), `light`, and `dark` (the 26
per-mode tokens). Naming a token in the wrong group is an error, as is naming one that is not in
the contract. A value must be `oklch(L C H)` or `oklch(L C H / A)` with unsigned decimal
components: `oklch(0.5 0.16 261)`, `oklch(1 0 0 / 0.149)`. Percentages (`96.6%`), `none`, angle
units on the hue, and signed components are rejected, which keeps an override directly comparable
with a derived value. The check is a shape check, not a range check, so it accepts a lightness
above 1; a malformed oklch compiles to black rather than failing the build, which is why the shape
is validated at all.

`overrides.scales` is keyed by full custom-property name and covers the rungs, radii, type sizes,
leading, tracking, and shadows, none of which is knob-derived. Each type role has exactly one
leading key (`--leading-h1`) and one tracking key (`--tracking-h1`), and both emitted shapes come
from it, so `--text-h1--line-height` moves with `--leading-h1` and cannot drift from it. Naming a
modifier key directly is an error. A value carrying `;`, `{`, `}`, a line break, or a comment
delimiter is rejected, since any of them would break out of the declaration it is rendered into.
Unbalanced parens are rejected too: one override opening a `calc(` and a later one closing it read
as well-formed CSS on their own, fuse every declaration between them into one, and take the whole
block out of the built stylesheet without an error.

## Surfaces

A three-tier ladder. Whether content sits on a card is meaning, not decoration.

- `canvas`: the page ground, self-enclosed controls, and the ground of a bottom sheet.
- `surface`: a discrete record or a coherent row group. The card is its enclosure.
- `surface-2`: a recess inside a card, or a low-key note that must not compete. Never a second card
  inside the first.
- `surface-3`: the deepest recess. Toggle-off tracks, disabled fills.
- `thumb`: the raised-control fill (a segmented control's thumb, a toggle knob, a resting chip). It
  is lighter than every track in both modes, so a raised element never reads as a recess at night.
- `edge`: the hairline divider. `edge-2`: the stronger ring.

**Give it a card** when it is a discrete record, a divided row list, a glance band, or a tile grid.
**Leave it on canvas** when it is chrome (a page head, a section head, an eyebrow, a label), a
control with its own shape, a chip cluster, a hero, or a transient state. **Never** build one
mega-card, a card inside a card, or chrome on a surface. The gap between body units is the design.

## Color roles

**Ink.** `ink-1` primary text, icons, and solid fills. `ink-2` secondary and body prose. `ink-3`
meta, eyebrows, labels, subtitles, muted figures, placeholders. `ink-4` disabled.

**Two accents, split by energy.** `interactive` and `interactive-soft` mark what is tappable or
what is current: text actions, links, live values, your own mark. `brand` and `brand-soft` are
passive structural chrome: a selected tab, a priming surface, an empty-state tint. They never carry
status and never fill a button. `brand-deep` is the reserved deepest step of that family.

**Semantics.** `ok` settled, done, covered. `warn` pending, caution, stale. `danger` failure and
safety, rare. Each has a `-soft` fill. Semantic *text* keeps the AA tone; a non-text warn mark (a
dot, a disc glyph, a status ring) rides `warn-mark`, which clears the 3:1 non-text floor and reads
warmer at arm's length. `danger-ink` is the ink that sits on a `danger` fill; it is the canvas
value of its mode, so it is neutral-hued and moves with `neutralHue`.

**The primary-fill pair.** `accent` and `accent-ink` are not colors of their own: `accent` resolves
to `ink-1` and `accent-ink` to `canvas`, per mode. Encoding the pair as an alias keeps the law true
under every knob setting instead of only at the defaults. Use them inside primitives, not at call
sites.

**The veil.** `scrim` is a static translucent overlay for a dialog backdrop or a chip floated over
media. It carries alpha and does not invert.

**Media that stays dark in both modes.** `oncover-fg`, `oncover-ink`, `oncover-surface`,
`oncover-glass`, and `oncover-shade` have no per-mode override on purpose, so chrome floated over a
photo or a cover band never flips at night. Reach for them instead of a literal color. Per-component
artwork stays literal inside that component.

### Tone to meaning

| Token                        | Means                                 | Reach for it on                                            | Never                                       |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| `ink-1`                      | primary, structural                   | body titles, row titles, solid fills, default icons        | de-emphasis                                 |
| `ink-2`                      | secondary                             | hints, body prose, note copy                               | a title that must lead                      |
| `ink-3`                      | meta, muted, still AA                 | eyebrows, labels, subtitles, muted figures, placeholders   | a title that must lead                      |
| `ink-4`                      | disabled                              | disabled labels and chrome                                 | live content                                |
| `brand`, `brand-soft`        | navigation and priming chrome         | selected tab, priming surface, empty-state tint            | status, a text action, a button fill        |
| `brand-deep`                 | the deepest step of the brand family  | a deep ground under brand chrome                           | text on a light ground                      |
| `interactive`                | tappable, or current                  | text actions, links, live values, today, your own mark     | a background fill                           |
| `interactive-soft`           | the same energy, as a fill            | the tint behind a current row or an active chip            | a passive descriptive badge                 |
| `ok`, `ok-soft`              | settled, done, covered                | a paid badge and its dot, a settled disc                   | a general success mood                      |
| `warn`, `warn-soft`          | pending, caution                      | a pending invite, a due amount, a shortfall, offline copy  | alarm, a routine state                      |
| `warn-mark`                  | pending, as a non-text mark           | a badge dot, a disc glyph, a status ring                   | any text                                    |
| `danger`, `danger-soft`      | failure, safety-critical              | a failed badge, a danger-tone button, a field error        | chrome, more than one mark per surface      |
| `danger-ink`                 | ink on a `danger` fill                | the label inside a filled danger control                   | a standalone text tone                      |
| `accent`, `accent-ink`       | the primary fill pair                 | inside primitives only                                     | a call-site background class                |
| `canvas`, `surface`          | the ground, and a record's enclosure  | see Surfaces above                                         | a decorative tint                           |
| `surface-2`, `surface-3`     | recess, deepest recess                | a panel in a card, a disabled fill                         | a second card                               |
| `thumb`                      | a raised control's fill               | a segmented thumb, a toggle knob, a resting chip           | a track                                     |
| `edge`, `edge-2`             | hairline, stronger ring               | a divider, a ring around a disc                            | a border around a working surface           |
| `scrim`                      | a static translucent veil             | a dialog backdrop, a chip over media                       | a surface that must invert                  |
| `oncover-fg`, `oncover-ink`  | ink over dark media                   | copy and glyphs on a cover                                 | anywhere the ground inverts                 |
| `oncover-surface`            | a badge base over dark media          | a light pill floated on a photo                            | a page surface                              |
| `oncover-glass`              | a translucent light fill              | a glass pill or button over media                          | a solid fill                                |
| `oncover-shade`              | a translucent dark fill               | a shade behind copy on a photo                             | a solid fill                                |

## Spacing rungs

One 4px grid, two telescopes. **Rhythm** is the gap between siblings; **inset** is the padding from
a surface edge to its content. One namespace serves both, so a rung reads as `gap-row` or `py-room`.

- `room` 32px: the top rung. Dialogs, empty stacks, big-moment ceremony, region breaks.
- `section` 24px: between regions of a screen.
- `stack` 12px: stacked units. Cards, fields, sub-sections.
- `row` 8px: items in a group. Row clusters, peer controls, head to body.
- `pair` 4px: glued micro-pairs. Label to control, title to meta.
- `gutter` 16px: the page edge inset.
- `card` 16px: the card body inset.

Two picking rules:

1. **Rhythm steps down one rung per nesting level.** Pick the top rung by relatedness, then each
   level inside it takes the next rung down. That is why a region break outsizes every in-region
   gap by at least 2x and the page chunks at a glance.
2. **An inset is at least the same-axis gap it contains.** A card padded at `card` (16) holds a
   `stack` (12) rhythm, never the other way round.

Dimension (width, height, position) and a control's own optical padding stay numeric. The numeric
`--spacing` base is deliberately left live so `min-h-11` and its siblings keep working.

Radius is one rung per surface class: `md` 10px for small media, `control` 14px for controls, rows
and recesses, `xl` 16px for cards and dialogs, `sheet` 24px for the one curve above card scale, and
`full` for pills and discs. An off-scale literal is drift.

## Type roles

Eight roles: `display` 34, `h1` 28, `h2` 22, `h3` 18, `body` 16, `callout` 14, `caption` 13,
`micro` 12. Pick the role, never a raw size.

- **Leading rides with the role.** Each role's line height is a unitless multiplier, so it scales
  with OS font scaling instead of pinning a pixel box. At base size every role's line box lands on
  the 4px grid: 40, 36, 28, 24, 24, 20, 16, 16.
- **Tracking is set on five roles only**: `display`, `h1`, `h2`, `h3`, and `micro`. The four larger
  roles tighten; `micro` opens up.
- **`micro` is labels only.** Its tracking is why. Running meta, hints, and errors are `caption`.
- **Mono is for measured data only**: money, counts, coordinates, times, IDs. Never labels, chrome,
  or prose. A unit symbol fused to a measurement stays mono; a pluralizing noun the count modifies
  stays sans.
- **Weight and alignment are props on the role component, never a call-site class.**

Each role emits in both shapes: the Tailwind v4 modifier (`--text-h1--line-height`,
`--text-h1--letter-spacing`) so `text-h1` carries its leading on web, and the standalone
`--leading-h1` / `--tracking-h1` namespaces so the multiplier semantics stay available on native.
One source of truth in the contract, two emitted shapes, and the override map keeps it that way:
`--leading-h1` is the only key either shape reads.

## Contrast contracts

These hold at the default hues, and they are what the fixed lightness ladder buys.

- `ink-1`, `ink-2`, `ink-3`: at least 4.5:1 on `canvas` and on `surface`, in both modes.
- `ink-4`: the one documented exception, below 4.5:1. Disabled and inert chrome only, never the
  sole carrier of information.
- `ok`, `warn`, `danger`, `interactive`, `brand`: at least 4.5:1 on `canvas`, on `surface`, and on
  their own `-soft` fill, in both modes.
- `warn-mark`: at least 3:1 against the ground behind it, which is the non-text floor. Text keeps
  `warn`.
- `accent-ink` on `accent`: at least 4.5:1, which follows from `canvas` on `ink-1`.
- `danger-ink` on `danger`: at least 4.5:1.
- Dark `-soft` fills sit at least ΔE 0.06 above dark `surface`; light `-soft` fills sit at least
  ΔE 0.06 above `surface-2`, so a status fill stays visible on a card.
- Dark `interactive` and dark `brand` stay at least ΔE 0.08 apart, so the two accents read as two.
  The dark `brand` binding carries a +14 degree offset for exactly this reason.
- `oncover-fg` and `oncover-ink` clear 4.5:1 against the media tones they are used on, which is a
  property of the artwork as much as the token.

**Moving a hue knob does not preserve any of this.** Chroma is held fixed while the hue roams, so a
value can leave the sRGB gamut and get mapped down, which changes the rendered contrast. Re-check
every contract above after changing a knob. Lightness is never derived precisely because these
contracts hold at those values.

## What the reset does not catch

`themeTokens` opens with four namespace resets, `--color-*`, `--radius-*`, `--text-*`, and
`--shadow-*`, all set to `initial`. An off-contract utility such as `bg-red-500` or `text-sm` then
compiles to nothing, so the contract is build-enforced rather than doc-enforced. Three holes remain:

- **`--leading-*` and `--tracking-*` stay live.** They are outside the reset set, so `leading-tight`
  and `tracking-wide` still compile. Role rules cover them, the build does not.
- **The numeric `--spacing` base stays live on purpose.** Every sizing utility derives from it, so
  killing it would break touch targets and glyph boxes. Rung usage for gaps and insets is a rule
  here, not a build error.
- **A utility built from a variable is invisible to the reset.** An arbitrary value like
  `bg-[var(--x)]`, and any interpolated class name, sidesteps the whole contract. Classes must be
  static.

The shadow ladder ships through `shadowUtilities`, not the `--shadow-*` namespace, because that
namespace composes through Tailwind ring and inset variables that do not resolve into React
Native's `boxShadow`. Each consumer wraps the three values in `@utility` itself: `shadow-1` is the
baseline lift every working surface carries, `shadow-2` is for floating menus, `shadow-3` for
dialogs and a floating action button. A working surface lifts with `shadow-1` and never a border.

## The canon

Five laws for a primitive's public API. They bind every primitive either UI plugin ships.

1. **One name per concept.** Across all primitives the text is `label`, the in-flight flag is
   `loading`, the change handler is `onChange`, the glyph is `icon`. A second name for a concept
   already named is drift, so rename the newcomer.
2. **A composed region is data, not a `ReactNode` prop.** Hand the owning primitive a descriptor
   (`Action`, `BadgeSpec`, `FooterSpec`) and let it render the region under its own matrices. The
   named slots that survive that rule are a closed registry, not a per-component invention.
3. **Primitives compose primitives.** A primitive reaches for another primitive before it reaches
   for a host element. Two primitives that share an anatomy become presets over one private core,
   never two copies of the same markup.
4. **A prop that changes which other props are legal is a sibling component, not a variant.** When
   one value of a prop makes three other props required and another makes them meaningless, the
   union is two components wearing one name. Split it and let the types say so.
5. **A primitive takes no `class`, `className`, or `style` prop.** A look the matrices do not cover
   has exactly two homes: the matrix grows, or the consumer authors its own primitive under `ui/`.
   There is no per-call-site hatch, because a hatch is the thing that gets reached for.

## The sharing line

The matrices hold the cells that mean the same thing on both platforms: fills, borders, ink,
padding rungs, radius, type role, font weight, and control minimum height. Weight is part of a type
role, and the `TEXT_STRONG` table is nothing else. A tap-target floor is the strictest of the
platform floors (Apple HIG 44pt, Material 48dp, WCAG 2.2 AA 24px), so leaving it per plugin means
deriving one number twice. It is spelled `min-h` and never `h`, so the label can grow the control
under OS font scaling.

Everything below is a platform overlay, composed at the plugin through `cn()`:

- **Display and alignment**: `flex`, `inline-flex`, `flex-row`, `items-*`, `justify-*`. React
  Native lays out as flex by default and the web does not, so one shared value would be wrong on
  one of them.
- **Font family**: `font-sans` and its siblings. Families stay with the platform plugins; only the
  fallback stacks are shared.
- **Every interaction state**: `active:`, `hover:`, `focus-visible:`, `data-*`, `dark:`, `group-*`,
  `peer-*`, `disabled:`.
- **Geometry sized to one plugin's own glyph**, such as the inset a card reserves for its chevron.

`gap-<rung>` stays inside the matrices. A gap is a spacing rung and a rung means the same thing on
both platforms, and the field's two layouts carry different gaps keyed by the matrix's own axis:
exiling it would force each plugin to rebuild that mapping by hand.

Two rules govern what a cell may say. **Arbitrary values are illegal**, in both spellings: no `[`
and no `(`. A cell that reaches for one makes the closed vocabulary negotiable, and the build
cannot tell `border-[1.5px]` from a contract class. **A control's interior padding is always a
literal numeric**, even where a rung happens to coincide: it is calibrated to the control's type
size rather than to rhythm, so a button pads at `px-4 py-2` and never `px-gutter py-row`. Rungs
govern rhythm gaps and container insets, which is why a card insets at `p-card` and the field's two
layouts gap at `gap-row` and `gap-stack`.

## Composing with cn

`cn()` merges class inputs and resolves Tailwind conflicts, last wins. Its `tailwind-merge` config
registers five contract scales under `theme`: the type roles as font sizes and again as leading,
the tracked roles as tracking, the radius rungs, and the spacing rungs. Two members of one scale
then collapse to the last, `rounded-t-control` beats `rounded-t-sheet`, and a type role beside a
color leaves both standing.

A role owns three properties, so the config also declares `font-size` as conflicting with both
`leading-` and `tracking-`: a later role clears the earlier role's line height and letter spacing
together. Stock `tailwind-merge` conflicts on `leading-` alone, which leaves a stale `tracking-h1`
riding body text.

**Compose the type role before any later size class, never after.** That conflict runs one way, so
`cn("leading-h1", "text-body")` and `cn("tracking-h1", "text-body")` each return `text-body` alone
and the earlier role's metrics are gone. `cn("text-body", "leading-h1")` keeps both, as does a
role beside its own `tracking-`.
