# Settings form

The range a settings form is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

A dialect is the references' number where the system keeps its own; the [judging](../judging.md) page says which hold.

## Range

input 38; two-line rows 64–70, the touch setting row the contract's 72 single-line; label 12–13/500 over 11–12 muted description; page title the system's title role (the references' 15–16 is a dialect); radius 4–8 (cards 8, inputs 4–6); hairline card or surface-step tile; save per card or right-aligned under the group, the system's primary act (dark or accent is a dialect), accent otherwise only on checked controls.

## Compose

A form about an object opens on that object as one `ListRow` in a `Group`, the `Form`'s first child: the object's glyph as `leading`, its name as `title`, where it lives as `meta`, and `onOpen` to change it.

## References

Queries: `account settings page with a form of labeled text inputs, toggles and a save button` · `workspace general settings with sectioned cards, each card a field with description and its own save action` · `dark mode settings screen with profile name and email fields, section headings and a danger zone`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Dub | [screen](https://mobbin.com/screens/c6f878d6-b08c-4817-bb41-8a778bb6343f) | one card per field with its own footer strip and save; the canonical Vercel-style settings card | settings nav ≈ 205 + icon rail ≈ 55; card full width, title 16/600, description 13/400 muted, helper 12; input ≈ 38 tall × 430 wide; footer ≈ 60 as a surface step under a hairline; radius 8 card, 6 input, 6 button; black primary, disabled save = gray fill; accent absent; toggle blue |
| v0 | [screen](https://mobbin.com/screens/386a2fec-434b-4e19-8141-52fe1594f760) | preference rows (label + description left, control right) stacked inside one card, section eyebrow outside it | sidebar ≈ 260; content ≈ 720 wide; row ≈ 70 (two-line); label 13/500, description 12/400 muted, section label 12 muted; 3 sizes; radius 8 card, 6 select; rows separated by hairline inside a hairline card; save right-aligned per card; accent blue on toggles only |
| Mintlify | [screen](https://mobbin.com/screens/b6724427-eb12-47d5-9b55-cb2d7130fe04) | toggle cards in a 2-column grid, each a filled tile with icon, label, description, switch and gear | tile ≈ 540 × 85, gap ≈ 16; label 12/500, description 11/400 muted, group heading 14/500 + 12 muted; 3 sizes; radius 8; tiles separated by surface step (gray fill, no border); switches gray until on; accent green only in the "Recommended" and trial badges |
| Devin | [screen](https://mobbin.com/screens/93170d84-7435-4c89-82b5-647330913aba) | dark version of the grouped-rows card: Profile / Display / Notifications groups as filled panels | sidebar ≈ 290; content ≈ 670 wide; row ≈ 64; label 12/500, description 11/400 muted, group heading 12/400; page title 15/500; 3 sizes; radius 8 panel; rows split by hairline inside a surface-step panel; controls right-aligned (select, toggle, Enable button); accent blue on toggles only |
| Twenty | [screen](https://mobbin.com/screens/c70083a8-dc3d-403f-8d9c-bc4e39bc13d9) | flat form (no cards): section title + one-line description, then the control; danger zone is an outlined red button | settings nav ≈ 310 on a soft surface; content ≈ 490 wide; section title 12/600, description 11 muted, field label 10 muted; input ≈ 38; radius 4; hairline inputs and row-buttons with chevrons; sections spaced by ≈ 24 not lines; accent absent (yellow only on the "Advanced" switch); danger = red text + red hairline |

DESIGN.md: `mintlify`: type body-sm 14/400, body-sm-medium 14/500, caption 13/400, micro 12/500, micro-uppercase 11/600, button-md 14/500; radius xs 4, sm 6, md 8, lg 12; hairline `#e5e5e5`, soft `#ededed`, dark `#1f1f1f`; spacing 4/8/12/16/20/24/32/40.

The references span: input 38; two-line rows 64–70; label 12–13/500 over an 11–12 muted description, page title 15–16; radius 4–8 (cards 8, inputs 4–6); separation by hairline card + hairline row split, or a surface-step tile with no border; save sits per card in a footer strip or right-aligned under the group; accent appears only on switches, never on the save button (black/dark primary).

Thin evidence: no Linear, Vercel or Stripe settings screen was returned; Dub and v0 stand in for that idiom.
