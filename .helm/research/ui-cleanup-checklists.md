# UI cleanup: the checklists

The confirmed checklists for steps 2 and 3 of [ui-cleanup.md](./ui-cleanup.md), from step 1's
research (2026-10-12, stack at `7510347`, Stead at `d2a6f85` with its stack pin `39695af`).
fcalell confirmed them on 2026-10-12 with these decisions: the widths are 320 (touch), 1280 and
1920 (desktop, fine pointer), each in light and dark, at a height of 800; every *measure* question
runs on web only; P6 is taken in step 4, per family before its cut; Z15 applies to units with a
text prop. Established-practice sources were read from their doc sources on GitHub where the
published page was refused by the session's egress policy; web.dev, Every Layout and Ark rest on
search summaries. The page drains with the plan.

## 0. How to read this page

### 0.1 What could and could not be read

Every ours-source was read: `ui-core.md` (2192 lines, all of it), `render-smells.md` (157), `skeleton-loading.md`, `philosophy.md`, the six ui-core guide pages, all 28 pattern pages (the 13 alphabetically from `filters-and-toolbars` to `version-picker` with reference-table rows cut at 420 characters), all 23 epic-005 stories plus `epic.md`, both `rules.md` (web read in full, native lines 1-50 and the headings), Stead's `07-interface.md` (1854 lines; ASCII diagrams skipped, tables and prose read, with the canvas, roster, states and rules sections read whole) and Stead's `evidence.md` lines 266-440 whole and 441-630 (Mobbin reference notes) by first lines plus a search for loading, shift, canvas and refetch terms. The pattern pages are Mobbin measurements and name no structural fault, with two exceptions noted in section 1 (`record-pane.md:8`, `node-canvas.md` range) and one pointer for S17 (`toast-and-banner.md`: a top strip where "app shifts down"). `evidence.md` lines 10-265 (prompts, cost, systemd, legal) name no UI fault and were scanned, not studied. Not read: `packages/ui-core/README.md` and `DESIGN.md` (neither is a listed source).

Established-practice sources: the published pages could not be fetched.

- `WebFetch` fails for every host with `getaddrinfo ENOTFOUND` (tool-side DNS).
- `curl` through the agent proxy is refused with HTTP 403 (organization egress policy, `curl: (56) CONNECT tunnel failed, response 403`) for `react.dev`, `every-layout.dev`, `web.dev`, `developer.mozilla.org`, `tanstack.com`, `www.radix-ui.com`, `www.w3.org`, `primer.style`, `polaris-react.shopify.com`, `spectrum.adobe.com`, `react-aria.adobe.com`, `react-spectrum.adobe.com`, `reactnative.dev`, `docs.expo.dev`, `ark-ui.com`. I did not route around the denial.
- The policy does allow `raw.githubusercontent.com`. For sources whose docs are open source I read the **source markdown of the doc in its repository** (same text the site is built from, current `main`). Each such row says "source repo, not the published page" and gives the exact URL read.
- `web.dev` (CLS, optimize-CLS), `every-layout.dev` (axioms, Stack, Sidebar) and `ark-ui.com` have no readable source repo. For these I only have `WebSearch` result summaries. They are marked "summary only, page not read" and carry no line numbers. Nothing was filled from memory.

### 0.2 Scope sets the checklist applies to (named in full)

**Step 2 units.** Every unit is answered per platform (web = `plugins/react-ui`, native = `plugins/native-ui`).

1. The 66 roster entries of `packages/ui-core/src/roster.ts` (counted by entry: 19 + 12 + 16 + 19; `ROSTER` starts at line 85). Atoms (19): Text, Icon, Button, IconButton, Count, StepCount, Status, Chip, Input, FileInput, TextArea, InputOtp, Select, Slider, Switch, Checkbox, Spinner, Avatar, Link. Layout (12): Place, Gate, Screen, Split, Section, Group, List, Form, Toolbar, ActionBar, Columns, Shell. Shared (16): ListRow, DefinitionRow, FormField, ItemHeader, SegmentedControl, Sheet, Picker, Menu, OptionList, EmptyState, Missing, Failed, QueryBoundary, Toast, Banner, PendingBar. Content (19): Prose, Code, Diff, ProseDiff, FileRow, Comparison, Table, Rules, Message, MessageInput, Meter, Stages, Stats, Stat, BarChart, Thread, QrCode, Image, Canvas. `Canvas` is web-only (`roster.ts:3117` `platforms: ["web"]`), so it has 66 web units and 65 native units.
2. Every helper a component uses to lay out, measure, wait for or read its children:
   - `plugins/react-ui/src/ui/lib/` (47 files): act-ink, acts-room, age, arrows, back, canvas-layout, caret, clock, closed, code, commit, confirm, copy, field-wait, field, focus, form, frame, ground, group, guards, heading, leave, loading, mark, media, modality, moment, navigate, not-found, option-wait, page, parts, picked, portal, reason, ring, scrolls, section, short, slider-wait, toast, touched, trailing-wait, tree, words, wraps.
   - `plugins/native-ui/src/ui/lib/` (44 files): act-ink, acts-room, age, caret, clock, closed, cn, code, compact, confirm, copy, field-wait, field, form, frame, glyph, ground, group, hosts, ink, leave, loading, moment, motion, navigate, not-found, option-wait, parts, picked, raised, reason, room, route, safe-area, section, short, slider-wait, strut, theme, toast, touched, trailing-wait, tree, words.
   - The two `lib/` directories are not mirrors: 31 names are shared, 16 are web-only (arrows, back, canvas-layout, commit, focus, guards, heading, mark, media, modality, page, parts.ts, portal, ring, scrolls, wraps) and 13 are native-only (cn, compact, glyph, hosts, ink, motion, parts.tsx, raised, room, route, safe-area, strut, theme).
   - Component-folder helpers (every `.ts/.tsx` under `components/<dir>/` other than `index.tsx`): web 50, native 32. Web: action-bar/wait, button/link, button/reason, canvas/{caption, connection, edges, elk, floor, geometry, ground, group, hit, label, layout, lift, look, node, view, viewport, wait, zoom}, definition-row/wait, empty-state/base, file-row/wait, icon-button/base, item-header/pair, list-row/{lock, marks, status, wait}, menu/base, message/{attachments, waiting}, meter/{count-links, wait}, missing/base, picker/base, sheet/{base, confirm, docked}, shell/{host, switcher}, stat/wait, stats/wait, status/{base, change, dot}, thread/{fill, latest}, toast/layer. Native has the same set minus all of `canvas/*`, `button/*`, `thread/fill.ts`, plus `menu/sheet`, `picker/sheet`, `toast/room`.
   - `plugins/native-ui/src/ui/app/index.tsx` and `plugins/react-ui/src/ui/showcase/` are not units (the showcase is the measuring place, not a subject).

**Step 3 units.** Every route file in Stead's route tree, `packages/server/src/app/routes/` (44 route files outside `-components/`, listed in 0.4), in every state the fixture seeds (0.4), light and dark, at 320, 1280 and 1920.

### 0.3 Terms the questions use (so no agent has to interpret)

- **Unit closure** of component `<dir>` on platform `<p>`: all `.ts/.tsx` under `plugins/<p>/src/ui/components/<dir>/`, plus every file it imports from `plugins/<p>/src/ui/lib/` or from another component folder (only the imported helper file, never the other component's `index.tsx`). Find the imports with `rg -n 'from "\.\.?/' plugins/<p>/src/ui/components/<dir>`. Every `rg` below that says `<closure>` runs over that set. A helper's closure is the helper file itself plus its own imports.
- **The cells a component draws**: the `draws:` list in its `roster.ts` entry, resolved in `packages/ui-core/src/variants.ts` and `variant-tables.ts`, plus the web overlay classes in `plugins/react-ui/scripts/overlays.ts` (native: `plugins/native-ui/scripts/verify.ts` overlay allowlist, check `b5`). Class greps include these files.
- **Rules R1-R5** (the PRD's own, `ui-cleanup.md:57-66`): R1 a container lays out with flex or grid and a child sets only flex or grid item properties. R2 nothing inspects its children (`Children`, `cloneElement`, `.type ===`), a layout context, or a `data-*` mark to change its own form. R3 a CSS container query on the container's size is allowed. R4 the one exception: the Place's `:has(~ [data-cover])`. R5 pure CSS for layout, JavaScript only where the browser offers no CSS.
- **Context classes** for A5/A6: L = changes class strings, element types, child order or which regions are drawn (layout/structure); D = carries data (words, route, theme, loading, mark); B = carries behaviour (focus, press, reason, pending, submit); P = portal or stacking.
- **Measured places**: web components are measured in Storybook (`pnpm --filter showcase storybook`, port 6006; stories are generated per roster entry and titled `<layer>/<Component>`, `.storybook/roster.ts:61`; hand-written behaviour stories are titled `Behaviour/<Name>` in `apps/showcase/behaviour/`). A story draws the states its roster entry lists (`rest, disabled, loading, error, empty, selected`), light and dark side by side, at the toolbar's density (`ui-core.md:2039-2041`). Whole-screen measures use the showcase app's routes (`stack dev`, routes `/deploys`, `/projects`, `/usage`, `/domains`, `/logs`, `/assistant`, `/members`, `/settings`, `/home`, `/sign-in`, `/connect`, `ui-core.md:2027-2031`). Density at the three widths: touch at 320, desktop at 1280 and 1920 with a fine pointer (the desktop set needs a fine pointer at `tablet` and wider, `plugins/react-ui/src/ui/lib/media.ts:4-23`); pin `data-density` as `drive.mjs` does (`/home/user/stead/packages/server/test/review/drive.mjs:24-28`), because an earlier phone-width run left `useTouch` on the touch tree at desktop widths (`evidence.md:316`).
- **Native cannot be measured by the step 2 agent**: "Native has no render harness" (`ui-core.md:2170`), and a phone render needs the Android emulator with Maestro (`design-critique.md:22-57`). Every question marked *measure* is answered on web only (fcalell, 2026-10-12); on native it is answered "n/a: no render harness". Read and grep questions run on both platforms.

### 0.4 Step 3 states and controls the fixture offers

From `/home/user/stead/packages/server/test/fixture/serve.ts:1-31` and `test/review/*.json`:

- Scenarios: `full` (every state seeded), `empty`, `first` (a first run). `--fresh` wipes state; plans that decide an item consume it ("runs once on a fresh fixture", `serve.ts:11-26`), and review state persists between runs (`evidence.md:375`), so each run needs its own fresh fixture.
- Controls: `/fixture/delay?ms=<n>&match=<rpc path part>` (`test/review/9b.json:336`), `/fixture/fail?status=500&match=<path part>` (`9b.json:342, 356`), `/fixture/socket?channel=<inbox|session|thread|board|job>&mode=<hold|fail|off>&ms=<n>` (`socket-states.json:46, 71, 108, 128, 153`), `/fixture/link` (sign in), `/fixture/handoff`, `/fixture/cutoff`, `/fixture/round`.
- Driver and its constraints: `test/review/drive.mjs` (plan steps `goto, tap, key, eval, count, axe, shot, fx, size, dark`, header lines 1-60). Chrome must run with `--blink-settings=primaryHoverType=2,primaryPointerType=4` or headless reports no hover (`drive.mjs:9-16`). Delayed `/rpc` requests hold the browser's six connections to one origin, so a following navigation can draw a blank page (`evidence.md:339, 359`): wait for the previous delayed requests to finish (7 s) or use a fresh browser context per navigation.
- Route files (the scope; layout routes marked L): `__root` (L), `$` (not found), `_now/route` (L), `_now/index`, `_now/items/$item`, `_now/items/$item/files/$`, `_now/items/$item/jobs/$job`, `_now/items/$item/jobs/$job/stages/$stage`, `_now/jobs/$job`, `_now/jobs/$job/stages/$stage`, `_now/runs/$run`, `_now/runs/$run/nodes/$row`, `_now/views/$lead/$view`, `chats/route` (L), `chats/$conversation` (index), `chats/$conversation/items/$item`, `chats/$conversation/jobs/$job`, `chats/$conversation/jobs/$job/stages/$stage`, `chats/$conversation/views/$lead/$view`, `link/$token`, `system/route` (L), `system/$section`, `system/$section/$record`, `system/knowledge/$repo`, `system/knowledge/$repo/$page`, `system/knowledge/$repo/$page/history`, `system/knowledge/$repo/graph`, `system/knowledge/$repo/jobs/$job`, `system/knowledge/$repo/jobs/$job/stages/$stage`, `system/repos/$repo/branches`, `system/repos/add`, `system/status/backup`, `system/workflows/$record/history`, `system/workflows/$record/runs/$run`, `work/route` (L), `work/index`, `work/$lead`, `work/code/$card`, `work/code/$card/jobs/$job`, `work/code/$card/jobs/$job/stages/$stage`, `work/code/$card/thread`, `work/code/epics/$epic`, `work/code/jobs/$job`, `work/code/jobs/$job/stages/$stage`. Routes `07-interface.md:94` lists but the tree does not build: `/enrol/<token>`, `/recover`, `/tv`, `/tv/views/...` (and the sign-in page lives in `__root.tsx`).


## 2. Final checklist, step 2 (per component and per helper)

**How an agent uses it.** Every question applies to every unit (a roster entry on one platform, or a helper) unless its *Applies to* line narrows it. Answer every question for every unit, or write `n/a: <reason>` (the construct does not exist in the unit, or "no native render harness", `ui-core.md:2170`). Never write a goal-shaped answer: give the answer type in the question, the evidence column in section 4, and the exact method run. Commands are `rg` (ripgrep, installed) run at the repo root; `<closure>` is defined in 0.3. A *measure* is made in Storybook (story `<layer>/<Component>`, the state named, 320/1280/1920, light and dark, density as in 0.3) using the snippets in Appendix 2A.

**Draft to final.** Draft 1 → A1-A4. 2 → A5-A8. 3 → A9, A10. 4 → A11. 5 → A12. 6 → A13, A14. 7 → Z1, Z2. 8 → Z4. 9 → Z5. 10 → Z6-Z9. 11 → Z11, Z12. 12 → Z13, Z14. 13 → L1, L2. 14 → L3. 15 → L6-L8. 16 → L9. 17 → B1-B3. 18 → B4. 19 → B5. 20 → B6. 21 → B7. 22 → B8. 23 → P1-P3. 24 → P4. 25 → P5. 26 → P6. 27 → P7, P8. New: A15, Z3, Z10, Z15, L4, L5, H1, E1, E2. How the vague or compound drafts were handled: Q17 "How many behaviours, props and variant values" had no definition of "behaviour", so it became three counts (B1 props, B2 variant values and cells, B3 distinct DOM structures) and "behaviour" is defined only as a distinct DOM structure. Q22 "What logic would go?" asked for a verdict; it became B8, an inventory in which each unit of logic carries the PRD rule it violates and its line count (a reader decides nothing, the session decides the cut). Q10 held four faults in one sentence and was split into Z6 to Z9. Q11, Q12, Q13, Q15, Q23 and Q27 were split into their parts (each part has one answer type). Q26 "does the cut lose a role, a label or a focus order" cannot be answered before the cut, so it became a baseline (P6) the cut is later checked against. Q18, Q24 and Q25 now name their search tool, because `[^>]*` regexes break on `=>` inside JSX props (see B4).

### A. Tree and flow

**A1. Does the unit inspect its children by type or identity?**
- Answer: count and `path:lines` of each hit, each hit tagged *React child* or *other* (markdown token, event, MutationRecord).
- Method: `rg -n -e 'Children\.' -e 'cloneElement' -e 'isValidElement' -e '\.type\s*[!=]==' -e 'props\.children' <closure>` on web and native. (Sanity: 77 lines in web `components`+`lib`, 87 in native, false positives included, e.g. markdown `token.type` in `prose/index.tsx`.)
- Source: draft 1; React `Children` Pitfall (`Children.md:7`); `ui-cleanup.md:296-308`. Marker: sharpened.

**A2. Does a walk of children see through Fragments, and what does it do at a wrapper component?**
- Answer: per walk: *sees through Fragment* yes/no (path:lines of the `Fragment` comparison), *recurses into a wrapper component's output* (always no: React cannot, `Children.md:372`), and the caller structure that defeats it (one sentence, from A13).
- Method: `rg -n -e 'Fragment' -e '<>' <closure>` next to each A1 hit; read the walk.
- Source: draft 1 ("Fragments seen through"); `Children.md:61`; the walkers `lib/section.ts:62-65`, `form/index.tsx:41`, `lib/field-wait.tsx:180`, `item-header/pair.tsx:27`. Marker: split from draft 1.

**A3. Does the unit read the DOM tree from JavaScript?**
- Answer: count and `path:lines`, each with what it reads and what it does with it.
- Method: `rg -n -e 'querySelector' -e 'closest\(' -e 'firstElementChild' -e 'lastElementChild' -e 'parentElement' -e 'parentNode' -e 'nextElementSibling' -e 'previousElementSibling' -e 'getElementsBy' -e 'MutationObserver' -e '\.children\b' <closure>`. (Sanity: 47 web, 0 native, e.g. `lib/page.ts:20` `closest("[data-page]")`.)
- Source: new; found while tracing `usePageTablet`. Marker: new.

**A4. Does the unit change another child's identity?** (re-keying, index keys, cloning to set a key)
- Answer: yes/no per hit, `path:lines`, and one example of a sibling change that moves a key or an element position.
- Method: `rg -n -e 'cloneElement\(' -e 'Children\.toArray' -e 'key=\{(index|i|idx)\}' -e 'key=\{[^}]*(Math\.random|Date\.now)' <closure>`; read each.
- Source: `item-header/pair.tsx:29` (`cloneElement(child, { key })`); `render-smells.md` native `group` finding (index keys); `Children.md:191` (toArray rewrites keys). Marker: new.

**A5. Which contexts does the unit read, and what does each change?**
- Answer: one row per context: name, class (L/D/B/P, 0.3), what it changes (class string | element type | which region draws | value only), `path:lines`. Count of class-L contexts.
- Method: `rg -n -e 'useContext\(' -e '\buse\([A-Z]' <closure>`; context names to classify (exported: web 43, native 45, from `rg -no 'export const \w+ = createContext' plugins/<p>/src/ui`; module-private ones come from `rg -n createContext`): ActFailed, ActInert, ActInk, ActRoom, ActsRoom, BackRoute, Beside, CellField, DetailsSheet, DistanceContext, FieldDisabled, FieldRefusal, FootPlace, FootRegion, FormContext, FormStands, GroundContext, GroupContext, GroupName, HeadingContext, InAct, InlineField, InsetRing, LabelTarget, ListedRoute, LoadingContext, OverThread, PageTitle, PlaceRoute, PortalContainer, PortalHosted, ReasonHostContext, ReasonKept, SectionContext, ShellHome, ShellSwitcher, SubmitContext, ThreadBleeds, ThreadRoom, ToastEntry, TouchedContext, TrailingWait, TreeContext (web); native has its own list (it adds DetailsOpen, FieldClaim, FieldError, FieldFocus, FieldNameContext, FootReturn, FootSlotContext, Ink, RecordShown, ShellTabs, ToastFrame and lacks the web-only ones such as DistanceContext, HeadingContext, InsetRing, ListedRoute, OverThread, PortalContainer, PortalHosted, DetailsSheet, SubmitContext).
- Source: draft 2; `cloneElement.md:396` lists context as an alternative, so the class matters; PRD R2. Marker: split from draft 2.

**A6. Which contexts does the unit provide, and does a descendant change its form because of them?**
- Answer: per context: name, class, which descendant components read it (`path:lines`), and whether that descendant's *structure* (not only a value) changes.
- Method: `rg -n -e '\.Provider' -e '<[A-Z]\w+ value=\{' <closure>`; then `rg -n '<ContextName>' plugins/<p>/src/ui` for the readers.
- Source: draft 2; `ui-core.md:1487-1500` (`GroupContext`). Marker: split from draft 2.

**A7. Does the unit emit or read a `data-*` mark, a `:has()` selector or a `has-[...]`/`group-has-*` variant?**
- Answer: per hit: producer or consumer, whose form changes (own, ancestor, descendant), `path:lines`, and whether it is the PRD's one exception (R4, `:has(~ [data-cover])`).
- Method: `rg -n -e 'data-[a-z-]+' -e 'group-has-' -e 'has-\[' -e ':has\(' -e '\[data-' <closure> plugins/react-ui/scripts/overlays.ts packages/ui-core/src/variants.ts`. Web sanity: marks in use include `data-fill`, `data-page`, `data-screen`, `data-record`, `data-pane`, `data-beside`, `data-split`, `data-foot`, `data-act-floats`, `data-clear`; 20 `has`/`group-has` lines in `components`+`lib` and 22 more in `scripts/overlays.ts`. Native: 0 by construction, so record how native replaces each (A9, P3).
- Source: draft 2; `ui-core.md:463-503`; `render-smells.md` theme A; PRD R2/R4. Marker: split from draft 2.

**A8. Does the unit choose its structure from pointer, width, mode or measured wrapping in JavaScript?**
- Answer: per hit: the hook or variant, what it chooses (a value | which elements are drawn), `path:lines`.
- Method: `rg -n -e 'useTouch' -e 'usePageTablet' -e 'useWraps' -e 'touch:' -e 'distance' -e 'useReducedMotion' -e 'matchMedia' <closure>`. (Sanity: 116 web lines, 36 native.)
- Source: `ui-core.md:129-137, 544` ("a runtime check (`useTouch`) only where the tree differs"; `useWraps` is "a measured fact"); `ui-cleanup.md:306-308` (room density). Neither R2 nor the draft names this switch. Marker: new.

**A9. Does a child write something its parent or frame reads after paint?** (registration, lend, cover, floats, fills, docks)
- Answer: per effect: `useEffect` or `useLayoutEffect`, what it writes, the target outside the unit (context setter | prop callback | store | DOM outside the unit's root), `path:lines`. Count of post-paint writes (`useEffect`) and pre-paint writes (`useLayoutEffect`).
- Method: `rg -n -e 'useEffect\(' -e 'useLayoutEffect\(' <closure>`; read each; also `rg -n -U 'use(Layout)?Effect\(\s*\(\)\s*=>\s*\{[^}]*\bset[A-Z]\w*\(' <closure>` (multi-line; sanity 11 web, 4 native).
- Source: draft 3; `render-smells.md:9, 15-23` (theme A); epic 005 stories 01-05 (pushes removed, some remain: `useGroupPart`, `GroupContext`). Marker: sharpened, split from draft 3.

**A10. Does a child portal into, or measure against, a frame it does not own?**
- Answer: per hit: portal target (body | frame `main` via `PortalContainer` | other), `path:lines`; and the first ancestor between the popup and the viewport with `overflow` other than visible, `transform`, `contain` or `filter` (read the Shell and Gate).
- Method: `rg -n -e 'createPortal' -e 'Portal' -e 'container=' -e 'PortalContainer' <closure>` (web 31 lines, native 0); then for the measure, in the showcase `Shell` story open the popup and walk `parentElement` with `getComputedStyle`.
- Source: draft 3 ("a portal back into the parent"); `ui-core.md:818-847` (popups mount inside `main`); PRD fault 4 ("inside a shell that is `overflow-hidden`"). Marker: split from draft 3.

**A11. Does the unit put spacing outside itself?**
- Answer: three counts, each with `path:lines` and the owner of the resulting space: (a) margin utilities on the unit's root or on a cell it draws, (b) selectors that style children the unit does not own, (c) negative margins that cancel a parent's inset.
- Method: (a) `rg -n -P '(^|[\s"\x60:])-?m[xytblrse]?-[\w\[(]' <closure> packages/ui-core/src/variants.ts plugins/react-ui/scripts/overlays.ts` (negative ones are (c)); (b) `rg -n -e '\[&>' -e '\[&_' -e '\*:' -e '\[&:' <closure> plugins/react-ui/scripts/overlays.ts`; (c) the `-m...` hits, e.g. `-mx-page`, `-mb-card`, `-mx-inside`. Then read the roster props named in B6.
- Source: draft 4; PRD fault 2; Every Layout Stack (summary only: the parent owns margin between children); `ui-core.md:265-270`. Marker: sharpened, split three ways.

**A12. Does the unit render a wrapper with no layout or meaning, or return a Fragment?**
- Answer: count and `path:lines` of (a) bare elements with no class and no role, (b) a Fragment or array returned as root, (c) a wrapper whose only job is spacing or pairing (e.g. `PAIR` in `item-header/pair.tsx`).
- Method: `rg -n -P '<(div|span|View)>' <closure>`; `rg -n -e 'return <>' -e '^\s*<>$' <closure>`; read for (c).
- Source: draft 5; React Aria `render`: "Only render a single root DOM element (no fragments)" (`customization.mdx:42`). Marker: sharpened.

**A13. What does the guide tell a caller about where the unit may stand?**
- Answer: list of sentences, `path:lines`, with the unit named: *direct child*, *never wrapped*, *never inside an app component*, *a fragment seen through*, *adds no count*.
- Method: `rg -n -i -e 'direct child' -e 'never (wrapped|inside)' -e 'fragment' -e 'wrapper component' -e "app's own component" -e 'inside a component of the app' plugins/react-ui/guide/rules.md plugins/native-ui/guide/rules.md packages/ui-core/guide .helm/knowledge/architecture/ui-core.md`, then filter by the unit's name. Known hits to confirm: `rules.md:13-14, 37, 358-359, 454-455, 519-520`; native `rules.md:8-37`.
- Source: draft 6 + 5; rules pages (omitted by the PRD). Marker: new.

**A14. What breaks when the unit stands outside its expected parent or around another child?**
- Answer: for each constraint found in A13, in the type (`?: never`, unions) or in a context default (`createContext(` default value, read): *none | visual change (px) | throws | silent semantic change*, with the story or code that shows it.
- Method: read `createContext<` / `createContext(` defaults in the closure; render the unit in its `<layer>/<Component>` story alone and, for frames, inside a deliberately wrapped child (a `div` around a `Thread`, a `Section` child wrapped in an app component).
- Source: draft 6. Marker: sharpened.

**A15. For each frame (Shell, Place, Screen, Split, Gate, Sheet, ItemHeader, Section, Group, Form, Toolbar, ActionBar): which of title, h1, back act, actions, more, foot, hairline, inset does it draw always, and which only when something else is true?**
- Answer: a table row per region: *always | prop X | context Y | mark Z | child type T | width W*, `path:lines`. Applies to those 12 units only.
- Method: read `index.tsx` and the cells in `variants.ts`; `rg -n -e 'headPaired' -e 'splitOf' -e 'useSplitHead' -e 'LIST_BACK_REPLACED' plugins/*/src/ui/components`.
- Source: PRD fault 1 ("the list's title has no bar while the details have one", `ui-cleanup.md:24-28`). Marker: new.

### Z. Size and position

**Z1. Which non-token values does the unit spell?**
- Answer: counts and `path:lines`: (a) arbitrary values `[...]`, (b) numeric-scale utilities (`gap-2`, `p-4`, `w-12`); for each, whether it is in the overlay allowlist, and the token it could be.
- Method: (a) `rg -n -P '\[[^\]\[]*(px|rem|em|vh|vw|%|calc|var\()' <closure> packages/ui-core/src/variants.ts plugins/react-ui/scripts/overlays.ts`; (b) `rg -n -P '(^|[\s"\x60:])-?(w|h|min-w|min-h|max-w|max-h|size|basis|gap|gap-x|gap-y|p[xytblrse]?|m[xytblrse]?|inset|top|bottom|left|right)-\d+(\.\d+)?(["\x60\s]|$)' <closure> packages/ui-core/src/variants.ts plugins/react-ui/scripts/overlays.ts`. (Sanity: 4 numeric lines in `variants.ts`, 34 numeric and 40 bracket lines in the web overlay list.) The overlay allowlist (`verify` check `b5`) proves each spelled class is listed, not that it is a token.
- Source: draft 7; `rules.md:66-67`; `ui-core.md:574-576`. Marker: split from draft 7.

**Z2. How is each dimension of the unit decided?**
- Answer: per width, height, min, max, size or basis: class → kind (*content | flex grow or shrink | token | literal | fraction*), the token name and its px at the density (read `packages/ui-core/src/tokens.ts:1100-1130` and `DESIGN.md`), and whether it sets the unit's own box or a child's.
- Method: `rg -n -P '(^|[\s"\x60:])-?(w|h|min-w|min-h|max-w|max-h|size|basis)-' <closure> packages/ui-core/src/variants.ts` for the cells in the roster `draws:`; read.
- Source: draft 7 ("is each a token or a literal"); `ui-core.md:631-639`. Marker: split from draft 7.

**Z3. Does a cap leave the container's width unused?**
- Answer: per cap (`max-w-measure`, `max-w-measure-inset`, `max-w-auth`, `w-list`, `max-w-pane`, `min-w-region-min`, `SPLIT_BESIDE` `grow basis-0`, any `max-w-*`) and per viewport 320/1280/1920 (desktop density at 1280 and 1920): container content width (px), cap (px), unused (container minus content, px), and where the unused width falls (*between siblings | at the end*).
- Method: arithmetic from tokens (`tokens.ts:1105-1112, 1125-1129`: sidebar 240, list 360, pane 320, `wide` 1200 read against the page container, which beside the Shell is the viewport less 240) and `getBoundingClientRect().width` of the capped element and its parent in the showcase `layout/Split` and `layout/Place` stories and the showcase routes.
- Source: PRD fault 3 (`ui-cleanup.md:32-35`) and The frame "Content width" (`:251-259`). Draft Q7 passes this fault (the cap is a token); this is the question that flags it. Marker: new.

**Z4. Does the unit read the viewport where its container should decide?**
- Answer: per hit: viewport-based or container-based, what it decides (a value | which elements draw), `path:lines`.
- Method: `rg -n -e 'matchMedia' -e 'innerWidth' -e 'innerHeight' -e 'useWindowDimensions' -e '\b(vh|vw|dvh|svh|lvh)\b' -e '100v' -e 'h-screen' -e 'w-screen' -e '@media' -e '\b(tablet|desktop|wide):' <closure> packages/ui-core/src/variants.ts plugins/react-ui/scripts/overlays.ts`; container-based ones are `page-*:` variants and `@container` (`ui-core.md:533-536`).
- Source: draft 8; PRD R3; MDN: container queries are an alternative to media queries (`container_queries/index.md:17`); `evidence.md:288, 351`. Marker: sharpened.

**Z5. Does the unit measure in JavaScript?**
- Answer: per hit: what is measured, what is written (*state | DOM style | CSS variable | nothing*), whether the first paint is already correct without it (yes/no, by read), whether CSS could do it (flex, grid, container query: yes/no), `path:lines`.
- Method: `rg -n -e 'ResizeObserver' -e 'getBoundingClientRect' -e 'getComputedStyle' -e 'useLayoutEffect' -e 'measureText' -e 'offsetHeight' -e 'offsetWidth' -e 'clientHeight' -e 'clientWidth' -e 'scrollWidth' -e 'scrollHeight' -e 'document\.fonts' -e 'onLayout' -e 'useWindowDimensions' -e '\.measure\(' <closure>`. (Sanity: web 89 lines in `components`+`lib`; native 29.)
- Source: draft 9; `ui-cleanup.md:65-66` (R5) and `:201-202` ("no measuring outside a closed list" becomes a test in step 5). Marker: sharpened.

**Z6. Does the unit position absolutely, fixed or sticky, or stack above others?**
- Answer: count and `path:lines`; per hit the purpose and the containing block (nearest positioned ancestor).
- Method: `rg -n -e '\babsolute\b' -e '\bfixed\b' -e '\bsticky\b' -e 'z-\(' -e 'anchor\(' <closure> packages/ui-core/src/variants.ts plugins/react-ui/scripts/overlays.ts`.
- Source: draft 10. Marker: split from draft 10.

**Z7. Does the unit clip or scroll, and is anything clipped that should not be?**
- Answer: per element with computed `overflow-x` or `overflow-y` other than `visible`: class that causes it, `scrollWidth - clientWidth`, `scrollHeight - clientHeight` at 320/1280/1920 loaded, and *on purpose* (it carries `truncate`, `line-clamp`, `text-ellipsis` or `wrap-anywhere`) yes/no. Any nonzero difference on an element that is not on purpose is a finding.
- Method: `rg -n -e 'overflow-(hidden|clip|auto|scroll|x-|y-)' -e 'truncate' -e 'line-clamp' <closure>` for the list, then snippet `clipReport` (Appendix 2A) in the unit's story.
- Source: draft 10 ("does its clipping hide content that overflows by a layout error"); `design-critique.md:98-99`. Marker: split from draft 10.

**Z8. Does a clipped flex item shrink below its content?**
- Answer: per flex item with `overflow` other than `visible` and `flex-shrink` other than 0: height (or width) in px, its `scrollHeight`, and *collapsed* yes/no (height 0, or less than `scrollHeight`).
- Method: snippet `collapsed` (Appendix 2A) in the unit's story inside a column that is shorter than its content (the `Behaviour/Measure` story shows a Place in `h-dvh`); `rg -n -e 'shrink-0' -e 'min-h-0' -e 'min-w-0' <closure>` beside each clipped item.
- Source: `evidence.md:280` (a Group "measures 0 px high once the screen's content overflows"); `/home/user/stead/packages/server/test/review/findings-2026-10-11.md` c1 (tab bar 17 px, "flex-shrink:1, overflow hidden"); `ui-core.md:1494-1496` (`shrink-0`); RN `flexShrink` default 0 (`flexbox.md:14`). Marker: new.

**Z9. Can focus scroll a container that clips?**
- Answer: per tab stop: the `scrollLeft`/`scrollTop` of every ancestor with `overflow` other than `visible`, before and after `el.focus()`, and `window.scrollX/Y`. Any change on an ancestor whose overflow is `hidden` or `clip` is a finding.
- Method: snippet `focusScroll` (Appendix 2A) over every stop in the story; for popup units open the popup first, then focus its first stop, in the `layout/Shell` story (the `overflow-hidden` shell).
- Source: draft 10 ("can focus scroll that container?"); PRD fault 4 (`ui-cleanup.md:35-39`). Marker: sharpened from draft 10.

**Z10. Are the gaps between consecutive siblings equal and tokens?**
- Answer: per container with two or more in-flow children: the list of gaps in px between consecutive children (column: `top - previous bottom`; row: `left - previous right`) at 320/1280/1920; the set of distinct values; for each value the spacing token it equals (`tokens.ts` spacing roles at that density) or *not a token*; and a yes/no *all equal*.
- Method: snippet `gaps` (Appendix 2A) on the unit's root and on every region it draws, in the loaded story.
- Source: PRD fault 2 ("6px apart instead of 32", `ui-cleanup.md:26-31`); The frame ("children always a `sections` gap apart, nothing paired", `:248-249`); Every Layout Stack (summary only). Marker: new.

**Z11. Does the unit paint a first frame and then move?**
- Answer: per unit and state: the maximum absolute change (px) of any element's x, y, width or height between the first animation frame after mount and 500 ms later, the element, and the `layout-shift` entries (value, sources) raised in the interval. Zero is a valid answer.
- Method: snippet `settle` (Appendix 2A) in the story (loading, rest, error, empty); also with `document.fonts` delayed (block the mono font URL for 3 s) for units that draw mono text.
- Source: draft 11; `render-smells.md:9`; `005-15` (path re-cuts after the mono face loads). Marker: split from draft 11.

**Z12. Does an overlay land in its place on its first frame, and does an ancestor scroll?**
- Answer: per popup unit (Menu, Select, Picker, Sheet, Toast, Tooltip, Canvas zoom stack, the Details sheet): popup rect on the first frame after open, rect when settled, the maximum displacement in px, and the scroll deltas of every ancestor (as Z9) and of the document.
- Method: snippet `popupFrames` (Appendix 2A): open by click, then by keyboard, in the unit's story and in the `layout/Shell` story; report in headless Chromium and, if a display exists, in headed Chrome (the PRD calls its cause "not confirmed in headless Chrome").
- Source: draft 11; PRD fault 4 and Leads (`ui-cleanup.md:35-39, 306`). Marker: split from draft 11.

**Z13. Is a surface inside another surface rounded by the outer radius less the inset?**
- Answer: per nested pair: outer radius, inset (px, smallest gap between the two border boxes), inner radius, and difference (inner minus max(0, outer minus inset)).
- Method: snippet `nested` (Appendix 2A) in each story; list the pairs found.
- Source: draft 12 (added in `7510347`); `ui-cleanup.md:209-211` ("radii (nested ones included)"). Marker: sharpened.

**Z14. Are the digits of a number that changes in place tabular?**
- Answer: per such element (Count, PendingBar clock, Stat, Stats, Meter, Slider value, BarChart ticks, ListRow age, Table cells, Diff gutters, Code line numbers, InputOtp): computed `font-variant-numeric` contains `tabular-nums`, yes/no.
- Method: `rg -n -e 'tabular-nums' -e 'FIGURES' packages/ui-core/src/variants.ts <closure>`, then snippet `digits` (Appendix 2A). Native: read only (uniwind maps it to `fontVariant`, `ui-core.md:272-275`).
- Source: draft 12. Marker: sharpened.

**Z15. How does the unit behave with empty, short and very long content?** *Applies to units with a text prop only.*
- Answer: for each text prop: with `""`, one character, 24 characters, a 300-character string with no space, and 300 characters of sentences: root width change (px), horizontal overflow of the document (`scrollWidth - innerWidth`), overlap between any two sibling boxes (area px²), clipped text (yes/no).
- Method: snippet `stress` (Appendix 2A) in the story with the prop overridden through Storybook args; the four text sizes of `rules.md:550-568` say what each prop should do.
- Source: `design-critique.md:98-103` ("empty, dense and very long content handled"); `evidence.md:274, 299` (chip overflow, path cut). Marker: new.

### L. Loading and states

**L1. What makes the unit wait?**
- Answer: yes/no each: accepts a `loading` prop (type: boolean | number | none), reads `LoadingContext`, reads a query state (`isPending`), provides `LoadingContext` to children.
- Method: `rg -n -e 'loading' -e 'LoadingContext' -e 'useWait' -e 'isPending' -e 'SKELETON' -e 'waiting' <closure>`; roster `props`.
- Source: draft 13. Marker: split from draft 13.

**L2. Where does the waiting form's size come from?**
- Answer: one of *the loaded markup (shared) | a twin file (`wait.tsx` or an inline branch) | declared slots read before data (`rowShape`, `fileShape`, `factShape`) | a fixed constant (a count, `WAITING_MESSAGES`, four rows) | a measure*, with `path:lines` and the constant's value.
- Method: read the unit's `wait.tsx` / `index.tsx` and `packages/ui-core/src/list-state.ts`.
- Source: draft 13; `skeleton-loading.md` families 1-5. Marker: split from draft 13.

**L3. Does the waiting form equal the loaded form, row by row?**
- Answer: numbers per root and per row or leaf in DOM order: width, height, x of the text start, count of rows or cells, waiting versus loaded, at 320/1280/1920, light and dark. The rubric's rule is the test: "any per-row difference is a finding" except that a loaded row whose text wraps grows by its wrapped lines (`rubric.md:35`).
- Method: first list the behaviour stories that already assert it: `rg -n '<ComponentName>|<dir>' apps/showcase/behaviour/waiting.stories.tsx apps/showcase/behaviour/waiting-late.stories.tsx apps/showcase/behaviour/option-list.stories.tsx apps/showcase/behaviour/row-meta.stories.tsx` (e.g. `option-list.stories.tsx:119-121` at 375/768/1440; `waiting.stories.tsx:56`). For anything not covered, measure `loading` against `rest` in the unit's story with snippet `rects` (Appendix 2A).
- Source: draft 14; `rubric.md:35`; `ui-core.md:552-573`; `skeleton-loading.md:161-165`. Marker: sharpened.

**L4. Which timing governs the waiting form?**
- Answer: per wait path: *through `useWait` (`WAIT_DELAY` 200 ms, `WAIT_MIN` 500 ms) | drawn as given by `loading` | router `pendingMs`*, `path:lines`.
- Method: `rg -n -e 'useWait' -e 'WAIT_DELAY' -e 'WAIT_MIN' -e 'isPending' <closure>` (7 `useWait` lines in each plugin); `packages/ui-core/src/wait.ts:9-11`; `rules.md:531-536`.
- Source: `rules.md:531-536`; TanStack Router `pendingMs` 1000 / `pendingMinMs` 500 (`data-loading.md:533, 542`). Marker: new.

**L5. Does the unit wait on the first load only, or also on a key change or a refetch?**
- Answer: per query-reading unit: which of `isPending | isFetching | isRefetching | isLoading | isPlaceholderData` it reads, and whether `placeholderData` or `keepPreviousData` is set by the unit or by any caller in stack or Stead.
- Method: `rg -n -e 'isPending' -e 'isFetching' -e 'isRefetching' -e 'isLoading' -e 'isPlaceholderData' -e 'placeholderData' -e 'keepPreviousData' <closure> plugins/api/src /home/user/stead/packages/server/src`; read `packages/ui-core/src/list-state.ts:27, 46`. (Sanity: the waiting decision reads `isPending` only.)
- Source: TanStack Query paginated and placeholder pages (`paginated-queries.md:21`); PRD step 3 Q4. Marker: new.

**L6. Does a `key` change on a data change?**
- Answer: per `key=` in the closure: what it derives from (*item id | index | prop | state | time or random | loading flag*), and whether it changes on refetch or on the loading toggle.
- Method: `rg -n 'key=\{' <closure>` (web 116 lines); read each.
- Source: draft 15; React "reset state with a key" (`you-might-not-need-an-effect.md:164`). Marker: split from draft 15.

**L7. Does a conditional swap replace a node that should have stayed?**
- Answer: per swap: the two branches, and the measured node identity: tag every element under the root, toggle `loading` to `rest` and back, count tagged nodes that survive out of the total (root and each child).
- Method: `rg -n -U -e '\?\s*<[A-Z]\w*[^:]*:\s*<[A-Z]\w*' -e 'if \(loading\)' -e 'loading \?' <closure>`; then snippet `identity` (Appendix 2A).
- Source: draft 15; `render-smells.md` native Place/Thread (parent element type swap remounts siblings). Marker: split from draft 15.

**L8. Do typed text, focus, scroll and an open popup survive the loading toggle?**
- Answer: yes/no each, for units that hold them (Section, Group, Form, FormField, Sheet, Table, List, Thread, Picker, Canvas).
- Method: story with an `Input`: type, focus, scroll, open a Picker, toggle `loading` on and off with the story control, read value, `document.activeElement`, `scrollTop`, `aria-expanded`.
- Source: `005-05` (body kept mounted so typed text survives); `ui-core.md:1479-1481`. Marker: new.

**L9. Do the empty, failed and missing forms stand at the loaded size?**
- Answer: width and height of the empty, error and missing forms against the loaded and the waiting forms, in px, at 320/1280/1920; and the unit's stated rule (e.g. BarChart "stand at the chart's height", `ui-core.md:1428-1432`; OptionList "stands in its card", `:1397-1402`).
- Method: snippet `rects` on the `empty`, `error` and `rest` states of the unit's story (List, Table, Thread, Comparison, BarChart, OptionList, Section, QueryBoundary, EmptyState, Missing, Failed, Canvas, Image, Stats, Code, Diff).
- Source: draft 16. Marker: sharpened.

### B. Behaviour and API

**B1. How many props does the unit have, and which are node-typed?**
- Answer: counts: all props, boolean, optional, callbacks, node-typed (`ReactNode`, `children`, `render`), plus the list of node-typed names and the alternative form already used (descriptor/data prop | compound component | render prop | array of objects).
- Method: read the `props: [...]` of the unit's entry in `packages/ui-core/src/roster.ts` and the exported `Props` type in `plugins/<p>/src/ui/components/<dir>/index.tsx` (verify `b-roster` guarantees the names match, `plugins/react-ui/scripts/verify.ts:558`).
- Source: draft 17; React `Children` alternatives (`Children.md:547, 681, 796`); Polaris "Many props is a signal ..." (`components.mdx:104`). Marker: split from draft 17 (props).

**B2. How many variant values and cells does the unit have?**
- Answer: counts: values per closed prop (`fit`, `act`, `kind`, `state`, `form`, ...), `draws:` entries, matrix cells drawn (sum over families of the product of axis sizes), `states:` entries.
- Method: read the roster entry; resolve each family in `packages/ui-core/src/variant-tables.ts` and `variants.ts` (`FAMILIES`, `matrixCells`).
- Source: draft 17. Marker: split from draft 17 (variant values).

**B3. How many distinct DOM structures does the unit draw?**
- Answer: count of distinct signatures over every story state × `fit`/`kind` value × touch and desktop density, using the signature `tag[role](children)` that ignores text and classes.
- Method: snippet `signature` (Appendix 2A) over all states of the unit's story. This is the only definition of "behaviour" the checklist uses.
- Source: draft 17 ("how many behaviours"); `ui-cleanup.md:50-54`. Marker: split from draft 17 and defined.

**B4. How many call sites in Stead use each prop and variant value?**
- Answer: per prop and per enum value: count of JSX call sites in Stead at HEAD `d2a6f85` with its pin `39695af`, 0 included; spread props (`{...props}` into the unit) are reported as *unknown (spread)* with `path:lines`.
- Method: parse with the TypeScript compiler API (`createSourceFile`, walk `JsxOpeningElement` and `JsxSelfClosingElement` with `tagName` equal to the unit and read `attributes`) over `/home/user/stead/packages/server/src/**/*.tsx`. Do not use `<X[^>]*prop=` regexes: an arrow function in a prop (`=>`) contains `>` and ends the match. A quick tag count is `rg -n --glob '*.tsx' '<Split\b' /home/user/stead/packages` (sanity at HEAD: Place 7, Screen 17, Split 6, QueryBoundary 35, Form 25, FormField 69, Toolbar 1; Place props title 7, bleed 6, actions 5, more 4, up 2, foot 1).
- Source: draft 18; Primer "used in more than one or two places" (`CONTRIBUTING.md:38`). Marker: sharpened.

**B5. Which combinations of props does the type allow that no caller uses, or that the guide forbids?**
- Answer: list of pairs (prop A, prop B): call sites setting both (stack showcase stories, behaviour stories, Stead), whether the type forbids it (`?: never`, union), and whether the guide says "never both".
- Method: pairs are taken among the props B6 marks as structure-changing; counts by the B4 parser; guide prose by `rg -n -i -e 'never both' -e 'not both' -e 'exclusive' -e 'only with' -e 'takes no' -e 'stand together' plugins/react-ui/guide/rules.md packages/ui-core/guide`.
- Source: draft 19; `ui-core.md:664` (`act` and `foot` exclusive). Marker: sharpened.

**B6. Which props are layout that a parent's flex or grid would do?**
- Answer: per prop: category from the closed set *content | look (closed enum) | behaviour or callback | data state | layout of the unit's own inside | layout between the unit and its siblings or container (margin, bleed, inset, fill, align, width, order, grow)*, with `path:lines` of what it changes. Name `bleed`, `inset`, `fill`, `in`, `fit`, `up`, `back`, `open`, `foot`, `act` explicitly wherever they exist.
- Method: read roster `props` and the cells each prop selects.
- Source: draft 20; `ui-cleanup.md:50-54, 286-288`. Marker: sharpened.

**B7. Does the unit import routing, a query or app state?**
- Answer: per hit: what it imports, what it uses it for, and whether a prop (`href`, `onAct`, `query`) could carry it instead.
- Method: `rg -n -e 'useRoute' -e 'usePathname' -e 'useRouter' -e 'useQuery' -e 'useMutation' -e 'navigate\(' -e 'expo-router' -e '@tanstack' -e 'useAuth' -e 'localStorage' -e 'sessionStorage' -e 'window\.location' -e 'document\.cookie' <closure>` (sanity: 17 web, 29 native).
- Source: draft 21. Marker: sharpened.

**B8. What logic does the unit carry, and which PRD rule does each piece violate?**
- Answer: one row per logic unit: kind (*context | hook | effect | observer | data mark | helper import | children walk | measure | timer | store*), name, `path:lines`, lines of code, violated rule (*R1 | R2 | R3 | R4 | R5 | none*) with one sentence, and its callers. Then the sum of lines of rule-violating units per unit.
- Method: derive from A1-A12, Z4-Z6, E1, E2 and read; lines of code by `wc -l` over the declaration.
- Source: draft 22 ("What logic would go?"); PRD Rules (`ui-cleanup.md:57-66`). Marker: rewritten (the verdict is the session's).

### P. Parity and cost

**P1. Are the unit's props and defaults the same on native?**
- Answer: per prop: type and default on each platform; each difference.
- Method: read both `index.tsx` Props. Names are already enforced by verify `b-roster` (`plugins/react-ui/scripts/verify.ts:558`, `plugins/native-ui/scripts/verify.ts:1244`); types and defaults are not.
- Source: draft 23. Marker: split from draft 23.

**P2. Does native behave the same?**
- Answer: list of constructs present on one platform and not the other: contexts, effects, measures, branches, helper files, with `path:lines`; and the count difference per A/Z/E pattern.
- Method: run every pattern of A1-A12, Z4-Z6, E1, E2 on both platforms and diff the lists; read both `index.tsx` for `Platform.OS`, `useTouch` and tree differences.
- Source: draft 23; `ui-core.md:577-584` ("A cell that needs a platform conditional belongs in the overlay"). Marker: split from draft 23.

**P3. Which web-only mechanisms have no native counterpart?**
- Answer: per mechanism: web `path:lines`, native counterpart `path:lines` or *none*.
- Method: `rg -n -e ':has\(' -e 'has-\[' -e 'group-has' -e '@container' -e 'page-(max-)?(tablet|desktop|wide)' -e 'container-type' -e 'grid-template' -e '\bgrid\b' -e 'subgrid' -e 'col-start' -e 'row-start' -e 'anchor\(' -e 'anchor-name' -e 'view-transition' -e 'divide-' -e 'peer-' plugins/react-ui/src/ui plugins/react-ui/scripts/overlays.ts packages/ui-core/src/variants.ts` and the same units on `plugins/native-ui/src/ui`. React Native supports `display` `flex`, `none`, `contents` only (`layout-props.md:573`), has no container queries, and `flexShrink` defaults to 0 (`flexbox.md:14`).
- Source: PRD Frame (grid, `:has`, container queries, view transitions) against Goal "web and native together"; RN docs. Marker: new.

**P4. Which stories, tests, guide lines and knowledge lines mention each logic unit of B8?**
- Answer: per logic unit: list of `path:lines` in each of: `apps/showcase/behaviour/`, generated roster stories, `plugins/*/test/`, `packages/ui-core/test/`, `plugins/*/scripts/verify.ts`, both `rules.md`, `packages/ui-core/guide/`, `DESIGN.md`, `.helm/knowledge/`.
- Method: `rg -n '<identifier>' apps/showcase/behaviour plugins/react-ui/test plugins/native-ui/test packages/ui-core/test plugins/react-ui/scripts plugins/native-ui/scripts plugins/react-ui/guide plugins/native-ui/guide packages/ui-core/guide packages/ui-core/DESIGN.md .helm/knowledge`.
- Source: draft 24. Marker: sharpened.

**P5. Which Stead call sites change, and how many?**
- Answer: per logic unit and per prop of B6/B8: Stead call-site count and `path:lines`; plus Stead `ui/` wrappers that put a stack component between a frame and what it reads (a collection in an app component under a Section, a head or bar behind a wrapper).
- Method: B4 parser; for wrappers `rg -n -U '<(Section|Form|Split|Place|Screen|Toolbar|Group)\b[^>]*>\s*<([A-Z]\w*)' /home/user/stead/packages/server/src/app` and keep the child names that are not roster names.
- Source: draft 25; `ui-cleanup.md:295-308`. Marker: sharpened.

**P6. What are the role/name tree and the Tab order of every story state? (the baseline the cut is checked against)** *Taken in step 4, per family, just before its cut, not in step 2 (fcalell, 2026-10-12).*
- Answer: per unit, state and width: the accessibility snapshot text (role, accessible name, state) and the ordered list of focus stops (tag, role, name).
- Method: Playwright `locator.ariaSnapshot()` on the story root and a Tab loop recording `document.activeElement` until it returns to the first stop; store as text in the report.
- Source: draft 26 ("does the cut lose a role, a label or a focus order?") cannot be answered before the cut; `philosophy.md:16-21`; APG keyboard interface. Marker: rewritten.

**P7. Is focus visible on every stop and unobscured by a sticky or fixed layer?**
- Answer: per stop: ring drawn yes/no (`outline-style` not `none`, or a `box-shadow` spread), and the fraction of the stop's box (5 × 5 sample points) whose `elementFromPoint` is the stop or inside it, at 320/1280/1920. Report below 100 % (WCAG 2.4.12 AAA) and 0 % (fails 2.4.11 AA, which allows partial obscuring).
- Method: snippet `obscured` (Appendix 2A), with and without a pinned `ActionBar`/`foot` and the Shell tab bar.
- Source: draft 27; WCAG 2.4.11 understanding (`focus-not-obscured-minimum.html`, "sticky footers, sticky headers, non-modal dialogs"); `evidence.md:290` (tab bar focusable under the pinned bar). Marker: split from draft 27.

**P8. Where does focus go when an overlay closes?**
- Answer: per overlay unit and per close path (Escape, scrim, act, pick, route change): `document.activeElement` (tag, name) versus the trigger; if the trigger is gone, the element that received it.
- Method: story with the trigger; open by pointer and by keyboard; close each way; read `activeElement`. First check the existing behaviour story: `rg -n 'focus' apps/showcase/behaviour/<name>.stories.tsx` (Sheet, Menu, Select, Picker, OptionList, Table, Gate are covered, `ui-core.md:2051-2056`).
- Source: draft 27; APG modal dialog (`dialog-modal-pattern.html`, "focus returns to the element that invoked the dialog"); `rubric.md:56`. Marker: split from draft 27.

### H. Helpers (every file in 0.2 point 2)

**H1. For each helper: what does it export, who uses it, and which of lay out, measure, wait, read children does it do?**
- Answer: exports (names); importers (`path:lines`); four yes/no; the native counterpart (`path` or *none*); lines of code; and the rule R1-R5 each of the four breaks (as B8). A1-A14, Z4-Z6, L4-L7, E1, E2 also run on every helper.
- Method: `rg -n 'lib/<name>' plugins/<p>/src/ui` for importers; read.
- Source: owner constraint on step 2 scope; draft list `ui-cleanup.md:112-116` ("and the rest the review finds"). Marker: new.

### E. Effects and timing

**E1. Which effects set state on mount or mirror a prop?**
- Answer: per effect: kind per React's names (*transform data | reset on prop change (use `key`) | adjust state on prop change | notify parent | pass data to parent | external store | fetch | other*), `path:lines`, and whether the first paint is wrong without the second commit.
- Method: `rg -n -U 'use(Layout)?Effect\(\s*\(\)\s*=>\s*\{[^}]*\bset[A-Z]\w*\(' <closure>` plus read each `useEffect(`/`useLayoutEffect(`.
- Source: React "You Might Not Need an Effect" (`:164, 205, 514, 598`); `render-smells.md` theme A. Marker: new.

**E2. Which timers stand in for ordering?**
- Answer: per hit: purpose (*ordering | animation | clock | debounce*), `path:lines`, and what event or promise would order it.
- Method: `rg -n -e 'requestAnimationFrame' -e 'setTimeout' -e 'setInterval' -e 'queueMicrotask' <closure>` (sanity: web 16, native 6).
- Source: `render-smells.md` theme C; `005-10`, `005-12`, `005-13` (cleared and proved with a held test clock). Marker: new.

### Appendix 2A. Snippets (run in the page; `root` is the unit's root element)

```js
const els = (root) => [root, ...root.querySelectorAll('*')];
const rect = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
const path = (e) => { const p = []; for (let n = e; n && n.nodeType === 1 && p.length < 6; n = n.parentElement) p.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + [...n.classList].slice(0, 2).map((c) => '.' + c).join('')); return p.join(' < '); };
const scrollers = (el) => { const a = []; for (let n = el.parentElement; n; n = n.parentElement) { const s = getComputedStyle(n); if ([s.overflowX, s.overflowY].some((v) => v !== 'visible')) a.push(n); } return a; };

// rects (L3, L9): one object per element in DOM order, compare two states by index
const rects = (root) => els(root).map((e) => ({ p: path(e), ...rect(e) }));

// clipReport (Z7)
const clipReport = (root) => els(root).filter((e) => { const s = getComputedStyle(e); return [s.overflowX, s.overflowY].some((v) => v !== 'visible'); })
  .map((e) => ({ p: path(e), overflow: getComputedStyle(e).overflow, dx: e.scrollWidth - e.clientWidth, dy: e.scrollHeight - e.clientHeight }));

// collapsed (Z8)
const collapsed = (root) => els(root).filter((e) => { const p = e.parentElement; if (!p) return false; const s = getComputedStyle(e); return getComputedStyle(p).display.includes('flex') && s.overflow !== 'visible' && s.flexShrink !== '0'; })
  .map((e) => ({ p: path(e), h: e.getBoundingClientRect().height, scrollH: e.scrollHeight, collapsed: e.getBoundingClientRect().height < e.scrollHeight }));

// focusScroll (Z9)
const stops = (root) => [...root.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled);
const focusScroll = (root) => stops(root).map((el) => { const bs = scrollers(el); const before = bs.map((n) => [n.scrollLeft, n.scrollTop]); const w0 = [scrollX, scrollY]; el.focus();
  return { p: path(el), moved: bs.map((n, i) => [n.scrollLeft - before[i][0], n.scrollTop - before[i][1], getComputedStyle(n).overflow]).filter((m) => m[0] || m[1]), window: [scrollX - w0[0], scrollY - w0[1]] }; });

// gaps (Z10): per container, consecutive in-flow children
const gaps = (box) => { const ks = [...box.children].filter((k) => { const s = getComputedStyle(k); return s.display !== 'none' && s.position !== 'absolute' && s.position !== 'fixed'; });
  const row = getComputedStyle(box).flexDirection.startsWith('row') && getComputedStyle(box).display.includes('flex');
  return ks.slice(1).map((k, i) => { const a = ks[i].getBoundingClientRect(), b = k.getBoundingClientRect(); return Math.round((row ? b.left - a.right : b.top - a.bottom) * 100) / 100; }); };

// settle (Z11): first rAF after mount, +3 frames, +500 ms, fonts ready; report the largest move per element
const settle = (root, done) => { const shots = []; const take = () => shots.push(rects(root)); requestAnimationFrame(() => { take(); requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => { take(); setTimeout(() => { take(); document.fonts.ready.then(() => { take(); const first = shots[0], last = shots.at(-1);
  done(first.map((r, i) => last[i] && { p: r.p, dx: last[i].x - r.x, dy: last[i].y - r.y, dw: last[i].w - r.w, dh: last[i].h - r.h }).filter((m) => m && (m.dx || m.dy || m.dw || m.dh))); }); }, 500); }))); }); };
// layout-shift entries: new PerformanceObserver((l) => l.getEntries().forEach((e) => log({ value: e.value, input: e.hadRecentInput, t: e.startTime, sources: e.sources.map((s) => ({ node: s.node && path(s.node), prev: s.previousRect, curr: s.currentRect })) }))).observe({ type: 'layout-shift', buffered: true }) // install before mounting

// popupFrames (Z12): sample the popup every frame for 600 ms after the open click
const popupFrames = (getPopup) => new Promise((res) => { const out = []; const t0 = performance.now(); const tick = () => { const p = getPopup(); out.push({ t: performance.now() - t0, rect: p && rect(p) }); performance.now() - t0 < 600 ? requestAnimationFrame(tick) : res(out); }; requestAnimationFrame(tick); });

// nested (Z13)
const nested = (root) => els(root).map((e) => { const r = parseFloat(getComputedStyle(e).borderTopLeftRadius); if (!r) return null; for (let n = e.parentElement; n; n = n.parentElement) { const s = getComputedStyle(n); const ro = parseFloat(s.borderTopLeftRadius); if (ro && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderTopWidth))) { const a = n.getBoundingClientRect(), b = e.getBoundingClientRect(); const inset = Math.min(b.left - a.left, b.top - a.top, a.right - b.right, a.bottom - b.bottom); return { p: path(e), outer: ro, inset, inner: r, diff: r - Math.max(0, ro - inset) }; } } return null; }).filter(Boolean);

// digits (Z14)
const digits = (root) => els(root).filter((e) => e.children.length === 0 && /\d/.test(e.textContent)).map((e) => ({ p: path(e), text: e.textContent.trim().slice(0, 20), tabular: getComputedStyle(e).fontVariantNumeric.includes('tabular-nums') }));

// stress (Z15): set the prop through Storybook args, then
const stress = (root) => ({ rootW: root.getBoundingClientRect().width, docOverflow: document.documentElement.scrollWidth - innerWidth, clipped: clipReport(root).filter((c) => c.dx > 0 || c.dy > 0).length,
  overlaps: (() => { const ks = [...root.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent.trim()); let n = 0; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = ks[i].getBoundingClientRect(), b = ks[j].getBoundingClientRect(); if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom && !ks[i].contains(ks[j]) && !ks[j].contains(ks[i])) n++; } return n; })() });

// signature (B3)
const signature = (e) => e.tagName.toLowerCase() + (e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : '') + '(' + [...e.children].map(signature).join(',') + ')';

// identity (L7): tag, toggle loading with the story control, then count survivors
const tag = (root) => els(root).forEach((e, i) => { e.__t = i; });
const survivors = (root) => ({ total: els(root).length, kept: els(root).filter((e) => e.__t !== undefined).length });

// obscured (P7): fraction of a focused stop that is not covered
const obscured = (el) => { el.focus(); const b = el.getBoundingClientRect(); let seen = 0; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const h = document.elementFromPoint(b.left + b.width * (i + 0.5) / 5, b.top + b.height * (j + 0.5) / 5); if (h && (h === el || el.contains(h))) seen++; } return { visible: seen / 25, ring: getComputedStyle(el).outlineStyle !== 'none' || getComputedStyle(el).boxShadow !== 'none' }; };
```


## 3. Final checklist, step 3 (per screen and region)

**Unit.** A *screen* is one route of 0.4 in one state, at one width, in one mode. A *region* is one of: an element with `aria-busy`, a `Section`, a `QueryBoundary` body, a list/main/pane column of a `Split`, the `Canvas`, a docked foot, an open overlay. Every question is answered for every screen, or `n/a: <reason>`.

**Matrix.** Widths 320, 1280, 1920, each light and dark (`prefers-color-scheme`), viewport height 800 (`HEIGHT` in `plugins/screens/src/ui/overflow.ts:6`, the height `stack screens test` uses). Density follows the width (touch at 320, desktop at 1280 and 1920 with a fine pointer) and is pinned as the driver pins it (`drive.mjs:24-28`); record the observed `data-density`, `matchMedia('(pointer: fine)')` and `matchMedia('(hover: hover)')` in every row. States per route, from 0.4:

- *loaded*: scenario `full`; also `empty` and `first` wherever the route differs.
- *loading*: `/fixture/delay?ms=D&match=<rpc path part>` for D = 0, 150, 250 and 1200 ms (150 is under `WAIT_DELAY` 200, 250 is over it, 1200 is over the router's default `pendingMs` 1000, `data-loading.md:533`). `match` is each `/rpc/` path the route reads (record the route's requests once to list them).
- *failed*: `/fixture/fail?status=500&match=<path part>`, and Retry after the control is cleared.
- *socket-bound*: `/fixture/socket?channel=<inbox|session|thread|board|job>&mode=<hold|fail|off>&ms=15000`.
- *not found*: an unknown id on each parameterised route (`/chats/missing` and so on); an address no route serves.
- *banner*: socket `off`, server stopped, usage paused.

**Method rules** (each from a harness trap already logged): one fresh browser context per navigation, or wait for earlier delayed requests to finish, because six held connections to one origin blank the next load (`evidence.md:339, 359`); one fresh fixture (`--fresh`) per plan that decides an item (`serve.ts:11-26`); Chrome started with `--blink-settings=primaryHoverType=2,primaryPointerType=4` (`drive.mjs:9-16`); transitions disabled and reduced motion set as the critique's Prepare step does (`design-critique.md:67-69`), except S14 which runs both ways; record `navigator.userAgent`.

**Settled** (the PRD's "until the screen settles" is undefined): the first moment after which, for 1000 ms in a row, no `layout-shift` entry fires, no DOM mutation occurs under the app root, and no `/rpc` request or socket frame is in flight; cap 20 s (the driver's own wait, `drive.mjs:34-36`). Report the time to settled.

**Draft to final.** 1 → S1, S2. 2 → S3, S4. 3 → S6. 4 → S7. 5 → S8. 6 → S9. 7 → S10. 8 → S11. 9 → S12. 10 → S13. 11 → S14. New: S5, S15-S20.

**S1. Which `layout-shift` entries fire from navigation start until settled, and what moved?**
- Answer: per entry: `startTime`, `value`, `hadRecentInput`, and per `sources[]` item the node's selector path, `previousRect`, `currentRect`. Then three numbers: the sum of entry values, the CLS (largest burst: entries less than 1 s apart, window at most 5 s) counting only entries with `hadRecentInput` false, and the same counting all entries.
- Method: install a `PerformanceObserver({type: 'layout-shift', buffered: true})` before navigation (snippet in Appendix 2A, or CDP `Page.addScriptToEvaluateOnNewDocument`), cold-load every screen. Entries flagged `hadRecentInput` are excluded from the web.dev score but are real moves (a click that opens a picker): report them in their own column.
- Source: draft 1; web.dev CLS (summary only): score excludes shifts within 500 ms of discrete input and counts only elements that change start position. Marker: sharpened.

**S2. Do landmarks move between the first frame, the skeleton and the loaded content?** (what the API cannot see)
- Answer: per landmark (page title, each Section heading, first and last row of each list, ActionBar or PendingBar, toolbar, foot or composer, sidebar or tab bar, banner): rect at first paint, at the last frame with a skeleton, at the first frame with loaded content, and settled; `dx, dy, dw, dh` between consecutive rects; count of landmarks with any change.
- Method: an in-page sampler on `requestAnimationFrame` plus a `MutationObserver` (Appendix 3A), landmarks selected by heading text and role; skeleton nodes are elements whose class list holds `bg-skeleton` or `text-skeleton`, busy regions are `[aria-busy]` (`packages/ui-core/src/variant-tables.ts:1025, 1300`).
- Source: `skeleton-loading.md:161-165` ("Skeleton nodes swapped for row nodes score 0"), `evidence.md:321`; PRD `ui-cleanup.md:41-42`. Marker: new, split from draft 1.

**S3. How does each region's skeleton box compare with its loaded box?**
- Answer: per region (paired by Section title and DOM order): width, height, number of rows or items, per-row height, x of each row's text start, the kind of leading mark (avatar | glyph | dot | none), waiting versus loaded; list every row that differs. Rule applied by the reader: "any per-row difference is a finding" except a loaded row whose text wraps (`rubric.md:35`).
- Method: capture `rects` of the region in the *loading* state (D = 1200) and in the *loaded* state (Appendix 2A `rects`).
- Source: draft 2; `rubric.md:35`; `evidence.md:281, 300, 321, 326`. Marker: sharpened.

**S4. Does the skeleton, failed and empty form hold the same regions as the loaded form?**
- Answer: per screen: the list of region names (Section titles, toolbar, header facts, acts) and the counts of Section, Group, List, Form, ActionBar elements in each of loaded, loading, failed, empty; each name or count that differs.
- Method: DOM query on the four captures of S3 (`h1,h2,h3`, `[role=group]`, `button` names, class counts).
- Source: `evidence.md:281` (one skeleton group where the screen draws two groups and a section), `:300, 321, 326`; `findings-2026-10-11.md` c1 (three skeleton rows, no label bar, column 273 against 360). Marker: new.

**S5. Is the shell, the title and any content on screen in every frame after first paint?**
- Answer: per cold load: time to first frame with the sidebar or tab bar, with the page title, with any visible text; the number of frames after first paint where the body is 0 px high, or the shell is absent, or no text is visible.
- Method: per-frame sampler (Appendix 3A `frames`) from `navigationStart` for D = 1200 and, as a separate labelled run, three loads in a row with 6 s delays (the saturated-connection case, a harness artifact per `evidence.md:359`, reported but marked).
- Source: `07-interface.md:170, 207` ("the shell never waits on a place"; the title "stands at once"); `evidence.md:281, 339, 359`. Marker: new.

**S6. How long does each waiting form show, and what shows before it?**
- Answer: per region and per D: ms from request start to first skeleton paint (undrawn before `WAIT_DELAY` 200), ms the skeleton stays once drawn (`WAIT_MIN` 500), ms from data arrival to content paint, and any blank gap between skeleton and content in frames; and whether the first thing drawn is the route's `pendingComponent` (router, default 1000 ms) or a component's waiting form (200 ms).
- Method: the per-frame sampler of S5 with the request log of S11. A skeleton shorter than 500 ms or a gap of at least one frame is a finding.
- Source: draft 3 ("a flash under about 200ms"), made precise because stack already fixes 200/500 (`packages/ui-core/src/wait.ts:9-11`, `rules.md:531-536`); TanStack Router `pendingMs`/`pendingMinMs` (`data-loading.md:533, 542`). Marker: sharpened.

**S7. When a key changes or a refetch runs, is the stale data kept?**
- Answer: per region and trigger: skeleton nodes present during the refetch (count before / during / after), previous content kept (yes/no), blank frames. Triggers: (a) opening another record from a list row, (b) invalidation after a mutation (decide, undo, Save, Add), (c) window focus or visibility change after 30 s (`staleTime: 30_000`, `plugins/api/src/tanstack-query.tsx:61`), (d) Retry after a failure, (e) a hub stream frame.
- Method: trigger, then the S2 sampler; cross-check with L5 (no `placeholderData` anywhere: a key change with no cache is `isPending`, which draws the waiting form).
- Source: draft 4; TanStack Query paginated/placeholder docs (`paginated-queries.md:21`). Marker: sharpened.

**S8. Which elements are replaced on a refetch, and does the canvas keep its nodes, viewport and selection?**
- Answer: per region: tagged elements that survive out of total after the trigger (Appendix 2A `tag`/`survivors`). For the `Canvas` (workflow canvas on `system/$section/$record` for a workflow; knowledge graph on `system/knowledge/$repo/graph`): per node id the `transform` or `left/top` before and after, the group frame rects, the viewport layer's `transform` (scale, x, y), the selected node id, the number of node elements replaced, and the number of ELK worker starts (`performance.getEntriesByType('resource')` or a counting `Worker` wrapper). Triggers: refetch of the workflow, a refused Save, opening and closing a node sheet, resize between 1920 and 1280, theme switch.
- Method: tag and count; compare transforms; the canvas stories already assert worker counts (`apps/showcase/behaviour/canvas.stories.tsx:1904`) and waiting height (`:1319`): note where they hold.
- Source: draft 5; `ui-cleanup.md:41-42` ("the workflow canvas redraws whole"); `ui-core.md:1874`; `node-canvas.md` range ("A run or scenario keeps every node in place"). Marker: sharpened.

**S9. When a list row is selected, which regions load and which are replaced?**
- Answer: per layout (list / main / pane at 1920, list + main with the Details sheet at 1280, one region at 320): regions drawing a waiting form, regions whose tagged elements are replaced, list scroll offset and selection kept (yes/no), main scroll reset to top (yes/no).
- Method: select a row on Now, Chats, Work, System; S2 sampler and `tag`/`survivors` per region.
- Source: draft 6; `ui-core.md:503` ("Each region keeps its own keyed scroll"). Marker: sharpened.

**S10. Are scroll position and focus kept across load, refetch, navigation and Back?**
- Answer: per scroller: `scrollTop`/`scrollLeft` before and after; `document.activeElement` (tag, name) before and after; the open row after Back ("back returns to the review at the row that was open", `07-interface.md:406`).
- Method: scroll and focus a control, run load → refetch → forward navigation → Back, read after each.
- Source: draft 7. Marker: sharpened.

**S11. Which requests does each screen make, and are there duplicates, waterfalls or loops?**
- Answer: request list (method, URL, start, end, status, initiator); duplicates (same URL and body within 1000 ms); waterfalls (a request that starts after another ends although its inputs do not depend on it, proved by the `enabled:` or key dependency, `path:lines` in the route or `ui/` file); requests per second in a 4 s idle window after settle (expected 0 for a read-only screen); websocket `sub`/`unsub` counts.
- Method: CDP Network domain for HTTP and websocket frames, or the driver's `{count: "/rpc/x", ms}` step (`drive.mjs:48`).
- Source: draft 8; `evidence.md:287` (8-15 refetches a second; `landings/get` 0 in 4 s after the fix, `:291`), `:279` (one subscription's unsub for the whole channel). Marker: sharpened.

**S12. How do failed, empty and missing forms compare with the loaded form, and does Retry shift the page?**
- Answer: width and height of each form against the loaded form's; whether the shell, the title and the header are kept; for Retry after the fail control is cleared: the `layout-shift` entries and landmark deltas (S1, S2); for a missing record the header band height (a blank 49 px band was logged).
- Method: states *failed*, *empty*, *not found* of the matrix, then Retry.
- Source: draft 9; `07-interface.md:160, 172`; `evidence.md:300`; `findings-2026-10-11.md` c2 (blank band over "This no longer exists."). Marker: sharpened.

**S13. Do late fonts or icons shift the layout?**
- Answer: per screen: landmark deltas and `layout-shift` entries between the first paint and `document.fonts.ready` when the font files are delayed 3 s (CDP `Network.setBlockedURLs` for `.woff2`, then unblock); the screens that draw mono text (Code, Diff, FileRow paths, Stat) listed; whether any `img` (logo) lacks reserved dimensions.
- Method: as stated, Appendix 2A `settle` over the screen.
- Source: draft 10; web.dev (summary only: size-adjust fallback faces), `ui-core.md:196-201` (metric fallback face); `005-15` (mono face held 3 s). Marker: sharpened.

**S14. Where does an overlay land on its first frame, and does any ancestor scroll?**
- Answer: per overlay (every Menu, Select, Picker, Sheet, Tooltip, Toast on the screen; the grants picker first): popup rect each frame from the open click to +600 ms, first-frame rect, settled rect, maximum displacement, `scrollLeft/scrollTop` deltas of every ancestor with overflow other than visible, `window.scrollX/Y` and `visualViewport.offsetLeft/offsetTop` deltas, the rect of the focused element at open, and landmark deltas (S2).
- Method: Appendix 2A `popupFrames` and `focusScroll`; transitions on and off; in real Chrome (stable, headed where a display exists, otherwise `--headless=new`; report which). The grants picker: System → Workflows → a workflow → select an agent node → its sheet (pane from `wide`) → the Grants control; reported at 1920 and 1280, and once at 1440, where the fault was logged (offsets `(1408, 708)` then `(1168, 620)`).
- Source: draft 11; PRD fault 4 (`ui-cleanup.md:35-39`). Marker: sharpened.

**S15. When a live frame arrives, does content move under the pointer or the focus?**
- Answer: with the pointer parked on a row and focus on a control: rects of the hovered row and of every landmark before and after a stream frame (a row arrives, a message appends, a job stage advances, a status changes), the moved distance, `hadRecentInput`, and for a Thread whether a reader at the end follows and a scrolled-up reader keeps place.
- Method: trigger the frame by the app's own act or the fixture; S2 sampler.
- Source: `07-interface.md:164, 267, 713` ("Nothing reorders under the pointer"; "An arriving urgent row takes the top of Needs you"; "the view is live"). Marker: new.

**S16. When an act swaps the bar for a pending bar and then a result, does anything below move?**
- Answer: heights of the ActionBar, each PendingBar phase (Landing, Queued, Checking, Pushing, Cancel, Stopping), the Decision section; landmark deltas below at each swap; focus after Cancel and Undo.
- Method: the review and item screens, Stop the job, Save, Run test, Refresh; S2 sampler.
- Source: `07-interface.md:152, 399`; `rules.md:233` ("the pending form stands over the bar at the bar's own loaded height"); `evidence.md:357`. Marker: new.

**S17. Does a banner appearing or clearing move the page?**
- Answer: landmark deltas of the title and first section when each Shell banner appears and clears (No connection, Stead is not answering, urgent item, paused for usage, new version); time from socket loss to banner (the spec says 2 s); whether the banner is in flow or over content.
- Method: `/fixture/socket?mode=off`, server stop, usage pause; S2 sampler.
- Source: `07-interface.md:98-108`; `evidence.md:290`; `patterns/toast-and-banner.md` (ManyChat: a full-width top strip where the "app shifts down"). Marker: new.

**S18. How many title bars, headings and acts does each screen draw, and what happens to the acts when a record opens?**
- Answer: per screen and region: count and rect of title bars, `h1` text, back act (target), actions and more (labels), foot; for a list-main layout the same before and after a record opens, and which acts vanished.
- Method: DOM query for `h1`, header regions, buttons by accessible name; compare before/after.
- Source: PRD fault 1 (`ui-cleanup.md:24-28`); `ui-core.md:529-547`. Marker: new.

**S19. Are the gaps between a screen's sections equal and tokens?**
- Answer: per page body and per column: list of gaps in px between consecutive sections (Appendix 2A `gaps`), distinct values, the token each equals (`sections` 32 on the desktop set, `pair`, `fields`) or *not a token*.
- Method: `gaps` on the page body, each Split column and each Sheet body.
- Source: PRD fault 2 (`ui-cleanup.md:26-31`); `evidence.md:320, 337, 350` (gaps of about 10 px against about 40 px, fixed to 32). Marker: new.

**S20. How much of each region's width does its content use?**
- Answer: per region at 320/1280/1920: container content width, widest content box, unused px, ratio, and whether the unused width lies between columns or at the screen's right edge.
- Method: `getBoundingClientRect()` of the region and of its widest descendant; arithmetic as Z3. At 1920 each half beside the list is (1920 − 240 − 360) / 2 = 660 px against the 536 px cap, 124 px unused; the cap first binds above a 1672 px viewport, so 1280 shows none.
- Source: PRD fault 3 (`ui-cleanup.md:32-35`). Marker: new.

### Appendix 3A. Snippets

```js
// frames (S5, S6): one record per animation frame from navigation start
const frames = []; const t0 = performance.now();
const tick = () => { const b = document.body.getBoundingClientRect(); frames.push({ t: performance.now() - t0, bodyH: b.height, shell: !!document.querySelector('nav,[role=tablist],aside'), title: !!document.querySelector('h1'), text: document.body.innerText.trim().length, skeleton: document.querySelectorAll('.bg-skeleton,.text-skeleton').length, busy: document.querySelectorAll('[aria-busy=true]').length }); requestAnimationFrame(tick); };
requestAnimationFrame(tick);

// landmarks (S2): rect by name, sampled every frame
const landmark = (name, sel) => ({ name, el: () => document.querySelector(sel) });
const sample = (marks) => marks.map((m) => { const e = m.el(); const b = e && e.getBoundingClientRect(); return b ? { name: m.name, x: b.x, y: b.y, w: b.width, h: b.height } : { name: m.name, gone: true }; });
```

## 4. Report columns

An answer is one of: `yes` / `no`; an integer; a number with its unit (`px`, `ms`, `%`, lines); `list: N items` (items in sheet 2 or the long table); `n/a: <reason>`; `cannot: <reason>`. Every answer carries evidence: `path:lines`, or `story-id@width/mode/density`, or a trace/screenshot file name. A cell never holds a verdict, a recommendation or a goal.

### 4.1 Step 2 (three sheets)

Sheet 1, one row per unit (component × platform, helper × platform), as the PRD asks ("a column per question", `ui-cleanup.md:158-160`):

| Column | Content |
| --- | --- |
| `unit` | roster name or helper path |
| `kind` | component or helper |
| `layer` | atom, layout, shared or content (helpers: `lib` or `component-folder`) |
| `platform` | web or native |
| `path` | `plugins/<p>/src/ui/components/<dir>` or the helper file |
| `closure` | the files of the unit closure (0.3), one per line |
| `story` | the Storybook title (`<layer>/<Component>`) and the behaviour stories that name the unit, or `none` |
| `A1` ... `A15`, `Z1` ... `Z15`, `L1` ... `L9`, `B1` ... `B8`, `P1` ... `P8`, `H1`, `E1`, `E2` | one column per question: `<answer> · <evidence>` |
| `family` | the shared cause the session assigns afterwards (left empty by the agent) |

Sheet 2, one row per item behind a `list:` answer (long form):

| Column | Content |
| --- | --- |
| `unit`, `platform`, `qid` | which cell it belongs to |
| `item` | the hit (symbol, class, context, prop, effect) |
| `answer` | the item's own answer (class L/D/B/P, kind, count, px) |
| `evidence` | `path:lines` or `story@width/mode/density` |
| `method` | the pattern text run, `read`, or the snippet name |
| `rule` | `R1` ... `R5` or `none` (B8, H1, A-group items) |
| `loc` | lines of code of the item (B8, H1) |
| `native counterpart` | `path:lines` or `none` (P2, P3) |
| `page` | for a measured row: the page container's width in px (as 4.2) |

Sheet 3, one row per family (PRD `ui-cleanup.md:158-160`, "grouped into families sharing a cause, each family with its proposed cut"):

| Column | Content |
| --- | --- |
| `family` | short name |
| `cause` | one sentence naming the shared mechanism |
| `units` | the units, web and native |
| `rule` | `R1` ... `R5` |
| `found by` | question ids and counts |
| `proposed cut` | one sentence (written by the session, not by the step 2 agents) |
| `Stead call sites` | P5 total and files |
| `touched` | P4 stories, tests, guide lines, knowledge lines |
| `lines` | sum of B8 `loc` |

### 4.2 Step 3 (one table per route, as the PRD asks, `ui-cleanup.md:184-186`)

| Column | Content |
| --- | --- |
| `route` | the route file pattern (0.4) and the concrete address used |
| `scenario` | `full`, `empty` or `first` |
| `state` | loaded; loading D = 0 / 150 / 250 / 1200; failed; not found; socket channel and mode; banner kind |
| `width`, `mode`, `density`, `page` | 320 / 1280 / 1920, light / dark, observed `data-density`, and the measured width in px of the nearest `[data-page]` element (the page container that `tablet` and `wide` are read against) |
| `chrome` | `navigator.userAgent`, headed or headless |
| `region` | name and selector path |
| `qid` | S1 ... S20 |
| `value` | the numbers the question names (with unit) |
| `evidence` | trace file, screenshot name, driver step or console output |
| `cause` | the stack component (roster name, `path:lines`) or the Stead file (`path:lines`) behind it |
| `evidence.md line` | the dated line to add to `design/evidence.md`, in its house style ("The step N app at ..., stack at `<pin>`, ... Source: ..., <date>.") |

Per route a summary table: S1 sum and CLS, S6 times, S3 rows that differ, S11 duplicates and loops, S14 maximum displacement; then the summary the PRD asks for in the cleanup page.

## 5. Coverage check

Test applied: would an agent answering the listed questions literally, with no goal to interpret, write down the fault? "Draft" = the first-draft questions; "Final" = this report's. Result: **yes** (the answer itself shows it), **partly** (the answer gives the inventory or numbers and a reader finds the fault), **no** (the answer cannot show it).

### 5.1 The ask (`ui-cleanup.md:8-17`)

| Complaint (quote) | Final ids | Draft ids | Flagged by a literal answer? |
| --- | --- | --- | --- |
| "way overengineered and should be fixed in stack" | B1, B2, B3, B8 | 17, 22 | Partly: counts and line totals per unit; the verdict is the session's. Draft: no (17 undefined, 22 asks for a verdict). |
| "cleanup all this extra logic that i deem useless" | B8, H1, A1-A14, E1, E2, P4, P5 | 22 | Yes: every unit of logic is listed with its rule and its lines. Draft: no. |
| "reduce the amount of possible different behaviours of a component" | B1-B6 | 17-20 | Yes: B3 gives distinct DOM structures, B4 usage, B5 unused combinations, B6 sibling-layout props. Draft: partly (Q17 never defines "behaviour"). |
| "the flow and rhythm should be linear, from parent that position children" | A11, A12, A15, Z10, Z6, S19 | 4, 5 | Yes: margins outside the unit, selectors on children, gap equality. Draft: partly (Q4 finds margins; nothing measures the gap). |
| "without Fragments breaking it" | A2, A12, A13, A14 | 1, 5 | Yes: whether the walk sees through, and which caller structure breaks it, with guide lines. Draft: yes for Q1/Q5, but not the caller side. |
| "without 'components place other components with fixed measures'" | Z1, Z2, Z3, Z10 | 7 | Yes: Z2 records whether a dimension sets the unit's own box or a child's; Z3 compares a token cap with the container. Draft: partly (Q7 lets a token pass). |
| "prepare multiple passes across the different components, to address all the issues we're currently finding" | report sheet 3 (families), B8 `rule` column | none | Yes by construction: families group by shared cause. Draft: no column for it. |
| Loading "is supposed to be an app wide research, cause it breaks on a lot of different places" | L1-L9, S1-S20 | 13-16, step 3 Q1-Q11 | Yes: every route, state and width; Draft: partly (Q1 measured only with the API that misses node swaps). |
| "The scope is stack's whole roster and every Stead screen, not the System screen that surfaced it" | 0.2 and 0.4 (named in full), H1 | scope lists | Yes. Draft: partly (step 3 said 375; helpers named by example). |

### 5.2 The four faults and the unmeasured ones (`ui-cleanup.md:19-46`)

| Fault (quote) | Final ids | Draft ids | Flagged by a literal answer? |
| --- | --- | --- | --- |
| "The list's title has no bar while the details have one ... The section's acts (New agent) sit in the Place's strip and vanish when a record opens." | A15, A9, A5, S18 | 2, 3 | Yes: A15 lists what each frame draws always or conditionally; S18 counts title bars and acts before and after a record opens. Draft: no (nothing asks what a frame draws unconditionally; Screen always draws a bar, so Q2 reports nothing). |
| "Groups 6px apart instead of 32" (`headPaired` wraps a factless `ItemHeader` and the sibling after it) | A1, A4, A12, Z10, S19 | 1, 4, 5 | Yes: A1 and A4 find `Children.forEach`, `child.type !==`, `cloneElement(child, { key })` in `item-header/pair.tsx:23-47`; Z10 and S19 measure 6 against 32. Draft: partly (Q1 finds the reading; the PAIR wrapper has a meaning, so Q5 passes it; no gap is measured). |
| "Wasted width ... both cap their content at `max-w-measure-inset` (536px) ... at 2000px each half is 700px with 164px empty" | Z3, S20 | 7 (passes), 8, 10 | Yes: at 1920 each half beside the list is (1920 - 240 sidebar - 360 list) / 2 = 660 px against the 536 cap, 124 px unused, which Z3 and S20 report. Draft: no. Q7 passes (the cap is a token), Q8 passes (no viewport read), Q10 passes (no clipping). |
| "The page jumps when the grants picker opens ... Likely cause ... focus scrolls the hidden-overflow shell, and it snaps back" | Z9, Z12, A10, S14 | 10, 11 | Yes: Z9 and S14 record ancestor scroll deltas and the popup's first-frame rect, in headless and headed Chrome; a non-reproduction is also an answer. Draft: no (Q10 names the cause but gives no method). |
| "loading states shift the layout" | S1, S2, S6, S16, S17, Z11, L3 | step 3 Q1 | Yes: S2 sees what the `layout-shift` API cannot (`skeleton-loading.md:161-165`). Draft: partly. |
| "skeletons stand larger than their component" | L3, S3, S4 | 14, step 3 Q2 | Yes: box, row and region inventory. Draft: partly (box only). |
| "the workflow canvas redraws whole, on many screens" | S8, L7, Z5, Z11 | step 3 Q5 | Yes: node identity, positions, viewport, selection, worker count. |
| "(the same causes:) a component reading its children, a mark or a context" | A1-A9 | 1-3 | Yes. |
| "a component sizing itself or others" | Z1-Z3, Z10, A11 | 7, 4 | Yes (Z3 and Z10 are the new ones that catch the measured faults). Draft: partly. |
| "a component with more behaviours than its uses need" | B1-B6, P5 | 17-19 | Yes. Draft: partly. |

### 5.3 The leads (`ui-cleanup.md:295-308`)

| Lead | Final ids | Flagged? |
| --- | --- | --- |
| `Section` reads loading from its direct children (`lib/section.ts`, `sectionPartsOf`) | A1, A2, A13, L1, B4 (QueryBoundary 35, Section `loading` about 56 sites) | Yes: `lib/section.ts:62-65` and `rules.md:358-359`. |
| `Form` and `lib/field-wait.tsx` walk children by type | A1, A2 | Yes: `form/index.tsx:39-47, 72, 91`, `lib/field-wait.tsx:178-182`. |
| `Toolbar` sorts children into search and chips by type | A1, B4 | Yes: `toolbar/index.tsx:29-31`; 1 Stead use. |
| A popover's first frame lands before it is positioned | Z12, Z9, S14 | Yes (measurement). |
| The Shell, the banner, `foot` docking, the room density | A5, A6, A8, A9, B8, S17 | Partly: the inventory shows what each does and costs; "what each still earns" is the session's judgement. |

## 6. Dropped candidates

Each line: the candidate, the source that suggested it, the reason, and (where the reason is "already enforced") the test that enforces it.

1. **Intl formatters built per render** (`new Intl.*` in `Meter`, `BarChart`, `age`, `moment`). Source: `render-smells.md` waste findings; `ui-core.md:233-237`. Reason: already enforced by an existing test: `plugins/react-ui/test/format.test.ts:12` fails any `new Intl.` in `src`, native has `plugins/native-ui/test/format.test.ts`; story `005-18`.
2. **Unstable context values, memoisation, re-render counts** (`Shell` switcher element, `TouchedContext`, `ToastList`, Table hover state, `Prose`/`Diff`/`QrCode` re-derivation). Source: `render-smells.md` (33 waste findings); stories `005-17`, `005-19` to `005-22`. Reason: out of scope (render cost, not layout or behaviour count); each was proved with the React profiler or a test and is `done` or `review`.
3. **A blocked act's press kept by an effect.** Source: `005-16`. Reason: already enforced by `plugins/react-ui/test/pressed.test.ts` and `plugins/native-ui/test/pressed.test.ts`.
4. **Sheet and confirm reset mid-dismiss, Picker search clearing, cell-edit Escape timing, copy timer, pending-bar clock.** Source: stories `005-08` to `005-13`. Reason: already enforced by behaviour stories on a held test clock (`apps/showcase/behaviour/table-edit.stories.tsx`, `code-copy.stories.tsx`, `clocks.stories.tsx`, `sheet.stories.tsx`); E2 only lists timers that remain.
5. **Screen-reader announcements, hidden duplicate content, `aria-describedby` and the "focus a static element so the content can be read" advice of the APG dialog notes.** Source: APG modal dialog pattern. Reason: out of scope: "Screen readers are not a target" (`philosophy.md:21`, `rubric.md:56`). The role/name baseline P6 serves keyboard, voice control, tests and agents instead.
6. **Contrast, target size, axe rules, horizontal overflow, console errors.** Source: `rubric.md:44`. Reason: already enforced by `stack screens test` (`plugins/screens/src/ui/overflow.ts`, `floors.ts`) and the stories' `a11y.test: "error"` (`ui-core.md:2048-2049`). The widths differ from the PRD's three.
7. **Type scale, hairline lightness, radius ranges, shadow use, ink levels, accent use, bans, the five AI looks, per-pattern ranges (28 pages).** Source: `rubric.md`, `judging.md`, `patterns/*.md`. Reason: look, judged by the design critique (`design-critique.md:59-103`); step 5 moves some numbers into `stack screens test`, not into this checklist.
8. **"Only `transform` and `opacity` animate."** Source: `judging.md` (Motion). Reason: look; Z11 would see a layout animation as a move, but no separate question is needed.
9. **Choosing among skeleton families** (twin, mask, holes, declared slots, measured). Source: `skeleton-loading.md:7-45`. Reason: decided (epic 004, declared slots as data, `ui-core.md:1114-1143`); L2 only records which family each unit uses.
10. **Primer's "each component should accept a `className`".** Source: Primer `CONTRIBUTING.md:147-149`. Reason: contradicts the canon (closed style channels, `ui-core.md:1729-1735`), enforced by verify `b7` and lint `no-class-on-component`.
11. **Radix `asChild` and `forwardRef` requirements, Ark `asChild`/`ids`.** Source: Radix composition guide; Ark summary. Reason: stack's popups use Base UI `render` internally and never expose it (`ui-core.md:1763-1770`); a consumer-facing node slot would show in B1.
12. **Polaris "backwards compatible", Spectrum "a story per visual state".** Source: Polaris `components.mdx:38`; Spectrum `CONTRIBUTING.md:131`. Reason: the story per state is already stack's rule (`ui-core.md:2039-2041`); backwards compatibility is counted as cost by P5, not asked as a gate.
13. **Router preloading, `staleTime` tuning, deferred data.** Source: TanStack Router `preloading.md`, `data-loading.md`. Reason: data-layer tuning in the app; S7 and S11 show the symptoms if they matter.
14. **React's "fetching data", "sending a POST" and "initializing the application" cases.** Source: `you-might-not-need-an-effect.md:312, 461, 700`. Reason: no hit: `rg -n 'fetch\(' plugins/react-ui/src/ui plugins/native-ui/src/ui` finds only `plugins/native-ui/src/ui/lib/picked.ts:10, 22` (a file blob), no component fetches in an effect.
15. **Expo platform-extension files (`.web.tsx`, `.native.tsx`) as the way to differ per platform.** Source: Expo `platform-specific-modules.mdx`. Reason: an alternative architecture to the two-plugin design, not a fault.
16. **Browser zoom ignored by the room density's `vw` units.** Source: `ui-core.md:178-182`. Reason: a named, accepted limit.
17. **Headless Chrome reports no hover.** Source: `evidence.md:291`. Reason: a harness rule (0.4, flags), not a question.
18. **Hover-only focus, scaled focus.** Source: `ten-foot.md`. Reason: stack draws a ring, never a scale (`ui-core.md:159-161`); P7 measures visible focus.
19. **A pass level for WCAG 2.4.12 (no part obscured).** Source: WCAG focus-not-obscured pages. Reason: the level is the owner's decision; P7 reports the fraction and both levels.
20. **CLS grades ("0.1 or less for at least 75% of page visits").** Source: web.dev CLS (summary only). Reason: a field metric over visits, not a lab grade per screen; S1 reports raw values.
21. **Hygiene list: `focus-visible`, `color-scheme`, `transition: all`, `…` against `...`, `user-scalable`, `overscroll-behavior: contain`.** Source: `design-critique.md:97-103`. Reason: already the critic's step 8, not structure; Z7 and Z9 cover the overflow and scroll part.
22. **Native Reanimated commit hook, gorhom sheet, `FullWindowOverlay`.** Source: `render-smells.md` native sheet finding; `005-06`. Reason: needs the phone harness on x86_64 Linux and local Reanimated builds; tracked by story `005-06` (`backlog`).
23. **The Mobbin execution tables themselves (161 rows, 87 apps).** Source: `references.md`, the pattern pages. Reason: evidence for design ranges, not a checklist.
24. **Estimated 25-150 ms per screen for the render walk.** Source: PRD step 5. Reason: belongs to step 5.
25. **Native `Intl`/Hermes cost and `Message` memoisation.** Source: `render-smells.md`; `005-18`, `005-19`. Reason: perf, covered by item 1 and 2.
