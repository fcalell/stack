# Diff and code

The range a diff or a code block is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

line 17–19 at mono 10.5–12; file header 32–40; full-row fills (`#dcfce7`-class add, `#fde2e1`-class remove), 3 px edge bar when split; gutter 40–56 grey; outer card hairline, radius 0–10; accent only on the one commit act.

## References

Queries: `code diff view with added and removed lines highlighted in green and red, line numbers, file header` · `pull request review page showing file changes with syntax highlighted code and inline comments` · `dark mode code editor panel with monospace syntax highlighted code block and copy button`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Graphite | [screen](https://mobbin.com/screens/c9c3a747-80fc-420d-9eec-961a9ca2d5dc) | unified diff with a sticky per-file header that carries language, +30, Viewed checkbox and overflow; the whole hunk is one pale-green fill | icon rail ≈ 48; file header ≈ 40, body 12/500; line ≈ 19 (≈5.2 rows/100 px), mono ≈ 12; gutter ≈ 56 with grey numbers; added fill ≈ `#dcfce7`, hunk separated by hairline + radius 6; one type size in the code, two in chrome; accent only on the blue Publish button |
| Devin | [screen](https://mobbin.com/screens/943c5aac-94ad-4e06-bbab-70d3a88e3fa1) | side-by-side split, file tree with +89 −53 counts per file, an inline "Investigate" thread anchored to a changed line | sidebar ≈ 200; file-tree row ≈ 28, 12/400 with green/red counts; split panes each ≈ 380; line ≈ 19, mono ≈ 11.5; changed line blue-tinted with a bold blue left bar ≈ 3; thread card white on hairline radius 8; file header ≈ 36 with "Mark as viewed" checkbox |
| Mintlify | [screen](https://mobbin.com/screens/75a194a1-ad5f-44e0-b8eb-6f78bd5598ee) | split diff with a "10 unmodified lines" collapse row, removed rows in pink fill with a red marker bar, added rows green with a green marker bar | chat pane ≈ 400, file tree ≈ 240, diff ≈ 800; line ≈ 19, mono ≈ 11.5; removed `#fde2e1` with a 3 px `#ef4444` edge, added `#dcfce7` with a 3 px `#22c55e` edge; collapse row grey fill ≈ 24; radius 0 inside the pane; accent on the green Publish only |
| Cursor | [screen](https://mobbin.com/screens/cb7068e4-44d5-4f04-9c5c-855782a96309) | Diff / Review / Commits tabs above per-file rows; each file carries an "Added" green word and a "New" grey chip in the header | sidebar ≈ 240 with 13/400 rows ≈ 28; file header ≈ 40 with chevron, mono path 12, right-aligned status; tab strip ≈ 36, 12/500, active tab underlined; separation by hairline only; radius 6 on chips; accent: black "Mark as ready" |
| Cofounder | [screen](https://mobbin.com/screens/c50251b3-860c-4f81-be1d-2795eae0182b) | stacked files inside one card, each with a per-file header showing −112 +116 in red/green; whole diff on a pale grey card | canvas card ≈ 940, radius 10, hairline; file header ≈ 32 with 12/500 filename; line ≈ 17 (≈5.9 rows/100 px), mono ≈ 10.5; removed pink, added green, both full-row fills with number gutter tinted the same; footer "Open PR" black button |

DESIGN.md: `cursor`: type code 13/400 JetBrains Mono lh 1.5, caption 13/400, caption-uppercase 11/600 +0.88, body-sm 14/400, title-sm 16/600; radius xs 4 · sm 6 · md 8 · lg 12; border hairline `#e6e5e0`, hairline-soft `#efeee8`, hairline-strong `#cfcdc4`, no shadows; spacing 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48. `mintlify`: type code-sm 13/400 lh 1.4, code-md 14/400, code-inline 13/500, caption 13/400, micro 12/500, micro-uppercase 11/600; radius xs 4 · sm 6 · md 8 · lg 12 · xl 16; border hairline `#e5e5e5`, hairline-soft `#ededed`, hairline-dark `#1f1f1f`; spacing 4 · 8 · 12 · 16 · 20 · 24 · 32.

The references span: code line 17–19 px at mono 10.5–12; file header 32–40 px; added `#dcfce7`-class green and `#fde2e1`-class pink as full-row fills, 3 px edge bar when split; gutters 40–56 grey numbers; separation by hairline and 0–10 radius on the outer card; accent never inside the diff, only on the one commit/publish act.

Thin evidence: Graphite, Devin, Cursor and Mintlify are the only diff screens at calibre.
