# Rules for the web UI

Every app `.tsx` follows these rules. The design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`; cells, states and tokens in ui-core's `DESIGN.md`)
plus the app's own `ui/` directory (any `ui/` path segment); everything else composes components
and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the frame (`Shell`, `Place`, `Screen`, `Split`, `Gate`),
the rhythm (`Section`, `Group`, `List`), the row (`ListRow`, `DefinitionRow`, `FormField`), the
control, the text role (`Text`). A host element that rebuilds one of these is drift. A `Split` is
its page's frame region: it stands as the bleeding `Place`'s (or `Screen`'s) direct child, never
inside a component of the app's, so the page's head draws its back and Details acts. Its back act
returns to the place's route; a list that stands at a deeper route names it as `back`
(`<Split back={treeRoute} …>`), which an open record returns to, whether its page is a `Place` or a
pushed `Screen`, and a missing read in it leads to, ahead of the `Screen`'s own `back`. A list that
stands alone at a deeper route is a pushed `Screen` whose `back` is the route above it, holding
`<Split back={treeRoute} …>`: the `Screen`'s back act leads up while the list stands alone, and the
`Split`'s `back` takes its place once a record is open.

A `Split` reads its regions against its page's width, not the viewport's, and in the `Shell` the page
is the viewport less the 240 px sidebar. The list and the main stand together from a page `tablet`
(768) wide, a 1008 px viewport; `beside` and `pane` stand from a page `wide` (1200) wide, a 1440 px
viewport. Below them one region stands at a time.

A record the open record links to opens beside it: the `Split`'s `beside` holds a `Screen` whose
`back` is the open record's route. From `wide` it stands beside the main, its back act a Close;
below `wide` it stands in the main's place with its back act, and below `tablet` its head is the
page's only head, its back act to the main. The record's title keeps its heading level at every
width. The body's first child, an `ItemHeader`, stands a pair, not a sections gap, above an `ActionBar` directly after it (a `Place`, a `Screen` or a `Split`'s `main`) and, in a `Split`'s `main` when it has no facts line, above the record's first section (not above a `Thread`). The body reads its own children, a fragment seen through: a head or bar reached through a wrapper component keeps the sections step.

```tsx
<Split list={rows} main={<Item />} beside={<Screen title="Run 12" back={itemRoute}><Run /></Screen>} />
```

A `Place`'s `title` is the page's name at every density: a place that draws one section of a larger
area titles itself with the section's name (`Repos`, not `System`), which the sidebar item or the tab
carries; the app never picks another title for the phone. A `Group` or `List` standing directly in a
`Place`'s body stands a page inset under the head's hairline, where a `Section`'s title stands a pair
over its body: the page's title is a strip over a hairline, the section's a line of the body, and a
list that should read as a section's own wants a `Section`.

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
with `strong`) or the molecule that owns its role (`title` is `Place`'s, `Screen`'s, `Gate`'s and `ItemHeader`'s, `heading`
`Section`'s (a `Section` inside a `Section` names itself at `body` semibold, a level below), `figure` `Stats`', `display` `Stat`'s); colour comes through a component's props.

## A picture is an `Image`

A picture is an `Image`, never an `<img>`: `src`, `alt` (a sentence naming what it shows), a `fit`
(`thumb`, a square tile beside the lines that say where it came from, or `content`, the
container's width at the picture's own aspect, capped in height), an `aspect` and `loading`. It
draws its own waiting and failed forms (the failed form says the `alt`; a `thumb`, too small for a
sentence, draws the glyph alone and the `alt` names it), and a press opens the full picture over
the scrim with a Close act, Escape and a press outside. The full view takes no zoom.

A `content` picture has no aspect until its bytes arrive, so `aspect` is required: its width over
its height (`16 / 9`), and its box holds that aspect in every state (waiting, failed and loaded),
the picture cover-cropped to it, so nothing moves when the bytes land. A `content` picture without
one is a type error; store the picture's width and height with its address. A `thumb` is always
square and takes none.

```tsx
<Image src={shot.url} alt={shot.title} fit="thumb" loading={shot.pending} />
<Image src={shot.url} alt={shot.title} aspect={shot.width / shot.height} />
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

## A page outside the shell is a `Gate`

A page with no sidebar or tab bar beside it (sign-in, a consent step) is a `Gate`, never a
`Place`, a `Screen` or a hand-built centred `div`. It takes `title` (the page's one `h1`),
`description` (a meta line as a `Sentence` from `@fcalell/ui-core/descriptors`: runs, each a string or
`{ strong }` at weight 500, never a node or one string), `step` (`{ at, of }`, a `StepCount` between
the mark and the title), `mark` (`{ name, src? }`, the product's image at the avatar's size, its
`name` standing in its place while the image fails or `src` is absent), `banner` (a `Banner`, first in the column) and
`children`, the step's body (a `Form`, a `Group`, an `OptionList`, a `List`, `Section`s). It is a root
frame as the `Shell` is: one column at most the `auth` width, centred across and down the viewport
(at the top on touch, spanning the viewport inside the page inset), the banner, the lead and the body
a sections gap apart, with `toast()` and `confirm()` standing in it. The body's `Section`s title a
level under the `h1`. The first field of a step takes focus as the page opens and as `title`
changes (a step with no field leaves focus where it is), and a `Form`'s `ActionBar` in it draws
`full`. It draws no word of its own.

```tsx
<Gate
  mark={{ src: "/mark.svg", name: "Acme" }}
  step={{ at: 1, of: 2 }}
  title="Choose a workspace"
  description={["Signed in as ", { strong: "ana@acme.dev" }]}
  banner={expired ? <Banner kind="warn" sentence="This request has expired." /> : undefined}
>
  <Group><List items={workspaces} row={row} /></Group>
</Gate>
```

## An onboarding step shows its count

A flow of two to four steps shows where it stands as a `StepCount`: `at` (counted from one) and
`of`. It draws a segment per step and "Step n of m", never a hand-built bar or a row of dots. It
heads the step's page, whether that is a `Place`, a sheet page or, as its `step`, a `Gate`, which draws it between the mark and the title.

```tsx
<StepCount at={2} of={3} />
```

## A rail of fixed states is `Stages`

A known sequence with a position in it (Submitted, In spec, In build, Live) is `Stages`, never a
`List` of rows or a `Status` per line: `steps`, each a `Stage` (`{ label, state, at? }` from
`@fcalell/ui-core/descriptors`, `state` `done`, `current` or `later`, `at` an ISO moment a done or
current stage may carry), and `ended`, the terminal row (`{ label, reason }`) that replaces every
stage after the last done one. A feed of what happened is not a rail.

```tsx
<Stages steps={request.stages} ended={request.rejection} />
```

## Counts are `Stats` and `Stat`

A strip of counts is `Stats`, never a `Columns` of `Text`: `items`, each a `StatSpec` (`label`,
`value`, `unit`, `meta`) that is either the whole cell a link (`href`) or carries `counts` (each a
`CountLink` with its own `href`), never both. Zeros are counts, drawn. It stands two cells to a row
below `tablet`. One figure that is the focal point of its screen is a `Stat` (`label`, `value`,
`unit`), once per screen, its label read after it ("2 need you"); a `Stats` cell's label is read
before it. Each `counts` link is a standalone link on the target height. While `loading`, a `Stats`
waits at the loaded height from the `items` you pass: one waiting cell per item, with the line
(`meta` or `counts`) it declares. With no items, four cells of label and figure stand in, so a
strip whose cells carry a line moves when its data lands.

A `Link`'s `href` is a route of the app (a plain click opens it through the router, with no
document load) or an external URL (the browser follows it). Every route anchor stays an `<a href>`,
so a new tab, a copied link and a middle click work. `navigate(route)` from
`@fcalell/plugin-react-ui/lib/navigate` opens a route from a handler the same way.

```tsx
<Stats items={[
  { label: "Projects", value: projects.length, href: "/projects" },
  { label: "Tests", value: 1284, counts: [{ label: "failing", value: 3, href: "/tests/failing" }] },
]} />
```

## A screen read from across a room declares its distance

A screen read from across a room (a television, a wall display) takes `distance="room"` on its
`Place`: no query detects the viewing distance, so the page states it. The page draws the touch set
on a 960 × 540 canvas, scaled to the screen by its width and height (`min(100vw / 960, 100dvh /
540)`, never under one pixel): at 1920 × 1080 the body is 32, the title 44, a control 88 and a
`Stat`'s figure 160, five times its label. It holds one column of `Columns`, `Stats` and one `Stat`
and never splits, since breakpoints stay px while its widths scale, and it takes no `context`,
`more` or `foot`, whose layers open outside it. Set it on the screen's one page, never on a part of
a page, and never a density of your own: `data-density` is the showcase's pin. Its sizes ignore
browser zoom, and a scaled size is fractional. The page keeps the app's mode, and a screen across a
room reads best dark, so run the app dark (`defaultMode: "dark"`).

```tsx
<Place title="Deploys" distance="room">
  <Stat label="need you" value={3} />
  <Stats items={[{ label: "Deployed", value: 14 }, { label: "Failed", value: 1 }]} />
</Place>
```

## Data, never nodes

A composed region is data its molecule renders: an `Act` (`{ label, onAct, destructive?, quiet? }`; `quiet` draws an `ActionBar`'s
act as words in the meta ink with no hairline, a resend or a skip, never its filled act),
an `IconAct` (`{ icon, label, onAct, loading? }`; `loading` is an `Act`'s: the act is running, inert, its glyph swapped for the spinner at the same size), a row's `StatusMark` and `ChipMark`, a `PlaceSpec`, all from
`@fcalell/ui-core/descriptors`. An icon is an `IconName`, a Lucide glyph's PascalCase name.
`children` is open only where the roster gives it. A `Form` submits through its `ActionBar`'s
filled act, the act pending while its promise pends; an `ActionBar` draws its last blocked act's `blocked` reason under the acts at rest, at meta size, and an end bar wraps its acts to a further row (the filled act last) before they leave its container. A `Form` that stands edited asks once, "Discard your edit?" or Keep editing, when its page is left (a router navigation, the back button, a reload or a closed tab), so the app writes no leave guard of its own; pressing the filled act ends the edit, so an act that navigates is never asked, and a rejected act puts the edit back. A `TextArea` grows with its value, except a `kind="source"` one in a page's `Form` (a `Place`'s body or a `Split`'s main, not a `Section`), which fills the free height of the page, three lines at least, and scrolls inside. An `Input` with an `act` presses that act on Enter. A `confirm()` takes a `Confirmation`, its `cancel` the way out's own label ("Keep editing") where the `cancel` word is not the decision's.

An act that is out of reach for a while (a resend after a code is sent) is a `Button` with `wait`, its seconds left, never a `blocked` reason that grows its row: it draws the count in its label, is inert while the count is above zero, and keeps its width at zero. Pass `wait` every tick, `0` once it is live; a `Button` is never wrapped in a context of the roster's own to be inert.

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

A `List` decides its rows' separator from its `row` map, never a prop: a map that declares `meta` (two-line rows) draws a full-width hairline once between rows, with no gap and no inset; any other map draws none, rows on the ground at the rows rhythm. The rows of one list never differ, so an item without a meta still stands under its hairline, and the waiting rows match. A tree's rails run unbroken, so a tree draws none, and a `List` in a `Group` takes the group's one hairline and adds none. The references split by row height: single-line and tight inbox rows read by whitespace and a hover fill (`patterns/activity-feed.md`: the Linear inbox at about 54 px; `patterns/dark-mode.md`), where tall two-line rows are parted by a hairline (`patterns/chips-and-statuses.md`: Vercel deployment rows; `patterns/data-table.md`: horizontal lines only in lists; the Dribbble messages screen on Mobbin).

A row off a highlighted path (a journey's untaken steps) is `dim`: its title in the meta ink at
400, never faded, still a link and focusable, its glyph and marks keeping their hue. While a
row's act pends, its work's steps are `steps` (a `StatusMark` each, the running one in `running`):
one line each in the meta line's place, so give `meta` back once the act settles. A title read
whole (a note, a memory) is `wrap`: it wraps to every line at 400 with its leading, trailing and
acts on the first line, and a `List`'s `row` map takes it as one boolean for every row. A
`{ quoted }` title marks a model-written name and wraps whole in a row with a second line; `wrap` is for text a person approved.

Rows that branch (a journey's choice points and their legs) are a tree: the `List`'s `row` map gives
`children`, each item's children, and the List draws a rail per level, a fold act on every parent
(open by default) and a lane every row reserves for it, so
give each item a `key` unique across the whole tree. Never indent rows with a class, a nested
`List` or a `ListRow` of your own. A `dim` branch gives `dim` to the parent and every child. The
tree is a real tree (the WAI-ARIA tree pattern): the list is a `tree` and each row a `treeitem`,
with its level and, on a branch, whether it is open. The tree is one tab stop: Up and Down move
between visible rows, Right opens a branch or moves to its first child, Left folds it or moves to
the parent, Home and End go to the ends and Enter opens the row. The fold act is for the pointer.

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

## A form about an object opens on that object

A form about an object (a domain, a project) opens on that object as one `ListRow` in a `Group`,
the `Form`'s first child: the object's glyph as `leading`, its name as `title`, where it lives as
`meta`, and `href` to the route that changes it.

```tsx
<Form>
  <Group>
    <ListRow
      leading={{ icon: "Globe" }}
      title="shop.acme.dev"
      meta={["acme-web", "Production"]}
      href={domainRoute}
    />
  </Group>
  <FormField label="Code">…</FormField>
</Form>
```

## Collections take data

A collection takes data and draws its states. A `List` takes its `query` (or static `items`) and one
item map, `row` for `ListRow`s, `file` for `FileRow`s, `meter` for `Meter`s or `definition` for
`DefinitionRow`s (facts from data: `label`, `value`, and `description`, `act`, `href` and `onOpen` or
`locked`, with `copyable` one value for the list), one function per slot; declare a slot only if
every item fills it. Pending, it waits in those slots; failed, it shows
`sentence` and Retry; empty, `empty`, with the act that fills it. Rows share one `leading` kind
(`avatar`, `icon` or `status`) or none. The first meta part names the item. A row's meta line
yields from its end, in this strict order: the later parts truncate (they show at least a short word
of room or none; a `{ quoted }` part cuts ahead of the plain ones, so a long quote or reason yields
and an age and spend that must read are the row's `trailing`), then the chip leaves whole, then the lock's label truncates, then the warning's,
and last the first part truncates; the status and the glyphs stay whole. A value trailing a title
(an age, an ISO moment the row words short and keeps current) is whole or gone: it leaves once the title would hold under half its line. A row that opens (`href` or `onOpen`) ends in a chevron after its trailing value; a row with an `act`, `more`, a trailing pick or a tree's fold draws none, and neither does a static row. Below `tablet`
a row with an `act` stands its acts on a line under its text, at the row's end, so give `act` the
next step and let the row decide where it stands. A table's `selected` row washes in its list form
as in its grid. A file row's `change` (a `ChangeKind`) draws the
change mark ahead of its glyph, and its `chip` says why it is listed; the path yields to it down to
its name's floor (the whole name when it is short, else its first three characters, an ellipsis
and its end, never clipped mid-glyph), and below that the chip's label truncates with an ellipsis; the row never overflows sideways. A Section counts them and waits with them when they stand as its direct children,
inside a direct `Group`, or as a direct `QueryBoundary`'s query; a collection inside the app's own
component, or inside a `QueryBoundary`'s body, draws itself but adds no count and no busy state to
the Section's head. A `definition` list adds no count to a Section's head (facts are not a
collection a viewer counts), though it still makes the head busy while it waits. A `Group` holds static
rows, and items that are no row (a `Meter`, a `FormField`, a `Slider`) which stand at the card's inset with its hairline between and keep their labels (an add field over a `List` is a `FormField` in the `Group`); rows from data in a card are a `List` placed in the `Group`, drawing its states on the card,
never a `.map` of `ListRow`s, `DefinitionRow`s or `Meter`s. A `definition` list stands in a `Group`,
as a `DefinitionRow` does. A waiting `Group` (its `loading`, or a loading `Section`'s) draws one waiting form per `Meter`, `Slider` and `DefinitionRow` it holds, at the loaded card's height (a row's form follows the `description`, `act`, `href`, `locked` or control it is given), and three setting rows for rows of your own. A loading `Section` whose body is a `Prose`, a `Thread`, a `Code`, a `Meter` or a `Slider` draws that part's waiting form, and skeleton fields stand in only for fields and for any other body. `Slider` and `DefinitionRow` wait through their `Group` or `Section` and take no `loading` of their own. `loading` is a boolean everywhere except where the loaded size is a count you know and the part cannot derive: a `Prose` takes `loading={lines}` (`true` is two paragraphs) and an `ActionBar` takes `loading={acts}` (`true` is one act, and give `acts` as `[]`). Both take a number from 1; `0` and `false` are not waiting, so `loading={rows?.length}` reads the loaded form when it is 0. A loading `Group` or `Section` hands down a boolean, so a `Prose` or `ActionBar` inside it draws the default; set the count on the part itself. A loading `Section` given `description=""` stands a bar where its sentence will be (an undefined `description` stands none, and loaded `""` draws no line, so `description={read?.tally ?? ""}` keeps the head's height). A `List` given `items` and `loading` with a `row` map that has a `trailing` slot (no tree) stands as the loaded rows with their trailing values waiting. A `definition` row's string value that does not fit its room, when it is one word of more than eight characters, cuts in its
middle (its start and its last four characters stay, `SHA256:uNiV…k3Qz`) on one line (any other value truncates at its end); the whole value
stays its read text and, with `copyable`, what the copy act copies, so a value never needs a wrapper
that truncates it.

A read that answers not found (its query's `error` carries `code: "NOT_FOUND"`, as a stack
procedure throws it, or `status: 404`) draws "This no longer exists." (the `missing` word) with
Back, never Retry: Back goes to the enclosing `Screen`'s `back`, else to the place's route, and
with neither there is no act. Pass the `useQuery` result whole so its `error` arrives; a record
opened by an address after it was removed then needs no screen of its own.

A missing state decided from data (a record the loaded list lacks, an address nothing serves) is
a `Missing`, never an `EmptyState`: its `sentence` defaults to the `missing` word and its `act` is
a `LinkAct` (`{ label, href }`, a way back) defaulting to the same Back, drawn as the hairline
act with no plus. An `EmptyState`'s act is the create act.

An address no route serves needs no route of yours: stack sets the router's not-found page, "Not
found" with "Nothing is at this address." (the `notFound` and `nowhere` words). An address under
one of your routes stands in that route's layout, so under a `Shell` it is a `Place` whose act
goes to the Shell's first place that is a route; any other miss stands at the root, outside the
shell, a `Gate` with Back to `/`. A route of your own wins: a catch-all route (`$.tsx`) that
matches, or a `notFoundComponent` on a route. To own the page under a shell, add `$.tsx` beside
the layout's routes and compose `<Place title="Not found"><Missing sentence="Nothing is at this
address." act={{ label: "Open Now", href: "/" }} /></Place>`.

A read that is no query and failed (a mutation that opens a file) is a `Failed`, never an
`EmptyState` and never a query faked for `QueryBoundary`: its `sentence` says what did not load and
its `act` is a function act (`{ label, onAct }`, Retry), never a `LinkAct`, drawn under the alert
mark as the hairline act with no plus, the form `QueryBoundary` draws for a failed query. A way back
that creates nothing is a `Missing`; a read of a query is a `QueryBoundary` or a collection's own `query`.

A `Table` takes its data the same way: `query` with `sentence`, or `items`; each column reads its
cell from the item by `cell`, and `row` gives the row's `id`, `href`, `locked`, `warning` (what is
wrong with it, drawn after its name) and `change` (where it stands in a change set, its mark ahead
of its name). It draws its states itself, with no `QueryBoundary` around it. An editable table
(`onEdit`) draws a lock after a cell its row locks; a column's own `locked` makes it read
only, its lock in the head alone.

A table that acts on rows takes `choose`: `chosen` (the ticked ids) and `onChange`, with `blocked`
and `moved` reading a row's reason from its item. A tick column leads the grid and its head tick is
unchecked, mixed or checked over the rows that can be ticked. `onChange` hears the viewer's tick and
your rule decides what the set becomes (ticking a change under a new parent ticks the parent):
return the ruled set through `chosen`. A `blocked` row cannot be ticked and a `moved` row says why
its tick moved ("Needed by Checkout"), each as a line under the row's name. The table draws no
count. Its count is the `ActionBar`'s: dock `<ActionBar chosen={{ count, of, onAll }}
acts={[publish]} />` as the Place's `foot`, and it reads "N of M chosen" at the bar's start beside
the one act, whose label you set ("Publish 4 changes") and whose `blocked` reason you give when
nothing can go. `onAll` puts a "Deselect all" act beside the count, live while any rows are chosen
(`of` counts the rows that can be chosen), and calls `onAll(false)`. Where the table draws no head
tick (below `tablet` of its page, at either density) it also puts a "Select all" act there, live while
some rows stand unchosen, which calls `onAll(true)`: apply your rule to them as to a tick. Where the
table draws its head tick, that tick is the select-all and the bar draws no such act. The bar's
column stands centred in the foot, no wider than a table-wide bar; on touch the count stands over the
full-width act. A row of a `List`
leads with a tick as `leading: { check }` (its `blocked` reason leads the meta line).

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
`author`, `name`, `body`, `at`, `attachments`, `meta`, `onOpen`, `detail`), each reading only its
item, since a message draws again only when its item changes; its `foot` is a `MessageInput`, or a
`Sheet` docked in its place.
In a `Place`'s body, or in a `Split`'s `main` under the record's `ItemHeader`, it fills what holds
it: its log scrolls and the input docks at the foot. It stands there as the body's direct child,
or as `main` (in a fragment under the record's `ItemHeader`), never inside a component of the
app's, so the frame knows it from its first render. What a system line names stands under it as
its `detail`, a `MessageDetail`, exactly one of: a `row` (a `ListRow`'s slots, its `title` a `Part` so a `Quoted` one draws its quotes, in a hairline card,
opening its record), a free act's `code` under its verb, or a `fold` of lines the line opens in
place; never a `ListRow` or a `Code` between the messages.

A `MessageInput`'s `onAttach` hears `PickedFile`s: the paperclip's dialog, a file pasted into the
text and a file dropped on the input all come through it. A paste brings the clipboard's files
only when it holds no text, so copied text with an image beside it pastes as the text. Turn each
into an `Attachment` (`{ id, name, src? }`, the picked file's own `src` for an image) and pass it
back through `attachments`: an image draws as a thumbnail with its remove act, a file as a chip.
A `Message` for `you` or `other` takes the same `attachments`, and `meta` (`"by voice"`,
`"Kitchen"`) before its time.

A picked file's `src` is a local address to draw it from before it is uploaded. On the web only
`MessageInput` sets it, as an object URL for an attached image (a `FileInput`'s file carries no
`src`), and it stays until you revoke it (`URL.revokeObjectURL(file.src)`) once you drop the
attachment.

A `FileInput` stands only inside a `FormField`, which labels it and draws the error line a refused
file lands in; outside one the refusal vanishes.

```tsx
<FormField label="Leads file">
  <FileInput value={file} onChange={setFile} accept={["text/csv"]} />
</FormField>
```

A field that stays in view while a `Place`'s sections scroll under it (an ask box over a
home's sections) is the Place's `foot`: it docks at the Place's bottom, above the tab bar on
touch; a selection bar (an `ActionBar` with `chosen`) docks the same way. A Place takes a `foot` or
an `act`, never both, since each holds the screen's filled act. A `Thread` in a Place with a
`foot` stands among its sections, inline, its `foot` left empty.

A `Sheet` passed as a `Thread`'s or a `Place`'s `foot` docks there, derived from where it stands:
no prop, no scrim. The head keeps the back act before one column, the title (a label, so a Section
inside leads it; it wraps to its whole text, the close act at its first line) and the close act over the `description`, so both lines share a start;
the body scrolls between the head and the foot, which hold their height (the `foot` line beside the `submit`,
over it on touch); the body scrolls past two fifths of the region it shares with the log, and keeps
three rows whatever the head, the foot line and the log hold (a shorter body pads to them), the
head, foot line and submit sitting on top and the log giving way. A blocked
`submit`’s reason stands at rest under the act in the foot; a
failed run is the `failed` sentence in that same line, in the field error’s cell and ink, the act
ready again and no `Banner`: clear `failed` when the act runs again, and a blocked `submit`’s reason
stands before it. The modal `Sheet` takes `failed` too, in the foot’s bar line on the desktop and
under the head’s submit on touch. Pass
the same `<Sheet>` as the modal from a page and as the `foot` of a conversation; closing it (render
the `MessageInput` in its place) returns focus to the input, and each page (a new `title`) opens at
the top of its body with focus in its first field. A `Sheet` among a `Thread`'s sections draws the same form with no bound.

A column is a width and the region around it aligns it. A filling `Thread`'s log and a docked foot
(a `Place`'s `foot`, a filling `Thread`'s input) centre their measure column, and a selection bar's;
a `Thread` among sections keeps their start, at the measure, as a `Text` paragraph does. A region
that holds a page's sections (a `Place`'s body, a `Split`'s list, main and pane, a `Sheet`'s body)
stands them a sections gap apart: never wrap sections in a `div` to space them. A `Split`'s list stands its first section at the page inset, as the record does, so both start on one line.

A `BarChart` takes data the same way, its `bar` map reading each item's `key`, `value`,
`parts` (by its declared `keys`) and `at`; its failed and empty forms stand at the chart's height.
Its head sums the bars, which is right for a flow (requests per day); bars that are a level (open
flags per round, a reading each hour) take `level`, and the head draws the last bar, never the sum.
A `unit` that takes a plural is `{ one: "flag", other: "flags" }`, never a bare plural: the head reads the form its figure takes ("1 flag", "6 flags"). Money is `{ currency: "USD" }`: the head and the keys write their figures in the currency, exact ("$30.97"), the axis whole when its step is, and no word follows; never a spelled `dollars` beside a figure the page writes with its symbol.

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

## What the check enforces

`pnpm check` fails these on the app's own sources (the directory its routes sit in), each
message naming its section; `stack generate` writes them into `.stack/biome.json`, which the
app's `biome.json` extends. The rest stays a rule a reviewer holds.

| Never | Lint rule |
| --- | --- |
| a `class`, `className`, `classList` or `style` on a component | `no-class-on-component` |
| a fill, radius, border, shadow, weight, transition or numeric dimension in a host element's class string (a reset such as `border-0` or `bg-none` is no look) | `no-host-look` |
| an arbitrary value in a class (`h-[34px]`) | `no-arbitrary-value` |
| a literal colour or pixel size in a `style` | `no-raw-style` |
| an `<img>` | `no-img` |
| a `data-density` of your own | `no-density` |
| a `.map` of `ListRow`s, `DefinitionRow`s or `Meter`s | `no-map-rows` |
| a tone class on a host element | not enforced: `text-*` names a colour and an alignment alike |
| a class a variable or a function builds | not enforced: only the string literals of the attribute are read |
| a literal colour or size held in a constant | not enforced: a lint reads the attribute, not where its value came from |
| a host element that rebuilds a roster shape, or a `Picker` of your own beside a `title` | not enforced: what an element draws is told by its render, which the design critique judges |
| a wrapper that re-adds a look, or a local copy of a stack component | not enforced: a copy is told by what it draws, never by its name |
| a `Split` inside an app component, rows indented by a nested `List` | not enforced: where an element stands is no property of its own code |

## Done

`pnpm check` and `stack screens test` pass for the app's screens, and the screen is checked in light and dark at desktop and touch density.
