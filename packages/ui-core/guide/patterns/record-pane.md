# Record pane beside a list

The range a record or its pane beside a list is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

list 375 (the contract's `w-list`), pane 300–395 beside the list at `wide` and a sheet below it; the record in the main headed at `heading` inside a Place, which owns the title; two-line rows 46–55; property rows 30–34 with label and value at 11–12; one large size (18/600 title); radius 4–6; hairline boundaries; selection grey fill or tinted fill with a left bar.

## References

Queries: `master-detail layout: list of records on the left and the selected record's detail pane on the right` · `inbox or issue list with a side panel showing the selected item's properties and activity` · `dark mode split view with a contact or customer list and an open record detail panel beside it`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338) | nav / inbox list / issue body / properties column, all split by hairlines; selected row is a plain gray fill | nav ≈ 235; list ≈ 375; properties column ≈ 300; list row ≈ 55 (title 13/500 + 12 muted line); issue title 18/600; body 13; property row ≈ 34, label 12/500 + value 12; 3 sizes; radius 4 on the selected row; no shadows; accent only on the yellow priority glyph and status dot |
| Twenty | [screen](https://mobbin.com/screens/601f66eb-0efb-4e92-a88e-38d29a5f9608) | side sheet slides over the table; tabs, collapsible field groups, inline-editable value (ARR input open) | sheet ≈ 395; property row ≈ 30; label 12/400 muted with icon, value 12/400; group heading 12/500 with collapse chevron; tabs 12; 2 sizes; radius 4; sheet separated by hairline + light shadow; inline input ≈ 28 with hairline and currency prefix; accent absent; footer "Open ⌘↵" as an outlined button |
| Lightfield | [screen](https://mobbin.com/screens/b47a2904-f608-414d-ac6c-241ff0642556) | account details as a fixed right pane over a table: label/value rows then related-record sections with "See all" | sidebar ≈ 235; pane ≈ 375; property row ≈ 34; label 11/400 muted with icon, value 11/400; section title 12/500; 2 sizes; tag chip blue-tinted radius 4; pane split by hairline; sections spaced by hairline + ≈ 24; accent blue only on the tag and the count badge |
| Clay | [screen](https://mobbin.com/screens/e99b385f-779a-434f-9db6-a9ca02201a1f) | dark: a bare name list with the record pane; eyebrow labels in caps, timeline as a dotted list | sidebar ≈ 195; list rows ≈ 46; pane ≈ 345; name 12/500 with small source glyphs; eyebrow 9/600 uppercase muted; body 12; 3 sizes; selected row = lighter surface fill spanning the row; hairline splits; radius 4; accent purple only on timeline glyphs and the network pill |
| Plain | [screen](https://mobbin.com/screens/03143e01-39f7-4352-a836-041ff5e3260e) | support inbox: thread list / activity / right panel of actions with kbd hints and customer cards | thread list ≈ 375, right panel ≈ 385; thread row ≈ 110 (multi-line, tags row); selected thread = blue-tinted fill + 2 px left accent bar; action row ≈ 28 with kbd chips 10; card title 12/500, label 11 muted; radius 6 on cards and chips; hairline everywhere; accent blue on selection, green on Done |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400, eyebrow 13/500, headline 28/600; radius xs 4, sm 6, md 8; hairline `#23252a`, strong `#34343a`; spacing 4/8/12/16/24/32. `clay`: type body-md 16/400, body-sm 14/400, caption 13/500, caption-uppercase 12/600, title-sm 16/600; radius xs 6, sm 8, md 12, lg 16; hairline `#e5e5e5`, soft `#f0f0f0`; spacing 4/8/12/16/24/32/48.

The references span: list 375, pane 300–395; list rows 46–55 for two-line items, up to 110 for message threads; property rows 30–34 with label 11–12 muted and value 11–12 at the same size; title 18/600 is the only large size; radius 4–6; every pane boundary is a hairline (a sheet adds a faint shadow); selection is a gray fill, or a tinted fill with a left bar where the accent is allowed; accent otherwise stays on status glyphs.
