# Data table with inline edit

The range a data table or an inline cell edit is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

rows 30–37, header 30–34; body 11–13, header 11–12 muted never bold; cell padding 6–8 × 10–12; radius 4 cells and pills, 6 popovers; hairline grid (both axes in editors, horizontal only in lists); hover a surface step; edit state a tinted row or a focused cell ring; accent only on the primary act, checked row boxes and status tints.

## References

Queries: `data table with an editable cell in focus, column headers and row hover, spreadsheet-like grid` · `database table editor where a cell is being edited inline with a dropdown of options` · `dark mode table view of records with status badges, checkboxes, and an inline text cell edit`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Supabase | [screen](https://mobbin.com/screens/a454c054-f6e8-41aa-a86c-41e774222935) | database grid: column type in mono next to the name, checkbox column, full hairline grid, dark | header ≈ 34; row ≈ 34; body 12/400, header name 12/500 + type 11 mono muted; 2 sizes; cell padding ≈ 8×12; left-aligned text, numbers left too; full grid hairlines both axes; row hover = surface step; radius 4 on tabs; accent green only on Insert; ≈2.9 rows/100 px |
| Twenty | [screen](https://mobbin.com/screens/36b0d5c8-9550-44ee-b7a0-30f8d10f2eed) | CRM table where every header is icon + label and domains render as pill chips; footer aggregate row | header ≈ 30; row ≈ 32; body 12/400, header 12/400 muted; chip 11 in pill radius; checkbox ≈ 12; cell padding ≈ 6×10; hairline grid both axes; numbers left-aligned; "+ Add New" as a ghost row; accent absent; ≈3.1 rows/100 px |
| Notion | [screen](https://mobbin.com/screens/83e2d66a-d836-406f-b72d-d5bc20e1d16f) | inline edit chain: header menu → Edit property → option list with color swatches; select values as tinted pills | row ≈ 36; header 12/400 muted with type icon; body 13/400; pill 12 in radius 4 with tinted fill; menu ≈ 235 wide, item ≈ 28, radius 6, shadow + hairline; grid = horizontal hairlines + vertical hairlines; accent blue only on New; ≈2.8 rows/100 px |
| Airtable | [screen](https://mobbin.com/screens/7daee7a7-054f-428c-8123-072df3912f0c) | dark records list with status pills, no vertical grid lines, numbers plain | header ≈ 30, header 11/400 muted; row ≈ 37; body 12/400; status pill 11 with tinted fill radius 4; assignee chips gray fill; cell padding ≈ 8×12; horizontal hairlines only; row hover = surface step; accent absent in the table (green/blue/orange only as status tints); ≈2.7 rows/100 px |
| Neon | [screen](https://mobbin.com/screens/af53a8bf-e592-450d-9edd-cd5ae8cf076d) | pending-edit state: the edited row turns amber, a date picker pops from the cell, Save changes / Discard appear in the toolbar | header ≈ 32 with name 11/500 + type 10 mono; row ≈ 30; body 11 mono; edited row = amber tint fill across the row; picker ≈ 350 wide, radius 6, shadow; Save = green primary, Discard = underlined text; hairline grid; accent green only on Add record / Save; ≈3.3 rows/100 px |

DESIGN.md: `supabase`: type caption 13/400, micro 12/400, code 14/400, button-md 14/500; radius xs 4, sm 6, md 8; hairline `#dfdfdf`, cool `#ededed`, strong `#c7c7c7`; spacing 2/4/8/12/16/24. `notion`: type body-sm 14/400, caption 13/400, micro 12/500, micro-uppercase 11/600; radius xs 4, sm 6, md 8; hairline `#e5e3df`, soft `#ede9e4`, strong `#c8c4be`; spacing 4/8/12/16/20/24. `airtable`: type body-md 14/400, caption 14/500, label-md 16/500; radius xs 2, sm 6, md 10, lg 12; hairline `#dddddd`, border-strong `#9297a0`; spacing 4/8/12/16/24/32.

The references span: rows 30–37, headers 30–34; body 11–13 with header 11–12 muted (one size below body or equal, never bold); cell padding ≈ 6–8 × 10–12; radius 4 on pills and cells, 6 on popovers; grid is hairline both axes in editors, horizontal-only in record lists; hover is a surface step, edit state a tinted row (amber) or focused cell ring; accent appears only on the primary act (Insert / Save / New) and as status tints.
