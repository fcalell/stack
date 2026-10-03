# Command palette

The range a command palette is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

dialog 490–645; input 41–56; rows 29–43 one-line, 50–52 two-line; label 11–12, group eyebrow 9–10 uppercase muted, kbd 10; dialog radius 8–12, rows 4–6; shadow-lifted, hairline only at input and footer; highlight grey fill; accent absent.

## References

Queries: `command palette overlay with a search input, grouped commands and keyboard shortcut hints` · `cmd+k quick search modal listing recent pages and actions with icons` · `dark mode command menu dialog with typed query, filtered results list and highlighted row`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Mintlify | [screen](https://mobbin.com/screens/7c7ad31f-9dfe-4be7-83d7-6002fe31d4d0) | grouped two-line results (title + path), typed query, ESC chip in the input, kbd footer | dialog ≈ 495 wide; input ≈ 56 with icon left and ESC chip right; group label 10/500 muted; item ≈ 52 (12/500 title + 11 muted subtitle); highlighted row = gray fill radius 6; footer ≈ 24 with 10 kbd chips; radius 12; shadow + hairline; accent absent |
| Superhuman | [screen](https://mobbin.com/screens/85dc5994-9360-428d-9092-7425e070ed7f) | dark, mono-typed query line, one-letter shortcut chips at the right edge of every row | dialog ≈ 645 wide; header 11 muted; input line ≈ 34 in mono 13; row ≈ 50 with icon + 12 label; selected row = lighter surface fill; shortcut chip ≈ 18 square, radius 4; dialog radius 8; separators hairline; accent absent (gradient title is outside the dialog) |
| v0 | [screen](https://mobbin.com/screens/29db691c-e7fb-4ee3-9f4b-e16c4970b92a) | commands first, then matching items with timestamps right-aligned, then a "New chat with query" escape hatch | dialog ≈ 490; input ≈ 43; group label 10 muted; row ≈ 43; label 12/400, timestamp 11 muted right; selected row = gray fill radius 6; dialog radius 10; shadow only, no hairline; accent absent |
| Vapi | [screen](https://mobbin.com/screens/593d7acd-2e16-4365-bcd6-02ce52f48f3b) | densest dark palette: Actions / Recent / All Pages groups, item + " — section" suffix, result count in the footer | dialog ≈ 645; input ≈ 41; group label 10 uppercase muted; row ≈ 29; label 11/500 + 10 muted suffix; shortcut "⌘ 0" right; footer ≈ 22 with kbd hints and "14 results"; radius 8; hairline + shadow; accent absent; ≈3.4 rows/100 px |
| Magnific | [screen](https://mobbin.com/screens/e22e26e2-f813-4f1e-beda-43c9ecf26419) | Recents then Quick actions, icons in small gray squares, three-key shortcut chips, ↵ on the highlighted row | dialog ≈ 635; input ≈ 56 with mic/camera/⌘K right; group label 9/500 uppercase; row ≈ 40; label 12/400; icon tile ≈ 22 radius 4; chips 10 radius 4; highlighted row gray fill; radius 12; shadow; accent absent |

DESIGN.md: `mintlify`: type body-sm 14/400, caption 13/400, micro 12/500, micro-uppercase 11/600; radius sm 6, md 8, lg 12; hairline `#e5e5e5`, dark `#1f1f1f`; spacing 4/8/12/16/20/24. `superhuman`: type body-md 16/460, caption 14/460, micro 12/540; radius xs 4, sm 6, md 8, lg 12; hairline `#e8e4dd`, dark `#3f3a52`; spacing 2/4/8/12/16/24/32.

The references span: dialog 490–645 wide; input 41–56; rows 29–52 (29–43 one-line, 50–52 two-line); label 11–12 with group eyebrow 9–10 uppercase muted and 10 kbd chips; dialog radius 8–12, row and chip radius 4–6; lifted by shadow, hairline only as the input/footer split; highlight is a gray or lighter-surface fill; accent absent in every one.
