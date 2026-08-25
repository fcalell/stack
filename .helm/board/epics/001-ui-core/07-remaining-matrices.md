---
id: 001-07
status: done
merged: 32297f7
depends: [001-06]
gate:
  rounds: 2
  round-1: 9 flags (1 blocking, 2 serious, 6 minor), all fixed, none contested
  round-2: 11 flags (0 blocking, 5 serious, 6 minor), all fixed, none contested
---
# Remaining matrices (M7)

## Goal

Close the PRD's five named families onto the sharing line: **checkbox**, **toggle**, **dialog
chrome**, **skeleton**, **spinner**. Three new shared matrices (`CHECKBOX`, `TOGGLE`, `DIALOG`) and
four class constants land in ui-core; solid-ui gains the three components it lacks (`Toggle`,
`Skeleton`, `Spinner`) and recuts `Checkbox` and `Dialog` onto the shared cells; native-ui recuts
its five existing components onto the same cells. Spinner ships with **no matrix**, recorded: its
tone resolves through a native `color` prop, so any tone cell is platform-conditional and the
PRD's non-goal keeps it out; `ContentTone` is its shared contract.

Driver: `docs/prd/ui-core.md` M7. Outside the PRD's acceptance. The board settled the two scope
forks: ship the missing web twins in this story, and unify every drifted cell to one value.

## Facts (measured)

- Family existence: all five exist in native-ui
  (`plugins/native-ui/src/ui/components/{checkbox,toggle,dialog,skeleton,spinner}/index.tsx`);
  solid-ui has only `checkbox` and `dialog` among them (41 component dirs). solid-ui also ships
  `Loader` (`loader/index.tsx`, a text-scramble loading treatment with `role="status"` at `:65`
  and its own doc page) and the inline `LoaderCircle class="animate-spin"` glyph in
  `button/index.tsx:101`; native has neither. `Spinner` is a third loading-adjacent surface, so
  its boundary is recorded (decision 8).
- The drift, cell by cell (web value first, native second):
  - checkbox shape: `rounded-md` square (`checkbox/index.tsx:9`) vs `rounded-full` disc
    (native `:24`); unchecked border `border border-ink-1` vs `border-[1.5px] border-edge`;
    disabled `disabled:opacity-50` vs `opacity-40` — and the web selector is inert: the cva
    lands on Kobalte's Control div, `:disabled` never matches a non-form element (Kobalte
    stamps `data-disabled` instead), so the rendered web fade today is none at all. The checked
    pair `bg-accent` + `text-accent-ink` is already invariant on both sides.
  - dialog: title `text-h3 font-semibold` (`dialog/index.tsx:132`) vs
    `text-h3 font-bold text-ink-1` (native `:66`); description `text-callout text-ink-3` (`:146`)
    vs `text-callout text-ink-2` (native `:68`); panel `rounded-xl border ... p-6` (`:56`) vs
    `rounded-sheet ... p-5` no border (native `:54`); scrim `bg-scrim` invariant.
  - toggle (native only): track on `bg-ink-1`, off `bg-edge`, knob `rounded-full bg-canvas`,
    disabled `opacity-40`, geometry `h-6 w-10 px-[3px]`, knob `h-[18px] w-[18px]`
    (native `toggle/index.tsx:23-28`). Props `value`/`onValueChange`, unlike its sibling
    checkbox's `checked`/`onChange`.
  - skeleton (native only): the whole look is `rounded-md bg-surface`
    (native `skeleton/index.tsx:18`), plus prop-driven `style={{ width, height }}`.
  - spinner (native only): zero class cells; RN `ActivityIndicator` colored via
    `useTokenColor(\`--color-${tone ?? "ink-1"}\`)`, `tone?: ContentTone`
    (native `spinner/index.tsx:19`).
- Token facts: `bg-surface`, `rounded-xl`, `border-ink-1`, `border-edge` are already matrix
  cells (`CARD`, `FIELD`; `packages/ui-core/src/variant-tables.ts:200,233-239`); `bg-edge` is
  new matrix vocabulary (the `edge` token exists, the `bg-` spelling compiles, no cell holds it
  today). `rounded-md` is a
  themed rung (10px; `tokens.ts:246-255`). `section` spacing rung is 24px, so web's dialog `p-6`
  has an exact rung spelling `p-section` and `CARD`'s `p-card` is the surface-padding-by-rung
  precedent (`variant-tables.ts:200-205`). `accent` aliases `ink-1` in the default theme (native
  a7's alias law), so unifying toggle's on-track to `bg-accent` renders identically today and
  diverges only under a themed accent. Web's default border color is already `edge`
  (`solid-ui src/ui/globals.css:30`).
- Type roles: `TEXT.h3` is `text-h3 font-semibold tracking-h3 leading-h3`
  (`variant-tables.ts:100`), agreeing with web's title weight; native's `font-bold` title is
  drift from the type contract. `TEXT.callout` carries `font-bold` (`:102`), so a dialog
  description (callout size, regular weight) cannot ride `TEXT`.
- Kobalte ships `@kobalte/core/switch`; its root options spell
  `checked?: boolean; defaultChecked?: boolean; onChange?: (isChecked: boolean) => void`
  (installed 0.13.11 dist types), and the switch is uncontrolled-capable: with `checked`
  undefined it flips its own input, `aria-checked`, and `data-checked` on press. A cva called
  with an optional prop therefore freezes while the accessible state moves, which is why
  decision 6 requires the prop. Web checkbox wraps `@kobalte/core/checkbox` with a local
  `checkboxVariants` cva, exported and documented as a composition hatch
  (`docs/checkbox.md:55-59`), size axis `sm | default | lg` (not `md`).
- Wiring points for one new matrix: `variant-tables.ts` table + `variants.ts` `build()` + axis
  types; ui-core c19 registers both directions and hard-pins the compound-row count string
  `"BUTTON:6 BUTTON_LABEL:6"` (`verify.ts:1035-1043`, unchanged — the new matrices carry no
  compound rows); `CLASS_CONSTANTS` (`verify.ts:206-208`) holds non-matrix constants; both
  plugins keep hand-spelled second-opinion `FAMILIES` registries
  (`plugins/solid-ui/scripts/verify.ts:731-772`, `plugins/native-ui/scripts/verify.ts:346-392`).
- solid-ui harness blast radius: b3's `REBUILT` list (`:631-639`) and `required` cva map
  (`:921-929`) must grow; b4 starts scanning any file added to `REBUILT` (button's
  `focus-visible:outline-interactive` precedent shows non-color selector suffixes pass, and
  `opacity` is not among b4's scanned roots); b5
  `RETIRED_EXPORTS` (`:687-693`) is where `checkboxVariants` dies; b6's `updated` page-marker
  list (`:1177-1187`) pins migrated doc pages; b8 fails on any new component dir until the
  closure fixture imports it. `docs/dialog.md:128,141` is already stale (`variant` for what the
  source spells `tone`); `docs/query-boundary.md:70` shows a `<Skeleton count={5} />` fallback
  example that no shipped component will match.
- native-ui harness blast radius: b5 set-equality between swept source classes and
  `NATIVE_OVERLAYS` (`:112-206`) fails in both directions on any class add or removal
  (bracketed tokens are skipped, `:282`); a6 requires every new matrix in native `FAMILIES`
  (`:346-393`) and every constant to compile; b7 pins fixture literal tokens including
  `onCheckedChange` and requires per-dir subpath imports. No native docs dir; native templates
  (`lib-auth.ts`, `lib-query.ts`) reference none of the five families, so the API renames touch
  fixture and README prose only.
- The b5 resync, measured: after decision 9 the entries no remaining native source spells are
  `bg-accent`, `text-accent-ink`, `rounded-sheet`, `p-5`, and `bg-scrim` (all move into matrix
  cells or constants; a6's INVENTORY covers them from there) — mandatory deletions. Entries that
  die in the recut files but survive elsewhere and must stay: `opacity-40` (stepper, nav-bar),
  `bg-edge`, `bg-ink-1`, `bg-canvas`, `font-bold`, `text-ink-2`, `text-h3`, `rounded-md`,
  `bg-surface`, `rounded-full`, `border-edge`. The scrim's `px-6` (backdrop inset, native
  dialog only) stays in source as overlay and therefore stays listed.
- Neither plugin harness would notice an unregistered new matrix today: native a6 iterates
  whatever `FAMILIES` holds, and solid-ui b0 asserts only that `CELLS` is non-empty plus the
  button/badge inks. Decision 10 closes the hole with pinned family rosters.
- ui-core README constraints: c15 bans the case-sensitive substrings `sea` and `Sheet` in that
  README; c25 asserts the sharing-line section by subject terms (`control minimum height`,
  `font weight`, `platform overlay`), so prose may grow without breaking it.

## Decisions

1. **Web values win every contested cell.** solid-ui's five families went through the M3/M5
   matrix sweeps; native's five never did. Every drifted cell unifies to the web value, and the
   native visible changes are the deliberate re-alignment: checkbox `rounded-md` +
   `border border-ink-1` + `opacity-50`; dialog title `font-semibold` (the `TEXT.h3` weight),
   description `text-ink-3`, panel `rounded-xl border border-edge p-section` (24px). The one
   cell with no web spelling unifies semantically instead: toggle's on-track is `bg-accent`, not
   `bg-ink-1`, matching checkbox's checked fill (identical rendering today via the alias law).
2. **Three matrices, four constants, in ui-core.** All state axes; no compound rows, so c19's
   pinned compound string is untouched:
   - `CHECKBOX`: base `"rounded-md"`, `state: { unchecked: "border border-ink-1", checked:
     "bg-accent" }`, default `unchecked`. No `border-none` in the cell: native recomputes
     per state so the checked call simply lacks the border; web undoes it in its selector
     overlay (`data-checked:border-none`), which paints no color and is outside b4's scan.
   - `TOGGLE`: base `"rounded-full"`, `state: { off: "bg-edge", on: "bg-accent" }`, default
     `off`.
   - `DIALOG`: base `""`, `part: { scrim: "bg-scrim", panel: "rounded-xl border border-edge
     bg-canvas p-section", description: "text-callout text-ink-3" }`, no defaults (the part is
     always named, like `RHYTHM`'s unit).
   - Constants in `variants.ts`, registered in `CLASS_CONSTANTS`: `CHECKBOX_MARK =
     "text-accent-ink"` (the tick ink; RN inherits nothing), `TOGGLE_KNOB = "rounded-full
     bg-canvas"`, `SKELETON = "rounded-md bg-surface"`, `CONTROL_MUTED = "opacity-50"`.
   - Axis types `CheckboxState`, `ToggleState`, `DialogPart` derived `keyof`-style like the
     existing ones.
3. **The sharing line grows one named member: muted-control opacity.** Checkbox and toggle mute
   by fading (`CONTROL_MUTED`), unlike button's fill-swap `BUTTON_MUTED`; the README
   sharing-line paragraph names the addition so the line stays deliberate. All four consumers
   (web and native checkbox and toggle) import the constant and apply it as a conditional call
   keyed off their `disabled` prop; no platform spells the opacity value as a literal, so the
   value has one home and drift has nowhere to live. c25's subject terms stay; the prose avoids
   `sea` and `Sheet`. The PRD's sharing-line sentence is the driver snapshot and stays
   untouched; the fold at epic close reconciles it.
4. **Dialog chrome recut, node by node.** Both titles render
   `text({ variant: "h3", tone: "ink-1" })`: web gains `tracking-h3 leading-h3` and the explicit
   ink, native drops its off-contract `font-bold`. The description is callout-size at regular
   weight, which `TEXT.callout` (bold by design) cannot express, so it is the `DIALOG`
   description cell on both sides. The web mapping, exhaustively:
   - Overlay (`dialog/index.tsx:32`): `cn(dialog({ part: "scrim" }), "fixed inset-0 z-50",
     MOTION)` where `MOTION` keeps the existing `data-[expanded]:`/`data-[closed]:` fade string.
   - Content (`:56`): `cn(dialog({ part: "panel" }), "relative z-50 grid max-h-screen w-full
     max-w-lg gap-4 overflow-y-auto duration-200", CONTENT_MOTION)` — the cell now supplies
     `rounded-xl border border-edge bg-canvas p-section` (24px, the same rendered padding);
     everything else on the node today survives verbatim.
   - Title (`:132`), Description (`:146`): the cells above. Header, Footer, CloseButton,
     ConfirmByName, and the portal wrapper are untouched.
   Native: scrim cell + `"flex-1 items-center justify-center px-6"` overlay on the backdrop;
   panel cell + `"w-full"` on the card; icon disc, margins, and action row stay overlay.
5. **Web `Checkbox` recut.** Kobalte structure unchanged. The control renders
   `cn(checkbox(), SIZE[local.size ?? "md"], STATE_OVERLAY, props.disabled && CONTROL_MUTED)`
   where `STATE_OVERLAY` carries the selector duplicates of the checked cells
   (`data-checked:border-none data-checked:bg-accent data-checked:text-accent-ink`, the
   `data-indeterminate:` triple, `data-disabled:cursor-not-allowed` — `data-`, because the
   Control is a div and `:disabled` never matches it — and the `peer-focus-visible:` outline
   triple) — selectors because Kobalte owns the checked state, uncontrolled included;
   the disabled fade is a conditional call because `disabled` is our own prop (read reactively,
   not split, so it still reaches Kobalte). The old `disabled:opacity-50` selector literal dies
   with the local cva. b4 is satisfied: `bg-accent` is the `CHECKBOX` checked cell,
   `text-accent-ink` sits in `TEXT`'s tone axis. The local `checkboxVariants` cva and its export
   die (`RETIRED_EXPORTS` grows; the docs composition hatch section goes with it). The size axis
   renames `default` to `md` (canon: `BUTTON` spells `sm | md | lg`), values unchanged
   (`size-3.5/4/5`).
6. **Web `Toggle` (new).** Dir `components/toggle`, wrapping `@kobalte/core/switch`; named
   `Toggle` for parity with native's dir (one name per concept; `accessibilityRole`/ARIA still
   say switch). Props: `checked: boolean` and `onChange: (checked: boolean) => void`, both
   **required** like native's, `disabled?: boolean`, plus the closed triple; the props type is
   our own, so `defaultChecked` and the rest of Kobalte's surface never enter it (the Facts show
   an uncontrolled Kobalte switch flips its accessible state while a prop-computed cva freezes —
   requiring the prop is what makes the call-not-selector shape sound). Part structure mirrors
   checkbox's: `Switch.Root` (label wrapper) holding `Switch.Input class="peer"` (the element
   carrying `role="switch"` and the interaction; Kobalte's Root renders `role="group"`) then
   `Switch.Control` as the track and `Switch.Thumb` as the knob. Track:
   `cn(toggle({ state: props.checked ? "on" : "off" }), "inline-flex h-6 w-10 items-center
   px-1", props.disabled && CONTROL_MUTED)`; knob:
   `cn(TOGGLE_KNOB, "size-4 transition-transform", props.checked && "translate-x-4")` (16px
   travel = 40 − 2×4 − 16); `props.*` reads throughout, never destructured, so the classes stay
   reactive. Focus outline is checkbox's `peer-focus-visible:` triple on the Control.
7. **Web `Skeleton` (new).** Dir `components/skeleton`. Props: `width?: number | string`,
   `height?: number | string` (native's names; native's type is RN's `DimensionValue`, the
   recorded type-level asymmetry), plus the closed triple. Renders
   `<div class={cn(SKELETON, "animate-pulse")} style={{ width: ..., height: ... }} />`; the
   pulse is web-only motion overlay (native's shimmer stays deferred). The internal `style`
   attribute is the component's own, built from typed props, the same shape native ships.
8. **Web `Spinner` (new).** Dir `components/spinner`. Props: `tone?: ContentTone` (default
   `"ink-1"`), plus the closed triple; no size prop (philosophy: surface is the last resort;
   native's README scopes the spinner to busy controls). Renders lucide `LoaderCircle` at
   `size-4` with `animate-spin`, `role="status"`, and
   `style={{ color: \`var(--color-${tone})\` }}` — the web mirror of native's `useTokenColor`,
   with no class assembled from a variable. No matrix, recorded: a tone cell would be
   platform-conditional (native colors a prop, not a class), which the PRD's non-goal forbids.
   Boundary with the existing web `Loader` (one name per concept, two concepts): `Spinner` is
   the spinning glyph for a busy control, `Loader` is the text-scramble loading treatment for a
   pane; both doc pages state the boundary and point at each other, and `Loader` stays web-only
   (a flourish, not a shared fact). The boundary binds web `Button` too: its raw
   `LoaderCircle class="animate-spin"` glyph (`button/index.tsx:101`) becomes
   `<Spinner tone={buttonContentTone(emphasis, tone)} />`, the structure native Button already
   has; Spinner's own `size-4` yields to Button's `GLYPH` map where they differ (`[&_svg]:`
   selectors out-rank a class on the svg), so the lg glyph stays `size-5`.
9. **Native recuts, five files.** checkbox: `cn(checkbox({ state }), ...)` + `CHECKBOX_MARK`
   tick + `CONTROL_MUTED`; the disc, `border-[1.5px]`, and `opacity-40` die; the 22px box and
   tap-target comment stay (platform geometry). toggle: cells + `TOGGLE_KNOB` + `CONTROL_MUTED`,
   and the props rename to `checked`/`onChange` matching checkbox and web (`value`/
   `onValueChange` were drift inside native's own pair). dialog: scrim/panel/description cells +
   `text({ variant: "h3", tone: "ink-1" })` title; `rounded-sheet`, `p-5`, `font-bold`,
   `text-ink-2` die; icon disc, margins, action row, `w-full`, and backdrop centering stay
   overlay. skeleton: `SKELETON` constant. spinner: unchanged. Component comments recast where
   the recuts falsify them: checkbox's "Round checklist box ... hairline edge ring" header and
   toggle's "stays visible on the ink-1 track" line (the tap-target comment is toggle's and
   survives as written). `NATIVE_OVERLAYS` resyncs to the measured delete/keep lists in the
   Facts; native `FAMILIES` gains the three matrices, `CLASS_CONSTANTS`-equivalents join the a6
   compile probe; the closure fixture follows the prop renames; the README's migrated-set
   paragraph grows.
10. **Harness.** ui-core: c19 registry +3, `CLASS_CONSTANTS` +4, c25 untouched-but-satisfied.
    Both plugin harnesses gain a pinned family roster, because today neither would notice an
    unregistered matrix (Facts): solid-ui b0 and native a6 each assert their `FAMILIES` names
    as one literal roster string ending `... CHECKBOX TOGGLE DIALOG`, the c19-compound-pin
    shape, so a run that skips a registry fails A5/A6 by command. solid-ui: `FAMILIES` +3;
    `REBUILT` grows `checkbox`, `toggle`, `dialog` with `required` rows (`checkbox` →
    `checkbox`; `toggle` → `toggle`; `dialog` → `dialog`, `text`); skeleton and spinner render
    constants, not cvas, so they stay out of `REBUILT` and are covered by b7/b8 plus their doc
    pages; `RETIRED_EXPORTS` + `checkboxVariants`; b6 `updated` rows
    `["checkbox.md", ["state", '`"md"`']]` and `["dialog.md", ["tone", '`"neutral"`']]`;
    closure fixture + three dirs (alphabetical imports, one legal use, the three
    `@ts-expect-error` closure blocks each). native: b5 allowlist resync, a6 `FAMILIES` +
    roster pin, b7's pinned literal tokens revisited where the renames touch them.
11. **Docs.** New pages `docs/toggle.md`, `docs/skeleton.md`, `docs/spinner.md` (44 dirs / 44
    pages after), spinner's carrying the `Loader` boundary and `loader.md` gaining the mirror
    line; `checkbox.md` recut (size `md`, hatch section gone, shared-matrix note); `dialog.md`
    recut (shared cells note, and the stale rows at `:128,141` fixed in name and values both:
    `tone?: "neutral" | "danger"`, the source's `ButtonTone` — today they read
    `variant?: "default" | "destructive"`, wrong twice); `query-boundary.md`'s fallback example
    recast to the shipped `Skeleton` API (no `count` prop) and its "loading spinner" prose
    checked against the boundary; `checkbox.md`'s opening line stops calling the checkbox a
    "Toggle control" now that `Toggle` names a component. Native README migrated-set paragraph
    updated.

## Non-goals

- Web `sheet`/`sidebar` migration onto the `DIALOG` cells: web-only duplication with a stated
  design-intent comment; cross-platform drift, which the matrices exist to kill, cannot happen
  there. Flagged as possible follow-up.
- Native `BottomSheet` and `Toast` recuts (not among the PRD's five).
- A shimmer animation on native skeleton; a size prop on web `Spinner`; an icon-disc slot on web
  `Dialog`.
- A `SPINNER` matrix (impossible by construction, recorded in the Goal).
- Native geometry hygiene (`h-[22px]`, `px-[3px]` and kin stay; only cells a shared matrix now
  owns are replaced).
- helm's migration (separate repo, carried).

## Acceptance criteria

- A1 (file): `variant-tables.ts` + `variants.ts` carry the three matrices, four constants, and
  axis types exactly as decision 2.
- A2 (command): `pnpm --filter @fcalell/ui-core verify` green; c19's compound pin unchanged.
- A3 (file): the six solid-ui touch points match decisions 4-8 (recut checkbox/dialog, new
  toggle/skeleton/spinner, button's glyph onto Spinner); closure fixture imports and exercises
  all three new dirs.
- A4 (file): the five native components match decision 9; `NATIVE_OVERLAYS` carries no stale and
  no missing entry.
- A5 (command): `pnpm --filter @fcalell/plugin-solid-ui verify` green with the grown b0/b3/b4/
  b5/b6/b8.
- A6 (command): `pnpm --filter @fcalell/plugin-native-ui verify` green with the grown a6/b5/b7.
- A7 (command): root `pnpm check` green.
- A8 (file): the decision-11 doc set exists and says what shipped; the ui-core README
  sharing-line paragraph names muted-control opacity without `sea`/`Sheet`.
- A9 (file): prop parity across the shared facts, names and required-ness both: checkbox and
  toggle spell `checked`/`onChange` (required where the platform requires state — toggle
  required on both; checkbox required on native, Kobalte-owned on web) and `disabled?` on both
  plugins; skeleton spells `width?`/`height?`; spinner spells `tone?`. Accepted asymmetries,
  recorded here and nowhere silently widened: native Skeleton extends `ViewProps` and spreads;
  native Spinner keeps `ActivityIndicator`'s `size`; web Checkbox keeps Kobalte's root surface
  (`defaultChecked`, `indeterminate`, `name`, ...). Any divergence outside this list fails.
- A10 (live, close-out): a scratch-consumer **web** page renders Checkbox (unchecked, checked,
  disabled), Toggle (off, on, disabled), Skeleton, Spinner, a busy Button, and an opened
  Dialog; checked fill and toggle on-track render the accent, the disabled pair shows the
  fade, the dialog panel shows the unified chrome (16px radius, hairline border, 24px padding),
  and the toggle animates its knob and toggles by keyboard. The native five have no live
  criterion: on-device rendering stays the carried debt owed to the first native consumer
  (standing since M4), so the native cell changes are vetoed on values, not renders — recorded
  here so the gap is loud.

## Open questions

None for the run; the board can veto the flags at merge.

## Flags for the board

- Native's visible changes are enumerated in decision 1 and are the point of the story, but each
  is vetoable per cell: the checkbox squares off, the dialog panel tightens its radius (24px to
  16px), gains a hairline border, and pads up (20px to 24px), the title drops to semibold and
  gains `tracking-h3 leading-h3`, the description lightens one ink step, disabled checkbox and
  toggle fade at 50 instead of 40. Web moves in three places: its dialog title gains
  `tracking-h3 leading-h3 text-ink-1` by riding `TEXT`; its disabled checkbox gains a fade it
  never actually rendered (the old selector was inert dead code, so "50" is a new value on both
  platforms, kept because it was web's written intent); and its busy Button glyph becomes the
  shipped Spinner.
- The `CONTROL_MUTED` value (50) diverges from native's remaining `opacity-40` sites: stepper's
  at-limit fade and nav-bar's idle tabs keep 40. The nav-bar dim is an inactive-tab treatment,
  not a control mute; stepper's at-limit fade is arguably the same concept and is carried as an
  alignment item for whenever stepper migrates.
- Native `Toggle` renames `value`/`onValueChange` to `checked`/`onChange`: an API break with no
  in-repo consumer outside the fixture; helm and any future native consumer get the aligned
  names.
- `checkboxVariants` dies as a public export; its documented composition hatch dies with it. The
  canon's growth rule (matrix grows, or consumer `ui/`) is the replacement.
- The sharing line grows muted-control opacity; recorded here and in the README.
- Web checkbox's size axis value `default` becomes `md`: a web API break aligning with `BUTTON`.
- `Spinner` lands beside the existing web `Loader`; the recorded boundary (decision 8) is the
  one-name-per-concept answer, vetoable if the board would rather fold one into the other.

## Run record

One worktree run, 4 commits, rebased onto the gate commit at merge and fast-forwarded
(`1e6deb9` ui-core matrices, `1346ffb` solid-ui families, `cbc3a47` native recuts, `70402c9`
docs), no contradictions. Five reported deviations, every one judged in-brief by the spec
review (docs commit placement forced by b5/b6 green history; checkbox keeps `shrink-0`; the
focus triple as its own `cn` argument; Skeleton's px-string helper; native b7's `onValueChange`
dead-prop probe). Spec review: decisions 1-11 verbatim, A1-A9 pass, 0 blocking, 0 serious, 2
minor (the Button glyph swap trades `aria-hidden` for the Spinner's `role="status"`, the
brief's own choice; the roster-pin shape leaves the inherent future-matrix hole). Standards
review: per-commit gates re-run green at every commit, 0 blocking, 1 serious (b2/b3 labels
still said "seven"), 2 minor (two commit headers at 67/69 chars, accepted as history; a
dropped article). Seat commit `32297f7` fixes the labels and the article.

## Close-out

- Suites on master tip: ui-core 28/28 (c19 at 14 tables, compound pin untouched), solid-ui
  23/23, native-ui 11/11; root `pnpm check` exit 0.
- Guard mutations, both caught: dropping the CHECKBOX family from native `FAMILIES` fails a6
  with "the family roster drifted" naming the truncated roster; pasting the literal
  `"text-callout text-ink-3"` back over the web dialog's description cell fails b3.
- A10 in the scratch consumer (build through the gate exit 0; live in Chrome, measured via
  DOM): checkbox unchecked = 1px `ink-1` ring at 10px radius, checked = accent fill with the
  border gone, disabled carries `opacity-50`; toggle off-track edge, on-track accent, disabled
  at computed opacity 0.5, knob measured at both endpoints (x 4 to 20, the 16px travel) under
  real clicks, and a real Space press toggles it; skeleton 160x16 pulsing on the surface fill;
  spinner an svg with `role="status"` spinning in ink-1; the busy Button hosts the Spinner
  with glyph color equal to the label ink (`buttonContentTone`); the dialog panel measures
  16px radius, 1px edge border, 24px padding, canvas fill, `max-w` 512px with the grid/gap
  overlay intact, under a `bg-scrim` overlay; the title computes weight 600 with live tracking
  and leading; the description is ink-3 at weight 400, the cell `TEXT.callout` could not
  express. One measurement artifact worth remembering: CSS transitions freeze at
  `currentTime: 0` in a hidden tab, so knob motion only measures under a visible tab and real
  input.

## Carried forward

- Epic 001 has no open story left. The PRD's fold-into-`.knowledge/`-and-retire step
  (`docs/prd/README`) is the epic-close activity and stays with the board.
- Vetoable at merge review: the native visual re-alignment cells (decision 1), the native
  toggle prop rename, the `checkboxVariants` removal, checkbox's `default` to `md`, and the
  Loader/Spinner boundary.
- Native stepper and nav-bar keep `opacity-40`; alignment with `CONTROL_MUTED` rides whichever
  story migrates stepper.
- Web sheet and sidebar keep their copied dialog-chrome literals; folding them onto the
  `DIALOG` cells is the named web-only follow-up.
- The native five still have no on-device render; that debt stays owed to the first native
  consumer, as since M4.
- helm's migration (separate repo) now has checkbox, toggle, dialog chrome, skeleton and
  spinner to draw on alongside 001-08's panes.
