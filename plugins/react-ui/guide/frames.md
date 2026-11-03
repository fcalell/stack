# Frames

A frame holds the rest of a screen: the `Shell` around the app, the `Pane` of a route, the `Gate` outside the shell, the `Sheet` over a page, the `Columns` and `Card` that arrange its sections. This page is what each takes; which frame a screen needs is `rules.md`.

## Shell

The frame of the app: a sidebar of places on the desktop, the column alone on touch.

- `places`: the places in order; the current route's is selected. A place's `children` nest under it, a branch that opens.
- `groups`: `{ label, switcher?, places? }`, named by a place's `group`; a `switcher` draws under its label.
- `switcher`: what the app is looking at and what it can switch to.
- `banner`: a `Banner` over the column.
- `children`: the route's `Pane`s.

## Pane

One column of a place.

- `title`: a short phrase or a selection of a read.
- `record`: `{ within, overline, facts, description }`. The bar holds `within` (where the record lives, "Agents") in place of the title, and the body opens with the record's name, whole and wrapping, between `overline` (the parts that place it, joined by a middle dot) and `facts` (a wrapping line of words, statuses, picks and links), the `description` as plain text under them. `title` stays the record's name, a selection of its read, so it paints while the record loads.
- `noun`: "project", for "Couldn't find this project."
- `back`: the route it returns to; absent, the router's parent; `false` none.
- `acts`, `more`: icon acts in the bar; the acts past them in a menu.
- `context` and `state`: for a page read in a context the viewer picks (Live, a change set, a version). `context` is a `Picker`'s props but `fit`, drawn in the bar as a pill after the title; `state` is its tone, `active` for Live, `attention` for a draft, `idle` for a version, a dot before the pick's label.
- `foot`: a field docked under the body, a `Thread`'s composer. `sheet` docks in its place while open.
- `read`, `empty`: the frame's read and its empty sentence (`rules.md`).
- `cover`: spans the place, the Panes before it hidden.
- `wide`: stands the body at the Pane's width, not the reading width, for a list page, a `Canvas` or a code `Diff`. In a Place a `wide` Pane takes all the spare room and the Pane after it, the record, holds the list width (520 px, floor 340 px) from `tablet`; the list stays first and wide, and below `tablet` the last Pane still stands alone.
- `fill`: the body's one child is a `Thread` or a `Canvas` that takes the free height.

```tsx
<Pane title="Library" wide>…</Pane>
```

## Gate

A page outside the shell: one centred step.

- `title`: the page's one `h1`.
- `description`: a meta line, runs allowed (`{ strong }` for an address).
- `step`: `{ at, of }`, the onboarding count between the mark and the title.
- `banner`: a `Banner` under the title, at the column's width, so a verdict stands with the content it is about.
- `children`: the body ahead of the form: a `Picker` at `list`, `Section`s of rows, controls.
- `acts`: `Button`s on one line under the body, primary first.
- `form`: a `Form`'s props, its bar across the column.

## Sheet

A task over the page.

- `open`, `onClose`: its holder owns both; an act's `sheet` takes the rest.
- `title`, `description`: the heading and the sentence under it.
- `back`: a function, a second page's way back, first in the head.
- `submit`: the act that completes the task.
- `fit`: `form` (the default) or `pane` for a record's pane; it sets the card's width.
- `read`, `empty`: the body's read and its empty sentence.
- `children`, `form`, `after`: parts ahead of a `Form`'s props, then parts after it (a preview of what it would send).

## Columns

Sections side by side. `fit`: `board` (the default) stands each at the column width in a row that scrolls sideways; `half` stands two to a row from the Pane's desktop width and stacks them below it.

## Card

A surface for one part of a `Section` that draws none (a `Prose`, `Stats`, `Stages`, `Image` or `Slider`, as `children`). A `Form` and a `Table` are cards already.
