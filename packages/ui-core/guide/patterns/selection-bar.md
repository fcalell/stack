# Selection bar

The range a selection bar (the count of chosen rows and the act that applies to them, docked at a list's foot) is measured against in a [design critique](../design-critique.md), and the executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

bar 38–52 tall, docked at the list's foot or floating 8–16 above it, centred, 255–565 wide on the desktop (a table-wide bar to ≈ 1060), radius 8 to pill, on a raised surface with a hairline and shadow or an ink fill; count "N selected" at 12–13/400–500 at the bar's start, a clear act (× or "Deselect all") beside it; one act at 28–34, the bar's only filled control; on touch the act stands full width 44–48 at the foot inset 16, the count at 12–13 above the list or in the act's label.

## References

Queries: screens `list or table with several rows selected and a bar docked at the bottom showing the selected count and an action button` · `dark mode developer tool list with checked items and a floating bottom bar reading "3 selected" with a primary action` · (iOS) `list with checked rows and a bottom bar showing how many are selected with a full-width action button`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/3f36e39e-2b9e-4145-bee2-f43a3cf21f7b) | Floating pill over the issue list: "6 selected", a count chip, a clear ×, then one Actions button | bar ≈ 255 × 40, pill, raised with hairline and shadow, ≈ 12 above the list's foot; count 12/500; Actions ≈ 28 neutral |
| Midday | [screen](https://mobbin.com/screens/2374dd24-e3bc-459d-a17f-99d82c043493) | Docked inside the table's foot: "9 selected", "Deselect all" text, one dark Download | bar ≈ 375 × 42, radius 4, wash surface; count 13/400; Deselect 13 text; Download ≈ 34 filled ink, the one filled control |
| Mercury | [screen](https://mobbin.com/screens/3380c227-a662-426a-8bcb-70e1d20ba4e1) | Floating pill: "2 selected", an inline GL Code picker, three icon acts, a close × | bar ≈ 565 × 50, pill, raised with shadow, ≈ 16 above the foot; count 13/400; picker ≈ 30; icon acts ≈ 28 |
| YNAB | [screen](https://mobbin.com/screens/13e2610f-4a0c-4a66-8c5c-e07d1615eb61) | Ink-filled bar: "× 3 Transactions", then Approve, Reject, Categorize and More as icon + label acts | bar ≈ 490 × 40, radius 8, dark ink fill; count 12/500 with its clear × leading; acts 12 text, none filled |
| ClickUp | [screen](https://mobbin.com/screens/e9639493-e0a6-46c9-93d1-d3189cbdc3c7) | Table-wide dark bar: "3 Tasks selected ×" chip, then eight icon + label acts | bar ≈ 1060 × 38, radius 8, ink fill; count 12/500 in a chip; acts 12; the widest execution, a toolbar more than an act |
| Posh | [screen](https://mobbin.com/screens/b6063974-b665-4dc9-8320-c7f2879583c5) | Dark: "3 Attendees Selected" beside one white pill act, docked at the page foot with no surface | count 13/600 (also repeated over the table); act ≈ 155 × 40 pill, white on black, the one filled control; no bar surface |
| eBay (iOS) | [screen](https://mobbin.com/screens/56d550db-b07a-4074-9468-0c5dcebdd907) | Touch: "1 item selected" over the list, one full-width "Add items" at the foot | count 12/400 above the list; act ≈ 47 pt tall pill, full width inset 16, accent fill |
| Alta (iOS) | [screen](https://mobbin.com/screens/5140c386-cd5c-4abd-81b8-2b8e5c553b99) | Touch: "3 selected" in the top bar, the act carries the count, "Style 3 items", floating above the tab bar | count 15/600 top; act ≈ 160 × 49 pt pill, ink fill, floating ≈ 12 above the tab bar |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400 lh 1.4, eyebrow 13/500 +0.4, button 14/500; radius xs 4 · sm 6 · md 8 · lg 12 · pill; border hairline `#23252a`, hairline-strong `#34343a`; spacing 4 · 8 · 12 · 16 · 24 · 32 · 48.

The references span: bar 38–52 tall (ClickUp 38, Mercury 50), floating 8–16 above the list or docked in its foot, 255–565 wide (ClickUp's table-wide 1060 the outlier), radius 4 to pill; count "N selected" 12–13 at 400–600 leading the bar, its clear act beside it; one filled act at 28–34 where the bar has one act, icon + label acts with none filled where it has many; on touch a full-width act 47–49 pt at the foot inset 16, the count at 12–15 above the list or inside the act's label.
