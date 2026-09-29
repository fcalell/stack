# Reference sheet

The measured reference for the design system rebuild (`kickoff.md` §6 Beautiful, line 1), built
2026-09-29 per pattern from Mobbin (web platform, deep search, two to four queries per pattern,
one of them in dark mode) and cross-checked against the measured CSS in
`VoltAgent/awesome-design-md`. Every execution is cited by its Mobbin link. Measurements read
from the 768 px previews are approximate CSS px at 1440; the `DESIGN.md` lines carry exact
values from a product's own stylesheet, and win when the two disagree. The rubric
(`rubric.md`) takes each pattern's `Range` line as its number.

## Anchor apps

Apps that recur across the 24 pattern shortlists, by count of cited executions
(155 rows, 69 apps; three or more listed). They are the anchors by evidence, not by assumption.

| App | Executions |
| --- | --- |
| Linear | 8 |
| Notion | 7 |
| Vercel | 6 |
| Vapi | 5 |
| Twenty | 5 |
| Railway | 5 |
| Supabase | 4 |
| Neon | 4 |
| Attio | 4 |
| v0 | 3 |
| Plain | 3 |
| Mintlify | 3 |
| Lovable | 3 |
| Laravel Cloud | 3 |
| Framer | 3 |
| Airtable | 3 |

`v0` is Vercel's; counted together Vercel leads with Linear. Linear, Notion, Vercel, Supabase
and Attio also have a `DESIGN.md` in the corpus, so their numbers are exact.

## Gaps

- **picker and menu**: Mobbin surfaces icon pickers and multi-select dialogs; a Linear-style
  priority or assignee picker with number-key hints did not appear. The shortlist leans on
  column and property menus (Notion, Zapier, Attio), one status picker (ClickUp), one dark select
  (FLORA).
- **settings form**: no Linear, Vercel or Stripe settings screen was returned; Dub and v0 stand in
  for that idiom.
- **version picker**: dominated by document-history panels; the true switchers are Leonardo AI
  and Vercel's rollback dialog; no docs-site version selector surfaced.
- **loading and pending**: the inline-spinner button rests on two results (Notion, Assembly).
- **toast and banner**: one full-width top banner at calibre (ManyChat); the rest are inline
  banners (Graphite, Better Stack) and bottom chips (Framer).
- **empty state**: no dashed-frame execution; Railway's hairline frame and Klaviyo's dashed
  illustration are the nearest.
- **diff and code**: Graphite, Devin, Cursor and Mintlify are the only diff screens at calibre.
- **activity feed**: Linear's feed screens hold one to four lines; the dense timelines come from
  Basecamp, incident.io, Plain and Better Stack.
- **dark mode**: the `linear.app` and `vercel` `DESIGN.md` files measure the marketing sites
  (Vercel's in light mode); their dark values are the product screens' estimates.
- Flow-derived executions (Lovable login, toast and onboarding; Notion and Coda workspace
  flows; v0 login) cite the flow's link, since a flow exposes no per-screen link.

## Patterns

## sidebar and scope switcher

Queries: `app sidebar with workspace switcher dropdown at the top and navigation links` · `left navigation sidebar with team or organization selector menu open showing list of workspaces` · `dark mode dashboard with collapsible sidebar navigation and project switcher`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/2679ae03-f852-47c3-a880-480c493c1369) | the densest, quietest sidebar: workspace name as a plain text-and-caret switcher, sections as 12px labels, team tree indented one icon | sidebar ≈ 235; row ≈ 28; body 13/400, section label 12/400 muted, workspace name 13/500; 2 type sizes; radius 4 on the selected row; sidebar separated from canvas by a hairline only; selection = light gray fill, no accent; accent absent (team icon color is the only chroma); ≈3.5 rows/100 px |
| Vercel | [screen](https://mobbin.com/screens/5bb75d66-7572-4f2e-a229-ebc54627343b) | dark shell where the team switcher is a top-left pill and the account menu is a full sidebar-width dropdown | sidebar ≈ 245; nav row ≈ 36; account menu ≈ 270 wide, item ≈ 38; body 13/400, name 13/500, email 12 muted; 3 sizes; radius 6; hairline `#333`-class separates sidebar and menu; selected "Projects" = surface-step fill; accent only on the status dot and the blue link; ≈2.8 rows/100 px |
| Height | [screen](https://mobbin.com/screens/6aa284f9-6ca0-4d37-888a-e0c4a6bf9196) | team as a bordered pill row ("SLMobbin + ⌄") that both scopes and expands the tree; tightest rows in the set | sidebar ≈ 205; row ≈ 26; body 12/400, team pill 12/500; 2 sizes; radius 6 on the pill, 4 on rows; hairline sidebar edge; no fill on hover visible; accent absent (orange only on project icons); ≈3.8 rows/100 px |
| Supabase | [screen](https://mobbin.com/screens/782baf2b-1d87-4a1c-a461-a87acc585ba9) | scope lives in the top bar as org › project › branch breadcrumb switchers; the sidebar is a 45 px icon rail | icon rail ≈ 45; top bar ≈ 45; switcher text 12/400 with caret, badges FREE/PRODUCTION as 10/600 pills; radius 6 on Connect button, pill on badges; surface separation by hairline `#2e2e2e`-class; accent green on charts and Connect only; rail items ≈ 40 tall |
| GitBook | [screen](https://mobbin.com/screens/49527874-e5f9-4d86-b582-a2bfb263e17b) | workspace switcher opens a compact menu with a nested Theme submenu | sidebar ≈ 245; row ≈ 30; menu ≈ 195 wide, item ≈ 34, submenu ≈ 34; body 12/400, section label 11/400 muted; 2 sizes; radius 6 on menu and rows; menu lifted by shadow + hairline; selected theme = checkmark right; accent pink only on Upgrade; ≈3.3 rows/100 px |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400, button 14/500, eyebrow 13/500; radius xs 4, sm 6, md 8, lg 12; hairline `#23252a`, strong `#34343a`; spacing 4/8/12/16/24/32/48. `vercel`: type body-sm 14/400, body-sm-strong 14/500, caption 12/400; radius xs 4, sm 6, md 8, lg 12; hairline `#ebebeb`, strong `#a1a1a1`; spacing 4/8/12/16/24/32; nav-bar height 64, form-input-sm 32. `supabase`: type button-md 14/500, caption 13/400, micro 12/400; radius xs 4, sm 6, md 8, lg 12; hairline `#dfdfdf`, cool `#ededed`; spacing 2/4/8/12/16/24/32.

Range: sidebar 205–245 (Supabase collapses to a 45 rail); rows 26–36; body 12–13 with one 11–12 muted section label, no third size; radius 4–6; separation is a hairline everywhere, never a shadow, with dropdowns lifted by shadow + hairline; selection is a gray fill, accent never touches the sidebar.

## settings form

Queries: `account settings page with a form of labeled text inputs, toggles and a save button` · `workspace general settings with sectioned cards, each card a field with description and its own save action` · `dark mode settings screen with profile name and email fields, section headings and a danger zone`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Dub | [screen](https://mobbin.com/screens/c6f878d6-b08c-4817-bb41-8a778bb6343f) | one card per field with its own footer strip and save; the canonical Vercel-style settings card | settings nav ≈ 205 + icon rail ≈ 55; card full width, title 16/600, description 13/400 muted, helper 12; input ≈ 38 tall × 430 wide; footer ≈ 60 as a surface step under a hairline; radius 8 card, 6 input, 6 button; black primary, disabled save = gray fill; accent absent; toggle blue |
| v0 | [screen](https://mobbin.com/screens/386a2fec-434b-4e19-8141-52fe1594f760) | preference rows (label + description left, control right) stacked inside one card, section eyebrow outside it | sidebar ≈ 260; content ≈ 720 wide; row ≈ 70 (two-line); label 13/500, description 12/400 muted, section label 12 muted; 3 sizes; radius 8 card, 6 select; rows separated by hairline inside a hairline card; save right-aligned per card; accent blue on toggles only |
| Mintlify | [screen](https://mobbin.com/screens/b6724427-eb12-47d5-9b55-cb2d7130fe04) | toggle cards in a 2-column grid, each a filled tile with icon, label, description, switch and gear | tile ≈ 540 × 85, gap ≈ 16; label 12/500, description 11/400 muted, group heading 14/500 + 12 muted; 3 sizes; radius 8; tiles separated by surface step (gray fill, no border); switches gray until on; accent green only in the "Recommended" and trial badges |
| Devin | [screen](https://mobbin.com/screens/93170d84-7435-4c89-82b5-647330913aba) | dark version of the grouped-rows card: Profile / Display / Notifications groups as filled panels | sidebar ≈ 290; content ≈ 670 wide; row ≈ 64; label 12/500, description 11/400 muted, group heading 12/400; page title 15/500; 3 sizes; radius 8 panel; rows split by hairline inside a surface-step panel; controls right-aligned (select, toggle, Enable button); accent blue on toggles only |
| Twenty | [screen](https://mobbin.com/screens/c70083a8-dc3d-403f-8d9c-bc4e39bc13d9) | flat form (no cards): section title + one-line description, then the control; danger zone is an outlined red button | settings nav ≈ 310 on a soft surface; content ≈ 490 wide; section title 12/600, description 11 muted, field label 10 muted; input ≈ 38; radius 4; hairline inputs and row-buttons with chevrons; sections spaced by ≈ 24 not lines; accent absent (yellow only on the "Advanced" switch); danger = red text + red hairline |

DESIGN.md: `mintlify`: type body-sm 14/400, body-sm-medium 14/500, caption 13/400, micro 12/500, micro-uppercase 11/600, button-md 14/500; radius xs 4, sm 6, md 8, lg 12; hairline `#e5e5e5`, soft `#ededed`, dark `#1f1f1f`; spacing 4/8/12/16/20/24/32/40.

Range: input 38; two-line rows 64–70; label 12–13/500 over an 11–12 muted description, page title 15–16; radius 4–8 (cards 8, inputs 4–6); separation by hairline card + hairline row split, or a surface-step tile with no border; save sits per card in a footer strip or right-aligned under the group; accent appears only on switches, never on the save button (black/dark primary).

## data table with inline edit

Queries: `data table with an editable cell in focus, column headers and row hover, spreadsheet-like grid` · `database table editor where a cell is being edited inline with a dropdown of options` · `dark mode table view of records with status badges, checkboxes, and an inline text cell edit`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Supabase | [screen](https://mobbin.com/screens/a454c054-f6e8-41aa-a86c-41e774222935) | database grid: column type in mono next to the name, checkbox column, full hairline grid, dark | header ≈ 34; row ≈ 34; body 12/400, header name 12/500 + type 11 mono muted; 2 sizes; cell padding ≈ 8×12; left-aligned text, numbers left too; full grid hairlines both axes; row hover = surface step; radius 4 on tabs; accent green only on Insert; ≈2.9 rows/100 px |
| Twenty | [screen](https://mobbin.com/screens/36b0d5c8-9550-44ee-b7a0-30f8d10f2eed) | CRM table where every header is icon + label and domains render as pill chips; footer aggregate row | header ≈ 30; row ≈ 32; body 12/400, header 12/400 muted; chip 11 in pill radius; checkbox ≈ 12; cell padding ≈ 6×10; hairline grid both axes; numbers left-aligned; "+ Add New" as a ghost row; accent absent; ≈3.1 rows/100 px |
| Notion | [screen](https://mobbin.com/screens/83e2d66a-d836-406f-b72d-d5bc20e1d16f) | inline edit chain: header menu → Edit property → option list with color swatches; select values as tinted pills | row ≈ 36; header 12/400 muted with type icon; body 13/400; pill 12 in radius 4 with tinted fill; menu ≈ 235 wide, item ≈ 28, radius 6, shadow + hairline; grid = horizontal hairlines + vertical hairlines; accent blue only on New; ≈2.8 rows/100 px |
| Airtable | [screen](https://mobbin.com/screens/7daee7a7-054f-428c-8123-072df3912f0c) | dark records list with status pills, no vertical grid lines, numbers plain | header ≈ 30, header 11/400 muted; row ≈ 37; body 12/400; status pill 11 with tinted fill radius 4; assignee chips gray fill; cell padding ≈ 8×12; horizontal hairlines only; row hover = surface step; accent absent in the table (green/blue/orange only as status tints); ≈2.7 rows/100 px |
| Neon | [screen](https://mobbin.com/screens/af53a8bf-e592-450d-9edd-cd5ae8cf076d) | pending-edit state: the edited row turns amber, a date picker pops from the cell, Save changes / Discard appear in the toolbar | header ≈ 32 with name 11/500 + type 10 mono; row ≈ 30; body 11 mono; edited row = amber tint fill across the row; picker ≈ 350 wide, radius 6, shadow; Save = green primary, Discard = underlined text; hairline grid; accent green only on Add record / Save; ≈3.3 rows/100 px |

DESIGN.md: `supabase`: type caption 13/400, micro 12/400, code 14/400, button-md 14/500; radius xs 4, sm 6, md 8; hairline `#dfdfdf`, cool `#ededed`, strong `#c7c7c7`; spacing 2/4/8/12/16/24. `notion`: type body-sm 14/400, caption 13/400, micro 12/500, micro-uppercase 11/600; radius xs 4, sm 6, md 8; hairline `#e5e3df`, soft `#ede9e4`, strong `#c8c4be`; spacing 4/8/12/16/20/24. `airtable`: type body-md 14/400, caption 14/500, label-md 16/500; radius xs 2, sm 6, md 10, lg 12; hairline `#dddddd`, border-strong `#9297a0`; spacing 4/8/12/16/24/32.

Range: rows 30–37, headers 30–34; body 11–13 with header 11–12 muted (one size below body or equal, never bold); cell padding ≈ 6–8 × 10–12; radius 4 on pills and cells, 6 on popovers; grid is hairline both axes in editors, horizontal-only in record lists; hover is a surface step, edit state a tinted row (amber) or focused cell ring; accent appears only on the primary act (Insert / Save / New) and as status tints.

## record pane beside a list

Queries: `master-detail layout: list of records on the left and the selected record's detail pane on the right` · `inbox or issue list with a side panel showing the selected item's properties and activity` · `dark mode split view with a contact or customer list and an open record detail panel beside it`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338) | nav / inbox list / issue body / properties column, all split by hairlines; selected row is a plain gray fill | nav ≈ 235; list ≈ 375; properties column ≈ 300; list row ≈ 55 (title 13/500 + 12 muted line); issue title 18/600; body 13; property row ≈ 34, label 12/500 + value 12; 3 sizes; radius 4 on the selected row; no shadows; accent only on the yellow priority glyph and status dot |
| Twenty | [screen](https://mobbin.com/screens/601f66eb-0efb-4e92-a88e-38d29a5f9608) | side sheet slides over the table; tabs, collapsible field groups, inline-editable value (ARR input open) | sheet ≈ 395; property row ≈ 30; label 12/400 muted with icon, value 12/400; group heading 12/500 with collapse chevron; tabs 12; 2 sizes; radius 4; sheet separated by hairline + light shadow; inline input ≈ 28 with hairline and currency prefix; accent absent; footer "Open ⌘↵" as an outlined button |
| Lightfield | [screen](https://mobbin.com/screens/b47a2904-f608-414d-ac6c-241ff0642556) | account details as a fixed right pane over a table: label/value rows then related-record sections with "See all" | sidebar ≈ 235; pane ≈ 375; property row ≈ 34; label 11/400 muted with icon, value 11/400; section title 12/500; 2 sizes; tag chip blue-tinted radius 4; pane split by hairline; sections spaced by hairline + ≈ 24; accent blue only on the tag and the count badge |
| Clay | [screen](https://mobbin.com/screens/e99b385f-779a-434f-9db6-a9ca02201a1f) | dark: a bare name list with the record pane; eyebrow labels in caps, timeline as a dotted list | sidebar ≈ 195; list rows ≈ 46; pane ≈ 345; name 12/500 with small source glyphs; eyebrow 9/600 uppercase muted; body 12; 3 sizes; selected row = lighter surface fill spanning the row; hairline splits; radius 4; accent purple only on timeline glyphs and the network pill |
| Plain | [screen](https://mobbin.com/screens/03143e01-39f7-4352-a836-041ff5e3260e) | support inbox: thread list / activity / right panel of actions with kbd hints and customer cards | thread list ≈ 375, right panel ≈ 385; thread row ≈ 110 (multi-line, tags row); selected thread = blue-tinted fill + 2 px left accent bar; action row ≈ 28 with kbd chips 10; card title 12/500, label 11 muted; radius 6 on cards and chips; hairline everywhere; accent blue on selection, green on Done |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400, eyebrow 13/500, headline 28/600; radius xs 4, sm 6, md 8; hairline `#23252a`, strong `#34343a`; spacing 4/8/12/16/24/32. `clay`: type body-md 16/400, body-sm 14/400, caption 13/500, caption-uppercase 12/600, title-sm 16/600; radius xs 6, sm 8, md 12, lg 16; hairline `#e5e5e5`, soft `#f0f0f0`; spacing 4/8/12/16/24/32/48.

Range: list 375, pane 300–395; list rows 46–55 for two-line items, up to 110 for message threads; property rows 30–34 with label 11–12 muted and value 11–12 at the same size; title 18/600 is the only large size; radius 4–6; every pane boundary is a hairline (a sheet adds a faint shadow); selection is a gray fill, or a tinted fill with a left bar where the accent is allowed; accent otherwise stays on status glyphs.

## command palette

Queries: `command palette overlay with a search input, grouped commands and keyboard shortcut hints` · `cmd+k quick search modal listing recent pages and actions with icons` · `dark mode command menu dialog with typed query, filtered results list and highlighted row`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Mintlify | [screen](https://mobbin.com/screens/7c7ad31f-9dfe-4be7-83d7-6002fe31d4d0) | grouped two-line results (title + path), typed query, ESC chip in the input, kbd footer | dialog ≈ 495 wide; input ≈ 56 with icon left and ESC chip right; group label 10/500 muted; item ≈ 52 (12/500 title + 11 muted subtitle); highlighted row = gray fill radius 6; footer ≈ 24 with 10 kbd chips; radius 12; shadow + hairline; accent absent |
| Superhuman | [screen](https://mobbin.com/screens/85dc5994-9360-428d-9092-7425e070ed7f) | dark, mono-typed query line, one-letter shortcut chips at the right edge of every row | dialog ≈ 645 wide; header 11 muted; input line ≈ 34 in mono 13; row ≈ 50 with icon + 12 label; selected row = lighter surface fill; shortcut chip ≈ 18 square, radius 4; dialog radius 8; separators hairline; accent absent (gradient title is outside the dialog) |
| v0 | [screen](https://mobbin.com/screens/29db691c-e7fb-4ee3-9f4b-e16c4970b92a) | commands first, then matching items with timestamps right-aligned, then a "New chat with query" escape hatch | dialog ≈ 490; input ≈ 43; group label 10 muted; row ≈ 43; label 12/400, timestamp 11 muted right; selected row = gray fill radius 6; dialog radius 10; shadow only, no hairline; accent absent |
| Vapi | [screen](https://mobbin.com/screens/593d7acd-2e16-4365-bcd6-02ce52f48f3b) | densest dark palette: Actions / Recent / All Pages groups, item + " — section" suffix, result count in the footer | dialog ≈ 645; input ≈ 41; group label 10 uppercase muted; row ≈ 29; label 11/500 + 10 muted suffix; shortcut "⌘ 0" right; footer ≈ 22 with kbd hints and "14 results"; radius 8; hairline + shadow; accent absent; ≈3.4 rows/100 px |
| Magnific | [screen](https://mobbin.com/screens/e22e26e2-f813-4f1e-beda-43c9ecf26419) | Recents then Quick actions, icons in small gray squares, three-key shortcut chips, ↵ on the highlighted row | dialog ≈ 635; input ≈ 56 with mic/camera/⌘K right; group label 9/500 uppercase; row ≈ 40; label 12/400; icon tile ≈ 22 radius 4; chips 10 radius 4; highlighted row gray fill; radius 12; shadow; accent absent |

DESIGN.md: `mintlify`: type body-sm 14/400, caption 13/400, micro 12/500, micro-uppercase 11/600; radius sm 6, md 8, lg 12; hairline `#e5e5e5`, dark `#1f1f1f`; spacing 4/8/12/16/20/24. `superhuman`: type body-md 16/460, caption 14/460, micro 12/540; radius xs 4, sm 6, md 8, lg 12; hairline `#e8e4dd`, dark `#3f3a52`; spacing 2/4/8/12/16/24/32.

Range: dialog 490–645 wide; input 41–56; rows 29–52 (29–43 one-line, 50–52 two-line); label 11–12 with group eyebrow 9–10 uppercase muted and 10 kbd chips; dialog radius 8–12, row and chip radius 4–6; lifted by shadow, hairline only as the input/footer split; highlight is a gray or lighter-surface fill; accent absent in every one.

## picker and menu

Queries: `dropdown select picker open with a search field, a list of options and a checkmark on the selected one` · `context menu opened on a row with icon items, separators, a submenu and keyboard shortcuts` · `dark mode assignee or status picker popover with avatars, search and selected item check` · `small popover to pick a label or priority: search input on top, icon list items, checkmark on selected item, keyboard number hints`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Notion | [screen](https://mobbin.com/screens/aea403dc-b079-460c-807a-0d4c515a5fb1) | property menu with a nested "Edit property" submenu; every item icon + label, groups split by spacing not lines | menu ≈ 235 wide; item ≈ 28; label 12/400; icon 14 muted; submenu offset flush to the parent row, ≈ 270 wide; radius 6; shadow + hairline; hover row = gray fill; text input inside the submenu with a blue focus ring; accent only on that ring and the "Now with agents" badge |
| Attio | [screen](https://mobbin.com/screens/a1cca18c-6359-46c4-a986-a46332943a05) | view picker with a search field at the top and a per-item "⋮" that opens a 4-item context menu beside it | picker ≈ 245; search row ≈ 28 (placeholder 12 muted, no border); item ≈ 28 with green view glyph; selected item = blue-tinted fill; "+ Create new view" as the last row; context menu ≈ 135, item ≈ 28, Delete in red; radius 6; shadow + hairline; body 12 |
| ClickUp | [screen](https://mobbin.com/screens/e9639493-e0a6-46c9-93d1-d3189cbdc3c7) | status picker: search input, grouped Not started / Active / Done, colored dot per status, toggle in the footer | popover ≈ 235; search ≈ 28 with hairline border radius 6; group label 9/500 uppercase muted; item ≈ 28 with 8 px dot; status label 10/600 uppercase in status color; footer toggle row ≈ 32 split by hairline; radius 8; shadow; accent = the status colors themselves |
| FLORA | [screen](https://mobbin.com/screens/08e9ad36-3602-45f8-b61c-fc7126ef1bac) | dark select: two-line items (name + meta chips), checkmark at the right of the selected one, trigger is a pill | popover ≈ 300; item ≈ 50; name 11/500, meta 10 muted in gray chips; selected row = lighter surface fill with ✓ right; trigger pill ≈ 28 with caret; radius 8; no visible hairline, surface step only; accent absent |
| Zapier | [screen](https://mobbin.com/screens/3cc85081-48d9-47f4-b4c8-e37d8108bc97) | column header menu with labelled groups (Sort / Create field / Zaps / Permissions) split by hairlines | menu ≈ 215; item ≈ 34; label 12/400 with 14 icon; group eyebrow 9/500 muted; separators hairline; radius 8; shadow + hairline; Delete field in default color, not red; accent blue only on the header's focus ring |

DESIGN.md: `notion`: type body-sm 14/400, caption 13/400, micro 12/500, micro-uppercase 11/600, button-md 14/500; radius xs 4, sm 6, md 8, lg 12; hairline `#e5e3df`, soft `#ede9e4`; spacing 4/8/12/16/20/24.

Range: popover 215–300 wide; items 28–34 one-line, 50 two-line; label 11–12 with 9–10 uppercase group eyebrows; search field sits as the first row at 28, borderless or hairline; radius 6–8 with 4 on inner chips; lifted by shadow + hairline (dark: surface step only); selection is a checkmark right or a gray/tinted fill; groups split by hairline or by spacing; accent stays on status colors and focus rings.

## sheet and confirm

Queries: `side sheet panel sliding in from the right edge with a form and footer buttons over a dimmed page` · `confirmation dialog asking to delete an item with a destructive red button and cancel button` · `dark mode modal dialog confirming a destructive action with type-to-confirm input field`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Neon | [screen](https://mobbin.com/screens/d51748aa-99fe-43a0-b839-b1688786ac9d) | Right sheet: title bar, hairline-separated body, sticky footer with Cancel outline + one dark primary | sheet ≈ 610 wide, full height; title 16/600 with X right; label 12/500; input ≈ 34; slider section heads 14/600; footer buttons ≈ 30 tall; 3 type sizes; radius 6; header and footer split by hairline; page dimmed ≈ 40 %; accent only on the primary act |
| Vapi | [screen](https://mobbin.com/screens/a2f7aa45-977a-43e8-91d4-e0da7e1acf1c) | Dark sheet with back arrow in title, grouped sections, textarea, footer Cancel ghost + green Save | sheet ≈ 710 wide; title 15/600; label 13/500 + help 12 muted; input ≈ 38, textarea ≈ 130; section box radius 8 with hairline; footer ≈ 60 tall hairline-topped; radius 6; green accent on Save only; 3 type sizes |
| Airwallex | [screen](https://mobbin.com/screens/00a6bb63-fa38-49ea-89f7-17bba3ee1b80) | Sheet with tabs (General / Documents) under title, filled-surface inputs, "Save as draft" link + disabled Create | sheet ≈ 730 wide; title 15/600; tab 13 with 2 px underline; section head 14/600; label 12; input ≈ 38 on a surface step, no border; "+ Add" outline pills ≈ 30; footer acts right; radius 4; 4 type sizes |
| Cloudflare | [screen](https://mobbin.com/screens/aa928ac1-4a1d-4b8c-9ccb-be35211cdca8) | Type-to-confirm delete: name in an inline code chip with copy icon, Cancel outline + red Delete | dialog ≈ 590 wide, radius 8, shadow over 50 % scrim; title 14/600; body 13; input ≈ 36 radius 6; footer buttons ≈ 32; danger red only on Delete; 2 type sizes |
| Resend | [screen](https://mobbin.com/screens/5a77cd07-e815-432f-8b21-43d7ef4a9fbf) | Dark confirm: body + red question line, `DELETE` chip with copy, red-tinted Delete then Cancel ghost, primary on the left | dialog ≈ 490 wide, radius 8, hairline `rgba(255,255,255,0.14)`; title 13/500; body 12; input ≈ 30; buttons ≈ 28; red tint on Delete only; 2 type sizes; denser than light peers |
| Clerk | [screen](https://mobbin.com/screens/71516c8f-ca28-4b68-bca8-01b6ea6e46ec) | Compact confirm with quoted-name instruction, red warning line with icon, full-width paired Cancel / Delete | dialog ≈ 365 wide; title 13/600; body 12; label 12/500; input ≈ 32; warning 11 red; buttons ≈ 32 each half width; radius 6; red fill only on Delete |

DESIGN.md: `resend`: type body-sm 14/400, caption 12/400, button-md 14/500, heading-sm 20/500; radius xs 4 sm 6 md 8 lg 12; border hairline `rgba(255,255,255,0.06)`, hairline-strong `rgba(255,255,255,0.14)`; controls button 36 tall padding 8 16, text-input 40 tall padding 10 14; spacing 2/4/8/12/16/24/32/48.

Range: sheets 610–730 wide, inputs 34–38, footer acts 30–32, hairline header/footer split, accent on one act; confirms 365–590 wide, radius 6–8, title 13–14/600, body 12–13, type-to-confirm input 30–36, red reserved for the destructive act, scrim 40–50 %.

## toast and banner

Queries: `toast notification in the bottom corner confirming an action was saved with an undo link` · `inline banner across the top of a dashboard warning about billing or a verification needed with a dismiss button` · `dark mode dashboard with a small success toast popup at the bottom right after copying or saving`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Coda | [screen](https://mobbin.com/screens/580abcac-fdb0-4c72-b6ea-b529d42bfa1e) | Bottom-centre toast: message, Undo link, X; light card on light page | ≈ 430 wide × 70 tall; body 13/400; Undo 13 link-blue; radius 8; hairline + soft shadow; 1 type size |
| Skiff | [screen](https://mobbin.com/screens/bf104b69-c42d-4fb9-a746-d51ca884f4a6) | Bottom-right inverted (dark on light) toast with title, body, Undo as small button | ≈ 355 wide × 100 tall; title 13/500; body 12 muted; Undo button ≈ 26 tall outlined; radius 8; X top-right; 2 type sizes |
| Laravel Cloud | [screen](https://mobbin.com/screens/5a0b71b3-f06f-4b14-af43-b862c1550a8f) | Pill success toast bottom-centre, green check, bold subject in-line | ≈ 370 wide × 36 tall; text 13 with 600 on the name; radius pill; dark fill on light page; icon-only status colour |
| Lovable | [flow](https://mobbin.com/flows/d092c4b4-3e75-4475-9a48-dc83a386a59c) | Bottom-right stacked toast (title + body) with green check; same chrome on light and dark canvases | ≈ 340 wide × 60 tall; title 12/500; body 12 muted; radius 8; hairline + shadow; green only in the icon |
| Framer | [screen](https://mobbin.com/screens/329098e1-751d-4322-90f0-569573cbdf85) | Bottom-centre chip notice with icon and a Dismiss button | ≈ 380 wide × 36 tall; text 13; Dismiss 12/500 in a surface-step button; radius 8; hairline + shadow |
| Graphite | [screen](https://mobbin.com/screens/e058beb8-a8a7-4cb6-886a-654fc33ba62e) | Inline warning banner in page flow: 3 px amber left rule, icon, text, Upgrade button, X | ≈ 36 tall, full content width; text 13; button ≈ 24 tall; radius 6; amber tint only on the rule and icon |
| Better Stack | [screen](https://mobbin.com/screens/4c01167d-1db7-4d92-822a-01e107afba61) | Inline success banner (green-tinted surface, dot icon, bold title + two body lines) on a dark page | ≈ 90 tall; title 13/600; body 13; radius 6; tint + hairline, no shadow |
| ManyChat | [screen](https://mobbin.com/screens/03b30f47-6ee9-449c-80cc-58456bf3d871) | Full-width top strip, dark on light, icon + sentence + link + X | ≈ 44 tall; text 12; link underlined; square corners; app shifts down |

DESIGN.md: `framer`: type body 15/400, body-sm 14/500, caption 13/500, micro 12/400, button 14/500; radius 4/6/10/15/20, pill 100; border hairline `#262626`, hairline-soft `#1a1a1a`; spacing 4/8/12/15/20/30/40. `lovable`: type body 16/400, button 16/400, button-sm 14/400, caption 14/400; radius 6 buttons, 12 cards, pill only for icon/action pills; border `1px #eceae4`, interactive `rgba(28,28,28,0.4)`; focus shadow `rgba(0,0,0,0.1) 0 4px 12px`. `vercel` (reference, not shortlisted): ex-toast radius md 8, padding 12 16, body-sm 14/400.

Range: toasts 340–430 wide, 36 (pill) to 100 (title + body + act) tall, radius 8 or pill, text 12–13, status colour confined to icon, hairline + shadow separation; banners 36–44 tall (inline) to 90 (message + body), radius 0–6, tinted surface or left rule, act as a small 24–26 button.

## empty state

Queries: `empty state in a dashboard list with an illustration or icon, a short explanation, and a primary create button` · `no projects yet placeholder page in a developer tool with a dashed outlined card inviting the first item` · `dark mode empty table state with no results message centered and a call to action`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/3af45bee-f669-4dc7-afaf-e3fb099161f9) | Left-aligned block centred on the page: line icon, title, two-line explanation, primary with kbd hint + secondary | sidebar ≈ 235; icon ≈ 64; title 14/600; body 13 muted; buttons ≈ 28 tall radius 6; kbd chips 11; accent on primary only; block ≈ 320 wide |
| Laravel Cloud | [screen](https://mobbin.com/screens/5a0b71b3-f06f-4b14-af43-b862c1550a8f) | Centred line-art illustration, title, one-line body, dark button | illustration ≈ 130; title 13/600; body 13 muted; button ≈ 30 tall radius 6; content region bordered radius 8 hairline |
| Framer | [screen](https://mobbin.com/screens/7b7bb65b-2e38-4c17-95f5-b84482493475) | No illustration: title, two-line body, one secondary button | title 13/600; body 12 muted; button ≈ 28 tall surface step, radius 6; 2 type sizes |
| Vapi | [screen](https://mobbin.com/screens/c428cae8-071d-409f-830d-ec4ad27f910d) | Dark: outline icon, larger title, two body lines, green primary | icon ≈ 44; title 18/500; body 13 muted; button ≈ 32 tall radius 6; 2 type sizes; green only on the button |
| Railway | [screen](https://mobbin.com/screens/abd5d03a-a1c4-41b0-93c5-72131ce30086) | Dark bordered region with icon, title, body containing an inline link; the act is in the page header (+ New) | region radius 8 hairline ≈ 170 tall; icon ≈ 20; title 14/600; body 13 with purple link; header "+ New" ≈ 30 purple |
| Klaviyo | [screen](https://mobbin.com/screens/16283d15-fe10-4277-a683-23faf7addaa4) | Dashed geometric line illustration, title, two-line body, black primary | illustration ≈ 190; title 16/500; body 13; button ≈ 32 tall radius 6 |

DESIGN.md: `linear.app`: type body 16/400, body-sm 14/400, caption 12/400, button 14/500, eyebrow 13/500; radius 4/6/8/12/16/24, pill; border hairline `#23252a`, strong `#34343a`, tertiary `#3e3e44`; spacing 4/8/12/16/24/32/48; button padding 8 14 radius md 8, input padding 8 12. `framer`: as above (body 15/400, caption 13/500, radius 6/10, hairline `#262626`).

Range: title 13–18 (13–14/600 in the densest tools), body 12–13 muted, icon 20–64 or illustration 130–190, one primary 28–32 tall radius 6, accent only on that act; centred column 300–360 wide; region either bare canvas or a radius-8 hairline frame.

## onboarding

Queries: flows `workspace onboarding after signup with a stepper asking for team name, role and invites` · screens `onboarding step page centered card with a progress indicator asking what you will use the product for` · `dark mode onboarding screen in a developer tool with a create your first workspace form and step counter`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Notion | [flow](https://mobbin.com/flows/757b6888-6eaa-498d-9b18-c013c9a2ef4a) | Full-bleed steps: question, three illustrated choice cards with top-right radios, full-width Continue, Cancel top-right | title 24/600; subtitle 14 muted; cards ≈ 230 × 270 radius 8 hairline; Continue ≈ 34 full width blue; inputs ≈ 32 with label 11; no step bar |
| Notion | [screen](https://mobbin.com/screens/99396b7b-c21d-4cea-8956-4942c2b9aae6) | In-app variant: 3-segment progress above the title, stacked option rows with icon + title + description | segments ≈ 4 tall; title 22/600; option row ≈ 76 tall radius 8, selected by 1 px blue border; row title 13/500 desc 12; Continue ≈ 34 blue |
| Coda | [flow](https://mobbin.com/flows/a40b6c20-74d3-4a5d-a60b-bba326bb5ab2) | Modal card with illustrated header band, form, Back text left and Next / Skip dark button right | card ≈ 745 wide radius 12; title 20/600; subtitle 13 muted; label 12/500; input ≈ 32; chip-in-input for invitees; footer acts ≈ 30 |
| Lovable | [flow](https://mobbin.com/flows/d092c4b4-3e75-4475-9a48-dc83a386a59c) | One question per step on a dark gradient canvas, dot pager at the bottom, white pill Next | title 22/600 centred; label 11; input ≈ 36 radius 6 ≈ 300 wide; Next pill ≈ 32; dots 4 with active elongated |
| Navattic | [screen](https://mobbin.com/screens/a33b4f74-8bbe-4fb8-8367-060abfcf25b5) | "Step 2 of 3" + segmented bar, card of checkable rows, Skip text + dark Next in the card footer | step label 12; title 20/600; subtitle 13; card ≈ 490 wide radius 8 hairline; rows 60–90 tall with checkbox right; Next ≈ 28 |
| Vapi | [screen](https://mobbin.com/screens/e8106529-4db7-4d84-971c-8d2dbda936d5) | Dark: two-dot progress, 2 × 2 icon tiles, selected tile gets the green border, Back outline + green Get Started | question 16/500 left; tiles ≈ 345 × 240 radius 8; footer buttons ≈ 32; 2 type sizes; accent on selection border and one act |
| Grammarly | [screen](https://mobbin.com/screens/965e4e5e-731a-4408-9e18-9ff0df5ae986) | "Step 1 of 4" text + progress bar centred between the cards and the Next button | title 20/600; subtitle 12; cards ≈ 190 × 100 radius 8 with radio top-left; selected card gets a teal tint + border; Next ≈ 30 |

DESIGN.md: `notion`: type body-sm 14/400, body-sm-medium 14/500, caption 13/400, micro 12/500, micro-uppercase 11/600, heading-4 22/600, heading-5 18/600, button-md 14/500; radius 4/6/8/12/16/20/24; border hairline `#e5e3df`, soft `#ede9e4`, strong `#c8c4be`; spacing 4/8/12/16/20/24/32/40. `lovable`: as above (body 16/400, button-sm 14/400, radius 6 controls, 12 cards, border `#eceae4`).

Range: title 16–24/500–600, subtitle 12–14 muted; progress as 2–4 segments ≈ 4 tall or "Step n of m" 12; choice cards 190–345 wide radius 8, selection = 1 px accent border (plus tint in two cases); inputs 32–36; Continue 28–34, full width when the step has one act; Back / Skip as text or outline, never accented.

## login and OTP

Queries: flows `login with email address followed by a one-time verification code entry screen` · screens `verification code entry screen with six separate digit boxes and a resend code link` · `dark mode sign in page with a single email field, continue button and social login buttons for Google and GitHub`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| v0 | [flow](https://mobbin.com/flows/37f50259-2477-423c-9d11-e358519f7a03) | Logo, title, one-line explanation with the address in 600, six boxes, Back link: nothing else | logo ≈ 76; title 24/600; body 13; boxes ≈ 42 × 42 gap 6 radius 6, focused box black 1 px ring; column ≈ 300; 3 type sizes |
| Cursor | [screen](https://mobbin.com/screens/12b44d35-1f79-4b3c-acb5-0c1edb9b230a) | Dark sign-in: three stacked social buttons, Email label + input, Continue with "Last used" chip | column ≈ 420; title 18/500 + 15 muted subtitle; social buttons ≈ 40 tall surface step radius 6; label 11; input ≈ 40; Continue ≈ 40; chip 10/500 |
| Lovable | [flow](https://mobbin.com/flows/d092c4b4-3e75-4475-9a48-dc83a386a59c) | Split page (form left, gradient right); social first, OR rule, email, black Continue with "Last used" badge | form column ≈ 335; title 22/600; social ≈ 36 radius 6 surface step; label 11/500; input ≈ 34; Continue ≈ 36; links 11 underlined |
| Laravel Cloud | [screen](https://mobbin.com/screens/806fc6c3-91f8-40d7-b9d2-8f69ec183bd8) | Left-aligned OTP inside a centred column, wide boxes, Resend with countdown, Back to sign-in | column ≈ 420; title 16/500; body 12; boxes ≈ 56 × 40 gap 8 radius 6 hairline; Resend (27) 12 muted |
| Tana | [screen](https://mobbin.com/screens/0c49a412-dcb4-491f-911b-74e7904144ef) | OTP inside a hairline card, title outside it, filled digits in 500 | card ≈ 420 wide radius 8; title 16/600; body 12; boxes ≈ 42 × 42 gap 8 radius 6; Resend (10) 12 muted |
| Coinbase | [screen](https://mobbin.com/screens/e302fcde-aa11-4cd1-aece-39704947227c) | OTP card with label, larger boxes, Resend as a full-width grey pill, Go back link | card ≈ 430 radius 12 hairline; title 20/600; body 13; label 12/600; boxes ≈ 48 × 48 gap 10 radius 6; Resend ≈ 40 pill; link 13/600 blue |
| Rox | [screen](https://mobbin.com/screens/e0cf8f8b-bd23-42b9-b515-55bdbce978d7) | Dark card: logo tile, Welcome, email, Continue, OR, social; email-first ordering | card ≈ 380 radius 8 hairline; title 16/500; body 12; input ≈ 40 radius 6; Continue ≈ 40 pill surface step; social ≈ 40 outline |

DESIGN.md: `cursor`: type body-sm 14/400, caption 13/400, caption-uppercase 11/600, title-sm 16/600, title-md 18/600, button 14/500; radius 4/6/8/12/16, pill; border hairline `#e6e5e0`, soft `#efeee8`, strong `#cfcdc4`; spacing 4/8/12/16/20/24/32/48. `vercel` (v0): body-sm 14/400, caption 12/400, button-md 14/500; radius sm 6 md 8 lg 12, pill 100; hairline `#ebebeb`, strong `#a1a1a1`; form-input 40 tall radius 6 padding 0 12; ex-auth-form-card radius lg. `coinbase`: body-sm 14/400, caption 13/400, caption-strong 12/600, title-md 18/600, button 16/600; radius 4/8/12/16/24, pill 100; hairline `#dee1e6`, soft `#eef0f3`. `lovable`: as above (input/button radius 6, border `#eceae4`, interactive border `rgba(28,28,28,0.4)`).

Range: column 300–430 wide; title 16–24/500–600; helper 12–13 with the address in 600; inputs and buttons 34–40 tall, radius 6 (card 8–12); OTP boxes 42–56 wide × 40–48 tall, gap 6–10, radius 6, focus ring 1 px ink or accent; social buttons are surface-step or outline, never accented; Resend is text 12 muted (with countdown) or a grey pill.

## page header with acts

Queries: `page header with a title, breadcrumb and a row of action buttons on the right above a data table` · `settings page heading with a description line and a primary button aligned right plus secondary actions` · `dark mode project overview page header with the project name, status badge, tabs and deploy button`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/267d16a1-982b-4479-85b5-22294fdab01a) | Thin breadcrumb strip with tabs below, then an in-body title with description and property chips; acts are icon buttons | sidebar ≈ 235; strip ≈ 36 tall hairline; tabs 12 pill 24 tall; title 20/600 under a 24 icon; description 13; chips 12 with 16 icons; no filled button |
| Vercel | [screen](https://mobbin.com/screens/c7fc1aa9-5a08-4993-a979-66c3e729527c) | Card header "Production Deployment" with three acts: two outline, one black split button | sidebar ≈ 235; card radius 8 hairline; header row ≈ 52 tall; label 14/500; acts ≈ 32 tall radius 6; body 13, meta 12 muted; only the last act filled |
| Supabase | [screen](https://mobbin.com/screens/782baf2b-1d87-4a1c-a461-a87acc585ba9) | Dark: 30-tall breadcrumb bar (org / project / branch + PRODUCTION badge + Connect), big title with URL + Copy chip, status tiles | icon rail ≈ 48; top bar ≈ 30 with 12 text; title 28/500; URL 12 mono muted; tiles 11 mono uppercase labels + 14 values; Connect ≈ 24 outline; green only in charts and status |
| Neon | [screen](https://mobbin.com/screens/79370ba2-b39f-4fc1-bd80-a6469e8cc78e) | Title left, three equal outline acts with icons right, stats card under a hairline | sidebar ≈ 235; title 22/600; acts ≈ 30 tall radius 6 outline, text 12/500, gap 8; stats card radius 8 hairline; label 12 / value 15/500 |
| Jira | [screen](https://mobbin.com/screens/1999248d-f1d5-41bf-8c63-f25c6ac7e1de) | Eyebrow breadcrumb, title with icons, tab row, then a toolbar of filter chips; share / expand icons right | eyebrow 11 muted; title 18/600; tabs 13 with 2 px underline; chips ≈ 28 tall radius 4; icon acts 28; primary "+ Create" lives in the global bar |
| GitBook | [screen](https://mobbin.com/screens/8cbf3d6c-0008-4d59-83c5-91a232b47ef5) | Settings title + description, sections as hairline cards, Danger zone red-tinted, Publish black button in the document bar | title 22/600; description 13 muted; section title 14/600 with 12 body; cards radius 8; Save ≈ 26 disabled; Delete red filled ≈ 28; top bar ≈ 30 |
| Sprig | [screen](https://mobbin.com/screens/db287836-e289-46c4-b1e0-8bde34df4adf) | Folder breadcrumb + title on one line, three acts right (Cancel outline, Save Changes outline, Launch yellow) | breadcrumb 14 muted / title 16/600; acts ≈ 30 tall radius 6; yellow fill only on Launch; stepper cards radius 8 hairline ≈ 60 tall |

DESIGN.md: `linear.app`: caption 12/400, eyebrow 13/500, body-sm 14/400, button 14/500, headline 28/600, card-title 22/500; radius sm 6 md 8 lg 12; hairline `#23252a` strong `#34343a`; button padding 8 14; status-badge caption pill 2 8. `vercel`: heading 20/600 and 24/600, body-sm 14/400, body-sm-strong 14/500, caption 12/400, caption-mono 12, button-md 14/500; radius 6/8/12; hairline `#ebebeb` strong `#a1a1a1`; button-secondary canvas + hairline. `supabase`: heading-lg 22/500, heading-md 18/500, caption 13/400, micro 12/400, code 14/400, button-md 14/500; radius 4/6/8/12/16; hairline `#dfdfdf` strong `#c7c7c7` cool `#ededed`; spacing 2/4/8/12/16/24/32/64.

Range: top strip 30–36 tall with 12 breadcrumb text; title 16–28/500–600 with a 13 muted description; acts 24–32 tall radius 4–6 in a right-aligned row, gap 8, all outline or surface-step except at most one filled (black, brand, or none); tabs 12–13 with a 2 px underline or 24 pill; regions separate by hairline, cards radius 8.

## diff and code

Queries: `code diff view with added and removed lines highlighted in green and red, line numbers, file header` · `pull request review page showing file changes with syntax highlighted code and inline comments` · `dark mode code editor panel with monospace syntax highlighted code block and copy button`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Graphite | [screen](https://mobbin.com/screens/c9c3a747-80fc-420d-9eec-961a9ca2d5dc) | unified diff with a sticky per-file header that carries language, +30, Viewed checkbox and overflow; the whole hunk is one pale-green fill | icon rail ≈ 48; file header ≈ 40, body 12/500; line ≈ 19 (≈5.2 rows/100 px), mono ≈ 12; gutter ≈ 56 with grey numbers; added fill ≈ `#dcfce7`, hunk separated by hairline + radius 6; one type size in the code, two in chrome; accent only on the blue Publish button |
| Devin | [screen](https://mobbin.com/screens/943c5aac-94ad-4e06-bbab-70d3a88e3fa1) | side-by-side split, file tree with +89 −53 counts per file, an inline "Investigate" thread anchored to a changed line | sidebar ≈ 200; file-tree row ≈ 28, 12/400 with green/red counts; split panes each ≈ 380; line ≈ 19, mono ≈ 11.5; changed line blue-tinted with a bold blue left bar ≈ 3; thread card white on hairline radius 8; file header ≈ 36 with "Mark as viewed" checkbox |
| Mintlify | [screen](https://mobbin.com/screens/75a194a1-ad5f-44e0-b8eb-6f78bd5598ee) | split diff with a "10 unmodified lines" collapse row, removed rows in pink fill with a red marker bar, added rows green with a green marker bar | chat pane ≈ 400, file tree ≈ 240, diff ≈ 800; line ≈ 19, mono ≈ 11.5; removed `#fde2e1` with a 3 px `#ef4444` edge, added `#dcfce7` with a 3 px `#22c55e` edge; collapse row grey fill ≈ 24; radius 0 inside the pane; accent on the green Publish only |
| Cursor | [screen](https://mobbin.com/screens/cb7068e4-44d5-4f04-9c5c-855782a96309) | Diff / Review / Commits tabs above per-file rows; each file carries an "Added" green word and a "New" grey chip in the header | sidebar ≈ 240 with 13/400 rows ≈ 28; file header ≈ 40 with chevron, mono path 12, right-aligned status; tab strip ≈ 36, 12/500, active tab underlined; separation by hairline only; radius 6 on chips; accent: black "Mark as ready" |
| Cofounder | [screen](https://mobbin.com/screens/c50251b3-860c-4f81-be1d-2795eae0182b) | stacked files inside one card, each with a per-file header showing −112 +116 in red/green; whole diff on a pale grey card | canvas card ≈ 940, radius 10, hairline; file header ≈ 32 with 12/500 filename; line ≈ 17 (≈5.9 rows/100 px), mono ≈ 10.5; removed pink, added green, both full-row fills with number gutter tinted the same; footer "Open PR" black button |

DESIGN.md: `cursor`: type code 13/400 JetBrains Mono lh 1.5, caption 13/400, caption-uppercase 11/600 +0.88, body-sm 14/400, title-sm 16/600; radius xs 4 · sm 6 · md 8 · lg 12; border hairline `#e6e5e0`, hairline-soft `#efeee8`, hairline-strong `#cfcdc4`, no shadows; spacing 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48. `mintlify`: type code-sm 13/400 lh 1.4, code-md 14/400, code-inline 13/500, caption 13/400, micro 12/500, micro-uppercase 11/600; radius xs 4 · sm 6 · md 8 · lg 12 · xl 16; border hairline `#e5e5e5`, hairline-soft `#ededed`, hairline-dark `#1f1f1f`; spacing 4 · 8 · 12 · 16 · 20 · 24 · 32.

Range: code line 17–19 px at mono 10.5–12; file header 32–40 px; added `#dcfce7`-class green and `#fde2e1`-class pink as full-row fills, 3 px edge bar when split; gutters 40–56 grey numbers; separation by hairline and 0–10 radius on the outer card; accent never inside the diff, only on the one commit/publish act.

## activity feed

Queries: `activity feed timeline listing recent events with avatars, action text and relative timestamps` · `issue activity history showing who changed status, assignee and comments in a vertical timeline with icons` · `dark mode activity log or audit log of events grouped by day with timestamps` · `Linear issue detail page with activity section showing status changes and comments`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/16e4d0c7-bf36-4daa-98f5-d3d31882cfec) | Activity block under the issue: 16 px status icon, one 12 px sentence with actor bold and "· 10d ago" muted, no lines between events, comment box below | inbox list ≈ 380 with rows ≈ 54; activity row ≈ 24 (≈4.2 rows/100 px), 12/400 with actor 12/500, meta grey; status icons colour-coded (yellow in-progress, blue done); no dividers, no avatars; composer card radius 8 hairline; accent absent |
| Basecamp | [screen](https://mobbin.com/screens/b71d21b5-1078-44a4-adb3-9583531a6059) | day headers as black label chips on a hairline rule, a vertical 1 px line with 20 px icon dots, time in the left gutter, avatar + bold actor + link verb | content column ≈ 1040; day chip ≈ 24 h black fill 11/700 uppercase; event row ≈ 40–64, body 13/400, actor and object 13/700; left time gutter ≈ 80 at 12 grey; blue circular icons on the line; radius 4 on chips; "No activity" days kept as one-line rows |
| incident.io | [screen](https://mobbin.com/screens/9a03356b-daf2-4c06-95a6-facc978430ae) | activity log drawer: search field on top, date group label, each event a coloured 16 px icon, bold title, time in grey, then a row of small status chips (Critical · Investigating → Fixing) | drawer ≈ 740; search ≈ 36 radius 6; event ≈ 60–72, title 13/600, body 13/400, chips ≈ 20 h 11/500 grey outline radius 4 with arrows between old → new; left column icons in red/blue/black; no vertical rule; accent none |
| Plain | [screen](https://mobbin.com/screens/399cc7cd-e9d4-44ee-af18-5cdaca859af5) | thread timeline with 12 px system rows ("You changed status to Waiting for customer · 15min ago") between message cards; label changes render the label as an outlined chip inline | three-pane 220 / 560 / 380; system row ≈ 20 (≈5 rows/100 px), 11.5/400 grey with 14 px icon; inline chips ≈ 18 h outline radius 4; message cards radius 8 on hairline, note card yellow fill; done row green fill; body 13; accent on the yellow "Done" summary and nowhere else |
| Better Stack | [screen](https://mobbin.com/screens/76f87fea-775d-47e6-b97a-b2d234f6c46b) | dark incident timeline: composer first, then rows with a 16 px event icon, 20 px avatar inline in the sentence, absolute time right-aligned in muted grey | sidebar ≈ 200; timeline ≈ 1100; row ≈ 28 (≈3.6 rows/100 px), 12/400 `#c8cdd3` on `#12151c`, actor 12/500; comment cards on a step-lighter surface radius 8, 1 px `#262b35`; attachment chip radius 6; no vertical line; accent none |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400 lh 1.4, eyebrow 13/500 +0.4, button 14/500, mono 13/400; radius xs 4 (chips, badges) · sm 6 · md 8 (buttons, inputs) · lg 12 (cards) · pill; border hairline `#23252a`, hairline-strong `#34343a`, hairline-tertiary `#3e3e44` (dark); spacing 4 · 8 · 12 · 16 · 24 · 32 · 48.

Range: system-event row 20–28 px at 11.5–12 px, comment/message rows 40–72; body 12–13 with actor at 500–700; day grouping by a chip or grey label, not by cards; vertical rule optional (Basecamp) and mostly absent; state changes rendered as 18–20 px outlined chips with "→"; accent never on the feed.

## board columns

Queries: `kanban board with status columns of task cards, column headers with counts and add buttons` · `project board view of issues in columns Todo In Progress Done with priority icons, labels and assignee avatars on cards` · `dark mode kanban board columns with draggable cards`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/410846e7-09d4-4ed8-baf2-ec94d96c29f4) | columns as slightly grey wells, header "◐ In Progress 3 ··· +", cards white on hairline with ID · parent, status icon + title, then priority, label chips, "Created Mar 31" | sidebar ≈ 220; column ≈ 320 with 12 px gutter; header ≈ 36, 13/500 + count 12 grey; card ≈ 100, padding 12, radius 6, hairline `#e5e5e5`; ID 11 grey mono-ish, title 13/500, meta 11; label chips outlined radius 4 with 6 px colour dot; avatar 18 top-right; "Hidden columns" list at right; accent none |
| Linear (dark) | [screen](https://mobbin.com/screens/720724d3-f686-457f-8c00-fa7efa409b12) | same board on `#191a1d`; cards `#1f2023` with 1 px `#2a2b2f`, column well barely lighter than canvas | column ≈ 330; card ≈ 84–120 radius 6; title 13/500 `#eeeeee`, meta 11 `#8a8f98`; label chips outlined `#2f3035` radius 4 with dot; filter tabs "All issues / Active / Backlog" as 26 h pills; accent none, colour only in the status icons |
| Asana | [screen](https://mobbin.com/screens/e51854b0-c808-437e-ad96-fe406f23e986) | dark board, cards with a 4 px coloured top stripe, filled colour tags (Medium/Rejected), avatar and date, "Add task" ghost row per column | sidebar ≈ 230; column ≈ 300; header ≈ 40, 14/500 + count; card ≈ 150 radius 8, surface `#2a2b2d` on `#1e1f21`, hairline `#3a3b3d`; title 13/400, tags ≈ 20 h 11/500 filled radius 4; avatar 24; accent orange only on "Add billing info" |
| Plane | [screen](https://mobbin.com/screens/69990ffa-9153-4bf1-bb53-87317f9e040f) | dense cards: ID, title, then a row of 6–7 property chips (state, priority, date, assignee, estimate) each an outlined 22 px control | sidebar ≈ 300; column ≈ 350; header ≈ 36, 13/500 with icon, count, ↔ and +; card ≈ 90 radius 6 hairline; ID 11 grey, title 13/500, chips ≈ 22 h 11 outline radius 4; inline "New work item" composer card; accent blue only on "Add work item" |
| Todoist | [screen](https://mobbin.com/screens/fd3b9b17-1333-427b-b93b-5152cdc39f8b) | minimal light board: section title + count, cards with circle check + title, meta line of small icons/dates, "Add task" red-plus row | sidebar ≈ 270; column ≈ 260, no well fill, columns separated by whitespace only; header ≈ 30, 13/600; card ≈ 40–80 radius 8 hairline; title 13/400, meta 11 with red date when due; check circle 16 with priority colour; accent red on the add-task plus |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400, eyebrow 13/500, button 14/500; radius xs 4 · sm 6 · md 8 · lg 12; border hairline `#23252a`, hairline-strong `#34343a`; spacing 4 · 8 · 12 · 16 · 24 · 32 · 48.

Range: column width 260–350 with 12–16 px gutters; column header 30–40 at 13–14/500–600 with a muted count; card radius 6–8 on hairline, padding 10–12, height 40–150 by property count; title 13/400–500, ID/meta 11; column well is either a 1-step surface (Linear, Plane) or nothing (Todoist); accent only on the create act.

## node canvas

Queries: `workflow automation builder canvas with connected nodes and edges, trigger and action blocks` · `node graph editor on a dotted grid canvas with zoom controls and a side panel for node settings` · `dark mode node-based pipeline canvas with cards linked by curved connectors`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Twenty | [screen](https://mobbin.com/screens/539342b6-0804-4bdb-ac10-719181d348a3) | compact nodes (eyebrow "Trigger"/"Action" + one-line title), straight-then-curved grey edges with "if"/"else" labels, selected node gets a blue outline, config panel right | sidebar ≈ 200; canvas dot grid ≈ 16 px on `#fcfcfc`; node ≈ 160 × 48, radius 6, hairline, eyebrow 10/500 grey, title 12/500; edge 1 px `#c8c8c8`; selection 1.5 px blue `#3b82f6`; panel ≈ 380 with tabs 13; Draft chip yellow; "+" add handle 12 below the leaf; accent blue only on selection and "View role" |
| Plain | [screen](https://mobbin.com/screens/fc2573d6-f22b-42b5-bc94-f6917a39649c) | Start node with an inner "Manual" field, If/else node with two labelled ports, port handles as 8 px hollow circles, mini-map bottom right, zoom stack bottom left | icon rail ≈ 56; canvas dot grid ≈ 14 px on `#f9f9f9`; node ≈ 300 × 130, radius 8, 1 px hairline, header 13/500 with icon, inner rows 12 in hairline boxes radius 4; selected outline 1.5 px blue-violet; edges 1 px grey; zoom buttons 28 stacked; panel ≈ 380; accent black "Create" only |
| Railway | [screen](https://mobbin.com/screens/2128d232-ce9a-4743-8a7a-60985142c234) | dark service canvas: two 32 px-headed cards (service name + domain, status dot row), dashed arrow edge, faint dot grid | canvas `#0b0d12` dots `#1d2029`; card ≈ 270 × 130, radius 8, 1 px `#262a33`, surface `#12151b`; title 13/600, subtitle 11 grey; status row 12 with 6 px dot (green Online, "Completed" check); attached volume as a second row on the card; edge 1 px dashed `#3a3f4b` with arrowhead; zoom stack bottom-left 28; accent none |
| Runway | [screen](https://mobbin.com/screens/7453b57a-8270-47bd-8fbd-2c69c60396da) | light creative canvas: white node cards with 12 px header row and a "Run" pill inside, green edge with hollow 8 px port circles, floating node-picker menu, bottom toolbar | rail ≈ 60; dot grid ≈ 20 px on `#f5f5f5`; node ≈ 300 × 400 (image preview), radius 10, hairline + soft shadow; header 12/500; ports 8 px circles on the card edge; edge 1.5 px green `#22c55e`; picker menu ≈ 280 radius 10, rows 40 with 24 px icon + 12/500 + 11 grey; bottom toolbar 40 h pill; accent black "Run all" |
| AirOps | [screen](https://mobbin.com/screens/ff79a5c0-07ad-4a62-b1b4-189e90c55c88) | vertical step list on a canvas: each node has eyebrow "LLM · Claude…" + title + right-aligned "Step n" chip, loop drawn as a dashed pink rectangle around grouped steps | copilot pane ≈ 400; dot grid ≈ 16 on `#fafafa`; node ≈ 260 × 44, radius 8, hairline; eyebrow 10 grey, title 12/500, step chip 11 grey outline radius 4; selected node outline blue; loop group 1 px dashed `#e879f9` radius 8 with a "Loop" tag; edges 1 px grey with 6 px dots; zoom toolbar bottom 36 h; accent green "Publish" only |

DESIGN.md: none of the shortlisted apps has a file.

Range: dot grid 14–20 px at 1 px dots on a canvas one step off white or `#0b0d12`; nodes radius 6–10 on 1 px hairline, 44–130 px tall for logic nodes, up to 400 for media; eyebrow 10–11 + title 12–13/500; ports 8 px hollow circles; edges 1–1.5 px grey (dashed for inactive, brand-green for data); selection is a 1.5 px accent outline; zoom stack of 28–36 px buttons bottom-left or a bottom pill toolbar; accent only on selection and the run/publish act.

## chips and statuses

Queries: `status badges and tag chips in a list, colored dot with label like Active, Pending, Failed` · `table of deployments or payments with status pill badges Succeeded Failed Canceled in green red gray` · `dark mode list rows with small status badges and removable label chips with x`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/212fda35-366e-4dc0-a1d1-3b679659d6ab) | labels as outlined chips with a 6 px colour dot and grey text, dates as outlined chips with a calendar icon; status is an icon, never a word | row ≈ 32 (≈3.1 rows/100 px), 13/400 title; chip ≈ 20 h, 11/400 grey, 1 px hairline `#e5e5e5`, radius 4, padding 6, dot 6 px in the label colour; status icon 14 (circle, half-circle); priority as 3-bar glyph; avatar 18; accent none |
| Vercel | [screen](https://mobbin.com/screens/e9576405-bcef-419a-922a-8fb84b044a54) | dark deployment list: status as 6 px dot + word (green Ready, red Error) with duration under it; "Current" blue filled chip and "Rolled Back" red filled chip inline | sidebar ≈ 220; row ≈ 66 (2 lines), 13/500 id, 12 muted; dot-status 12/400; chip ≈ 18 h, 11/500, radius 4, filled `#1e3a8a`-class blue / `#7f1d1d`-class red with light text; commit hash 12 mono; hairline `#2e2e2e` rows; toolbar of 32 h outlined selects radius 6; accent only on the blue Current chip |
| Airtable | [screen](https://mobbin.com/screens/56681290-7954-4b16-b6f6-daf753c2c0fc) | select-field chips as soft pastel fills (blue In Progress, green Planning) with text darkened to the hue; collaborator names as grey chips; applied filter shows the chip inside the toolbar | row ≈ 34; chip ≈ 20 h, 11.5/400, radius 10 (near-pill), fill `#cfe3ff`-class / `#d1f0d1`-class with dark text, padding 6; grey member chip `#eeeeee`; header 11 grey; hairline `#e5e5e5`; accent none in the grid |
| PlanetScale | [screen](https://mobbin.com/screens/be0ec4c5-4a49-4f4a-8a29-179143a514c5) | "Deployed" outlined grey chip fused with a timer chip "29:45 ⟳" in pale blue, a tabs row with count chips, warning banner in yellow with a hairline | row ≈ 40; chip ≈ 22 h, 12/400, radius 4 outline `#d4d4d4`; timer chip pale blue fill `#dbeafe` radius 4; tab count chips 16 h grey fill radius 8; branch names 12 mono blue; banner yellow `#fefce8` with `#fde68a` hairline radius 6; accent none |
| Sentry | [screen](https://mobbin.com/screens/230a355d-3b80-430d-8d18-0b4fa6198768) | dark issues feed: a 3 px coloured left bar on the row as the severity, "[Filtered]" / "Unhandled" as 10 px outlined micro-tags, applied filter `is: unresolved ×` as an inline token in the search field | row ≈ 84 (2 lines), title 13/600, subtitle 12; micro-tag ≈ 16 h, 10/500, radius 3, 1 px `#4a4560`; search token ≈ 20 h, 11, purple fill `#3f2f6b`-class radius 4 with ×; priority and assignee as 24 h outlined dropdown chips radius 6; canvas `#1e1730`; accent purple on the "Save As" button only |

DESIGN.md: `linear.app`: caption 12/400, eyebrow 13/500 +0.4; radius xs 4 (small chips, status badges) · sm 6 (inline tags) · pill (status pills); border hairline `#23252a` (dark). `vercel`: caption 12/400 lh 16 (badge labels), caption-mono 12/400, body-sm 14/400 −0.28; radius xs 4 · sm 6 · md 8 · pill 100; border hairline `#ebebeb`, hairline-strong `#a1a1a1`; spacing 4 · 8 · 12 · 16 · 24. `airtable`: body-md 14/400 lh 1.25, caption 14/500 +0.16; radius xs 2 · sm 6 · md 10 · lg 12 · pill 9999; border hairline `#dddddd`, border-strong `#9297a0`; surface-soft `#f8fafc`. `sentry`: micro-cap 10/600 +0.25 (status labels, badge text), body-md 16/500; radius xs 4 (badges, status pills) · sm 6 · md 8 · lg 10 · xl 12; spacing 2 · 4 · 8 · 12 · 16 · 24.

Range: chip 16–22 px tall at 10–12 px type, padding 6, radius 3–4 (outlined dev tools) or 10–pill (pastel-filled data tools); three chip dialects: dot + grey text on hairline (Linear, Vercel status), soft pastel fill with hue-darkened text (Airtable, PlanetScale timer), filled saturated with light text for one exceptional state (Vercel Current / Rolled Back); status also carried by a 6 px dot or a 3 px row edge without any chip; accent never on the chip set.

## filters and toolbars

Queries: `filter bar above a data table with applied filter chips, search field, sort and view toggle buttons` · `toolbar with filter dropdown menu open listing filter fields, display options and group by controls` · `dark mode list header toolbar with filter chips, date range picker and column visibility controls`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Notion | [screen](https://mobbin.com/screens/d41e1c3f-7554-4129-af21-b8d1c8eace43) | "2 rules" blue chip opens a popover of rule rows Where/And · field · operator · value, each cell an outlined mini-select; "+ Filter" ghost; view icons right | toolbar ≈ 36 with view tab chip 26 h grey fill radius 6; rules chip 26 h blue fill `#e0efff` 12/500; popover ≈ 500 radius 8 hairline + shadow, rule row ≈ 32, selects 26 h 12 outline radius 4, value chip blue; "Add filter rule" 12 grey; delete row red text; icon cluster right 16 px; accent blue on "New" only |
| Airtable | [screen](https://mobbin.com/screens/8e0df9ce-81e6-4ffc-8ec8-5bc093db466f) | applied filters as 28 px outlined tokens ("Project Status is [Planning] or [In Progress]") holding value chips, a focused token gets a blue ring and opens a checkbox list with a search field | token ≈ 28 h, 12/400, hairline radius 6, inner value chips 18 h pastel; open token ring 2 px `#2d7ff9`; popover ≈ 300 radius 8, search 32, rows 26 with 14 px checkbox, footer "Assigned Designers is ▾" 12; toolbar right: Group · Filter · Sort as 12 text buttons + icons; accent blue on focus and "Add project" |
| Vercel | [screen](https://mobbin.com/screens/e9576405-bcef-419a-922a-8fb84b044a54) | dark toolbar of equal-height outlined selects (date range, authors, environments, repos, branches) plus a "Status 5/6" select carrying a colour-dot stack | control ≈ 32 h, 12/400 placeholder grey, 1 px `#333` radius 6, 16 px leading icon, 8 px gutter; six controls fill the width evenly; no applied-chip row, the state lives in the selects; list below with 1 px `#2e2e2e` rows; accent none in the toolbar |
| Aboard | [screen](https://mobbin.com/screens/43b940cb-28a4-42b5-9974-2073b895ad66) | applied filters as icon + field + [value chip] + × tokens on one row with "+ Add filter" ghost, table header directly under | token ≈ 24 h, 12/400 label, value as 18 h grey fill chip radius 4, × 12 px; token background grey `#f3f4f6` radius 6; "Add filter" 12 grey with plus; header row 11 grey 32 h; row 34; status chip green fill radius 4; accent none |
| Deel | [screen](https://mobbin.com/screens/fd251a0e-8b5f-4889-9446-040dd33f374e) | dark people table: toolbar is a pill row of outlined 32 px filter selects ("Worker status 15 ▾" with a count badge), search icon-button first, "View as report" / "Configure columns" flat buttons right | toolbar ≈ 48 pill on a 1-step surface; select 32 h, 12/400, 1 px `#3a3a3a` radius 16 (pill); count badge 16 h filled radius 8; "Group" first; row ≈ 32 with 24 px avatar, 12/400; status 6 px dot + 11 word in green/red/blue filled pills radius 4; accent none |

DESIGN.md: `notion`: body-sm 14/400, body-sm-medium 14/500 (active sidebar, button labels), caption-bold 13/600 (badge labels), button-md 14/500; radius xs 4 · sm 6 · md 8 · lg 12 · xl 16; border hairline `#e5e3df`, hairline-soft `#ede9e4`, hairline-strong `#c8c4be`; spacing 4 · 8 · 12 · 16 · 20 · 24 · 32. `airtable`: body-md 14/400, caption 14/500; radius xs 2 · sm 6 (inputs) · md 10 · lg 12 · pill; border hairline `#dddddd`, border-strong `#9297a0`. `vercel`: body-sm 14/400 −0.28, caption 12/400, button-md 14/500; radius sm 6 (in-app nav buttons) · md 8 · pill 100; border hairline `#ebebeb`, hairline-strong `#a1a1a1`; inline gap 12–16, `--geist-gap` 24.

Range: toolbar 36–48 tall; controls 24–32 tall at 12 px, outlined on hairline, radius 4–6 (square dialect) or 16 (Deel pill dialect); applied state is either a token row (field + value-chip + ×, 24–28 h) or lives inside the selects with a count badge; the rule editor is a popover 300–500 wide with 26–32 px rows; sort/group/display sit right as 12 px text buttons or 16 px icons; accent only on the focused control's 2 px ring and the one create button.

## members and invitations

Queries: `workspace members settings page with a table of members, roles and pending invitations` · `invite team members dialog with email input and role dropdown` · `team member list with avatars, role selector per row and an invite button, dark mode`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Attio | [screen](https://mobbin.com/screens/4f090dd4-deb6-4eae-b0ed-6a9c653594c0) | one table holds members and pending invites; the row's overflow menu carries Resend / Copy link / Revoke | sidebar ≈ 260; content ≈ 720 max; search ≈ 32 h + Filter + primary Invite; row ≈ 40 (2.5 rows/100); avatar 20; body 13, uppercase header 11; role as gray chip 20 h; "Invite pending" blue chip is the only accent besides the primary; hairline rows only; radius 6; menu item 28, destructive red last |
| Dub | [screen](https://mobbin.com/screens/815a00a1-43c7-44ca-b86f-b9af461fbcb6) | Members / Invitations as underline tabs inside one card; invite meta ("Invited 2m") inline | sidebar ≈ 220; card ≈ 1080 wide, radius 10–12, hairline; card header 20/600 + 13 muted; row ≈ 64 (avatar 32, name 13/500 + email 12 muted); role text plain 12; black primary Invite + icon-only copy-link beside it; overflow menu radius 8 with red "Revoke invite" |
| Cal.com | [screen](https://mobbin.com/screens/a77637fa-823b-4b72-a6fe-4092d0710d7d) | bordered table with checkbox column, uppercase role badges, per-row icon acts | sidebar ≈ 215; toolbar controls 32 h (Search / Filter / Display / + Add black); header row gray fill 12/500; row ≈ 54; badge uppercase 10/600 tinted (OWNER blue, MEMBER gray); radius 6; hairline `#e5e7eb`; 1.9 rows/100 |
| Tailscale | [screen](https://mobbin.com/screens/5a7fb227-6974-4ddb-9437-34f7d93e336c) | dark render: invite call-outs as two hairline cards above the table, count chip "2 users" | no sidebar, top tabs; canvas ≈ `#1a1a1a`, cards same surface + hairline ≈ `#2a2a2a`; search 36 h + Status / Role filter buttons; uppercase header 11; row ≈ 62 with avatar 44; ink white / `#9a9a9a`; single blue primary; 1.6 rows/100 |
| Stripe | [screen](https://mobbin.com/screens/3fd05467-0d3e-424f-a76b-1bc3f4c44ec6) | invite dialog with chip email input, grouped role checklist and a role-description pane | dialog ≈ 1290 × 780, two panes split ≈ 55/45; email chips 24 h; role search 28 h; group headers gray fill 12/600; check rows ≈ 36, 13/400; Cancel + purple "Send invites" bottom-right 28 h; radius 6 |

DESIGN.md: `stripe`: type body-md 15/300, body-tabular 14/300, caption 13/400, micro 11/300, button-sm 14/400; radius xs 4 / sm 6 / md 8 / lg 12; border hairline `#e3e8ee`, hairline-input `#a8c3de`; spacing 2/4/8/12/16/24/32. `cal`: type body-sm 14/400, caption 13/500, button 14/600, nav-link 14/500, title-sm 16/600; radius 4/6/8/12/16/pill; border hairline `#e5e7eb`, hairline-soft `#f3f4f6`; surface-soft `#f8f9fa`; spacing 4/8/12/16/24/32/48.

Range: row 40–64 (invite rows carry a second line for email or "invited 2m"); body 13, meta 12, header 11 uppercase; radius 6–12; separation by hairline rows, at most one bordered card; accent on the single Invite primary and the "pending" chip; destructive act red and last in the row's overflow menu.

## version picker

Queries: `version history panel listing saved versions with timestamps and a restore button` · `dropdown to switch between versions or releases of a document or deployment` · `documentation site version selector menu showing v1, v2, latest, dark mode`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Vercel | [screen](https://mobbin.com/screens/7872f282-32c8-4dbe-bf80-a7fb36fb1833) | rollback dialog: current deployment shown read-only, targets as radio cards with a Current / Previous chip | dialog ≈ 470 wide, radius 8, hairline; radio card ≈ 85 h, 3 lines: id 13/500, commit 12, meta 12 muted with branch + avatar + age; chips 11 uppercase (Current black fill, Previous outline); reason textarea; Cancel + black Continue 32 h |
| Notion | [screen](https://mobbin.com/screens/780626a3-20f5-4795-ac3b-bdbaef325210) | history as a right panel of two-line entries with the selected one filled; single Restore act | panel ≈ 265 wide; entry ≈ 44 (2.3/100), time 13/500 + author 12 muted; selected entry gray fill radius 6, no border; hairline only at panel edge; blue Restore 28 h bottom-right; "Learn more" as link |
| Framer | [screen](https://mobbin.com/screens/6074cf77-b523-4ee5-8046-c7f108612cf6) | list + detail split: selected version outlined with a LIVE pill, detail as label/value stacks | list ≈ 330, detail ≈ 330; row ≈ 62 (age · author 13/500, "7 changes" 12 muted); selected row hairline card radius 8; LIVE blue pill 10/600; status chip READY; View button 28 h full width; 1.6/100 |
| Leonardo AI | [screen](https://mobbin.com/screens/e0cbc005-7d2a-47e3-b7de-33effee96097) | dark dropdown of numbered versions with dates, check on current | trigger ≈ 160 × 38, hairline, radius 6; menu ≈ 160 wide, 15 items ≈ 30 h (3.3/100), 12/400 "v1.5.6 - 14 Apr 2026"; check mark right on current; menu `#1a1a1a` + hairline `#2a2a2a` on canvas `#0f0f0f`; no accent inside the menu |
| Sana AI | [screen](https://mobbin.com/screens/0d1c373e-876d-48f2-b460-54aa375f8b35) | history grouped by day, "Current version" as plain text, restore promoted to the header | panel ≈ 340; group label 12 muted; entry ≈ 66 (date-time 13/500, author with avatar 12); selected entry soft fill radius 8; "Restore this version" black pill 32 h top-right; Highlight changes toggle in footer; 1.5/100 |

DESIGN.md: `vercel`: type body-sm 14/400, body-sm-strong 14/500, caption 12/400, caption-mono 12/400, code 13, button-md 14/500; radius 4/6/8/12/16/pill 100; border hairline `#ebebeb`, hairline-strong `#a1a1a1`; canvas-soft `#fafafa`; spacing 4/8/12/16/24/32/40/48. `notion`: type body-sm 14/400, body-sm-medium 14/500, caption 13/400, micro 12/500, micro-uppercase 11/600, button-md 14/500; radius 4/6/8/12/16/20/24; border hairline `#e5e3df`, hairline-soft `#ede9e4`, hairline-strong `#c8c4be`; surface `#f6f5f4`; spacing 4/8/12/16/20/24/32/40. `framer`: type body 15/400, body-sm 14/500, caption 13/500, micro 12/400, button 14/500; radius 4/6/10/15/20/pill 100; border hairline `#262626`, hairline-soft `#1a1a1a`; canvas `#090909`, surface-1 `#141414`, surface-2 `#1c1c1c`; spacing 4/8/12/15/20/30/40.

Range: entry 30 (single-line menu) to 44–85 (two- or three-line history cards); primary text 13/500 with 12 muted meta; radius 6–8; selection by soft fill or hairline outline, never accent fill; "current" marked by a chip or check, the accent reserved for the one Restore / Continue act.

## keyboard-first navigation

Queries: `command palette with keyboard shortcut hints next to each action, dark mode` · `keyboard shortcuts cheat sheet modal listing key combinations for navigating the app` · `issue list with a keyboard-selected row and shortcut key badges in the menu and toolbar`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Attio | [screen](https://mobbin.com/screens/fa567c5a-616d-4991-88fc-e2a047b5fcfd) | shortcut reference as a searchable side panel over the live table; sidebar shows ⌘K and / hints inline | panel ≈ 355; search 30 h; section labels 11 muted; row ≈ 28 (3.5/100), 12/400; keys as bordered chips 18 h, sequences written "G then N"; monochrome, no accent; table behind at row ≈ 34 |
| Supabase | [screen](https://mobbin.com/screens/9b4725f5-e038-4fc7-98ad-64a59f74b4d7) | palette groups Shortcuts / Queries / Actions, hints as plain two-key chords | palette ≈ 545 wide, radius 8, shadow, no border; input 40 h; group label 11 uppercase tracked; row ≈ 42 (2.4/100), 13/400; hints "O N" 11 mono right-aligned; hovered row gray fill |
| Fey | [screen](https://mobbin.com/screens/ff52ac90-4d18-4765-98da-df1e362a5ee1) | dark onboarding that teaches single-key acts; inline `space` kbd in the sentence | list row ≈ 40; key badges ≈ 22 square, hairline, 11; focused row blue outline 1 px on `#1a1a1a`; palette `#141414` + hairline; heading 22/500 warm gradient, body 12 muted |
| Juicebox | [screen](https://mobbin.com/screens/2af813bf-0129-45d1-81ed-069edee76e16) | keyboard-driven palette with a footer legend and a left-bar cursor row | palette ≈ 610; row ≈ 42, 13; selected row 2 px purple left bar + light fill; footer 30 h with kbd chips "↵ to select · ↑↓ to navigate · Tab to jump sections · ⌘K to toggle" 11 muted; radius 8 |
| Height | [screen](https://mobbin.com/screens/7816b00a-ce5f-4c54-99cc-60fd3d5c5ca2) | editable shortcut list: every command a row, chord as right-aligned gray text | modal ≈ 1160; nav column ≈ 260; search 28 h + "Show only custom" toggle; row ≈ 32 (3.1/100), icon 16 + 13/400; chord 12 muted "Cmd+Shift+1"; hairline rows; disclosure caret on grouped commands |

DESIGN.md: `supabase`: type body-md 16/400, button-md 14/500, caption 13/400, micro 12/400, code 14/400; radius 4/6/8/12/16; border hairline `#dfdfdf`, hairline-strong `#c7c7c7`, hairline-cool `#ededed`; canvas-night `#1c1c1c`, canvas-night-soft `#202020`; spacing 2/4/8/12/16/24/32.

Range: rows 28–42; body 12–13, hint 11 (mono or chip); key chips 18–22 h square-ish radius 4 with hairline, or plain muted text when the list is long; cursor row by soft fill, left accent bar or 1 px outline, never accent fill; footer legend 30 h repeats the navigation keys; sequences spelled "G then N" or "O N".

## dark mode

Queries: `dark mode project dashboard with sidebar, cards and a data table` · `dark theme settings page with form fields, section dividers and a save button` · `dark mode issue tracker list view with a dialog open on top showing layered surfaces`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Vercel | [screen](https://mobbin.com/screens/5bb75d66-7572-4f2e-a229-ebc54627343b) | pure-black canvas, cards and popover one step up, hairlines carry every edge | canvas ≈ `#000`, sidebar same; cards + popover ≈ `#0a0a0a`, 1 px hairline ≈ `#262626`; active nav item ≈ `#1a1a1a` fill; ink white / `#a1a1a1` / `#666`; body 13, label 12; card radius 8, menu item 32; accent only on status dots and one green "Alerts only"; card ≈ 375 × 245 |
| Linear | [screen](https://mobbin.com/screens/c968b3b2-82a5-4044-8e4a-0bec5683dec5) | settings groups as filled cards, no hairlines at all; three ink levels | sidebar ≈ 230 on `#191a1f`; content on same canvas; group cards ≈ `#1e2025` radius 8, separated by surface step; row ≈ 56 (title 13/500 + description 12 muted); section heading 13/500 above card; toggles blue only when on; selects hairline 28 h |
| Railway | [screen](https://mobbin.com/screens/348e2be0-dd9b-4e19-8722-c781bb191b34) | near-black canvas, cards and a menu each one step lighter with hairline | canvas ≈ `#0d0d0d`, sidebar same; card ≈ `#131313` + hairline ≈ `#262626`; popover ≈ `#141414` + hairline; ink white / `#8a8a8a`; nav row 28; card radius 6; accent purple on New button and avatar; warning banner yellow-tinted text on tinted fill |
| Vapi | [screen](https://mobbin.com/screens/34079984-55ad-40d8-8438-4aee7c8841e0) | dark table with a filter popover: popover steps up and outlines, badges stay dark chips | canvas ≈ `#0f0f0f`; popover ≈ `#1a1a1a` + hairline ≈ `#2e2e2e`, radius 8; table rows ≈ 88 (two-line), hairline ≈ `#1f1f1f`; chips dark fill 20 h; ink white / `#9a9a9a`; teal accent on Apply and New Monitor only; header 11 muted |
| Frame.io | [screen](https://mobbin.com/screens/6c486ec5-0a08-4528-98c4-48a824ec9db5) | three surfaces stepping lighter rail → sidebar → content, no hairlines between them | rail ≈ 60 `#111`, sidebar ≈ 265 `#161616`, content `#1a1a1a`; selected nav item outlined ≈ `#333` radius 6; search 28 h; row ≈ 40; header row hairline only; ink white / `#8a8a8a`; accent green on avatar only |

DESIGN.md: `vercel`: canvas `#ffffff`, canvas-soft `#fafafa`, canvas-soft-2 `#f5f5f5`, hairline `#ebebeb`, hairline-strong `#a1a1a1`, ink `#171717`, body `#4d4d4d` (light-mode file; the dark render steps canvas → card → popover the same way); radius 4/6/8/12/16; spacing 4/8/12/16/24/32. `linear.app`: canvas `#010102`, surface-1 `#0f1011`, surface-2 `#141516`, surface-3 `#18191a`, surface-4 `#191a1b`; hairline `#23252a`, hairline-strong `#34343a`, hairline-tertiary `#3e3e44`; ink `#f7f8f8`, ink-muted `#d0d6e0`, ink-subtle `#8a8f98`, ink-tertiary `#62666d`; primary `#5e6ad2`; type body-sm 14/400, caption 12/400, button 14/500, eyebrow 13/500, mono 13/400; radius 4/6/8/12/16/24; spacing 4/8/12/16/24/32/48.

Range: canvas `#000`–`#191a1f`; surfaces step +4 to +8 lightness per layer (canvas → card → popover), never more than three steps; hairlines `#1f1f1f`–`#34343a` (≈ 10–15 % lighter than the surface they sit on), some systems drop them and separate by step alone; ink three levels (`#f7f8f8`, `#a1a1a1`–`#d0d6e0`, `#62666d`–`#8a8f98`); accent one chromatic act or status dot per screen; radius 6–8.

## density

Queries: `dense data table with many rows of small text, compact row height and column headers` · `compact logs or events list with monospace timestamps and status badges, dark mode` · `spreadsheet-like CRM records grid with tight cells, tags and small controls`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Attio | [screen](https://mobbin.com/screens/b1f51bfb-4b7f-4d77-a7ce-9a1568db223e) | CRM grid: 34 px rows with chips and avatars still fitting | sidebar ≈ 260; filter bar controls 28 h; header 34, 12/500 with icons; row ≈ 34 (2.9/100); name 13/500, cells 13/400; chips 20 h tinted; avatar 16; hairline both axes ≈ `#ebebeb`; column menu radius 8, item 28; blue accent on Save only |
| Twenty | [screen](https://mobbin.com/screens/9557bbfb-3b7e-41d0-9daf-1362d3b8e686) | tightest CRM grid in the set: 31 px rows, 12 px text | sidebar ≈ 210; header 30; row ≈ 31 (3.2/100); text 12/400, name 12/500 with favicon 14; chips 18 h outline; hairline grid; field popover row 28; footer count 24 h; no accent inside the table |
| Railway | [screen](https://mobbin.com/screens/e4b50f41-977b-4733-881f-eb5e95612ef3) | log stream: 25 px mono rows, error rows tinted full width | filter input 32 h; row ≈ 25 (4.0/100); mono 12; columns Time / Service / Data; error rows red-tinted fill + red text, info rows plain; left 2 px blue tick per row; dark `#0d0d0d`; histogram 40 h above |
| Braintrust | [screen](https://mobbin.com/screens/55e7a8ff-e03c-49a3-9c6c-c0a3cc977170) | dataset grid with row-number gutter and truncated JSON cells | sidebar ≈ 200, detail panel ≈ 300; toolbar controls 26 h; header 30; row ≈ 36 (2.8/100); gutter 24 wide 11 muted; cell mono 12 truncated; hairline both axes; radius 4; accent absent |
| Clay | [screen](https://mobbin.com/screens/069a413b-290e-40d7-80d8-f7dc811268c9) | spreadsheet grid with status ticks in the header and enrichment columns | chat pane ≈ 440; header 30 + status strip 24; row ≈ 33 (3.0/100); text 12/400; row numbers 11 muted; full hairline grid; toolbar buttons 26 h radius 6; blue accent on Upgrade and Tools only |

DESIGN.md: `clay`: type body-sm 14/400, caption 13/500, caption-uppercase 12/600, button 14/600, nav-link 14/500; radius xs 6 / sm 8 / md 12 / lg 16; border hairline `#e5e5e5`, hairline-soft `#f0f0f0`; canvas `#fffaf0`, surface-soft `#faf5e8`; spacing 4/8/12/16/24/32/48.

Range: row 25 (mono logs) – 36 (grids with chips), 2.8–4.0 rows/100; controls 26–32 h; text 12–13 with 12/500 or 13/500 for the leading cell; header 30–34 at 11–12/500; chips 18–20 h; separation by full hairline grid; radius 4–6; accent kept out of the table body (one toolbar primary, status tints on whole rows).

## loading and pending

Queries: `skeleton loading placeholder rows in a list or table while content loads` · `button with inline spinner in a pending submitting state inside a form or dialog` · `deployment in progress status with a progress indicator and building steps, dark mode`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Neon | [screen](https://mobbin.com/screens/9b5b1374-c015-495b-abcb-9cce659c741b) | chrome and heading render first; table rows arrive as skeletons that mirror the columns | sidebar ≈ 235; h1 22/600 real; skeleton rows ≈ 44, hairline-separated; bars 12 h radius 4 ≈ `#e5e5e5`, one per column at column width, plus a 12 px circle for the status dot; header chips skeleton too |
| Railway | [screen](https://mobbin.com/screens/fca24d24-ab3c-4dec-a5d3-e90b18e90af1) | pending deployment as a second card above history with a DEPLOYING chip, step line and a toast | card ≈ 72 h radius 8; DEPLOYING chip blue-tinted 10/600 uppercase vs ACTIVE green; pending card border accent-tinted; sub-row "Deployment in progress: Pulling image…" 12 muted + chevron; canvas node shows "Online · Deploying (00:02)"; toast bottom-right ≈ 280 wide, dark surface, hairline, check icon + link |
| Webflow | [screen](https://mobbin.com/screens/8b7d9540-15cd-4752-9c8e-b9e3b14ed754) | publish progress as a 4-step checklist popover anchored to the Publish button | popover ≈ 375 wide, dark `#1e1e1e`, hairline; title 12/500; steps 19 h each, 11; active step spinner glyph + full ink, pending steps dash + dimmed; Close button 22 h bottom-right; no bar |
| Notion | [screen](https://mobbin.com/screens/2e595e28-1d50-4c6b-9737-7d88fe423a62) | form dims to ~40 % and a floating pill names the wait; primary keeps its spinner | pill ≈ 260 × 44, white, shadow, radius pill, 13 text + 14 spinner; primary button 32 h disabled blue tint with spinner glyph left of label; sidebar and fields all dimmed together |
| Assembly | [screen](https://mobbin.com/screens/1b2791e8-8b91-435d-a0e2-6855b4aec9f7) | button holds its size, label swaps for a centered ring spinner, fill lightens | card ≈ 500 wide radius 8 hairline; input 56 h; button ≈ 385 × 45 radius 4, fill desaturated green, 16 px ring spinner centered, no label |

DESIGN.md: `notion`: type body-sm 14/400, caption 13/400, micro 12/500, button-md 14/500; radius 4/6/8/12/16/20/24/full; border hairline `#e5e3df`, hairline-strong `#c8c4be`; surface `#f6f5f4`; spacing 4/8/12/16/20/24/32/40. `webflow`: type body-sm 14/400, caption 12.8/550, caption-mono 12/400, eyebrow-uppercase-sm 12/500, button-md 16/500; radius xs 2 / sm 4 / md 8; border hairline `#d8d8d8`; spacing 2/4/8/12/16/20/24/32.

Range: skeleton bars 12 h radius 4 at ≈ `#e5e5e5` on white, laid out at real column widths inside real row heights (44); pending buttons keep width and height and swap label for a 14–16 px spinner with a lightened fill; multi-step waits list steps at 19 h with the active step spinning and pending steps dimmed; page-level waits dim the form to ~40 % and float one pill; long-running work gets a chip (DEPLOYING) plus a timer or step text, and a toast confirms the start.
