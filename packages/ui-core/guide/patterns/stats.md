# Stats

The range a count strip and a lone display figure are measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

strip: one hairline card radius 8 split by 1 px rules, or one card per cell; cell padding 16–20; label 12–13 muted (11 caps in one) over the figure 18–26/400–500, a meta line 12 muted under it, a delta in a status hue only on its glyph; zeros drawn; two to a row at phone width, tiles radius 12–16 with a gap ≈ 10, label 12–17 muted, the figure 16–22/400–700 with its unit muted (MyFitnessPal, MacroFactor). Lone figure: 26–52/500–700 on the web, the largest text on its screen; figure first with its label 12 muted under it, or the label over it as a strip cell's. The phone's lone figure is unmeasured: no reference shows one figure alone on a phone screen.

## References

Queries: screens `project dashboard with a strip of stat cards in one hairline card, each a small label over a large number, split by vertical dividers` · `dark mode usage overview with a row of metric cells, each a muted label over a large tabular number with a sub-line like last 30 days` · `one very large number as the focal point of the screen with a short label under it, like a queue size or count of items waiting` · `Plain support queue overview with queue size figure and its words` · iOS `phone dashboard summary with a two by two grid of stat tiles, each a label and a large number`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Neon | [screen](https://mobbin.com/screens/1662d1cc-c43f-4227-91f1-bf6652b2146e) | The story's reference: one hairline card of counts split by vertical rules, a usage meta line under the row | card radius 8 hairline; cells split by 1 px rules; padding ≈ 20; label 13 muted with an info glyph; figure ≈ 18/500, its unit ("/ 10", "CU-hrs") muted; meta line 12 muted spanning the card |
| Mintlify | [screen](https://mobbin.com/screens/03b084b9-d5ed-41be-a9ca-43445af854f2) | Dark: five cells in a row, each its own card, a delta meta line | cards ≈ 210 × 115 radius 8 hairline, gap ≈ 8; padding ≈ 16; label 13 muted; figure ≈ 26/500; meta 12 muted with the delta's hue on its glyph only; empty meta drawn as "–" |
| Gorgias | [screen](https://mobbin.com/screens/141aad01-c51a-4c52-878f-ae96c045f999) | A band of four live counts split by rules under the header, zeros drawn | cells ≈ 120 tall, split by 1 px rules, no radius; label 11/600 caps tracked, centred; figure ≈ 24/400 centred; "0" shown in the body ink |
| Plain | [screen](https://mobbin.com/screens/58858c8e-032b-4cb9-ac14-fb6a078e024e) | The 003-56 reference: "Queue size 6 in todo right now", the figure with its words | label 12/500 over the figure; figure ≈ 24/500; its words 13 muted on the figure's baseline; no card, the chart under it |
| Aboard | [screen](https://mobbin.com/screens/310b0e18-6f92-4327-b4b7-a1150260624e) | One large figure heading a panel, three smaller counts under it | lone figure ≈ 52/500 under a period picker; sub-cells label 12 muted over figure ≈ 28/500, split by space only; panel radius 12 on a grey fill |
| Framer | [screen](https://mobbin.com/screens/a18a01d8-9f82-4605-b2c4-d54278f9f2b3) | Figure first, its label under it, three in a row | figure ≈ 26/700; label 12 muted under it; gap ≈ 36 between cells; no rules, no card |
| MyFitnessPal (iOS) | [screen](https://mobbin.com/screens/e7196f3f-6dcf-4b3b-a86e-ac1ca0310326) | Phone: each tile led by its figure, the predicate under it ("1,284 Remaining") | figure ≈ 22/700, its unit at body size; label 12 muted under it; tiles radius 16 |
| MacroFactor (iOS) | [screen](https://mobbin.com/screens/b745d030-38ff-4cb2-bc6d-98fc3c8e4b27) | Phone: counts two to a row | 2 × 2 tiles radius 12, gap ≈ 10; label 17/500 over a meta 13 ("Today"); figure ≈ 16/400 with its unit muted, at the tile's foot; empty value drawn as "---" |

DESIGN.md: none of the cited products is among those `VoltAgent/awesome-design-md` carries (Linear, Notion, Vercel, Supabase and Attio by the references page); Vercel's observability card draws label 12 over figure ≈ 14/500, a summary inside a card rather than a strip.

The references span: strip cells as one ruled card (Neon, Gorgias) or one card each (Mintlify), padding 16–20; label 12–13 muted over the figure 18–26/400–500; meta 12 muted, a delta's hue on its glyph; zeros and empty values drawn; on the phone two tiles to a row (MacroFactor, MyFitnessPal), radius 12–16, the figure 16–22/400–700. A lone figure 26–52 on the web at 500–700, figure first with its label under it in Framer, the label over it in Plain and Aboard; no reference holds a lone figure on a phone. Tabular figures cannot be read off the previews.
