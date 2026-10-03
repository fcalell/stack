# Picker and menu

The range a picker, a select or a menu is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

A dialect is the references' number where the system keeps its own; the [judging](../judging.md) page says which hold.

## Range

popover 215–300; items 28–34 one-line, 50 two-line; label at body (the references' 11–12 is a dialect; a menu label never differs from a list row's); search as the first 28 px row; radius 6–8, inner chips 4; shadow + hairline (dark: step only); selection a right checkmark or grey/tinted fill; groups by hairline or spacing.

## References

Queries: `dropdown select picker open with a search field, a list of options and a checkmark on the selected one` · `context menu opened on a row with icon items, separators, a submenu and keyboard shortcuts` · `dark mode assignee or status picker popover with avatars, search and selected item check` · `small popover to pick a label or priority: search input on top, icon list items, checkmark on selected item, keyboard number hints`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Notion | [screen](https://mobbin.com/screens/aea403dc-b079-460c-807a-0d4c515a5fb1) | property menu with a nested "Edit property" submenu; every item icon + label, groups split by spacing not lines | menu ≈ 235 wide; item ≈ 28; label 12/400; icon 14 muted; submenu offset flush to the parent row, ≈ 270 wide; radius 6; shadow + hairline; hover row = gray fill; text input inside the submenu with a blue focus ring; accent only on that ring and the "Now with agents" badge |
| Attio | [screen](https://mobbin.com/screens/a1cca18c-6359-46c4-a986-a46332943a05) | view picker with a search field at the top and a per-item "⋮" that opens a 4-item context menu beside it | picker ≈ 245; search row ≈ 28 (placeholder 12 muted, no border); item ≈ 28 with green view glyph; selected item = blue-tinted fill; "+ Create new view" as the last row; context menu ≈ 135, item ≈ 28, Delete in red; radius 6; shadow + hairline; body 12 |
| ClickUp | [screen](https://mobbin.com/screens/e9639493-e0a6-46c9-93d1-d3189cbdc3c7) | status picker: search input, grouped Not started / Active / Done, colored dot per status, toggle in the footer | popover ≈ 235; search ≈ 28 with hairline border radius 6; group label 9/500 uppercase muted; item ≈ 28 with 8 px dot; status label 10/600 uppercase in status color; footer toggle row ≈ 32 split by hairline; radius 8; shadow; accent = the status colors themselves |
| FLORA | [screen](https://mobbin.com/screens/08e9ad36-3602-45f8-b61c-fc7126ef1bac) | dark select: two-line items (name + meta chips), checkmark at the right of the selected one, trigger is a pill | popover ≈ 300; item ≈ 50; name 11/500, meta 10 muted in gray chips; selected row = lighter surface fill with ✓ right; trigger pill ≈ 28 with caret; radius 8; no visible hairline, surface step only; accent absent |
| Zapier | [screen](https://mobbin.com/screens/3cc85081-48d9-47f4-b4c8-e37d8108bc97) | column header menu with labelled groups (Sort / Create field / Zaps / Permissions) split by hairlines | menu ≈ 215; item ≈ 34; label 12/400 with 14 icon; group eyebrow 9/500 muted; separators hairline; radius 8; shadow + hairline; Delete field in default color, not red; accent blue only on the header's focus ring |

DESIGN.md: `notion`: type body-sm 14/400, caption 13/400, micro 12/500, micro-uppercase 11/600, button-md 14/500; radius xs 4, sm 6, md 8, lg 12; hairline `#e5e3df`, soft `#ede9e4`; spacing 4/8/12/16/20/24.

The references span: popover 215–300 wide; items 28–34 one-line, 50 two-line; label 11–12 with 9–10 uppercase group eyebrows; search field sits as the first row at 28, borderless or hairline; radius 6–8 with 4 on inner chips; lifted by shadow + hairline (dark: surface step only); selection is a checkmark right or a gray/tinted fill; groups split by hairline or by spacing; accent stays on status colors and focus rings.

Thin evidence: Mobbin surfaces icon pickers and multi-select dialogs; a Linear-style priority or assignee picker with number-key hints did not appear. The shortlist leans on column and property menus (Notion, Zapier, Attio), one status picker (ClickUp), one dark select (FLORA).
