# Node canvas

The range a node canvas is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

dot grid 14–20 at 1 px on a canvas one step off; nodes radius 6–10 hairline, 44–130 tall (media to 400); eyebrow 10–11 + title 12–13/500; ports 8 hollow; edges 1–1.5 grey, dashed inactive; selection a 1.5 px accent outline; zoom stack 28–36 buttons; accent only on selection and run.

## References

Queries: `workflow automation builder canvas with connected nodes and edges, trigger and action blocks` · `node graph editor on a dotted grid canvas with zoom controls and a side panel for node settings` · `dark mode node-based pipeline canvas with cards linked by curved connectors`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Twenty | [screen](https://mobbin.com/screens/539342b6-0804-4bdb-ac10-719181d348a3) | compact nodes (eyebrow "Trigger"/"Action" + one-line title), straight-then-curved grey edges with "if"/"else" labels, selected node gets a blue outline, config panel right | sidebar ≈ 200; canvas dot grid ≈ 16 px on `#fcfcfc`; node ≈ 160 × 48, radius 6, hairline, eyebrow 10/500 grey, title 12/500; edge 1 px `#c8c8c8`; selection 1.5 px blue `#3b82f6`; panel ≈ 380 with tabs 13; Draft chip yellow; "+" add handle 12 below the leaf; accent blue only on selection and "View role" |
| Plain | [screen](https://mobbin.com/screens/fc2573d6-f22b-42b5-bc94-f6917a39649c) | Start node with an inner "Manual" field, If/else node with two labelled ports, port handles as 8 px hollow circles, mini-map bottom right, zoom stack bottom left | icon rail ≈ 56; canvas dot grid ≈ 14 px on `#f9f9f9`; node ≈ 300 × 130, radius 8, 1 px hairline, header 13/500 with icon, inner rows 12 in hairline boxes radius 4; selected outline 1.5 px blue-violet; edges 1 px grey; zoom buttons 28 stacked; panel ≈ 380; accent black "Create" only |
| Railway | [screen](https://mobbin.com/screens/2128d232-ce9a-4743-8a7a-60985142c234) | dark service canvas: two 32 px-headed cards (service name + domain, status dot row), dashed arrow edge, faint dot grid | canvas `#0b0d12` dots `#1d2029`; card ≈ 270 × 130, radius 8, 1 px `#262a33`, surface `#12151b`; title 13/600, subtitle 11 grey; status row 12 with 6 px dot (green Online, "Completed" check); attached volume as a second row on the card; edge 1 px dashed `#3a3f4b` with arrowhead; zoom stack bottom-left 28; accent none |
| Runway | [screen](https://mobbin.com/screens/7453b57a-8270-47bd-8fbd-2c69c60396da) | light creative canvas: white node cards with 12 px header row and a "Run" pill inside, green edge with hollow 8 px port circles, floating node-picker menu, bottom toolbar | rail ≈ 60; dot grid ≈ 20 px on `#f5f5f5`; node ≈ 300 × 400 (image preview), radius 10, hairline + soft shadow; header 12/500; ports 8 px circles on the card edge; edge 1.5 px green `#22c55e`; picker menu ≈ 280 radius 10, rows 40 with 24 px icon + 12/500 + 11 grey; bottom toolbar 40 h pill; accent black "Run all" |
| AirOps | [screen](https://mobbin.com/screens/ff79a5c0-07ad-4a62-b1b4-189e90c55c88) | vertical step list on a canvas: each node has eyebrow "LLM · Claude…" + title + right-aligned "Step n" chip, loop drawn as a dashed pink rectangle around grouped steps | copilot pane ≈ 400; dot grid ≈ 16 on `#fafafa`; node ≈ 260 × 44, radius 8, hairline; eyebrow 10 grey, title 12/500, step chip 11 grey outline radius 4; selected node outline blue; loop group 1 px dashed `#e879f9` radius 8 with a "Loop" tag; edges 1 px grey with 6 px dots; zoom toolbar bottom 36 h; accent green "Publish" only |

DESIGN.md: none of the shortlisted apps has a file.

The references span: dot grid 14–20 px at 1 px dots on a canvas one step off white or `#0b0d12`; nodes radius 6–10 on 1 px hairline, 44–130 px tall for logic nodes, up to 400 for media; eyebrow 10–11 + title 12–13/500; ports 8 px hollow circles; edges 1–1.5 px grey (dashed for inactive, brand-green for data); selection is a 1.5 px accent outline; zoom stack of 28–36 px buttons bottom-left or a bottom pill toolbar; accent only on selection and the run/publish act.
