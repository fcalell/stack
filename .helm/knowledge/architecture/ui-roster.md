# The UI roster, what each molecule owns and why

The 54 components both UI plugins ship, by layer, with what each owns and the anchor it follows.
The props are data in `packages/ui-core/src/roster.ts` and each plugin's README; the token
contract is `packages/ui-core/README.md`; the rationale for the contract is [ui-core](./ui-core.md).
The anchors are Linear (web and iOS) for the frame and the rows, GitHub iOS for files, diffs and
stacked acts, Claude iOS for threads, pickers and sheets, Attio for tinted data chips; the phone's tab bar is the system's
full-width bar, its tabs at the side inset and at most five, as iOS holds them. Every control, row and header stands on the floor: 44 px on touch, and under the
theme's `density: "desktop"` 32 px where the pointer is fine, since a desktop data tool reads
more rows than a phone and a mouse needs no 44 px target (Linear web's and Attio's rows). Nothing
on a touch screen is denser than on the phone, whatever its width.

## Atoms

One control or one piece of text, no layout of their own; the same props on both platforms. An
act prop is `act` on every molecule that takes one: a labelled text act at the floor, with an optional
`blocked` reason, drawn under it once the act is tapped or its `Form` or `Sheet` has taken input,
so an untouched form opens with its act disabled and silent; while `loading` its button draws the
busy glyph the act names (`spinner`: `circle` spins, `scramble` cycles mono glyphs). `Text` is the
only way to set type and its ink follows the role.
`Icon` is sized by the type role around it and named from the consumer's closed icon set, a
runtime map the app provides. `Button` is a pill with words, full width in an action bar and its
content's width in a toolbar, which the container decides; in a top bar (a `Place`'s, a
`Screen`'s, a `Sheet`'s) it draws compact, the matrix's `fit: "bar"`, and keeps a 44 px hit area
around it. `IconButton` is a circle at the floor for moving and nothing else, compact in a top bar the
same way. `Count` is a number in a pill. `Status` is an icon and a word, the
consumer mapping its own states onto six, and a chip at the floor with `onOpen`. `Chip` is a data
value's tag (a type, a source, a destination) on one of six `chip-n` fills, the consumer giving
each family of values one, so a chip's meaning is learnable across screens; it pads as a control
does, so it follows density, and carries no act, since what opens is the row or cell it sits in.
A chip is a fill under `ink` and a status an icon and a word in its state's ink, so the two are
separate concepts with separate names, never one molecule with a mode. `Input` kinds: `search`
is a pill, the rest take the group radius, `number` opens the numeric keyboard and draws its
`unit` after the value, `source` is text a machine reads (a command, a path, a host), mono and
never corrected or capitalized, `email` an address on the email keyboard with the saved address offered, never corrected or capitalized; a tap anywhere on the field focuses it. `TextArea`
`source` is mono and keeps indentation; `budget` draws a word counter. Both say when the viewer
is done with a value through `onCommit`: leaving the field, or Enter on an `Input` (a new line in
a `TextArea`), having changed it since the field took focus; leaving an unchanged field never
commits, and with `onCommit` Escape puts back the value at focus. It is the moment an autosaving
form saves, since a specification that saves as it is edited has no save act, and a keystroke is
too early and a submit too late; both platforms decide it with ui-core's `commitMoment`. `InputOtp` is a one-time
code: `length` boxes drawn over one invisible input carrying `autocomplete="one-time-code"` and
the numeric keyboard, so the system's code suggestion or a pasted code fills every box at once,
the arrows move between boxes and a digit on a filled box replaces it; `onComplete` hears the full
code, `loading` holds it while the code is checked, and in a `FormField` its error is the field's
line. The one input is why: the code suggestion and a screen reader meet a single field, where
an input per box splits the code across six. It takes focus when it is drawn unless the viewer is in another field: a code field appears
because the viewer just asked for a code, often replacing the button that asked, and a step change
inside a `Place` has no open to hang focus on the way a `Sheet` does; on the web it is read-only,
not disabled, while `loading`, since a disabled input drops its focus and a refused code's retry
would type into nothing. `EnumInput` edits a list of strings a machine reads
(a schema's allowed values): each value on a `source` cell with a `remove` text act, then a
`source` field whose `add` act, or Enter on the web, appends the draft; a value already listed
is refused and `words.duplicate` says so under the field. Order is the order of adding: moving a
value waits for a drag affordance, since a keyboard-only move would be invisible. `Switch` and `Checkbox`
carry their label so the hit area is the whole line. `Avatar` draws an image or the name's
initials on one of eight `avatar-n` fills picked by a hash of the name. `Link` is inline and
never a screen's only act. Retired as atoms: `Badge` (split into `Count` and `Status`), `Label`,
`Separator`, `Skeleton` (a container's `loading` draws its own form), `Tooltip`.

## Layout molecules

Each takes children, owns every space inside it and between its children, and has no prop that
is not meaning. A child never knows its parent: a `Screen` draws the same in a `Split` slot, over
a list on the phone, or alone; the parent composes. Alone, a `Place` or a `Screen` is the app
root's child: on the web the root gives every page the column a `Shell` gives its place, the
viewport's height on `surface` as a flex column with no banner, so a page with no shell fills the
viewport the way the shell's column does.

| Molecule | Owns | Anchor |
| --- | --- | --- |
| `Place` | the large title on the top bar's row beside its circles, on its own line under the switcher and the circles under tablet, since the switcher leaves a phone's row no room, wrapping and never truncated, the side inset, the scroll, the body measured at `widths.reading` and centred unless a `Columns` inside claims the column (a `Table` claims it the same way), or with `bleed` the whole box under the top bar with no inset, no measure and no scroll, so a child that pans and scrolls itself (a canvas) owns it, the tab bar below on the phone, at most two actions as circles with the rest and the labelled `more` acts under the more circle, and `act` as a pill floating above the bar bottom right with room kept under the last row, in the top bar on the desktop | Linear Mobile's tab screens, Linear web's settings column |
| `Screen` | the top bar with the back circle and the title compact and centred, the side inset, the scroll, the body measured at `widths.reading` and centred; an `ItemHeader` inside claims the heading, and the top bar's title then shows once it scrolls away; its actions as at most two circles, the rest and the labelled `more` acts (an end, a removal: never a move) under the more circle; no tab bar; a pinned `ActionBar` or `MessageInput` child above the home indicator | Linear Mobile's issue page, GitHub iOS's and Claude iOS's settings |
| `Split` | the desktop's columns: `list` at `widths.list`, `main` filling, `pane` at `widths.list` beside `main`, pushing it narrower, from the width where the columns fit (`breakpoints.desktop` with no `list`, `breakpoints.wide` with one, since three columns under wide leave `main` too narrow to use), and folding over `main` under it; so a table or a canvas in `main` stays usable beside the pane that edits its selected row, with no prop, because the width is a fact of the slots present; under `breakpoints.desktop` one slot at a time, the deepest present; `empty` fills `main`'s column from desktop while nothing is picked. Composed per place by the consumer, never by the shell | Linear web |
| `Section` | the `label` header at the floor, folding when `folded` is set (a disclosure group then, never a landmark, reporting each open and close through `onToggle`), the header's `Count` and `act`, a blocked act's reason under it as every act draws one, its loading form; the space above it is its container's gap, and a nested section takes `stack` | Linear Mobile's sections |
| `Group` | a `group`-filled box, `edge` hairlines between rows, rows inset `inset`; three row forms when loading | iOS grouped lists |
| `List` | rows on the surface with no box and no hairlines, each at least the floor; the list semantics, each child one item whatever it is | Linear Mobile's inbox |
| `Form` | fields at `stack`; its `ActionBar` last and in flow, so it scrolls with the fields and the keyboard never covers it | |
| `Toolbar` | one row of controls over a list | |
| `ActionBar` | pinned above the home indicator as a `Screen`'s child, in flow as a `Form`'s, a `Section`'s or a `Sheet`'s; full-width buttons stacked with the primary first on the phone, at their content's width in one row on the desktop; pinned, it sits behind a hairline and lifts the toasts by its height; at most three, one `PendingBar` in their place | GitHub iOS's merge box |
| `Columns` | the same sections side by side, each `widths.column`, scrolling sideways, over the `Place`'s whole column; a `ListRow` inside is a card. On native and under `breakpoints.desktop` the sections stack | Linear's board |
| `Shell` | the frame at every width from one list of places: the tab bar under `breakpoints.tablet`, its fill full width and its tabs at the side inset, at most five: past five places the first four and a fifth, `more`, whose `Sheet` holds the rest as sidebar rows and which draws selected while one of them is (iOS's More tab; a scrolling bar hides places with no sign they are there), the `widths.rail` sidebar on `canvas` from it; the selected place is the one whose route is the longest prefix of the address, so a place at `/` holds every address no other claims, and it draws `accent-soft` in the sidebar and is the one `aria-current` names; the app's `Banner`, which a `Screen` fixed over the column on the phone starts under; the tab bar a `Screen` covers goes inert; where the toasts stand, over its column and above its tab bar and any pinned bar (on the web the app root draws the queue and the `confirm()` decisions on every page, a sign-in with no shell included; on native the `Shell` still draws both); the `switcher` (what switches what the app is looking at, an organization or a project), heading the sidebar from `breakpoints.tablet` and starting each `Place`'s top bar under it, never a `Screen`'s: the phone's tab bar holds places only, and Linear Mobile keeps its workspace switcher at the head of the places, not on a pushed page | Linear's sidebar header, iOS's tab bar |

Rows go in a `Group` when they are a record and in a `List` when they are a feed. A control that
edits in place (`Switch`, `Checkbox`, `Picker`) is always the value of a `DefinitionRow` in a
`Group`; a control that types (`Input`, `TextArea`, `InputOtp`, `EnumInput`, `Slider`) is always a
`FormField` in a `Form`, and so is a `Picker` whose pick is part of what a form submits (a new
record's type, a role on an invitation), where it takes the field's surface, label and error. A
`FormField` bound to a form field through `field` draws the field's error and hands its control
the value and the change handler, so a control is one spread and never three hand-wired props;
a binding made to autosave (`bind(name, { commit: true })`) hands it `onCommit` too, which
submits the form, so a field that saves as it is edited is still that one spread.
Errors are the screen's `EmptyState`; a molecule ships its loading form and nothing else, and a
`QueryBoundary` is how a screen gets both from its queries. Text entry never sits over a pinned
bar.

## Shared molecules

| Molecule | Anatomy | Anchor |
| --- | --- | --- |
| `ListRow` | a leading icon or status, a one-line `body` medium title, one or two meta lines of parts joined by a middle dot, a trailing age (an ISO moment drawn as "4m", "3h", "2d" or a date in the browser's locale, kept current), count or value in `meta`, marks read aloud, one act, `more`: the row's own acts under a more circle at its end, a `Menu` beside the row and never inside what opens it; `href` or `onOpen`; no chevron, no divider; the row whose `href` is the current route draws `accent-soft`, the open item of a `Split`'s list | Linear Mobile's inbox and issue rows |
| `DefinitionRow` | the label left, the value, a `Status` or an in-place control right, and the description under both at the row's width; the value takes its own width up to three fifths and the label the rest, each wrapping at any character inside its width; `copyable`. A control whose width is its words (a `Picker`) claims the row, and under `breakpoints.tablet` the row stacks: the label and the description, then the control across the row with the act at its end, since a name, an address and a pick do not share a phone's line; a `Switch` or a `Checkbox` is a fixed size and stays beside its label, which names it when it carries no label of its own | Linear web's settings rows, Claude iOS's settings for the description |
| `FormField` | label, description, one typing control, the error line; with `field` the error is the form's and the control a function of the field's value and handler, typed by the field | Linear web's settings rows, stacked |
| `ItemHeader` | an overline of parts, a title that wraps in full and is the page's one heading inside a `Screen`, a row of facts, a status fact with `onOpen` a chip that opens its explanation | Linear Mobile's issue page |
| `SegmentedControl` | a state the control rests on, never a trigger | Linear Mobile's Assigned, Created, Subscribed |
| `Sheet` | a close circle left, the title, `submit` right where a keyboard would cover a bar, or an `ActionBar` child for a decision, the two exclusive in the types; focus on its first field when it opens and back on what held it when it closes, and on the sheet itself when a control holding it is removed (a replaced act), so Escape still closes it; a new `title` or `description` is a new page, whose blocked `submit` is silent again until tapped or touched; the title wraps to two lines and names a typing control in the sheet that no `FormField` labels, so the bare `TextArea` a sheet edits is named; content-tall, full height with a `TextArea`; `sheet` corners; centered at `widths.sheet` on the desktop. `confirm({ title, sentence, act, confirmName })` asks a decision from anywhere and resolves to whether the act was taken: the app root hosts the queue beside the toasts on the web (the `Shell` on native) and draws the first as a decision sheet, dismissing declines, and focus goes back to what held it; with `confirmName` the act stays blocked with its reason until the viewer types the named value, for an act that removes something with a name | Linear Mobile's and Claude's sheets, GitHub's type-the-name deletion |
| `Picker` | a control showing its value; a tap opens one-line rows with a tick, up to six, a searchable `Sheet` above six; options may come in groups (`OptionGroup`), each under its label in the list and the sheet. Generic over its value, read off the options alone: an enum's options pick that enum, so a bound enum field takes the control in one spread and a value outside the options is a type error. No `value`: nothing selected, the placeholder, the label in `ink-meta` with no row ticked, and no row for it in the list, since nothing picked yet is no choice. A `null` option: the explicit empty choice (a "Not set"): a pick is nullable because its options offer it, never by a prop, so a nullable enum field spreads in the same way and `onChange` hears `null`; the empty choice reads as a placeholder, in `ink-meta`, in the list and on the control, as the control does with no value: lighter than a value in `ink`, and text a viewer reads, so never `ink-faint`, which misses 4.5:1. A pick: the value of a `DefinitionRow` when it applies at once, the control of a `FormField` when a form submits it | Linear Mobile's status card, Claude's model picker |
| `Menu` | a more circle, its `label` read aloud, opening the acts it holds: anchored under the circle from `breakpoints.tablet`, a `Sheet` titled `label` under it; items with an optional icon, `destructive` in `danger`, a `blocked` one disabled with its reason under its label, groups under hairlines; the arrows move, Enter takes an act, Escape closes, focus goes back to the circle, and one menu is open at a time. A `Place`'s and a `Screen`'s more circle and a `ListRow`'s `more` are the same menu | Linear web's and Linear Mobile's more menus |
| `OptionList` | radio rows with a description line, the recommended one marked with `words.recommended`, children under the chosen option, its loading form; no `value` is no option chosen, so every pick reaches `onChange` | Claude iOS's model picker rows |
| `QueryBoundary` | one query or several read together: while any is pending the loading form of the container around it, when one fails the screen's `EmptyState` with the consumer's `sentence` and a `retry` act, then the children with the data, one value per query in order (an accessor on the web, so a refetch updates in place) | |
| `EmptyState` | one sentence and the way to make the first one; with `title` it centers as a first screen, alone in a body it centres in the space left, with children it stays above them | Claude iOS's empty project |
| `Toast` | a dark pill above the bar; with `state` (`done`, `attention`, `failed`, three of the status states) it says how an act ended, the state's glyph on its `-soft` fill, so a refused edit reads `failed` and a finished act `done`; client-owned, so never an undo; the app root draws the queue on the web, so a page with no shell shows it, and the `Shell` places it; on native the `Shell` draws it | Linear Mobile |
| `Banner` | full width under the top bar on the kind's `-soft` fill; placed by the shell for the app's state, by a screen or a sheet for its own, the screen's under the shell's | |
| `PendingBar` | one line with a spinner (its `spinner` kind) or a server-deadline countdown and one act, in an `ActionBar`'s place, a `Sheet`'s foot, above a `MessageInput`, or as a row of a thread | GitHub iOS's merge state, Claude's usage bar |

Retired: `Card` (a `Group`), `Item` (a `ListRow`), `Pair` (a `DefinitionRow`), `SectionToolbar`,
`Tabs` (a `SegmentedControl`), `Dialog`, `DropdownMenu` and `ContextMenu` (one `Menu`),
`DangerZone`, `InputGroup`, `DockedPanel` and `Sidebar` (the shell), `Select` (a `Picker`).

## Content molecules

Each draws one kind of content and owns its interior; all take `loading`. `Prose` is markdown at
`body`, measured at `widths.reading`, fences as `Code`. `Code` is mono, scrolls sideways, never
wraps, folds past `tail` lines, takes focus to scroll by keyboard, and draws its copy act with
`words.copy` beside the text, never over it; `title` heads the block with what the text is (a file's name, the tool it goes into), and the copy act then sits in the title's row. `Diff` is mono with a
line-number gutter pinned left on web and scrolling with the lines on native, added on
`ok-soft`, removed on `danger-soft`, hunk headers on `group`, in one column at every width,
since the pane that holds it is never wide enough for two readable sides; it takes its lines as `hunks`, or as two texts a machine reads, `before` and `after` (a document observed beside the one expected), diffed by line with three lines of context. `FileRow` is a row for a `Group` with a ring in `ink-meta` that becomes
a tick in `ok` when seen. `ProseDiff` is `Prose` with an added sentence on
`ok-soft` and a removed one struck through on `danger-soft`. `Comparison` is a `Group` of rows
whose cells sit side by side from `breakpoints.desktop`, the newest right, and stack under a
`SegmentedControl` below it. `Message` follows Claude iOS: `you` in a soft bubble right, `other`
as `Prose` on the surface, `system` one centered meta line, its `at` drawn as an age. `MessageInput` is a plus for files,
the text in a pill, one circle that sends, or stops the turn while `working` and the draft is
empty; dictation is the keyboard's; a `Screen`'s child pins to the bottom like an action bar. `Meter` is a
labelled fill in `tint` with its share as a percentage, read as a native meter. `BarChart` is one labelled bar per series item, SVG on native. `QrCode`
is a square code.

`Table` is a data grid, Attio's table the anchor: a header row of `label` cells, one row per item
keyed by its id, every cell drawn by its column's kind (`text` at `body`, `source` mono, `number`
at the end in tabular figures, `chip` a `Chip` on the column's one family, `status` a `Status`,
`age` an ISO moment drawn as an age, `check` a tick). A column is its `key`, `label`, `width`
(a `widths` rung or a fraction; none shares what is left), `align`, `sortable` and `edit`. A row
and its header stand on the floor, 32 px under `density: "desktop"` and 44 on touch, since the
cell is the field's box (`TABLE_CELL`): the floor, the field's vertical padding and its side
padding behind a transparent side border. That is what lets a cell edit in place with no jump: a
click, or Enter on the focused cell, turns a column with `edit` into its control where the value
was (`Input` of the column's kind, a `Picker` that opens at once, a tick that commits as it
turns), Enter or leaving it commits, Escape cancels, and `onEdit(id, key, value)` hears each
commit that changed the value, once; a picked column whose options hold the empty choice clears
its cell, and the edit hands back `null`. The column's kind types its edits, so a `status` column
cannot edit and a `chip` is picked, never typed. A click on a cell that does not edit opens the
row through `onOpen`; the row whose id is `selected` draws `accent-soft`, the `Split` list's
open item, so the grid in `main` shows which row the pane beside it edits. The grid is one tab
stop: the arrows move the focused cell, Tab steps across and leaves at the ends. A `sortable`
header sorts ascending, descending, then back to the given order, empty cells last. No rows
draws the header over `empty`, the consumer's `EmptyState`; inside a `Place` the table claims
the whole column as `Columns` does. Resizing and reordering columns are out. A grid does not fit a
phone, so on native and on the web under `breakpoints.tablet` `Table` is a `List` of `ListRow`s
from the same columns, the one phone form of the component and not a column subset, since a
subset would pick columns by position where the kinds already say which cell is which: the first
column the title, the first `status` the leading glyph, the first `age` the trailing age, the
rest the meta line. A tap opens the row and its cells edit in the pane it opens, and the phone
draws no selection, since it never shows the pane beside the list; `onEdit` and `sortable` are
the grid's.

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

Not rebuilt yet, waiting for the first consumer surface that needs them: `ScrollArea`, `NavigationProgress`, `Logo`, `AvatarStack`, `FilterChip` and a chip row, `ProgressBar`, a numeric `Stepper`, `Input` kinds
`date`, `time` and `amount`, a file and image control.
