# Density

The range a dense data view is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

rows 25–36, 2.8–4.0 per 100 px; controls 26–32; text 12–13 with the leading cell at 500; header 30–34 at 11–12/500; chips 18–20; full hairline grid; radius 4–6; accent out of the body except on checked controls.

## References

Queries: `dense data table with many rows of small text, compact row height and column headers` · `compact logs or events list with monospace timestamps and status badges, dark mode` · `spreadsheet-like CRM records grid with tight cells, tags and small controls`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Attio | [screen](https://mobbin.com/screens/b1f51bfb-4b7f-4d77-a7ce-9a1568db223e) | CRM grid: 34 px rows with chips and avatars still fitting | sidebar ≈ 260; filter bar controls 28 h; header 34, 12/500 with icons; row ≈ 34 (2.9/100); name 13/500, cells 13/400; chips 20 h tinted; avatar 16; hairline both axes ≈ `#ebebeb`; column menu radius 8, item 28; blue accent on Save only |
| Twenty | [screen](https://mobbin.com/screens/9557bbfb-3b7e-41d0-9daf-1362d3b8e686) | tightest CRM grid in the set: 31 px rows, 12 px text | sidebar ≈ 210; header 30; row ≈ 31 (3.2/100); text 12/400, name 12/500 with favicon 14; chips 18 h outline; hairline grid; field popover row 28; footer count 24 h; no accent inside the table |
| Railway | [screen](https://mobbin.com/screens/e4b50f41-977b-4733-881f-eb5e95612ef3) | log stream: 25 px mono rows, error rows tinted full width | filter input 32 h; row ≈ 25 (4.0/100); mono 12; columns Time / Service / Data; error rows red-tinted fill + red text, info rows plain; left 2 px blue tick per row; dark `#0d0d0d`; histogram 40 h above |
| Braintrust | [screen](https://mobbin.com/screens/55e7a8ff-e03c-49a3-9c6c-c0a3cc977170) | dataset grid with row-number gutter and truncated JSON cells | sidebar ≈ 200, detail panel ≈ 300; toolbar controls 26 h; header 30; row ≈ 36 (2.8/100); gutter 24 wide 11 muted; cell mono 12 truncated; hairline both axes; radius 4; accent absent |
| Clay | [screen](https://mobbin.com/screens/069a413b-290e-40d7-80d8-f7dc811268c9) | spreadsheet grid with status ticks in the header and enrichment columns | chat pane ≈ 440; header 30 + status strip 24; row ≈ 33 (3.0/100); text 12/400; row numbers 11 muted; full hairline grid; toolbar buttons 26 h radius 6; blue accent on Upgrade and Tools only |

DESIGN.md: `clay`: type body-sm 14/400, caption 13/500, caption-uppercase 12/600, button 14/600, nav-link 14/500; radius xs 6 / sm 8 / md 12 / lg 16; border hairline `#e5e5e5`, hairline-soft `#f0f0f0`; canvas `#fffaf0`, surface-soft `#faf5e8`; spacing 4/8/12/16/24/32/48.

The references span: row 25 (mono logs) – 36 (grids with chips), 2.8–4.0 rows/100; controls 26–32 h; text 12–13 with 12/500 or 13/500 for the leading cell; header 30–34 at 11–12/500; chips 18–20 h; separation by full hairline grid; radius 4–6; accent kept out of the table body (one toolbar primary, status tints on whole rows).
