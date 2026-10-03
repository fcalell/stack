# Board columns

The range a board of columns is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

column 260–350, gutter 12–16; header 30–40 at 13–14/500–600 with muted count; card radius 6–8 on hairline, padding 10–12, 40–150 tall; title 13/400–500, meta 11; well one surface step or nothing; accent only on create.

## References

Queries: `kanban board with status columns of task cards, column headers with counts and add buttons` · `project board view of issues in columns Todo In Progress Done with priority icons, labels and assignee avatars on cards` · `dark mode kanban board columns with draggable cards`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/410846e7-09d4-4ed8-baf2-ec94d96c29f4) | columns as slightly grey wells, header "◐ In Progress 3 ··· +", cards white on hairline with ID · parent, status icon + title, then priority, label chips, "Created Mar 31" | sidebar ≈ 220; column ≈ 320 with 12 px gutter; header ≈ 36, 13/500 + count 12 grey; card ≈ 100, padding 12, radius 6, hairline `#e5e5e5`; ID 11 grey mono-ish, title 13/500, meta 11; label chips outlined radius 4 with 6 px colour dot; avatar 18 top-right; "Hidden columns" list at right; accent none |
| Linear (dark) | [screen](https://mobbin.com/screens/720724d3-f686-457f-8c00-fa7efa409b12) | same board on `#191a1d`; cards `#1f2023` with 1 px `#2a2b2f`, column well barely lighter than canvas | column ≈ 330; card ≈ 84–120 radius 6; title 13/500 `#eeeeee`, meta 11 `#8a8f98`; label chips outlined `#2f3035` radius 4 with dot; filter tabs "All issues / Active / Backlog" as 26 h pills; accent none, colour only in the status icons |
| Asana | [screen](https://mobbin.com/screens/e51854b0-c808-437e-ad96-fe406f23e986) | dark board, cards with a 4 px coloured top stripe, filled colour tags (Medium/Rejected), avatar and date, "Add task" ghost row per column | sidebar ≈ 230; column ≈ 300; header ≈ 40, 14/500 + count; card ≈ 150 radius 8, surface `#2a2b2d` on `#1e1f21`, hairline `#3a3b3d`; title 13/400, tags ≈ 20 h 11/500 filled radius 4; avatar 24; accent orange only on "Add billing info" |
| Plane | [screen](https://mobbin.com/screens/69990ffa-9153-4bf1-bb53-87317f9e040f) | dense cards: ID, title, then a row of 6–7 property chips (state, priority, date, assignee, estimate) each an outlined 22 px control | sidebar ≈ 300; column ≈ 350; header ≈ 36, 13/500 with icon, count, ↔ and +; card ≈ 90 radius 6 hairline; ID 11 grey, title 13/500, chips ≈ 22 h 11 outline radius 4; inline "New work item" composer card; accent blue only on "Add work item" |
| Todoist | [screen](https://mobbin.com/screens/fd3b9b17-1333-427b-b93b-5152cdc39f8b) | minimal light board: section title + count, cards with circle check + title, meta line of small icons/dates, "Add task" red-plus row | sidebar ≈ 270; column ≈ 260, no well fill, columns separated by whitespace only; header ≈ 30, 13/600; card ≈ 40–80 radius 8 hairline; title 13/400, meta 11 with red date when due; check circle 16 with priority colour; accent red on the add-task plus |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400, eyebrow 13/500, button 14/500; radius xs 4 · sm 6 · md 8 · lg 12; border hairline `#23252a`, hairline-strong `#34343a`; spacing 4 · 8 · 12 · 16 · 24 · 32 · 48.

The references span: column width 260–350 with 12–16 px gutters; column header 30–40 at 13–14/500–600 with a muted count; card radius 6–8 on hairline, padding 10–12, height 40–150 by property count; title 13/400–500, ID/meta 11; column well is either a 1-step surface (Linear, Plane) or nothing (Todoist); accent only on the create act.
