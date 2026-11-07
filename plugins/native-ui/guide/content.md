# Content: lists, tables and threads

The content that fills a `Pane`: a `Section` of rows, a `Table`, the `Toolbar` over a list, `Rules` and a `Thread`. Each takes its data as props (`rules.md`) and, given a selection, is the frame of its own read. The parts that read as a block (`Prose`, `Code`, `Stats`, `Image`) are `blocks.md`. This page is what each takes.

## Section

A titled stretch of a page, over its rows (`items`) or its parts (`children`).

- `title`: a short phrase, or a selection of the read the section holds. A Section with `items` and no `title` is the sheet alone.
- `description`: a sentence under the title.
- `folded`: makes the title fold the body, and is the initial fold (`true` starts folded, `false` open; later changes are not read). `onToggle` hears whether it is now open. The title stays the heading size folded or not.
- `act`, `more`: the head's one icon act and its other acts in a menu; a foldable section's `more` does not fold it (`rules.md`).
- `items`, `groups`: the sheet's rows, and the bands over them (a row's `group` is a band's `key`), each constants or a selection. One row given alone, not in an array, is a value (a field that holds one thing): no list, and the head draws no count.
- `read`, `empty`: the body's read (with `items`, a read the rows depend on besides them, the options of a row's pick), and what it says when empty. A Section with a `description` takes an `empty` of its `act` alone.

## Table

Records as rows and columns, a list of rows below `tablet` of the window.

- `items`, `columns`, `row`: the records, the columns in order (the first is the row's name) and the row's slots, each read from the item (`rules.md`).
- `label`: its accessible name, for a page that holds more than one table.
- `empty`: what the table says in its own box when its `items` selection answers none, `{ sentence, act? }` as a `Section`'s `empty` (`act` an act that runs, or a `{ label, href }` that goes to a route): a constant from the parent, so a screen with a filter on gives the sentence for it from its own state. The `Toolbar` and the `Pane` above stand through it. Without it the generic sentence stands, with no act.
- `selected`: the open record's id, washed as selected.
- `current`: the id of the current row, apart from the open record (what is playing, the step a deploy is at): the current bar at the row's start, read as selected by the screen reader (the phone has no current state). On the list form the row is current as a list row is, the bar and the wash.
- `onOpen`: a press on a row.
- `onEdit(id, key, value)`: hears each committed edit of a cell whose column has `edit: "input"`. Return the save's promise and the cell's control holds the viewer's value while it pends; a refusal puts it back with its reason. A table that edits also takes `onOpen`; below `tablet` the record it shows is where a cell edits.
- `choose`: the ticked rows (`rules.md`). The acts on them are the `Pane`'s `foot`, an `ActionBar` with `chosen`.

## Toolbar

The strip over a list; the search stands on a row of its own. It has no `tabs`.

- `search`: `{ value, onChange, placeholder? }`. Absent, the strip has none.
- `filters`: a `Picker`'s own props (`label`, `options`, `value`, `onChange`; an array `value` picks several). All fold behind one Filters act that counts those set and opens them as labelled picks in a sheet.
- `chips`: `{ label, family, onRemove }`, the applied filters of the app's own, in a row under the acts.
- `children`: the acts at the bar fit, never a filled act: the create act is the page's.

## Rules

Rows of inline terms. `rules` is a list of `{ id, terms, onRemove? }` with `terms` a pair (`from`, `to`) or a condition (`field`, `operator`, `value`); `add` is the act that ends the list.

## Thread

A conversation: `items` drawn through `message`, over a `composer`.

- `message`: slots each reading only its item: `key`, `author`, `name`, `body`, `at`, `attachments`, `from`, `streaming`, `onOpen`, `detail`.
- `composer`: `value`, `onChange`, `attachments`, `onAttach`, `onDetach`, `placeholder`, `notice`, `working`, `onSend`, `onStop`, `disabled`.
- `sheet`: docks in the input's place. A `Pane`'s `foot` takes the input on its own, a `Composer` with the same props.
- `replying`: a reply from the other author is on its way; the loaded log ends on a waiting message of theirs until it is cleared.
- `reply`: the turn being written, a stream the app declares (`node_modules/@fcalell/plugin-api/guide/pages-and-streams.md`). It draws after the items and steps aside once the last item has its key.
- `empty`: the sentence, and the act that makes the first message.

```tsx
<Pane title="Chat">
  <Thread
    items={log}
    message={{ key: (m) => m.id, author: (m) => m.who, body: (m) => m.text }}
    composer={{ value: draft, onChange: setDraft, onSend: send }}
  />
</Pane>
```
