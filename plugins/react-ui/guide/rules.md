# Rules for the web UI

Every app `.tsx` follows these rules. The design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`; cells, states and tokens in ui-core's `DESIGN.md`)
plus the app's own `ui/` directory (any `ui/` path segment); everything else composes components
and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the frame (`Shell`, `Place`, `Screen`, `Split`),
the rhythm (`Section`, `Group`, `List`), the row (`ListRow`, `DefinitionRow`, `FormField`), the
control, the text role (`Text`). A host element that rebuilds one of these is drift. A `Split` is its page's frame region: it
stands as the bleeding `Place`'s (or `Screen`'s) direct child, never inside a component of the
app's, so the page's head draws its back and Details acts.

A record the open record links to opens beside it: the `Split`'s `beside` holds a `Screen` whose
`back` is the open record's route. From `wide` it stands beside the main, its back act a Close;
below `wide` it stands in the main's place with its back act, and below `tablet` its head is the
page's only head, its back act to the main.

```tsx
<Split list={rows} main={<Item />} beside={<Screen title="Run 12" back={itemRoute}><Run /></Screen>} />
```

## Classes are geometry, on host elements only

A component takes no `class`, `className`, `classList` or `style`: its props type declares each
`?: never`. A class belongs only on an intrinsic host element (`div`, `span`, `ul`) and only for
geometry: flex plumbing, alignment, zero offsets, fill sizes, gap rungs. A fill, radius, border,
shadow, weight, tone, transition or state is a look, and a numeric dimension is never geometry.

```tsx
<div className="flex min-w-0 items-center gap-pair">
  <Status state="active" label={words.active} />
  <Text role="meta">{sentence}</Text>
</div>
```

## Tokens only

Every colour, size, radius and spacing is a contract token; never an arbitrary value
(`h-[34px]`), a literal colour or a raw pixel size. Copy renders through `Text` (`body` or `meta`,
with `strong`) or the molecule that owns its role (`title` is `Place`'s and `Screen`'s, `heading`
`Section`'s, `figure` `Stats`', `display` `Stat`'s); colour comes through a component's props.

## A picture is an `Image`

A picture is an `Image`, never an `<img>`: `src`, `alt` (a sentence naming what it shows), a `fit`
(`thumb`, a square tile beside the lines that say where it came from, or `content`, the
container's width at the picture's own aspect, capped in height) and `loading`. It draws its own
waiting and failed forms (the failed form says the `alt`), and a press opens the full picture over
the scrim with a Close act, Escape and a press outside. The full view takes no zoom.

```tsx
<Image src={shot.url} alt={shot.title} fit="thumb" loading={shot.pending} />
```

## A page read in a context names it beside its title

A page read in a context (Live, one change set, a past version) takes `context` on its `Place`: a
`Switcher`, the same descriptor the shell's switcher takes (`label`, `options`, `value`,
`onChange`, and `act` ending the list with the way to open a new context). It draws a pick beside
the title, on touch under the top bar as on the desktop in the strip. An option's `chip`
(`{ family, label }`) is its kind (Draft, Ready), drawn after its label in the list and on the
trigger; `status` stays for a work state that moves. Never a `Picker` of your own beside the
`title`, and never the kind in the label.

```tsx
<Place
  title="Billing"
  context={{
    label: "Context",
    value: context,
    onChange: setContext,
    options: [
      { value: "live", label: "Live" },
      { value: "billing", label: "Billing limits", chip: { family: "amber", label: "Draft" } },
    ],
    act: { icon: "Plus", label: "New change set", onAct: openNew },
  }}
/>
```

## An onboarding step shows its count

A flow of two to four steps shows where it stands as a `StepCount`: `at` (counted from one) and
`of`. It draws a segment per step and "Step n of m", never a hand-built bar or a row of dots. It
heads the step's page, whether that is a `Place`, an auth column or a sheet page.

```tsx
<StepCount at={2} of={3} />

## A rail of fixed states is `Stages`

A known sequence with a position in it (Submitted, In spec, In build, Live) is `Stages`, never a
`List` of rows or a `Status` per line: `steps`, each a `Stage` (`{ label, state, at? }` from
`@fcalell/ui-core/descriptors`, `state` `done`, `current` or `later`, `at` an ISO moment a done or
current stage may carry), and `ended`, the terminal row (`{ label, reason }`) that replaces every
stage after the last done one. A feed of what happened is not a rail.

```tsx
<Stages steps={request.stages} ended={request.rejection} />

## Counts are `Stats` and `Stat`

A strip of counts is `Stats`, never a `Columns` of `Text`: `items`, each a `StatSpec` (`label`,
`value`, `unit`, `meta`) that is either the whole cell a link (`href`) or carries `counts` (each a
`CountLink` with its own `href`), never both. Zeros are counts, drawn. It stands two cells to a row
below `tablet`. One figure that is the focal point of its screen is a `Stat` (`label`, `value`, `unit`),
once per screen, its label read after it ("2 need you"); a `Stats` cell's label is read before it.

```tsx
<Stats items={[
  { label: "Projects", value: projects.length, href: "/projects" },
  { label: "Tests", value: 1284, counts: [{ label: "failing", value: 3, href: "/tests/failing" }] },
]} />
```

## A screen read from across a room declares its distance

A screen read from across a room (a television, a wall display) takes `distance="room"` on its
`Place`: no query detects the viewing distance, so the page states it. The page draws the touch
set on a 960 × 540 canvas, scaled to the screen by its width and height (`min(100vw / 960,
100dvh / 540)`, never under one pixel): at 1920 × 1080 the body is 32, the title 44, a control 88
and a `Stat`'s figure 160, five times its label. It holds one column of `Columns`, `Stats` and
one `Stat` and never splits, since breakpoints stay px while its widths scale, and it takes no
`context`, `more` or `foot`, whose layers open outside it. Set it on the screen's one page,
never on a part of a page, and never a density of your own: `data-density` is the showcase's pin.
Its sizes ignore browser zoom, and a scaled size is fractional.

```tsx
<Place title="Deploys" distance="room">
  <Stat label="need you" value={3} />
  <Stats items={[{ label: "Deployed", value: 14 }, { label: "Failed", value: 1 }]} />
</Place>
```

## Data, never nodes

A composed region is data its molecule renders: an `Act` (`{ label, onAct, destructive? }`),
an `IconAct`, a row's `StatusMark` and `ChipMark`, a `PlaceSpec`, all from
`@fcalell/ui-core/descriptors`. An icon is an `IconName`, a Lucide glyph's PascalCase name.
`children` is open only where the roster gives it. A `Form` submits through its `ActionBar`'s
filled act, the act pending while its promise pends; a `confirm()` takes a `Confirmation`.

A row's marks are named props on the meta line, at most one each, in order: `status`, `warning`
(what is wrong, a string), `lock` (what it holds, a string, its label shown from `tablet`) and
`chip`; the act that clears a warning is the row's `act`.

Where a row, a fact or a field stands in a change set is its `change` (`ChangeKind`: `added`,
`changed`, `removed`, `unchanged`, `stale`), one prop on `ListRow`, `DefinitionRow` and `FormField`
and a `change` slot on a `List`'s `row` map and a `Table`'s `row`: a glyph in the kind's ink in a
lane at the row's start, named by the kind's word. Mark every row of a set, the untouched ones
`unchanged`, so the titles line up.

A row's next step is its `act`, one labelled `Act` at its end ahead of the more menu (an act the
row waits on keeps its pending press there, never also in `more`). An input on a row is its
`entry`, a `RowEntry` (`label`, `field`, `placeholder`, `act`, `error`) standing under the title
in the meta line's place; once its act settles, give the row `meta` or `status` instead of
`entry`. A `List`'s `row` map declares `act` and `entry` only if every item fills them.

A row off a highlighted path (a journey's untaken steps) is `dim`: its title in the meta ink at
400, never faded, still a link and focusable, its glyph and marks keeping their hue. While a
row's act pends, its work's steps are `steps` (a `StatusMark` each, the running one in `running`):
one line each in the meta line's place, so give `meta` back once the act settles. A title read
whole (a note, a memory) is `wrap`: it wraps to every line at 400 with its leading, trailing and
acts on the first line, and a `List`'s `row` map takes it as one boolean for every row. A
`{ quoted }` title marks a model-written name; `wrap` is for text a person approved.

Rows that branch (a journey's choice points and their legs) are a tree: the `List`'s `row` map gives
`children`, each item's children, and the List draws a rail per level, a fold act on every parent
(open by default) and a lane every row reserves for it, so give each item a `key` unique across the
whole tree. Never indent rows with a class, a nested `List` or a `ListRow` of your own. A `dim`
branch gives `dim` to the parent and every child. Arrow Left folds an open branch and Arrow Right
opens a closed one.

Rows of inline terms (a mapping of sources to targets, a filter's conditions) are `Rules`: each
`Rule` is `{ id, terms, onRemove? }`, its `terms` a pair (`{ from, to }`) or a condition
(`{ field, operator, value }`), each term a `RuleValue`, one of `{ pick }` (an `OptionPick`),
`{ picks }` (a `MultiPick`, the chosen values as removable chips) or `{ either }` (an
`EitherPick`: a picked option or a typed value, `{ picked }` or `{ typed }`, with a way back).
`add` is the act that ends the list. A pick of several outside a rule is a `Picker` given an
array `value`.

```tsx
<Rules
  rules={[{
    id: "page",
    terms: {
      field: { label: "Field", options: fields, value: "page.type", onChange: setField },
      operator: "in",
      value: { picks: { label: "Values", options: pages, value: ["checkout"], onChange: setPages } },
    },
    onRemove: remove,
  }]}
  add={{ label: "Add condition", onAct: add }}
/>
```

A value outside its editable context is a `DefinitionRow` with `locked`, a `Lock` (`reason`,
`href`): the value stays, a lock follows it and the reason stands under it, the whole line a link
with an `href` ("Held by CR-12, Ana"). A locked row takes no `description`, `act`, `href` or
`onOpen`. A held value is never a disabled `FormField`.

## Collections take data

A collection takes data and draws its states. A `List` takes its `query` (or static
`items`) and one item map, `row` for `ListRow`s, `file` for `FileRow`s or `meter` for `Meter`s,
one function per slot; declare a slot only if every item fills it. Pending, it waits in those
slots; failed, it shows `sentence` and Retry; empty, `empty`, with the act that fills it. Rows share one `leading` kind
(`avatar`, `icon` or `status`) or none. The first meta part names the item; it and the status
stay whole as the later parts, then the chip, truncate. A file row's `chip` says why it is listed
or what its change is; it stays whole and the path yields to it. A Section counts them and waits with them when
they stand as its direct children, inside a direct `Group`, or as a direct `QueryBoundary`'s
query; a collection inside the app's own component, or inside a `QueryBoundary`'s body, draws
itself but adds no count and no busy state to the Section's head. A `Group` holds
static rows; rows from data in a card are a `List` placed in the `Group`, drawing its states
on the card, never a `.map` of `ListRow`s or `Meter`s.

A read that answers not found (its query's `error` carries `code: "NOT_FOUND"`, as a stack
procedure throws it, or `status: 404`) draws "This no longer exists." (the `missing` word) with
Back, never Retry: Back goes to the enclosing `Screen`'s `back`, else to the place's route, and
with neither there is no act. Pass the `useQuery` result whole so its `error` arrives; a record
opened by an address after it was removed then needs no screen of its own.

A `Table` takes its data the same way: `query` with `sentence`, or `items`; each column reads its
cell from the item by `cell`, and `row` gives the row's `id`, `href`, `locked`, `warning` (what is
wrong with it, drawn after its name) and `change` (where it stands in a change set, its mark ahead
of its name). It draws its states itself, with no `QueryBoundary` around it. An editable table
(`onEdit`) draws a lock after a cell its row locks; a column's own `locked` (a reason) makes it read
only, its lock in the head alone.

A table that acts on rows takes `choose`: `chosen` (the ticked ids) and `onChange`, with `blocked`
and `moved` reading a row's reason from its item. A tick column leads the grid and its head tick is
unchecked, mixed or checked over the rows that can be ticked. `onChange` hears the viewer's tick
and your rule decides what the set becomes (ticking a change under a new parent ticks the parent):
return the ruled set through `chosen`. A `blocked` row cannot be ticked and a `moved` row says why
its tick moved ("Needed by Checkout"), each as a line under the row's name. The table draws no
count. Its count is the `ActionBar`'s: dock `<ActionBar chosen={{ count, of }} acts={[publish]} />` as the Place's `foot`, and it reads "N of M chosen" at the bar's start beside the one act, whose label you set ("Publish 4 changes") and whose `blocked` reason you give when nothing can go. On the desktop the bar spans the page's width; on touch the count stands over the full-width act. A row of a `List` leads with a tick as `leading: { check }` (its
`blocked` reason leads the meta line).

```tsx
<List
  query={notes}
  sentence="Notes did not load."
  empty={{ sentence: "No notes.", act: { label: "New note", onAct: create } }}
  row={{ key: (n) => n.id, title: (n) => n.title, meta: (n) => [n.edited] }}
/>
```

An `OptionList` holds a static set in `options`. Options from a query take `query`, `sentence`,
`empty` (a sentence) and an `option` map over the check row: `value`, `label`, `description`,
`recommended` and `group`; it waits, fails and empties inside its card. Its `value` picks the
form: a set (`onChange` hears the set) draws check rows, one value or `null` (`onChange` hears
the value) radio rows, one answer among a few described options.

A `Thread` takes its `query` (or `items`) the same way through a `message` map (`key`,
`author`, `name`, `body`, `at`, `attachments`, `meta`, `onOpen`, `detail`), each reading only its item, since a message
draws again only when its item changes; its `MessageInput` stays the `foot`. In a
`Place`'s body, or in a `Split`'s `main` under the record's `ItemHeader`, it fills what holds it:
its log scrolls and the input docks at the foot. It stands there as the body's direct child, or
as `main` (in a fragment under the record's `ItemHeader`), never inside a component of the
app's, so the frame knows it from its first render. What a
system line names stands under it as its `detail`, a `MessageDetail`, exactly one of: a `row`
(a `ListRow`'s slots, in a hairline card, opening its record), a free act's `code` under its
verb, or a `fold` of lines the line opens in place; never a `ListRow` or a `Code` between the
messages.

A `MessageInput`'s `onAttach` hears `PickedFile`s: the paperclip's dialog, a file pasted into the
text and a file dropped on the input all come through it. Turn each into an `Attachment`
(`{ id, name, src? }`, `src` for an image) and pass it back through `attachments`: an image
draws as a thumbnail with its remove act, a file as a chip. A `Message` for `you` or `other`
takes the same `attachments`, and `meta` (`"by voice"`, `"Kitchen"`) before its time.

A field that stays in view while a `Place`'s sections scroll under it (an ask box over a
home's sections) is the Place's `foot`: it docks at the Place's bottom, above the tab bar on
touch; a selection bar (an `ActionBar` with `chosen`) docks the same way. A Place takes a `foot` or an `act`, never both, since each holds the screen's filled act.
A `Thread` in a Place with a `foot` stands among its sections, inline, its `foot` left empty.

A `BarChart` takes data the same way, its `bar` map reading each item's `key`, `label`, `value`,
`parts` (by its declared `keys`) and `at`; its failed and empty forms stand at the chart's height.

Any other region reading a query sits in its own `QueryBoundary`, naming its loading form; it
draws the not-found form when every failed query answers not found.

## Words are the config's, sentences are props

A word a component draws on its own comes from `reactUi({ words })`, read with
`useWords()` from `@fcalell/plugin-react-ui/lib/words`; every sentence the app shows is a prop.

## The app's `ui/`

A shape that needs the app's nouns (`ProjectRow`, taking a `project`) lives in `ui/`, composes
roster components only, never a host element with a look, and reads no data.

## What the roster lacks is a gap

A shape no component owns, or a look its props cannot express, is a gap in stack: leave that part
out, compose the rest, and file it by the gap recipe (`node_modules/@fcalell/cli/guide/gap.md`).
Never a call-site class, a wrapper that re-adds a look, a local copy of a stack component, or a
host element carrying tokens.

## Done

`pnpm check` passes, and the screen is checked in light and dark at desktop and touch density.
