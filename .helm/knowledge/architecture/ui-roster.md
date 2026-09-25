# The UI roster, what each molecule owns and why

The 48 components both UI plugins ship, by layer, with what each owns and the anchor it follows.
The props are data in `packages/ui-core/src/roster.ts` and each plugin's README; the token
contract is `packages/ui-core/README.md`; the rationale for the contract is [ui-core](./ui-core.md).
The anchors are Linear (web and iOS) for the frame and the rows, GitHub iOS for files, diffs and
stacked acts, Claude iOS for threads, pickers and sheets; the phone's tab bar is the system's
full-width bar, and nothing on the desktop is denser than on the phone.

## Atoms

One control or one piece of text, no layout of their own; the same props on both platforms. An
act prop is `act` on every molecule that takes one: a labelled text act, 44 px, with an optional
`blocked` reason, drawn under it once the act is tapped or its `Form` or `Sheet` has taken input,
so an untouched form opens with its act disabled and silent. `Text` is the only way to set type and its ink follows the role.
`Icon` is sized by the type role around it and named from the consumer's closed icon set, a
runtime map the app provides. `Button` is a pill with words, full width in an action bar and its
content's width in a toolbar, which the container decides; in a top bar (a `Place`'s, a
`Screen`'s, a `Sheet`'s) it draws compact, the matrix's `fit: "bar"`, and keeps a 44 px hit area
around it. `IconButton` is a 44 px circle for moving and nothing else, compact in a top bar the
same way. `Count` is a number in a pill. `Status` is an icon and a word, the
consumer mapping its own states onto six, and a 44 px chip with `onOpen`. `Input` kinds: `search`
is a pill, the rest take the group radius, `number` opens the numeric keyboard. `TextArea`
`source` is mono and keeps indentation; `budget` draws a word counter. `Switch` and `Checkbox`
carry their label so the hit area is the whole line. `Avatar` draws an image or the name's
initials on one of eight `avatar-n` fills picked by a hash of the name. `Link` is inline and
never a screen's only act. Retired as atoms: `Badge` (split into `Count` and `Status`), `Label`,
`Separator`, `Skeleton` (a container's `loading` draws its own form), `Tooltip`.

## Layout molecules

Each takes children, owns every space inside it and between its children, and has no prop that
is not meaning. A child never knows its parent: a `Screen` draws the same in a `Split` slot, over
a list on the phone, or alone; the parent composes.

| Molecule | Owns | Anchor |
| --- | --- | --- |
| `Place` | the large title on the top bar's row beside its circles, the side inset, the scroll, the body measured at `widths.reading` and centred unless a `Columns` inside claims the column, the tab bar below on the phone, at most two actions as circles with the rest and the labelled `more` acts under the more circle, and `act` as a pill floating above the bar bottom right with room kept under the last row, in the top bar on the desktop | Linear Mobile's tab screens, Linear web's settings column |
| `Screen` | the top bar with the back circle and the title compact and centred, the side inset, the scroll, the body measured at `widths.reading` and centred; an `ItemHeader` inside claims the heading, and the top bar's title then shows once it scrolls away; its actions as at most two circles, the rest and the labelled `more` acts (an end, a removal: never a move) under the more circle; no tab bar; a pinned `ActionBar` or `MessageInput` child above the home indicator | Linear Mobile's issue page, GitHub iOS's and Claude iOS's settings |
| `Split` | the desktop's columns: `list` at `widths.list`, `main` filling, `pane` folding away under `breakpoints.wide` and pushing over `main` when it folds; under `breakpoints.desktop` one slot at a time, the deepest present. Composed per place by the consumer, never by the shell | Linear web |
| `Section` | the `label` header at the 44 px floor, folding, the header's `Count`, its loading form; the space above it is its container's gap, and a nested section takes `stack` | Linear Mobile's sections |
| `Group` | a `group`-filled box, `edge` hairlines between rows, rows inset `inset`; three row forms when loading | iOS grouped lists |
| `List` | rows on the surface with no box and no hairlines, each at least 44 px; the list semantics, each child one item whatever it is | Linear Mobile's inbox |
| `Form` | fields at `stack`; its `ActionBar` last and in flow, so it scrolls with the fields and the keyboard never covers it | |
| `Toolbar` | one row of controls over a list | |
| `ActionBar` | pinned above the home indicator as a `Screen`'s child, in flow as a `Form`'s, a `Section`'s or a `Sheet`'s; full-width buttons stacked with the primary first on the phone, at their content's width in one row on the desktop; at most three, one `PendingBar` in their place | GitHub iOS's merge box |
| `Columns` | the same sections side by side, each `widths.column`, scrolling sideways, over the `Place`'s whole column; a `ListRow` inside is a card. On native and under `breakpoints.desktop` the sections stack | Linear's board |
| `Shell` | the frame at every width from one list of places: the tab bar under `breakpoints.tablet`, the `widths.rail` sidebar on `canvas` from it; the app's `Banner`; the toast queue | Linear's sidebar, iOS's tab bar |

Rows go in a `Group` when they are a record and in a `List` when they are a feed. A control that
edits in place (`Switch`, `Checkbox`, `Picker`) is always the value of a `DefinitionRow` in a
`Group`; a control that types (`Input`, `TextArea`, `Slider`) is always a `FormField` in a `Form`.
Errors are the screen's `EmptyState`; a molecule ships its loading form and nothing else. Text
entry never sits over a pinned bar.

## Shared molecules

| Molecule | Anatomy | Anchor |
| --- | --- | --- |
| `ListRow` | a leading icon or status, a one-line `body` medium title, one or two meta lines of parts joined by a middle dot, a trailing age (an ISO moment drawn as "4m", "3h", "2d" or a date in the browser's locale, kept current), count or value in `meta`, marks read aloud, one act, `href` or `onOpen`; no chevron, no divider | Linear Mobile's inbox and issue rows |
| `DefinitionRow` | the label left, the value, a `Status` or an in-place control right, and the description under both at the row's width; the value takes its own width up to three fifths and wraps inside it past that; `copyable` | Linear web's settings rows, Claude iOS's settings for the description |
| `FormField` | label, description, one typing control, the error line | Linear web's settings rows, stacked |
| `ItemHeader` | an overline of parts, a title that wraps in full and is the page's one heading inside a `Screen`, a row of facts, a status fact with `onOpen` a chip that opens its explanation | Linear Mobile's issue page |
| `SegmentedControl` | a state the control rests on, never a trigger | Linear Mobile's Assigned, Created, Subscribed |
| `Sheet` | a close circle left, the title, `submit` right where a keyboard would cover a bar, or an `ActionBar` child for a decision, the two exclusive in the types; focus on its first field when it opens; content-tall, full height with a `TextArea`; `sheet` corners; centered at `widths.sheet` on the desktop | Linear Mobile's and Claude's sheets |
| `Picker` | a control showing its value; a tap opens one-line rows with a tick, up to six, a searchable `Sheet` above six. A pick, never a form | Linear Mobile's status card, Claude's model picker |
| `OptionList` | radio rows with a description line, the recommended one marked with `words.recommended`, children under the chosen option | Claude iOS's model picker rows |
| `EmptyState` | one sentence and the way to make the first one; with `title` it centers as a first screen, alone in a body it centres in the space left, with children it stays above them | Claude iOS's empty project |
| `Toast` | a dark pill above the bar; client-owned, so never an undo; the `Shell` hosts the queue | Linear Mobile |
| `Banner` | full width under the top bar on the kind's `-soft` fill; placed by the shell for the app's state, by a screen or a sheet for its own, the screen's under the shell's | |
| `PendingBar` | one line with a spinner or a server-deadline countdown and one act, in an `ActionBar`'s place, a `Sheet`'s foot, above a `MessageInput`, or as a row of a thread | GitHub iOS's merge state, Claude's usage bar |

Retired: `Card` (a `Group`), `Item` (a `ListRow`), `Pair` (a `DefinitionRow`), `SectionToolbar`,
`Tabs` (a `SegmentedControl`), `Dialog`, `DropdownMenu` and `ContextMenu` (a `Sheet`),
`DangerZone`, `InputGroup`, `DockedPanel` and `Sidebar` (the shell), `Select` (a `Picker`).

## Content molecules

Each draws one kind of content and owns its interior; all take `loading`. `Prose` is markdown at
`body`, measured at `widths.reading`, fences as `Code`. `Code` is mono, scrolls sideways, never
wraps, folds past `tail` lines, takes focus to scroll by keyboard, and draws its copy act with
`words.copy` beside the text, never over it. `Diff` is mono with a
line-number gutter pinned left on web and scrolling with the lines on native, added on
`ok-soft`, removed on `danger-soft`, hunk headers on `group`; `split` is picked by the parent from
the molecule's own width, never the viewport's. `FileRow` is a row for a `Group` with a ring in
`edge` that becomes a tick in `ok` when seen. `ProseDiff` is `Prose` with an added sentence on
`ok-soft` and a removed one struck through on `danger-soft`. `Comparison` is a `Group` of rows
whose cells sit side by side from `breakpoints.desktop`, the newest right, and stack under a
`SegmentedControl` below it. `Message` follows Claude iOS: `you` in a soft bubble right, `other`
as `Prose` on the surface, `system` one centered meta line, its `at` drawn as an age. `MessageInput` is a plus for files,
the text in a pill, one circle that sends, or stops the turn while `working` and the draft is
empty; dictation is the keyboard's; a `Screen`'s child pins to the bottom like an action bar. `Meter` is a
labelled fill in `tint` with its share as a percentage, read as a native meter. `BarChart` is one labelled bar per series item, SVG on native. `QrCode`
is a square code.

A thread is a `List` whose rows are `Message`s, folded `Section`s, `Group`s and a `PendingBar`.
`native-ui` draws the phone layout at every width until a native consumer asks for a tablet's.
Pull to refresh is the phone's; the web list is live over the server's stream.

## Wording, naming, boundary

1. An icon-only button moves and does nothing else: back, close, more, search, new, send, stop.
2. A disabled button says why, under it.
3. Sentence case, no exclamation marks.

A component is a PascalCase noun of one or two words for the thing the operator can point at,
never an adjective or a verb alone. A part of a container carries the container's word first:
`ListRow`, `FormField`, `ItemHeader`, `FileRow`. Where the platform has a name for the thing,
that name wins, Apple's Human Interface Guidelines as the tiebreaker: `Sheet`, `Toast`, `Switch`,
`Picker`, `SegmentedControl`, `Banner`. An acronym cases as a word: `QrCode`. No name is a
product's noun.

A molecule lives in stack when its prop names and enum words are product-free. A molecule whose
props are a product's nouns lives in that product's `ui/`, and only when it is a composition of
stack molecules repeated on two or more screens; one screen's shape stays inline in the screen.
Mapping a domain object onto a molecule's props is a function in the screen, never a component.
A product `ui/` molecule a second consumer wants is generalized then, by renaming its nouns.

Not rebuilt yet, waiting for the first consumer surface that needs them: `Table`, `DataTable`,
`EnumInput`, `InputOtp`, `ScrollArea`, `NavigationProgress`, `QueryBoundary`, `Logo`,
`AvatarStack`, `FilterChip` and a chip row, `ProgressBar`, a numeric `Stepper`, `Input` kinds
`date`, `time` and `amount`, a file and image control.
