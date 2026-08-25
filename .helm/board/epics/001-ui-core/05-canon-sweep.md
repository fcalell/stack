---
id: 001-05
status: done
merged: 15191c0
depends: [001-03, 001-04]
gate:
  rounds: 2
  flags: 13 + 17
  outcome: all fixed, none dismissed
  round-1-blocking: Solid's classList prop survives a class?: never closure with the same power
    as class (adversary probe-compiled); closure list, scan, and fixtures widened to cover it
  round-1-serious: uniwind's per-prop *ClassName augmentations (colorClassName alone would have
    defeated the spinner collapse); Section rung rationale restated as the PRD-mandated
    region container with three recorded consequences
  round-2-blocking: decision 1 and criterion A4 were mutually exclusive on the classList token;
    A4 now exempts the ?: never declaration form
  round-2-serious: Action.loading/icon were unrenderable by either Button (fixed by decision 24
    loading + Action<never>); the 36-page solid-ui docs/ dir was absent from the brief;
    ColumnMeta.align and sidebar width props cut as speculative surface; divider/separator and
    toast-axis naming drift settled (decision 25); nav-bar action geometry settled as an
    internal pressable
runs:
  - id: A (ui-core RHYTHM + registry, full web sweep)
    commits: a6ebff3..6047b72 (10, merged ff to master)
    review: >
      spec CHANGES-REQUESTED then APPROVE (1 must-fix: the closure fixture was swallowed by the
      fixture dir's gitignore, so the committed branch failed b8 on fresh checkout; 5 fresh
      mutations all caught); standards CHANGES-REQUESTED then closed (same must-fix; data-table
      Table.Cell fork, hairline triplication, quoted-token b7 evasion all fixed; sidebar
      Trigger's duplicated tertiary grounds recorded for M7, commit-header nits recorded)
    note: >
      the one b7 "flake" was the two parallel reviewers racing one worktree (a live mutation by
      the spec reviewer was on disk when the standards reviewer's scan read it); b7 hardened to
      quote verbatim file:line either way
    verify: ui-core 26/26, solid-ui 20/20, native-ui 7/7, pnpm check clean (271 files) from the
      real checkout after merge
  - id: B (full native sweep)
    commits: 789d2e3..15191c0 (8, merged ff to master; the last is my review-nits commit)
    review: >
      spec CHANGES-REQUESTED then closed (2 must-fixes: the committed fixture failed biome on a
      real checkout because the worktree lint no-op masked it one level deeper than Run A's trap,
      and three gorhom *Component probes were vacuous since gorhom types them without | null,
      proven by an uncaught reopen mutation; both fixed and re-proven); standards APPROVE (2
      mechanical should-fixes applied at the seat: useTokenColor in the README exports row, one
      em-dash recast)
    note: >
      reviews ran sequentially this time (Run A's phantom b7 failure was the two parallel
      reviewers racing one worktree); the run self-corrected its worktree base onto Run A's
      merge before starting; the suggested biome-ignore fix was itself environment-dependent
      (biome's react domain activates differently between worktree and checkout), settled by
      restructuring the probe into an object-literal closure
close-out:
  - all suites green from the real checkout post-merge — ui-core 26/26, solid-ui 20/20,
    native-ui 9/9, pnpm check clean (275 files)
  - guard mutations across gate + reviews + close-out, 11 distinct, every one caught; close-out
    pair — a brand-new titleClass hatch on web card FAIL b7; an off-allowlist gap-7 in native
    pair FAIL b5
  - "FIRST BROWSER RENDER OF THE EPIC: stack generate + stack dev in helm (workspace-linked, so
    it consumes the swept plugin live), Chrome render of the board in dark and in light — both
    correct, zero console errors; the alias law verified live in computed styles: light
    --color-accent === light --color-ink-1 === oklch(0.22 0.043 261). This settles the carried
    no-browser-render reduction standing since M3. The native half of the PRD's boot-both-apps
    Verify stays reduced (no native consumer or simulator exists; standing M4 ratification)"
  - B7 parity table delivered in Run B's final report and spot-verified by the spec reviewer
    across eight shared components; the checkbox onChange rename landed on both sides
carried-forward:
  - >
    Sidebar.Trigger hand-writes Button's tertiary ground strings (third hand-synced ground
    site); M7's shared ground-table move absorbs it.
  - >
    FooterSpec remains a pure type in both plugins; the first screen-scaffold composition owns
    its renderer. Action/BadgeSpec now have native consumers; no web component consumes the
    descriptors (web menus keep local item types deliberately).
  - >
    helm's migration is owed in helm: 12 measured sites plus the ratified tabs capability loss
    (its fill-and-scroll tab panel becomes a helm ui/ primitive over Kobalte).
  - >
    The eyebrow tracking-widest overlay (six web sites, one native) and field's role-less
    wrapper leading-snug await M7's look pass.
  - >
    toast and bottom-sheet close third-party styling surfaces by denylist; a solid-sonner or
    gorhom upgrade can reopen a channel silently (the fixtures pin today's list; gorhom's
    missing | null on three *Component props is why those probes pass () => null values).
  - >
    useTokenColor is new public surface on lib/theme (accepted: type-guard wrapper over the
    decision-named useCSSVariable, six internal consumers).
  - >
    The biome worktree-exclusion no-op bit both runs (Run A: lint half silently skipped; Run B:
    the fixture escaped even the lifted-exclusion pass via its nested .gitignore + biome's
    vcs-use-ignore-file). Environmental debt, now twice-paid; wants a real fix in biome-config.
  - >
    Run reviews run sequentially from now on: parallel reviewers racing one worktree produced
    Run A's phantom b7 failure.
  - >
    The on-device native render stays owed to the first native consumer (standing since M4).
---
# The canon sweep, both plugins

Driver: `docs/prd/ui-core.md` M5 (`:292-308`). The canon is law since M2
(`packages/ui-core/README.md` "The canon"); M3/M4 put both plugins on the contract with the class
props still open. This story closes them, applies the descriptor law, writes the slot registry the
canon names, and ships the rhythm family.

## Goal

One pass across all 62 components (36 web, 26 native, measured): `class`, `className`, and `style`
declared `?: never` on every own-props type with nothing in their place, every sibling channel of
the same power closed with them (Solid's `classList`, uniwind's per-prop `*ClassName`
augmentations, the renamed hatches `contentClass` / `listClass` / `containerClass` /
`ColumnMeta.class` / the `createDialog` / `createSheet` options, and the third-party styling
surfaces toast and bottom-sheet forward), the slot props the canon turns into descriptors
collapsed, the surviving slots written into ui-core's README as the closed registry, and the
rhythm family (`Section` / `Stack` / `Row` / `Pair`) shipped in both plugins over a shared
`RHYTHM` matrix. Where a component leaned on a forwarded class to lay itself out, the geometry
moves inside it.

## Measured facts

Verified against `0d1ac65` (clean tree). Exhaustive per-component inventories were taken for both
plugins; the load-bearing facts:

### The closure mechanics (probe-verified)

- A scratch `tsc --noEmit` probe in `plugins/solid-ui` confirmed: `ComponentProps<"div"> &
  { class?: never; style?: never }` and `PolymorphicProps<T, P>` with the `never` keys in `P` both
  reject `class` and `style` at the call site while legal props still pass, including under
  `as="span"` and under `as={Custom}` where the target itself accepts `class`. The PRD's
  re-admission warning (`:194-200`) is real: the `never` keys must stay in the own-props type `P`
  so `Omit<ComponentProps<T>, keyof P>` strips the host's.
- On native, every RN-extending interface admits `className` through uniwind's augmentation
  (`plugins/native-ui/src/uniwind-env.d.ts:6`) and `style` through the RN prop type, even when
  neither is declared.

### plugin-solid-ui (36 dirs)

- Host shapes: 16 dirs touch Kobalte `Polymorphic` (26 `PolymorphicProps` call sites plus
  `danger-zone:26` and `empty-state:45` element-only uses), 16 dirs use `ComponentProps`, 13 have
  standalone prop types. `enum-input` and `navigation-progress` have no class/style surface today.
- Solid admits `classList` on every host-extending type with the same power as `class`, and a
  `class?: never` closure leaves it open (probe-verified); `navigation-progress:49` uses it
  internally (nothing props-sourced reaches it).
- Renamed hatches: `tabs` `listClass`/`contentClass` (`tabs/index.tsx:89-90`), `table`
  `containerClass` (`table/index.tsx:8`), `contentClass` on `dialog:165` (`CreateDialogOptions`),
  `sheet:208` (`CreateSheetOptions`), `select:154`, `context-menu:153`, `dropdown-menu:196`; plus
  `data-table`'s TanStack module augmentation `ColumnMeta.class?: string`
  (`data-table/index.tsx:11-16`) landing on `Table.Head`/`Table.Cell` (`:49`, `:86`).
  `dropdown-menu`'s own `class` prop (`:195`) is declared and never read.
- Two consumer-facing class channels evade a `cn(...local.class)` grep: the cva `className:`
  argument (`input-group:67,129`, `item:75,112`, `logo:86`) and `toast`'s untouched spread
  (`ComponentProps<typeof SolidSonnerToaster>` at `toast/index.tsx:5`, `{...rest}` at `:35` after
  the plugin's `style`/`toastOptions`, so a consumer can replace the whole toast design today;
  solid-sonner's type has no top-level `classNames`, but it has `icons` element slots).
- Plugin-to-plugin class hand-offs that break when the props close (complete list):
  `field:38-48` → `Label` (five lines of layout and state selectors), `danger-zone:22` → `Inset`
  (`py-4`), `item:29` and `sidebar:329` → `Separator` (margins, `bg-edge`), `sidebar:350-355` →
  `Input` (`bg-canvas` + focus ring), `sidebar:260` → `Button` (`aspect-square`),
  `sidebar:192-193` → `Sheet.Content` (`w-(--sidebar-width) bg-surface p-0 [&>button]:hidden` plus
  a `style` custom property), `input-group:127-182` → `Button`/`Input`/`Textarea` (shell-stripping
  overlays), `data-table:37,49,72,86` → `Table` parts, `form:33-271` → `Field`/`FormField` (seven
  bare forwards, no literals), `tabs:110,122` and `select:196,210` and the menus' `:160-164` →
  their own internal parts, `sidebar:494` → `Tooltip.Trigger` (`inline-flex`).
- Open Kobalte re-exports with no wrapper to close: `Dialog.Trigger` (`dialog:276`),
  `Sheet.Trigger`/`Sheet.Close` (`sheet:273-274`), `Tooltip.Trigger` (`tooltip:38`).
- `sidebar` sizing rides `style`: `ProviderProps` re-declares `style?: JSX.CSSProperties`
  (`sidebar:70-74`), writes `--sidebar-width`/`--sidebar-width-icon` with the consumer's style
  spread last (`:133-138`), read back only through `w-(--sidebar-width)` arbitrary syntax; the
  mobile branch re-sets the property on `Sheet.Content` (`:193`). `Sidebar.Trigger` inherits
  `class` through `ButtonProps` (`:246`). The mobile branch silently drops a consumer `class`
  (`:164-170` vs `:188`), a pre-existing inconsistency the closure dissolves.
- Slot props (`JSX.Element`, non-children): `checkbox.label:29`, `empty-state.icon:13`,
  `logo.icon:67`/`logo.text:68`, `dropdown-menu.trigger:193`, `MenuAction.icon:20`,
  `MenuSub.icon:44` (context-menu imports the same types), `data-table.fallback:21`,
  `query-boundary.loadingFallback:29`/`emptyFallback:33` (plus function-typed `errorFallback:31`,
  `children:35`), `tabs` `Tab.content:11` (plus function `children:91`), `select.children:157`,
  the `createDialog:170`/`createSheet:213` render props, `app.providers:21`/`errorFallback:23`.
- Role-metric overrides on role-carrying nodes: `dialog:123` (`text-h3` + `leading-none
  tracking-tight`, the carried 001-03 compose-order debt), `checkbox:61` (`text-callout
  leading-none`), `field:60` (`text-caption leading-normal`), `label:18` (`text-micro
  leading-snug`), `logo:42` (`leading-none tracking-widest` under role variants), and
  `field:41` (`leading-snug` inside the Label hand-off). `field:27` carries `leading-snug` on a
  role-less wrapper. The eyebrow look `uppercase tracking-widest` rides role nodes at
  `empty-state:47`, `section:55`, `label:18`, `danger-zone:28`, `logo:42`; `lib/menu.ts:16` has
  the tracking without the uppercase, and native's `field/index.tsx:16` carries the same eyebrow.
- Latent bug: `input-group` `GroupInput` passes its `"sm"|"default"|"lg"` size (`:154`) into
  `Input`'s native numeric `size` attribute (`:162`).
- `lucide-solid` exports `type LucideIcon = (props: LucideProps) => JSX.Element`
  (`dist/types/types.d.ts:12`); the plugin already depends on it (`package.json:75`).

### plugin-native-ui (26 dirs)

- 15 components extend RN prop types (both hatches live, `...rest` spread onto the RN element):
  avatar, avatar-stack, badge, button, card, divider, field (4 parts), filter-chip, input,
  progress-bar, row-item, skeleton, spinner, text-area, text. 10 declare `className?: string` on
  standalone types (no `style`): checkbox, def-row, dialog, footbar, nav-bar, segmented, stepper,
  tab-bar, toast, toggle. `bottom-sheet` has no `className` but forwards gorhom's style-object
  props AND its render-takeover slots (`backgroundComponent`, `handleComponent`,
  `backdropComponent`, `footerComponent`) through `Partial<BottomSheetModalProps>` (`:15`, spread
  `:27`). `spinner` forwards `className`/`style` silently through `...rest` (`:15`) with no `cn`
  in the file.
- uniwind also augments RN types with per-prop class channels (`uniwind/types.d.ts:57-95`):
  five `*ClassName` props on `TextInputProps`, `selectionColorClassName` on `TextProps`,
  `colorClassName` on `ActivityIndicatorProps`. Probe-verified: they survive a
  `className?: never` closure untouched.
- Slot props (`ReactNode`, non-children): `checkbox.icon:10` (fallback is a `✓` Text glyph
  `:39`), `dialog.icon:11` (rendered in a 48px tone-tinted disc `:48-57`), `filter-chip.leading:8`,
  `nav-bar.leading:8`/`trailing:9`, `row-item.leading:8`/`trailing:9`, and the render-prop
  `tab-bar` `TabBarItem.icon?: (active: boolean) => ReactNode` (`:10`).
- children semantics: `dialog.children:15` is an actions region the component lays out itself
  (`mt-4 flex-row gap-3`, `:63`); `footbar.children:7` is the bar's content inside a positioning
  shell (safe-area, border, `:24`); badge/button render string children into their own label
  `Text`; def-row/bottom-sheet/card/avatar-stack children are content.
- Zero cross-component composition (no component imports another) and zero consumers anywhere
  (no `stack.config.ts` under `~/projects` passes `nativeUi()`), so every break lands at zero
  migration cost.
- `skeleton`'s doc comment names `className` as its sizing API (`:4`). `avatar` merges a public
  `style` last (`:38-42`) and keeps a fixed-hex `TINTS` table (`:11-18`, deliberately
  theme-invariant). `spinner.color?: string` (`:7`) is the one arbitrary color prop in the set;
  `useButtonContentColor` (`button:102-108`) still has no in-tree consumer (M4 carried item).
- `lucide-react-native` is already a dependency (`package.json:37,64`, plugin dependencies map
  `index.ts:209-210`) and exports `LucideIcon`; today's icon slots are `ReactNode` with doc
  comments telling the consumer to pass a lucide element.
- The web dir is `textarea`, the native dir is `text-area`; every other shared name matches.

### ui-core and the references

- `@fcalell/ui-core/descriptors` ships `Action`, `BadgeSpec`, `FooterAction`, `FooterDestructive`,
  `FooterSpec`; nothing in either plugin imports the module (grep). M2 explicitly left the slot
  registry's contents to this story (`02-cn-matrices-canon.md` Out of scope).
- The sharing line keeps `gap-<rung>` inside the matrices (`README.md:273-275`), so the rhythm
  cells' home is a ui-core matrix, not per-plugin strings. The spacing scale is registered in
  `cn()`, so two rhythm gaps collapse correctly.
- Sailward's rhythm family (`~/projects/sailward/apps/mobile/src/ui/primitives/{stack,row,pair}.tsx`)
  is the reference: `Stack` bakes a `gap-stack` column, children only; `Row` bakes
  `flex-row items-center gap-row`, with the note that a left/right split is `justify-between`
  geometry, not a `Row`; `Pair` bakes `gap-pair`, column by default, `row` prop lays it inline.
  Its `Section` carries data-driven head chrome, which the PRD keeps web-only (`:150-153`).
- helm is the only live consumer (web only). Measured impact of this story's breaks there:
  21 files import plugin components; 11 call sites pass `class` (`Loader` ×4, `Sheet.Header` ×3,
  `Badge` ×2, `Card` ×1, plus one retired-utility case), one site uses `listClass`/`contentClass`
  (`card-drawer.tsx:251-252`), checkbox labels are already strings, no `style` is passed to any
  component. helm still calls M3-retired APIs (`variant="secondary"`), so it is already pending a
  migration this story only extends. helm's migration happens in helm, not here.

## Approach

Two sequential dispatches against this one brief. Run A lands ui-core (the `RHYTHM` matrix, the
registry) and the whole web sweep; Run B lands the whole native sweep. B is gated on A because the
native rhythm components compose the cva A ships.

**Run A: ui-core + plugin-solid-ui.**

1. ui-core: `RHYTHM` config + `rhythm` cva in `src/variants.ts` (decision 3). README gains the
   slot registry subsection (decision 5) and the icon-param rule. `scripts/verify.ts` picks the
   new cva up through the existing enumerator; add the cell-shape check and the registry README
   check (criteria A2).
2. Geometry relocations first, per decisions 7 through 15: the closure cannot type-check while
   `field`, `sidebar`, `data-table`, `input-group`, and the rest still pass `class` to sibling
   components.
3. Web closure: every own-props type in all 36 dirs declares
   `class?: never; style?: never; classList?: never` (decision 1); the renamed hatches die
   (decision 2); the `splitProps` keys, `cn` tails, cva `className:` arguments, and the
   `ColumnMeta` `class` key go with them.
4. Slot collapses and survivors, per decisions 16, 18, and 24; role-metric override fixes,
   decision 19.
5. New `stack`/`row`/`pair` component dirs; `Section.Root` gains the rung (decision 4).
6. Harness: the closed-prop scan check, the `tsc` fixture check, and the rhythm family added to
   the verify script's family list so its cells enter the Tailwind resolution set
   (criteria A4-A6). Docs: the 36 pages under `plugins/solid-ui/docs/` sweep with the code (32
   document `class` props; `docs/tabs.md:19-20`, `docs/table.md:17`, `docs/data-table.md:20`
   document the dead hatches), and `stack`/`row`/`pair` get pages (criterion A12).

**Run B: plugin-native-ui.**

7. Native closure: every own-props type declares `className?: never; style?: never`; spinner and
   bottom-sheet stop forwarding (decisions 1, 20, 21).
8. Slot collapses, per decisions 17 and 18.
9. New `stack`/`row`/`pair`/`section` dirs (decision 4); `text-area` renames to `textarea`
   (decision 22).
10. Harness: scan + fixture checks; `NATIVE_OVERLAYS` re-trued by b5's set-equality.
11. README updates in both runs: component lists, the closed-prop statement, the skeleton/spinner
    API changes, and the `useButtonContentColor` line at `plugins/native-ui/README.md:158` goes
    with the export.

## Settled decisions

1. **The closure spelling.** Web closes `class`, `style`, and `classList` (Solid's object-syntax
   class prop rides every host-extending type and is the same power as `class`; probe-verified
   that it survives a `class?: never` closure untouched); native closes `className`, `style`, and
   the uniwind per-prop `*ClassName` augmentations its host type carries
   (`node_modules/uniwind/types.d.ts:57-95`): `placeholderTextColorClassName`,
   `cursorColorClassName`, `selectionColorClassName`, `selectionHandleColorClassName`,
   `underlineColorAndroidClassName` on `input`/`textarea`, `selectionColorClassName` on `text`,
   `colorClassName` on `spinner` (which would otherwise defeat decision 20 single-handedly).
   Internal attribute use stays legal: `input` keeps setting `placeholderTextColorClassName` on
   its own `TextInput` element. Both plugins spell every closure `?: never` on every own-props
   type, uniformly, including components with no surface today (`enum-input`,
   `navigation-progress`), so the harness scan can demand the declaration everywhere instead of
   allow-listing exceptions. Compound components declare it per part. The runtime
   `splitProps`/destructure keys and `cn` tails are deleted with the props, and
   `navigation-progress` rewrites its internal `classList` (`:49`) as a `cn` ternary, so the only
   permitted `classList` token form left in components is the `classList?: never` declaration
   itself (A4 is worded exactly that way).
2. **Renamed hatches close under the same law.** The canon rejected a renamed `unsafeClass` prop
   by name (PRD `:132-137`); `contentClass`, `listClass`, `containerClass`, the two
   `createDialog`/`createSheet` `options.contentClass` fields, and `data-table`'s `ColumnMeta.class`
   augmentation are that prop. All die. Replacements exist only where a decision below names one;
   popover geometry (menu width, dialog width, tabs list/content, table scroll container) gets
   none: the defaults stand, and a consumer look is a `ui/` primitive. `sheet` keeps its existing
   `position`/`size` axes. `dropdown-menu`'s dead `class` prop is deleted outright.
3. **The rhythm cells are a ui-core matrix.** `RHYTHM = { base: "", variants: { unit: { section:
   "gap-section", stack: "gap-stack", row: "gap-row", pair: "gap-pair" } } }`, exported beside a
   `rhythm` cva, enumerated and Tailwind-resolved by the existing harness like every family. The
   axis is string-keyed; the cells are exactly `gap-<unit>`, pinned by a shape check.
4. **The rhythm components.** Both plugins ship `Stack` (column, `rhythm({unit:"stack"})`),
   `Row` (row, `items-center`, `rhythm({unit:"row"})`), and `Pair` (`rhythm({unit:"pair"})`,
   column by default, `row?: boolean` lays it inline with `items-center`), all closed: children
   only, no other props, `?: never` closures included. Display and alignment classes are the
   platform overlay: web adds `flex flex-col`/`flex flex-row`, native adds only the row-direction
   classes (RN is a column by default). Stack, Row, and Pair each bake their namesake rung as the
   gap between their children, per the rung table.
   **Section is the region-level container, per the PRD's own sentence** ("the rhythm family's
   outermost rung folds into" `Section.Root`, `:150-153`): its children are a screen's regions,
   gapped at `rhythm({unit:"section"})`. Native adds `Section` as exactly that, a
   `gap-section` column, children only. Web's existing `Section.Root` gains the same rung on its
   column, and `Section.Content` drops its top padding to `px-6 pb-6`: for the canonical
   Header + Content pair the header-to-content distance is unchanged (24 either way,
   arithmetic verified against `section/index.tsx:38,63`). Three recorded consequences, all with
   zero live consumers (helm and the templates use `Section` nowhere): a `Section.Table` body
   gains a 24px seam under the header where it sat flush; a headerless `Section` loses its
   24px top inset (the gap has no preceding sibling); and the rung table's "head to body" row
   entry describes in-region heads, while `Section.Root`'s Header is bordered screen chrome whose
   24 is today's measured look, kept deliberately. Sailward's `Section` gaps differently
   (`gap-row` head-to-body over a `gap-stack` body); it carries product head chrome the PRD keeps
   web-only, so it is the reference for Stack/Row/Pair, not for Section.
5. **The slot registry lands in ui-core's README** as a subsection of "The canon", and it is the
   closed list: `children` (a primitive's own content region; badge and button keep rendering
   string children into their label `Text`); function children and per-item render props
   (`children: (item) => element` on data-driven containers and the `createDialog`/`createSheet`
   render argument: select, tabs, query-boundary); `content` (the per-item content of a
   data-driven container: web tabs); `trigger` (the anchor of an overlay: dropdown-menu);
   `fallback`, `loadingFallback`, `errorFallback`, `emptyFallback` (boundary alternates:
   query-boundary, data-table); `icon` and `text` on `logo` (brand media, the consumer's own
   mark); `providers` and `errorFallback` on `createApp` (app-shell hooks). Everything else
   composed is descriptor data, and an icon is always a component-typed param (`TIcon` = the
   platform's `LucideIcon`), never an element.
6. **Descriptors get their first consumers**: `Action` (native nav-bar and dialog), `BadgeSpec`
   (native row-item). `FooterSpec` stays a type: sailward renders it from screen scaffolds that
   stack does not ship, native-ui's footbar is a positioning shell whose children are content
   (registry), and inventing the renderer with zero consumers is the speculative surface
   philosophy forbids. Carried forward.
7. **field → Label.** The label look's base string moves to a module-internal export
   (`lib/` or the label module, `menu.ts` precedent); `Label` composes it, and `Field.Label`
   renders its own label element composing the same base plus its five field-state lines. No class
   prop crosses a component boundary anywhere in the plugin afterward.
8. **danger-zone** wraps its parts in an internal `flex flex-col gap-3 py-4` element inside
   `Inset` (Inset's own `gap-3` goes idle with a single child, so the wrapper restates the
   internal rhythm it previously got from Inset); its own `class` prop closes with the rest.
9. **item and sidebar separators** stop composing `Separator`: each renders its own internal
   hairline element carrying its margins. `Separator` itself closes untouched.
10. **SidebarInput** renders `Input` with no overrides; the `bg-canvas` and focus-ring look dies
    (sidebar has no in-tree or helm consumer). **Sidebar.Trigger** becomes a raw internal
    `<button>` with its own classes, ending the `ButtonProps` inheritance leak.
11. **input-group** gets an internal Solid context: `InputGroup.Button` keeps its own compact
    size prop (`xs`/`icon-xs`/`icon-sm`/`sm`) and provides it, with the in-group flag, through
    the context; `Input`, `Textarea`, and `Button` read the context to compose their in-group
    overlays (shell stripping, group sizing) internally. The `GroupInput` size-attribute bug dies
    with the redesign.
12. **data-table**: the `ColumnMeta` augmentation stays (it is the only way to type TanStack's
    interface); inside it, the `class?: string` key is deleted with nothing in its place (no
    in-tree or helm column passes `meta`, so a typed `align` replacement would be speculative
    surface; it waits for the consumer that needs it), and `ariaSort` stays untouched (`:14`,
    consumed at `:50`). `Table` gains `bordered?: boolean` (justified: data-table's own `:37`
    call site consumes it); the empty-row cell becomes a raw `<td>` with its classes.
13. **table** loses `containerClass`; the internal scroll container keeps its fixed classes.
14. **toast** closes by `Omit` of solid-sonner's `class`, `className`, `style`, `toastOptions`,
    and `icons` from the public type (`classNames` is not a top-level `ToasterProps` key, and
    `icons` is a set of element slots law 2 forbids). The spread stays for behavioral props; the
    design-overwrite hole closes with it. This is a denylist against a third-party type: a
    solid-sonner upgrade adding a new styling prop reopens silently, and the look-adjacent
    residue that stays open today (`richColors`, `invert`, `theme`, mostly neutered by the
    forced `unstyled`) is accepted and recorded.
15. **The open Kobalte re-exports get thin closed wrappers**: `Dialog.Trigger`, `Sheet.Trigger`,
    `Sheet.Close`, `Tooltip.Trigger` each become a component whose props close `class`/`style` and
    forward the rest. Plugin internals may use Kobalte primitives directly (`sidebar:494`
    switches to `TooltipPrimitive.Trigger`). **sidebar's Provider** closes its `style` prop with
    nothing in its place: the widths become the internal constants they already default to
    (sidebar has no in-tree or helm consumer, so replacement `width` props would be speculative
    surface; they wait for the consumer that asks). The mobile branch composes Kobalte's Dialog
    primitives directly with the sheet look strings, which move to `src/ui/lib/sheet.ts`
    (`menu.ts` precedent: lib constants shared across component modules; `sheetVariants` is not
    exported today and the exports map makes every module public, so lib is the sanctioned home),
    ending the `Sheet.Content` class/style hand-off.
16. **Web slot dispositions.** `checkbox.label` narrows to `string`. `empty-state.icon` becomes
    `icon?: LucideIcon` (rendered by the component at its fixed size); `empty-state`'s children
    (an actions row the component lays out) collapse to `action?: Action<never>`, rendered as a
    secondary `md` `Button` (decision 24 makes `loading` renderable; `Action<never>` makes the
    `icon` field unpassable until buttons learn icons, M7); `query-boundary` and the default app
    error fallback update to pass `action`.
    `MenuAction.icon` and `MenuSub.icon` become `LucideIcon` (menus keep their own item types;
    they already say `onSelect`). `trigger`, the fallbacks, `Tab.content`, the `select`/`tabs`
    option render props, `logo`'s slots, and `createX` render props survive per the registry.
    `empty-state.titleAs` stays: it is the documented `as`-hole, not a class channel.
17. **Native slot dispositions.** `row-item`: `leading`/`trailing` collapse to
    `icon?: LucideIcon` (leading glyph, ink-3), `value?: string` (trailing mono callout),
    `badge?: BadgeSpec` (rendered through `Badge`), `chevron?: boolean` (lucide `ChevronRight`,
    ink-3); `label`/`description` stay strings. `nav-bar`: `leading`/`trailing` collapse to
    `onBack?: () => void` with `backVariant?: "back" | "close"` (lucide `ChevronLeft`/`X`
    rendered internally) and `action?: Action<never>` rendered as the bar's own internal
    pressable text (interactive-tone callout label, `hitSlop` to the 44pt floor, stepper
    precedent; `loading` dims and disables it): a `Button`'s `min-h-11` plus the bar's `py-2`
    would grow the 48px bar to 60, so the bar owns this one composition. `title`/`center` stay.
    `filter-chip.leading` becomes `icon?: LucideIcon`. `dialog.icon` becomes `icon?: LucideIcon`
    (the disc renders it, tone-inked); `dialog.children` collapses to `primary?: Action<never>`
    and `secondary?: Action<never>`, rendered as its action row through `Button` (primary takes
    the dialog's tone: a danger dialog renders a danger primary; decision 24 covers `loading`).
    `checkbox.icon` is deleted: the `✓` glyph is the anatomy, a different mark is a consumer
    primitive. `checkbox.onCheckedChange` renames to `onChange` (law 1: the change handler is
    `onChange`; web's Kobalte checkbox already says it). `tab-bar`'s icon render-prop becomes
    `icon?: LucideIcon`; the component resolves the active/inactive color itself via
    `useCSSVariable`. `footbar`, `def-row`, `bottom-sheet`, `badge`, `button`, `card`,
    `avatar-stack` keep `children` per the registry.
18. **`TIcon` is each platform's `LucideIcon`** (`lucide-solid` on web, `lucide-react-native` on
    native, both already dependencies). Web renders icon params through `Dynamic`; native renders
    them as elements with `size`/`color` props resolved internally.
19. **Role-metric overrides die where they null a role's own metric on the same node**:
    `dialog:123` drops `leading-none tracking-tight` (settles the carried 001-03 compose-order
    debt), `checkbox:61` drops `leading-none`, `field:60` drops `leading-normal`, `label:18`
    drops `leading-snug`, `logo:42` drops `leading-none` from `logoTextClasses` (its role
    variants carry their own leading). The `leading-snug` in `Field.Label`'s five state lines
    (`field:41`) dies when decision 7 recomposes them. Out of the rule's reach and kept as
    measured: `field:27` (`leading-snug` on a role-less wrapper) and the `uppercase
    tracking-widest` eyebrow overlay (`empty-state:47`, `section:55`, `label:18`,
    `danger-zone:28`, `logo:42`, plus the un-uppercased `tracking-widest` at `lib/menu.ts:16` and
    the native eyebrow at `native-ui field/index.tsx:16`), a deliberate look riding the live
    tracking namespace, recorded for the M7 look pass.
20. **spinner**: `color?: string` becomes `tone?: ContentTone` (default `ink-1`), resolved
    internally via `useCSSVariable`; `className`/`style` close, and so does the uniwind-augmented
    `colorClassName` (decision 1), without which this collapse would be decorative.
    `useButtonContentColor` is deleted: the M4 carried item resolves against decision 24, whose
    busy button composes `Spinner` with `tone={buttonContentTone(emphasis, tone)}` instead.
21. **skeleton** gains `width?: DimensionValue` and `height?: DimensionValue` (numeric dimension
    is the sanctioned vocabulary; `avatar.size` is precedent) since `className` was its only
    sizing API. **bottom-sheet** `Omit`s gorhom's `style`, `backgroundStyle`, `handleStyle`,
    `handleIndicatorStyle`, and `containerStyle`, and the render-takeover slots
    `backgroundComponent`, `handleComponent`, `backdropComponent`, `footerComponent`, and
    `containerComponent` (the modal type adds it; the same replace-the-design hole decision 14
    closes on toast); behavioral props keep flowing.
    **avatar**'s `style` closes; `size` and the theme-invariant `TINTS` stand.
22. **Native `text-area/` renames to `textarea/` and `TextArea` renames to `Textarea`** so the
    shared component has one spelling in both the import path and the export (web precedent,
    helm imports it, native has zero consumers).
23. **helm's migration is out of scope** and its measured break surface is recorded above; helm
    already needs the M3 migration this story extends.
24. **Both Buttons gain `loading?: boolean`**, the composition the M4 carried item scheduled for
    M5/M7 and the field `Action` already carries, without which decisions 16 and 17 would type
    loadable actions no component can render. `loading` disables the press and renders a
    spinning glyph beside the label in the label's content tone: native composes `Spinner` with
    `tone={buttonContentTone(emphasis, tone)}` (ui-core's data path, its first consumer); web
    renders lucide `LoaderCircle` with `animate-spin` (the `--animate-*` namespace is live). No
    matrix cell changes: the glyph is anatomy, the tones are the existing label tables.
25. **Native `divider/` renames to `separator/`** (law 1: web ships the concept as `separator`,
    Kobalte's primitive carries the name, native has zero consumers). Web `loader` and native
    `spinner` stay: they are different anatomies (a labeled mono loading line vs the bare
    ActivityIndicator glyph), recorded as deliberate divergence, and a platform gaining the
    other's anatomy ships it under the existing name. Native toast's local axis renames to
    `tone: "neutral" | "ok" | "danger"` (from `variant: default|success|danger`), the contract
    vocabulary, zero consumers.

## Blast radius

`packages/ui-core/src/variants.ts` (+`RHYTHM`), `README.md` (registry), `scripts/verify.ts`
(new checks). All 36 `plugins/solid-ui/src/ui/components/*` dirs plus `lib/` internals (new
`lib/sheet.ts`), three new component dirs, the 36 pages under `docs/` plus three new ones,
`scripts/verify.ts`, `scripts/fixture/`, `README.md`. All 26 `plugins/native-ui/src/ui/components/*`
dirs (two renamed), four new dirs, `scripts/verify.ts`, `scripts/fixture/`, `README.md`. No
slot-graph change, no `@fcalell/cli` change, no `stack.config.ts` surface change, no PRD
amendment. `pnpm-lock.yaml` only if a devDep moves.

## Acceptance criteria

Run A (all `(command)` unless noted):

- A1. `pnpm check` passes from the repo root.
- A2. `pnpm --filter @fcalell/ui-core verify` passes; the enumerator covers `rhythm`; a check
  asserts `rhythm({unit: u}) === "gap-" + u` for the four units; a check asserts the README
  carries the registry subsection naming every decision-5 entry (`children`, the render-prop
  entry, `content`, `trigger`, the four fallbacks, `logo`'s slots, `providers`, and the
  icon-param rule).
- A3. `pnpm --filter @fcalell/plugin-solid-ui verify` passes, existing checks intact.
- A4. Harness scan check: across `src/ui/components/**`, every `class` / `style` / `classList` /
  `/[a-z]Class/` prop declaration is `?: never`; outside those `?: never` declarations the tokens
  `className`, `classList`, and `contentClass`/`listClass`/`containerClass` appear nowhere; no
  `cn(` call or class attribute references a props-sourced class value. The check fails when any
  one closure is reverted (mutation-tested at review).
- A5. Type fixture check: a `scripts/fixture` TSX file passes `class`, `style`, and `classList`
  (and each dead hatch prop) to every exported component under `@ts-expect-error`, plus
  un-annotated legal usages; `tsc --noEmit` over it exits 0, so every closure is proven at the
  type layer and any reopened prop fails the build.
- A6. The Tailwind resolution check covers the swept sources: the verify script's family list
  gains `rhythm` (its auto-enumerated cells, `gap-section` through `gap-pair`, must resolve),
  and the source-driven resolution check still passes over every component.
- A7. `components/{stack,row,pair}` exist closed (children plus `Pair.row` only);
  `Section.Root` composes `rhythm({unit:"section"})`; `Section.Content` carries `px-6 pb-6`.
  `(file)` + A6 resolution.
- A8. The web collapses of decision 16 hold: `checkbox.label` is `string`; `icon` props are
  `LucideIcon`-typed; `empty-state` has `action?: Action<never>` and no element children region;
  `Button` renders `loading` per decision 24; the registry survivors are unchanged. `(file)`
  spot-reads at review, fixture-typed where typable.
- A9. No plugin component passes `class` to another plugin component: the measured hand-off list
  is gone (grep for the enumerated sites returns nothing), and `form`'s seven forwards are
  deleted.
- A10. `dialog/index.tsx` Title carries no `leading-` or `tracking-` utility beside its role;
  same for the other four decision-19 dropping sites.
- A11. `pnpm check` still passes with the fixture in place, whichever way the tsconfig reaches
  it (an included fixture type-checks clean because its `@ts-expect-error` lines all fire; an
  excluded one is compiled by the verify check itself). The fixture imports through the public
  subpaths (`@fcalell/plugin-solid-ui/components/*`) so it proves what the PRD's
  scratch-consumer check would have; if self-referencing resolution fails under the package
  tsconfig, the relative-import fallback is a recorded reduction.
- A12. No page under `plugins/solid-ui/docs/` mentions a closed prop (`class`, `style`,
  `classList`, the dead hatches) as API; `stack`/`row`/`pair` have pages; the tabs, table, and
  data-table pages describe the swept APIs. `(file)`, spot-read at review.

Run B (all `(command)` unless noted):

- B1. `pnpm check` passes from the repo root.
- B2. `pnpm --filter @fcalell/plugin-native-ui verify` passes; the overlay allowlist set-equality
  (b5) is re-trued to the swept sources (its two drift directions are native-specific), and the
  verify family list gains `rhythm` so the new cells enter the compiled-stylesheet checks. The
  new spinner's `--color-${tone}` template evades the a8 regex rather than tripping it; harmless
  because `ContentTone` is token-typed and ui-core pins every member (the M4 a8 note extends to
  this site), recorded in the harness comment.
- B3. Harness scan check (native spelling): every `className` / `style` declaration in
  `src/ui/components/**` is `?: never` (word-bounded, so the internal
  `placeholderTextColorClassName` attribute never false-positives); no `cn(` call references a
  props-sourced class; the fixture check proves each closure under `@ts-expect-error` with
  `tsc --noEmit`, including `spinner` (`className`, `style`, `colorClassName`), the
  input/textarea/text `*ClassName` augmentations of decision 1, `bottom-sheet`'s gorhom style
  and `*Component` props, and `avatar.style`.
- B4. The native collapses of decision 17 hold; no `ReactNode`-typed prop remains in
  `src/ui/components/**` except registered `children`; `Action` and `BadgeSpec` are imported from
  `@fcalell/ui-core/descriptors` at their consumers.
- B5. `components/{stack,row,pair,section}` exist closed; `section` composes
  `rhythm({unit:"section"})`; `text-area/` is renamed `textarea/` (export `Textarea`) and
  `divider/` is renamed `separator/`, with imports and README updated. `(file)` + B2.
- B6. `spinner` takes `tone?: ContentTone` and no `color`; `useButtonContentColor` is gone
  (including its README line); both Buttons render `loading` per decision 24; `skeleton` takes
  `width`/`height`; `avatar.size` still works; toast's axis is `tone` with the decision-25 keys.
- B7. Parity, scoped to plugin-declared props (host-inherited surfaces such as web `onInput` vs
  RN `onChangeText` are platform facts, excluded): across every shared component name (avatar,
  badge, button, card, checkbox, dialog, field, input, text, textarea, toast, stack, row, pair,
  section), a plugin-declared prop naming a shared fact carries the same name in both plugins.
  The checkbox handler rename (decision 17) is the one live fix; known-divergent shapes are
  recorded, not forced: `avatar.size` (web variant keys vs native pixels), `toast` (web renders
  solid-sonner's Toaster config, native is a message component), `dialog` (web compound anatomy
  vs native data-driven `title`/`message`). Reviewed as a diff table at close-out. `(file)`

Close-out (mine, at merge): re-run all three verifies and `pnpm check` from the real checkout;
run at least two guard mutations against the new scan/fixture checks; read the parity diff table
(B7); attempt the live half of the PRD Verify with the means that exist: `stack dev` in helm plus
a Chrome render in light and dark (this would also settle the carried no-browser-render debt), and
if helm cannot consume the workspace build, ratify the reduction explicitly on this card. No
native render exists to run (standing M4 reduction, still owed to the first native consumer).

## Out of scope

- The geometry gate, its vocabulary, and `buildSteps` contributions (M6).
- New shared matrices for further families, the shared ground tables, and any look reform beyond
  decision 19 (M7); the eyebrow tracking overlay stays as measured.
- A `FooterSpec` renderer (carried: the first screen-scaffold consumer owns it).
- helm's migration (its break surface is recorded in Measured facts).
- Icon-set unification beyond typing the params (`lucide` glyph-name parity stays parked).
- Deleting or restructuring components beyond what the closures force (sidebar stays, swept).

## Open questions

None blocking; adversary rounds may add.

## Flags for the board

- After this story, `Action` has consumers on both sides of the native collapses and `BadgeSpec`
  one, but no web component consumes either (web menus keep their own item types deliberately),
  and `FooterSpec` remains a pure type. Recorded, not drift.
- helm's pending migration grows by the measured 12 sites; it was already pending from M3. One
  of them is a capability loss, not a mechanical edit: `card-drawer.tsx:250-252` threads a
  fill-and-scroll chain (`min-h-0 flex-1 overflow-y-auto`) through Tabs' closed nodes, which no
  wrapper can restore. The canon's answer is a helm-owned tabs primitive under its `ui/`
  (composing `@kobalte/core` directly). **Ratified at the board seat**: the closure ships with
  no Tabs layout prop, and helm takes the consumer-primitive route.
- After decision 19, the deliberate off-role metrics that remain in the web plugin are the
  eyebrow `tracking-widest` overlay (six sites) and `field:27`'s wrapper `leading-snug`; native
  carries the eyebrow once. M7's look pass should decide whether the eyebrow becomes a role or
  dies.
- Decisions 14 and 21 close third-party styling surfaces by denylist (`Omit`); a solid-sonner or
  gorhom upgrade can reopen a channel silently. Accepted; the fixtures pin today's list.
