# Controls

A control is a field: it takes its `label`, plus the `description`, `optional` and `error` it draws placed alone, and no screen draws a control's name itself (`rules.md` says which control a value takes). A control's `value` may be a selection: it paints the control, inert, until its read lands, and follows it until the viewer changes it. Save from `onChange` or, where a keystroke is no save, `onCommit`: return the save's promise and the viewer's value holds while it pends; a refusal puts it back with its reason. This page is what each control takes.

## Button

One act in three forms: labelled, `href` (a link) and `glyph` (the icon alone).

- `act`: its kind. `primary` (the accent fill, the default), `danger` (the danger fill), `secondary` (a hairline), `destructive` (the hairline in danger ink), `quiet` (words in the meta ink). The `glyph` form takes `quiet` (the default), `destructive` or `primary` (a glyph on the accent fill, the act its bar is for: a player's Play).
- `fit`: what it sits in, `body` (the default) or `field`, full width under a field.
- `icon` leads the label; `count` follows it, in the label's ink.
- `wait`: the seconds left of a delay (a resend that opens in 30). The act is inert while it is above zero, its count drawn and no reason under it; at zero the count's slot stays hidden so the act keeps its width.
- `blocked`: why the act cannot run, a sentence. It is inert and says so under itself once pressed. The link form takes none.
- `onAct`, `confirm`, `done`, `to`, `sheet`: the act's wiring, in that order (`rules.md`).

## Input

What is typed or picked, by `kind`.

- `placeholder`: the hint while empty, never the field's name.
- `onChange` hears every keystroke. `onCommit` hears the value when the viewer is done: on leaving the field or Enter, only if it changed since focus; Escape puts back the value at focus. A `prose` input commits on leaving it alone, since Enter is a new line.
- `unit`: a `number`'s unit after the value, a word.
- `act`: an icon act at the field's end (copy, reveal, add), which Enter presses except in a `secret`.
- `autoFocus`: focus on mount, for a field that replaces what the viewer was reading, never one on a form that loads with the page.
- `prose` takes `source` (mono, indentation kept) and `budget` (a word budget: the count is drawn against it, in the error ink once over).
- `code` takes `length` (digits, a box each) and `onComplete`, which hears the code at its last digit. Return the check's promise: the boxes hold the code at rest, disabled under a spinner line, and a refusal stands under them with its reason.
- `file` takes `accept`, the MIME types, families and extensions (`["text/csv", ".har"]`); any other file never reaches `onChange`.

## Picker

A pick among options.

- `options`: flat or under group labels. An option's `leading` is a status, an avatar or an icon; it may carry a `chip`, a `line` under its label and why it is `blocked`.
- `placeholder`: the hint while nothing is chosen. At `field` the label stands over the box; at `row` the hint is the generic word (`words.choose`) and the label stays the accessible name; at the other fits the label is the hint.
- `fit`: where it stands. `field` (the default), `bar`, `row` or `pill` open a popover (a sheet on touch); `list` stands the options in the page as rows; `segments` as one row.
- `value` an array picks several.
- `act`: the icon act that makes a new option, ending the list.
- At `list`, `items` with `option` (a function per row slot) draw the rows from a read, and `children` stand under the first chosen option.
- At `segments`, options with an `href` are the tabs of a place and hold no value.

## Switch

Every boolean: `checked` and `onChange`.

## Slider

A number along a range. `value` runs from `min` to `max` in `step`s (1 unless set). `unit` is an Intl unit identifier (`minute`, `percent`) formatted after the value in the viewer's locale. `onChange` hears each value as it moves, `onCommit` the one the viewer lets go of (a key's step is one).
