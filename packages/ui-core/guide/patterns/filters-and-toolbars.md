# Filters and toolbars

The range filters or a toolbar is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

A dialect is the references' number where the system keeps its own; the [judging](../judging.md) page says which hold.

## Range

toolbar 36–48; on touch it wraps into rows, each row inside that range; controls 24–32 at body (the references' 12 is a dialect), outlined, radius 4–6 (or 16 pill dialect); applied filters as a row of the 20 px chip (the contract's applied-filter token; the references drew 24–28) or a count badge in the select; rule popover 300–500 with 26–32 rows; sort and display right as 12 text or 16 icons; accent only on the focused ring and the one create button.

## References

Queries: `filter bar above a data table with applied filter chips, search field, sort and view toggle buttons` · `toolbar with filter dropdown menu open listing filter fields, display options and group by controls` · `dark mode list header toolbar with filter chips, date range picker and column visibility controls`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Notion | [screen](https://mobbin.com/screens/d41e1c3f-7554-4129-af21-b8d1c8eace43) | "2 rules" blue chip opens a popover of rule rows Where/And · field · operator · value, each cell an outlined mini-select; "+ Filter" ghost; view icons right | toolbar ≈ 36 with view tab chip 26 h grey fill radius 6; rules chip 26 h blue fill `#e0efff` 12/500; popover ≈ 500 radius 8 hairline + shadow, rule row ≈ 32, selects 26 h 12 outline radius 4, value chip blue; "Add filter rule" 12 grey; delete row red text; icon cluster right 16 px; accent blue on "New" only |
| Airtable | [screen](https://mobbin.com/screens/8e0df9ce-81e6-4ffc-8ec8-5bc093db466f) | applied filters as 28 px outlined tokens ("Project Status is [Planning] or [In Progress]") holding value chips, a focused token gets a blue ring and opens a checkbox list with a search field | token ≈ 28 h, 12/400, hairline radius 6, inner value chips 18 h pastel; open token ring 2 px `#2d7ff9`; popover ≈ 300 radius 8, search 32, rows 26 with 14 px checkbox, footer "Assigned Designers is ▾" 12; toolbar right: Group · Filter · Sort as 12 text buttons + icons; accent blue on focus and "Add project" |
| Vercel | [screen](https://mobbin.com/screens/e9576405-bcef-419a-922a-8fb84b044a54) | dark toolbar of equal-height outlined selects (date range, authors, environments, repos, branches) plus a "Status 5/6" select carrying a colour-dot stack | control ≈ 32 h, 12/400 placeholder grey, 1 px `#333` radius 6, 16 px leading icon, 8 px gutter; six controls fill the width evenly; no applied-chip row, the state lives in the selects; list below with 1 px `#2e2e2e` rows; accent none in the toolbar |
| Aboard | [screen](https://mobbin.com/screens/43b940cb-28a4-42b5-9974-2073b895ad66) | applied filters as icon + field + [value chip] + × tokens on one row with "+ Add filter" ghost, table header directly under | token ≈ 24 h, 12/400 label, value as 18 h grey fill chip radius 4, × 12 px; token background grey `#f3f4f6` radius 6; "Add filter" 12 grey with plus; header row 11 grey 32 h; row 34; status chip green fill radius 4; accent none |
| Deel | [screen](https://mobbin.com/screens/fd251a0e-8b5f-4889-9446-040dd33f374e) | dark people table: toolbar is a pill row of outlined 32 px filter selects ("Worker status 15 ▾" with a count badge), search icon-button first, "View as report" / "Configure columns" flat buttons right | toolbar ≈ 48 pill on a 1-step surface; select 32 h, 12/400, 1 px `#3a3a3a` radius 16 (pill); count badge 16 h filled radius 8; "Group" first; row ≈ 32 with 24 px avatar, 12/400; status 6 px dot + 11 word in green/red/blue filled pills radius 4; accent none |

DESIGN.md: `notion`: body-sm 14/400, body-sm-medium 14/500 (active sidebar, button labels), caption-bold 13/600 (badge labels), button-md 14/500; radius xs 4 · sm 6 · md 8 · lg 12 · xl 16; border hairline `#e5e3df`, hairline-soft `#ede9e4`, hairline-strong `#c8c4be`; spacing 4 · 8 · 12 · 16 · 20 · 24 · 32. `airtable`: body-md 14/400, caption 14/500; radius xs 2 · sm 6 (inputs) · md 10 · lg 12 · pill; border hairline `#dddddd`, border-strong `#9297a0`. `vercel`: body-sm 14/400 −0.28, caption 12/400, button-md 14/500; radius sm 6 (in-app nav buttons) · md 8 · pill 100; border hairline `#ebebeb`, hairline-strong `#a1a1a1`; inline gap 12–16, `--geist-gap` 24.

The references span: toolbar 36–48 tall; controls 24–32 tall at 12 px, outlined on hairline, radius 4–6 (square dialect) or 16 (Deel pill dialect); applied state is either a token row (field + value-chip + ×, 24–28 h) or lives inside the selects with a count badge; the rule editor is a popover 300–500 wide with 26–32 px rows; sort/group/display sit right as 12 px text buttons or 16 px icons; accent only on the focused control's 2 px ring and the one create button.
