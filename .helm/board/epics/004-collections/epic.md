---
sessions: {}
---
# Collections take data

## Goal
Every component that repeats one item shape over a collection takes data (`query` or `items`,
plus a per-slot item map) and draws all four of its states at the leaf: pending in its own
skeleton, failed, empty and loaded. Composition containers (`Section`, `Columns`, `Split`,
`Screen`, `Toolbar`, `Form`, `Sheet`, `Shell`) keep children.

## Breakdown rationale
`List` sets the pattern in 02. The audit (01) classifies the rest of the roster against the
rule and files one story per collection. 03, built in 02's change, narrows `QueryBoundary` to
compound bodies that name their loading form, and the guide teaches the pattern. Evidence: `.helm/research/skeleton-loading.md`.

### Classification

Every roster component, the same on web and phone, in build order: collections first, most used
first (by the showcase's `/layout` app and the guide pages). A collection's item map is named for
the item it draws (`row`, `file`, `meter`, `message`, `bar`, `option`), and one container holds
one item kind. Under a compound `QueryBoundary` a collection takes `items`, and its `loading`
draws its pending form. A row, a control or a content block is a leaf: it draws one value.

| Component | Class | Reason |
| --- | --- | --- |
| `List` | collection | `ListRow`s over data; sets the pattern (02). |
| `Group` | mixed | Static mixed setting rows stay children; a set of rows from data takes `row` in the card look (04). |
| `Table` | collection | Already declares `columns`; lacks `query`, failed at the leaf, and reading cells from the item (05). |
| `Thread` | collection | `Message`s over a conversation take `message`; `foot` stays the one authored part (06). |
| `BarChart` | collection | Bars over data; `keys` already declared, lacks failed and empty (07). |
| `FileRow` | leaf | One file; a set of them is a `List` taking `file` (08). |
| `Meter` | leaf | One measure; a set of them is a `Group` taking `meter` (09). |
| `Comparison` | collection | Facts over data; its columns come from the first row, so it declares `columns` (10). |
| `OptionList` | mixed | Static `options` are already projected; a set from a query takes `option` (11). |
| `Section` | composition | A titled region over authored parts. |
| `Columns` | composition | Each column a distinct `Section`; a board's stages are an authored set, their cards a collection. |
| `Place` | composition | A page frame: title, acts, body. |
| `Screen` | composition | A pushed page frame. |
| `Split` | composition | Three authored slots: list, main, pane. |
| `Form` | composition | Distinct fields over one `ActionBar`. |
| `Toolbar` | composition | Distinct controls in a row. |
| `Sheet` | composition | An overlay over an authored body. |
| `Shell` | composition | `places` are authored `PlaceSpec`s, each its own route. |
| `QueryBoundary` | composition | Wraps a compound body only, naming its loading form (03). |
| `ActionBar` | composition | Distinct authored acts, each its own handler. |
| `Menu` | composition | Distinct authored acts, each its own handler. |
| `ItemHeader` | composition | One record's distinct facts. |
| `FormField` | composition | One label around one control. |
| `Select` | leaf | A form control over a closed option set; the trigger labels the value, so the options load with the record. |
| `Picker` | leaf | A control; the trigger labels the chosen option, so the options load with what holds the pick. |
| `SegmentedControl` | leaf | Two to five static segments. |
| `ListRow` | leaf | One row; a `row` map's target. |
| `DefinitionRow` | leaf | One fact of one record; a `Group` of them is authored. |
| `Message` | leaf | One message; a `message` map's target. |
| `Diff` | leaf | One document; its lines derive from `before` and `after`. |
| `ProseDiff` | leaf | One document. |
| `Prose` | leaf | One document. |
| `Code` | leaf | One text. |
| `MessageInput` | leaf | A control. |
| `EmptyState` | leaf | One message and act. |
| `Toast` | leaf | One notice. |
| `Banner` | leaf | One notice. |
| `PendingBar` | leaf | One notice. |
| `QrCode` | leaf | One value. |
| `Text`, `Icon`, `Button`, `IconButton`, `Count`, `Status`, `Chip`, `Input`, `TextArea`, `InputOtp`, `Slider`, `Switch`, `Checkbox`, `Spinner`, `Avatar`, `Link` | atom | One value or one act. |
