# Frames

A frame holds the rest of a screen: the `Shell` around the app, the `Pane` of a route, the `Gate` outside the shell, the `Sheet` over a page, the `Columns` and `Card` that arrange its sections. This page is what each takes; which frame a screen needs is `rules.md`.

## Shell

The frame of the app: a sidebar of places on the desktop, the column alone on touch. A Shell whose places name groups draws the sidebar as a rail of groups beside the group column; one that names none draws the one sidebar.

- `places`: the places in order; the current route's is selected. A place's `children` nest under it, a branch that opens. The sidebar's places scroll between the switcher bar and the footer group (the places with `end`), which stay fixed; with groups the footer places stand at the rail's foot as icon links.
- `groups`: `{ label, icon, switcher?, places? }`, named by a place's `group`; a place naming a group `groups` does not list throws. The `icon` is the group's entry on the rail, the `label` its name there (a tooltip) and the column's heading; a `switcher` draws under the heading. The rail's first entry is the ungrouped places, named and drawn by their first place; the others follow in `groups`' order. Pressing an entry shows that group's column without going anywhere, until the route changes (the column then shows the current place's group, marked current on the rail); the column folds away from its head, leaving the rail, and an entry pressed while it is folded unfolds it (the browser keeps the fold). On touch the places layer lists the groups first, a tap shows that group's places with a way back to the list.
- `switcher`: what the app is looking at and what it can switch to.
- `banner`: a `Banner` over the column.
- `foot`: a part under the place across the column, whatever the route (a `Dock`, `audio.md`); without one the Shell draws nothing there.
- `children`: the route's `Pane`s: the place's own, then a record's.

## Pane

One column of a place, of two kinds, one of each at most: the place's own, titled by the place's name, and a record's after it, titled by the record's name (`rules.md`).

- `title`: the record's name, a short phrase or a selection of its read, on a record's Pane. The place's Pane takes none: the place's name titles it.
- `record`: `{ overline, facts, description, image }`, on a record's Pane. The bar holds the place's name, a slash and the record's name, then Expand (which folds the place's Pane away and turns to Collapse) and Close; below `tablet` of the place Back leads the bar instead of Close. The body opens with the record's name, whole and wrapping, between `overline` (the parts that place it, joined by a middle dot; never the place's name, which the bar holds) and `facts` (a wrapping line of words, statuses, picks and links), the `description` as plain text under them, and the `image` (`{ src, alt }`: a person's photo, a product shot) a square tile beside all of it at the top, painted while its `src` is a read, an `ImageOff` glyph where it failed or the address is empty.
- `noun`: "project", for "Couldn't find this project." `missing`: the sentence in its place.
- `acts`, `more`: icon acts in the bar; the acts past them in a menu.
- `context` and `state`: for a page read in a context the viewer picks (Live, a change set, a version). `context` is a `Picker`'s props but `fit`, drawn in the bar as a pill after the title; `state` is its tone, `active` for Live, `attention` for a draft, `idle` for a version, a dot before the pick's label.
- `foot`: a field docked under the body, a `Thread`'s composer. `sheet` docks in its place while open.
- `read`, `empty`: the frame's read and its empty sentence (`rules.md`); a Pane with no `empty` leaves its sections to draw their own.
- `fill`: the body's one child is a `Thread` or a `Canvas` that takes the free height.

```tsx
<Pane title={deploy.at((d) => d.commit)} record={head} noun="deploy">…</Pane>
```

## Gate

A page outside the shell: one centred step.

- `title`: the page's one `h1`.
- `description`: a meta line, runs allowed (`{ strong }` for an address).
- `step`: `{ at, of }`, the onboarding count between the mark and the title.
- `banner`: a `Banner` under the title, at the column's width, so a verdict stands with the content it is about.
- `children`: the body ahead of the form: a `Picker` at `list`, `Section`s of rows, controls.
- `acts`: an act list in reading order, the filled act last (`Act`s, and `LinkAct`s for a Back or a way home), drawn as an `ActionBar` under the body: at the auth width, across the column with the filled act on top. A step with a `form` gives its alternatives as the form's `acts`; a resend is a caption with an inline act (`Button` at `fit: "inline"`) in the form's `after`.
- `form`: a `Form`'s props, its fields a card and its bar after the card.

## Sheet

A task over the page: a create, an edit, a decision, an acknowledgement. A record is read in a `Pane`, never in a sheet.

- `open`, `onClose`: its holder owns both; an act's `sheet` takes the rest.
- `title`, `description`: the heading and the sentence under it.
- `back`: a function, a second page's way back, first in the head.
- `submit`: the act that completes the task.
- `read`, `empty`: the body's read and its empty sentence.
- `children`, `form`: parts ahead of a `Form`'s props; the form's own `after` is a function of its input that draws what follows its fields (a preview of what it would send), the form's bar standing after it, pinned to the sheet's foot, so the submit never ends above the preview.

## Columns

Sections side by side. `fit`: `board` (the default) stands each at the column width in a row that scrolls sideways; `half` stands two to a row from the Pane's desktop width and stacks them below it.

## Card

A surface for one part of a `Section` that draws none (a `Prose`, `Stages`, `Image` or `Slider`, as `children`). A `Form`, a `Table`, a `Stats` and a `BarChart` are cards already.
