# Content: lists, tables and threads

The content that fills a `Pane`: a `Section` of rows, a `Table`, the `Toolbar` over a list, `Rules` and a `Thread`. Each takes its data as props (`rules.md`, collections take data) and, given a selection, is the frame of its own read. The parts that read as a block (`Prose`, `Code`, `Stats`, `Image`) are `blocks.md`. This page is what each takes.

## Section

A titled stretch of a page, over its rows (`items`) or its parts (`children`).

- `title`: a short phrase, or a selection of the read the section holds. A Section with `items` and no `title` is the sheet alone.
- `description`: a sentence under the title.
- `folded`: makes the title fold the body, and is the initial fold (`true` starts folded, `false` open; later changes are not read). `onToggle` hears whether it is now open. The title stays the heading size folded or not.
- `act`, `more`: the head's one icon act and its other acts in a menu; a foldable section's `more` does not fold it (`rules.md`, acts).
- `items`, `groups`: the sheet's rows, and the bands over them (a row's `group` is a band's `key`).
- `reorder`: lets the rows be moved (`rules.md`, drag, drop and reorder).
- `read`, `empty`: the read of a Section over parts (`children`), and what it says when empty; a Section with `items` frames its own selections and takes no `read`. A Section with a `description` takes an `empty` of its `act` alone.

## Table

Records as rows and columns: a grid where the density is desktop, a list on touch. A narrow container (a list beside an open record) keeps the grid and scrolls it sideways under its frozen leading column.

- `items`, `columns`, `row`: the records, the columns in order (the first is the row's name) and the row's slots, each read from the item (`rules.md`, collections take data).
- `label`: its accessible name, for a page that holds more than one table.
- `selected`: the open record's id, washed as selected.
- `current`: the id of the current row, apart from the open record (what is playing, the step a run is at): the current bar at the row's start and `aria-current`, never a fill. On touch the row is current as a list row is, the bar and the wash.
- `onOpen`: a press on a row, Enter on its leading cell.
- `onEdit(id, key, value)`: hears each committed edit of a cell whose column has `edit: "input"`. Return the save's promise and the cell's control holds the viewer's value while it pends; a refusal puts it back with its reason. A table that edits also takes `onOpen`, since a phone edits through the record it shows.
- `choose`: ticked rows; the acts on them are an `ActionBar` with `chosen` in the Pane's `foot` (`rules.md`).
- `drag`, `reorder`: rows dragged onto a drop, or moved within the grid (`rules.md`, drag, drop and reorder).

## Toolbar

The strip over a list.

- `tabs`: `{ label, href }` views, the one the location selects marked.
- `search`: `{ value, onChange, placeholder? }`. Absent, the strip has none.
- `filters`: a `Picker`'s own props (`label`, `options`, `value`, `onChange`; an array `value` picks several). Two or fewer stand beside the acts on the desktop; three or more fold behind one Filters act that counts those set; on touch every filter folds.
- `chips`: `{ label, family, onRemove }`, the applied filters of the app's own, in a row under the strip.
- `children`: the acts at the bar fit, never a filled act: the create act is the page's.

## Rules

Rows of inline terms. `rules` is a list of `{ id, terms, onRemove? }` with `terms` a pair (`from`, `to`) or a condition (`field`, `operator`, `value`); `add` is the act that ends the list.

## Thread

A conversation: `items` drawn through `message`, over a `composer`.

- `message`: slots each reading only its item: `key`, `author`, `name`, `body`, `at`, `attachments`, `from`, `streaming`, `onOpen`, `detail`.
- `composer`: `value`, `onChange`, `attachments`, `onAttach`, `onDetach`, `placeholder`, `notice`, `working`, `onSend`, `onStop`, `disabled`.
- `sheet`: docks in the input's place.
- `replying`: a reply from the other author is on its way; the loaded log ends on a waiting message of theirs until it is cleared.
- `reply`: the turn being written, a stream the app declares (`node_modules/@fcalell/plugin-api/guide/pages-and-streams.md`). It draws after the items and steps aside once the last item has its key.
- `empty`: the sentence, and the act that makes the first message.

```tsx
<Pane title="Chat" fill>
  <Thread
    items={log}
    message={{ key: (m) => m.id, author: (m) => m.who, body: (m) => m.text }}
    composer={{ value: draft, onChange: setDraft, onSend: send }}
  />
</Pane>
```
