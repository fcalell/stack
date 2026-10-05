# Rules for the phone UI

Each phone `.tsx` obeys these rules. Its design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`, web prop names; cells, states and tokens in
ui-core's `DESIGN.md`) plus the app's own `ui/` directory (any `ui/` path segment); the rest
composes components and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the frame (`Shell`, `Place`, `Screen`, `Split`, `AuthColumn`),
the rhythm (`Section`, `Group`, `List`), the row (`ListRow`, `DefinitionRow`, `FormField`), the
control, the text role (`Text`). A `View` rebuilding one is drift. A `Split` is its page's frame
region: it stands as the bleeding `Place`'s (or `Screen`'s) direct child, never inside a component
of the app's, since the page reads its props for its head's back and Details acts; deeper it draws
as a plain region and no head draws them.

A record the open record links to opens beside it: the `Split`'s `beside` holds a `Screen` whose
`back` is the open record's route. On the phone it stands in the open record's stead, its back
act in its top bar, its head the page's only head.

```tsx
<Split list={rows} main={<Item />} beside={<Screen title="Run 12" back={itemRoute}><Run /></Screen>} />
```

## Classes are geometry, on hosts only

A component takes no `class`, `className`, `classList` or `style`, nor uniwind's host class
channels (`colorClassName` and the rest): its props type declares each `?: never`. A class
belongs only on a `View`, `Pressable`, `ScrollView` or `Animated.View`, only for geometry: flex
plumbing, alignment, zero offsets, fill sizes, gap rungs. A fill, radius, border, shadow, weight,
tone, transition or state is a look, and a numeric dimension is never geometry. Copy never sits
in React Native's `Text`.

## Tokens only

Every colour, size, radius and spacing is a contract token, never an arbitrary value (`h-[34px]`),
a literal colour or raw pixels. Copy renders through `Text` (`body` or `meta`, with `strong`) or
the molecule that owns its role (`title` is `Place`'s, `Screen`'s and `AuthColumn`'s, `heading` `Section`'s,
`figure` `Stats`', `display` `Stat`'s); colour comes through a component's props.

## A picture is an `Image`

A picture is an `Image`, never React Native's: `src`, `alt` (a sentence naming what it shows), a
`fit` (`thumb`, a square tile beside the lines that say where it came from, or `content`, the
container's width at the picture's own aspect, capped in height), an `aspect` and `loading`. It
draws its own waiting and failed forms (the failed form says the `alt`; a `thumb`, too small for a
sentence, draws the glyph alone and the `alt` names it), and a press opens the full picture over
the scrim (under any toast) with a Close act, the system's back and a press on the scrim. The full
view takes no pinch-zoom.

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
`onChange`, and `act` ending the list with the way to open a new context). It draws a pick on the
title line. An option's `chip` (`{ family, label }`) is its kind (Draft, Ready), drawn after its
label in the sheet and on the trigger; `status` stays for a work state that moves. Never a
`Picker` of your own beside the `title`, and never the kind in the label.

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

## A page outside the shell is an `AuthColumn`

A page with no sidebar or tab bar beside it (sign-in, a consent step) is an `AuthColumn`, never a
`Place`, a `Screen` or a hand-built centred `View`. It takes `product` (the product's name, the line that
leads the column), `step` (`{ at, of }`, a `StepCount` between the product and the title),
`title` (the page's one header), `sentence` (a meta line: a string, or `Run[]` from
`@fcalell/ui-core/descriptors`, each run a string or `{ strong }` at weight 500, never a node),
`banner` (a `Banner`, first in the column) and `children`, the step's body (a `Form`, a `Group`,
an `OptionList`, a `List`). It stands one column at most the `auth` width, centred; on touch it spans the
viewport inside the page inset. An `Input` or `InputOtp` that mounts in it takes focus unless a
typing control of the column holds it, and a `Form`'s `ActionBar` in it draws `full`. It draws no
word of its own, and `toast()` and `confirm()` stand only inside a `Shell`: say an outcome in a field
or a banner.

```tsx
<AuthColumn
  product="Acme"
  step={{ at: 1, of: 2 }}
  title="Choose a workspace"
  sentence={["Signed in as ", { strong: "ana@acme.dev" }]}
  banner={expired ? <Banner kind="warn" sentence="This request has expired." /> : undefined}
>
  <Group><List items={workspaces} row={row} /></Group>
</AuthColumn>
```

## An onboarding step shows its count

A flow of two to four steps shows where it stands as a `StepCount`: `at` (counted from one) and
`of`. It draws a segment per step and "Step n of m", never a hand-built bar or a row of dots. It
heads the step's screen, whether that is a `Place`, a sheet page or, as its `step`, an `AuthColumn`, which draws it between the product and the title.

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

A strip of counts is `Stats`, never a row of `Text`: `items`, each a `StatSpec` (`label`,
`value`, `unit`, `meta`) that is either the whole cell a link (`href`) or carries `counts` (each a
`CountLink` with its own `href`), never both. Zeros are counts, drawn. It stands two cells to a
row. One figure that is the focal point of its screen is a `Stat` (`label`, `value`, `unit`), once
per screen, its label read after it ("2 need you"); a `Stats` cell's label is read before it. Each
`counts` link is a standalone link on the target height. While `loading`, a `Stats` waits at the
loaded height from the `items` you pass: one waiting cell per item, with the line (`meta` or
`counts`) it declares. With no items, four cells of label and figure stand in, so a strip whose
cells carry a line moves when its data lands.

A `Link`'s `href` is a route of the app (it navigates through the router) or an external URL
(the OS opens it).

```tsx
<Stats items={[
  { label: "Projects", value: projects.length, href: "/projects" },
  { label: "Tests", value: 1284, counts: [{ label: "failing", value: 3, href: "/tests/failing" }] },
]} />
```

## A screen read from across a room declares its distance

A screen read from across a room (a wall display, a tablet on a stand) takes `distance="room"` on
its `Place`: nothing detects the viewing distance, so the page states it. The page draws the touch
set on a 960 × 540 canvas, scaled to the window by its width and height (never under one): on a 1920
× 1080 window the body is 32, the title 44, a control 88 and a `Stat`'s figure 160, five times its
label, and a rotation or a resize rescales it. It holds one column of `Columns`, `Stats` and one
`Stat`, and takes no `context`, `more` or `foot`, whose layers open outside it. Set it on the
screen's one page, never on a part of a page. A scaled size is fractional. The page keeps the app's
mode, and a screen across a room reads best dark, so run the app dark (`defaultMode: "dark"`).

```tsx
<Place title="Deploys" distance="room">
  <Stat label="need you" value={3} />
  <Stats items={[{ label: "Deployed", value: 14 }, { label: "Failed", value: 1 }]} />
</Place>
```

## Data, never nodes

A composed region is data its molecule draws: an `Act` (`{ label, onAct, destructive?, quiet? }`; `quiet` draws an `ActionBar`'s
act as words in the meta ink with no hairline, a resend or a skip, never its filled act),
an `IconAct`, a row's `StatusMark` and `ChipMark`, a menu's `MenuItem`s, a `PlaceSpec`, all from
`@fcalell/ui-core/descriptors`. An icon is an `IconName`, a Lucide glyph's PascalCase name.
`children` is open only where the roster gives it. A `Form`'s `ActionBar` filled act runs its
`onAct`, the form busy while it pends. A `FormField` takes a `FieldBinding` from the
app's own form state; a `confirm()` takes a `Confirmation`, its `cancel` the way out's own label ("Keep editing") where the `cancel` word is not the decision's.

A row's marks are named props on the meta line, at most one each, in order: `status`, `warning`
(what is wrong, a string), `lock` (what it holds, a string, a glyph read aloud) and `chip`; the
act that clears a warning is the row's `act`.

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
400, never faded, still a hit, its glyph and marks keeping their hue. While a row's act pends,
its work's steps are `steps` (a `StatusMark` each, the running one in `running`): one line each
in the meta line's place, so give `meta` back once the act settles. A title read whole (a note,
a memory) is `wrap`: it wraps to every line at 400 with its leading, trailing and acts on the
first line, and a `List`'s `row` map takes it as one boolean for every row. A `{ quoted }` title
marks a model-written name; `wrap` is for text a person approved.

Rows that branch (a journey's choice points and their legs) are a tree: the `List`'s `row` map gives
`children`, each item's children, and the List draws a rail per level, a fold act on every parent
(open by default, read aloud as expanded or collapsed) and a lane every row reserves for it, so give
each item a `key` unique across the whole tree; the fold act's expanded state is the branch's
accessibility state, and the phone has no keyboard focus to rove. Never indent rows with a class, a
nested `List` or a `ListRow` of your own. A `dim` branch gives `dim` to the parent and every child.

Rows of inline terms (a mapping of sources to targets, a filter's conditions) are `Rules`, each
rule a card of stacked terms: each `Rule` is `{ id, terms, onRemove? }`, its `terms` a pair
(`{ from, to }`) or a condition (`{ field, operator, value }`), each term a `RuleValue`, one of
`{ pick }` (an `OptionPick`), `{ picks }` (a `MultiPick`, the chosen values as removable chips)
or `{ either }` (an `EitherPick`: a picked option or a typed value, `{ picked }` or `{ typed }`,
with a way back). `add` is the act that ends the list. A pick of several outside a rule is a
`Picker` given an array `value`.

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
yields from its end, in this strict order: the later parts truncate, then the chip leaves whole,
then the warning's label truncates, and last the first part truncates; the status and the glyphs
stay whole. A row with an `act` stands its acts on a line under its text, at the row's end, so give
`act` the next step and let the row decide where it stands. A table's `selected` row washes in its
list form as in its grid. A file row's `change` (a `ChangeKind`) draws the
change mark ahead of its glyph, and its `chip` says why it is listed; the path yields to it down to
its name's floor (the whole name when it is short, else its first three characters, an ellipsis
and its end), and below that the chip's label truncates. A Section counts them and waits with them when they stand as its direct children,
inside a direct `Group`, or as a direct `QueryBoundary`'s query; a collection inside the app's own
component, or inside a `QueryBoundary`'s body, draws itself but adds no count and no busy state to
the Section's head. A `definition` list adds no count to a Section's head (facts are not a
collection a viewer counts), though it still makes the head busy while it waits. A `Group` holds static
rows, and items that are no row (a `Meter`, a `FormField`, a `Slider`) which stand at the card's inset with its hairline between and keep their labels (an add field over a `List` is a `FormField` in the `Group`); rows from data in a card are a `List` placed in the `Group`, drawing its states on the card,
never a `.map` of `ListRow`s, `DefinitionRow`s or `Meter`s. A `definition` list stands in a `Group`,
as a `DefinitionRow` does.

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
and `moved` reading a row's reason from its item. Below `tablet` each row leads with its tick (a
`ListRow` `leading: { check }`, a `blocked` reason leading its meta line, a `moved` one too); from
`tablet` a tick column leads the grid and its head tick is unchecked, mixed or checked over the rows
that can be ticked. `onChange` hears the viewer's tick and your rule decides what the set becomes
(ticking a change under a new parent ticks the parent): return the ruled set through `chosen`. The
table draws no count. Its count is the `ActionBar`'s: dock `<ActionBar chosen={{ count, of, onAll }}
acts={[publish]} />` as the Place's `foot`, and it reads "N of M chosen" over the full-width act,
whose label you set ("Publish 4 changes") and whose `blocked` reason you give when nothing can go.
The phone has no head tick, so `onAll` puts two acts beside the count: "Select all", live while
some rows stand unchosen, and "Deselect all", live while any are chosen (`of` counts the rows that
can be chosen). They call `onAll(true)` and `onAll(false)`: apply your rule to them as to a tick.
The bar's column stands centred in the foot.

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
item, since a message draws again only when its item changes; its `MessageInput` stays the `foot`.
In a `Place`'s body, or in a `Split`'s `main` under the record's `ItemHeader`, it fills what holds
it: its log scrolls and the input docks at the foot. It stands there as the body's direct child,
or as `main` (in a fragment under the record's `ItemHeader`), never inside a component of the
app's, so the frame knows it from its first render. What a system line names stands under it as
its `detail`, a `MessageDetail`, exactly one of: a `row` (a `ListRow`'s slots, its `title` a `Part` so a `Quoted` one draws its quotes, in a hairline card,
opening its record), a free act's `code` under its verb, or a `fold` of lines the line opens in
place; never a `ListRow` or a `Code` between the messages.

A `MessageInput`'s `onAttach` hears `PickedFile`s: the paperclip opens the photo library or the
files, and a file picked comes through it. A paste into the text brings nothing, since React
Native's `TextInput` hands over no pasted image. Turn each file into an `Attachment`
(`{ id, name, src? }`, the picked file's own `src` for an image) and pass it back through
`attachments`: an image draws as a thumbnail with its remove act, a file as a chip. A `Message`
for `you` or `other` takes the same `attachments`, and `meta` (`"by voice"`, `"Kitchen"`) before
its time.

A picked file's `src` is a local address to draw it from before it is uploaded: the asset's uri,
set on every file the photo library and the file picker hand over. It is the asset's own address,
so nothing needs revoking.

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

A column is a width and the region around it aligns it: a docked foot (a `Place`'s `foot`, a
`Thread`'s input) centres a selection bar's column. A region that holds a page's sections (a
`Place`'s body, a `Split`'s list and record, a `Sheet`'s body) stands them a sections gap apart:
never wrap sections in a `View` to space them.

A `BarChart` takes data the same way, its `bar` map reading each item's `key`, `label`, `value`,
`parts` (by its declared `keys`) and `at`; its failed and empty forms stand at the chart's height.
Its head sums the bars, which is right for a flow (requests per day); bars that are a level (open
flags per round, a reading each hour) take `level`, and the head draws the last bar, never the sum.

Any other region reading a query sits in its own `QueryBoundary`, naming its loading form; it
draws the not-found form when every failed query answers not found.

## Words are the config's, sentences are props

A word a component draws on its own comes from `nativeUi({ words })`, read with
`useWords()` from `@fcalell/plugin-native-ui/lib/words`; every sentence is a prop.

## The app's `ui/`

A shape that needs the app's nouns (`ProjectRow`, taking a `project`) lives in `ui/`, composes
roster components only, never a host with a look, and reads no data.

## What the roster lacks is a gap

A shape no component owns, or a look its props cannot express, is a gap in stack: leave it out,
compose the rest, and file it by the gap recipe (`node_modules/@fcalell/cli/guide/gap.md`).
Never a call-site class, a wrapper that re-adds a look, a local copy of a stack component, or a
host carrying tokens.

## Done

`pnpm check` passes; the screen is checked on a device or simulator, light and dark.
