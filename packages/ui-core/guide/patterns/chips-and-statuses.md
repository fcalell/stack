# Chips and statuses

The range chips or statuses is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

16–22 tall at 10–12, padding 6, radius 3–4 outlined or pill filled; dialects: dot + grey text on hairline, soft fill with hue-darkened text, saturated fill for one exceptional state; a 6 px dot or 3 px row edge may carry status alone; accent never on a chip, and only the `active` status dot wears it.

## References

Queries: `status badges and tag chips in a list, colored dot with label like Active, Pending, Failed` · `table of deployments or payments with status pill badges Succeeded Failed Canceled in green red gray` · `dark mode list rows with small status badges and removable label chips with x`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/212fda35-366e-4dc0-a1d1-3b679659d6ab) | labels as outlined chips with a 6 px colour dot and grey text, dates as outlined chips with a calendar icon; status is an icon, never a word | row ≈ 32 (≈3.1 rows/100 px), 13/400 title; chip ≈ 20 h, 11/400 grey, 1 px hairline `#e5e5e5`, radius 4, padding 6, dot 6 px in the label colour; status icon 14 (circle, half-circle); priority as 3-bar glyph; avatar 18; accent none |
| Vercel | [screen](https://mobbin.com/screens/e9576405-bcef-419a-922a-8fb84b044a54) | dark deployment list: status as 6 px dot + word (green Ready, red Error) with duration under it; "Current" blue filled chip and "Rolled Back" red filled chip inline | sidebar ≈ 220; row ≈ 66 (2 lines), 13/500 id, 12 muted; dot-status 12/400; chip ≈ 18 h, 11/500, radius 4, filled `#1e3a8a`-class blue / `#7f1d1d`-class red with light text; commit hash 12 mono; hairline `#2e2e2e` rows; toolbar of 32 h outlined selects radius 6; accent only on the blue Current chip |
| Airtable | [screen](https://mobbin.com/screens/56681290-7954-4b16-b6f6-daf753c2c0fc) | select-field chips as soft pastel fills (blue In Progress, green Planning) with text darkened to the hue; collaborator names as grey chips; applied filter shows the chip inside the toolbar | row ≈ 34; chip ≈ 20 h, 11.5/400, radius 10 (near-pill), fill `#cfe3ff`-class / `#d1f0d1`-class with dark text, padding 6; grey member chip `#eeeeee`; header 11 grey; hairline `#e5e5e5`; accent none in the grid |
| PlanetScale | [screen](https://mobbin.com/screens/be0ec4c5-4a49-4f4a-8a29-179143a514c5) | "Deployed" outlined grey chip fused with a timer chip "29:45 ⟳" in pale blue, a tabs row with count chips, warning banner in yellow with a hairline | row ≈ 40; chip ≈ 22 h, 12/400, radius 4 outline `#d4d4d4`; timer chip pale blue fill `#dbeafe` radius 4; tab count chips 16 h grey fill radius 8; branch names 12 mono blue; banner yellow `#fefce8` with `#fde68a` hairline radius 6; accent none |
| Sentry | [screen](https://mobbin.com/screens/230a355d-3b80-430d-8d18-0b4fa6198768) | dark issues feed: a 3 px coloured left bar on the row as the severity, "[Filtered]" / "Unhandled" as 10 px outlined micro-tags, applied filter `is: unresolved ×` as an inline token in the search field | row ≈ 84 (2 lines), title 13/600, subtitle 12; micro-tag ≈ 16 h, 10/500, radius 3, 1 px `#4a4560`; search token ≈ 20 h, 11, purple fill `#3f2f6b`-class radius 4 with ×; priority and assignee as 24 h outlined dropdown chips radius 6; canvas `#1e1730`; accent purple on the "Save As" button only |

DESIGN.md: `linear.app`: caption 12/400, eyebrow 13/500 +0.4; radius xs 4 (small chips, status badges) · sm 6 (inline tags) · pill (status pills); border hairline `#23252a` (dark). `vercel`: caption 12/400 lh 16 (badge labels), caption-mono 12/400, body-sm 14/400 −0.28; radius xs 4 · sm 6 · md 8 · pill 100; border hairline `#ebebeb`, hairline-strong `#a1a1a1`; spacing 4 · 8 · 12 · 16 · 24. `airtable`: body-md 14/400 lh 1.25, caption 14/500 +0.16; radius xs 2 · sm 6 · md 10 · lg 12 · pill 9999; border hairline `#dddddd`, border-strong `#9297a0`; surface-soft `#f8fafc`. `sentry`: micro-cap 10/600 +0.25 (status labels, badge text), body-md 16/500; radius xs 4 (badges, status pills) · sm 6 · md 8 · lg 10 · xl 12; spacing 2 · 4 · 8 · 12 · 16 · 24.

The references span: chip 16–22 px tall at 10–12 px type, padding 6, radius 3–4 (outlined dev tools) or 10–pill (pastel-filled data tools); three chip dialects: dot + grey text on hairline (Linear, Vercel status), soft pastel fill with hue-darkened text (Airtable, PlanetScale timer), filled saturated with light text for one exceptional state (Vercel Current / Rolled Back); status also carried by a 6 px dot or a 3 px row edge without any chip; accent never on the chip set.
