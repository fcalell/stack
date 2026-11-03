# Frames

A frame holds the rest of a screen: the `Shell` around the app, the `Pane` that is a screen of the router's stack, the `Gate` outside the shell, the `Sheet` over a page, the `Columns` and `Card` that arrange its sections. This page is what each takes; which frame a screen needs is `rules.md`.

## Shell

The frame of the app: the tab bar over the home indicator, the player's dock, the toasts and the `confirm()` sheets.

- `places`: the tab bar's places, in order. Past five, four stand and a More tab opens a page of the rest.
- `groups`: `{ label, switcher? }`, named by a place's `group`; the More page draws a group's switcher over its places.
- `switcher`: what the app is looking at and what it can switch to. Its trigger starts the bar of each `Pane` that has no back act.
- `banner`: a `Banner` under the status bar.
- `children`: the router's stack, each screen a `Pane`.

## Pane

One screen of a place.

- `title`: a short phrase or a selection of a read; one line in the bar.
- `record`: `{ within, overline, facts, description }`. The bar holds `within` (where the record lives, "Agents") in place of the name, and the body opens with the record's name, whole and wrapping, between `overline` (the parts that place it) and `facts` (a wrapping line of words, statuses, picks and links), the `description` under them. `title` stays the record's name, a selection of its read, so it paints while the record loads.
- `noun`: "project", for "Couldn't find this project."
- `back`: the route it returns to, a Back act leading the bar. Absent, the router's parent, and the shell's switcher where there is none; `false` leaves the switcher.
- `actions`: icon acts after the title, the primary first. It stands at its icon; the rest lead the `more` menu.
- `more`: the acts past them, in a menu.
- `foot`: a field docked under the body over the keyboard, a `Thread`'s composer. `sheet` docks in its place while open.
- `read`, `empty`: the screen's read and its empty sentence (`rules.md`).
- `cover`, `wide`: accepted for the web's sake and change nothing; a Pane fills its screen and its body is one column.

## Gate

A page outside the shell: one step on the surface, scrolling over the keyboard.

- `title`: the page's one header.
- `description`: a meta line, runs allowed (`{ strong }`).
- `step`: `{ at, of }`, the onboarding count before the title.
- `banner`: a `Banner` under the title, so a verdict stands with the content it is about.
- `children`: the body ahead of the form: controls, `Button`s, `Section`s of rows. A first run is a titled Gate whose body is its `Button`s.
- `form`: a `Form`'s props, its bar across the column.

## Sheet

A task over the page.

- `open`, `onClose`: its holder owns both; an act's `sheet` takes the rest.
- `title`, `description`: the heading and the sentence under it.
- `back`: a function, a second page's way back, first in the head.
- `submit`: the act that completes the task, at the head's end.
- `fit`: `form` (the default) or `pane` for a record's pane.
- `read`, `empty`: the body's read and its empty sentence.
- `children`, `form`, `after`: parts ahead of a `Form`'s props, then parts after it (a preview of what it would send).

## Columns

Sections side by side. `fit`: `board` (the default) stands each at the column width in a row that scrolls sideways; `half` stacks them in order.

## Card

A surface for one part of a `Section` that draws none (a `Prose`, `Stats`, `Stages`, `Image` or `Slider`, as `children`). A `Form` and a `Table` are cards already.
