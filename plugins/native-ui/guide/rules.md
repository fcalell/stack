# Rules for the phone UI

Each phone `.tsx` obeys these rules. Its design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`, web prop names; cells, states and tokens in
ui-core's `DESIGN.md`) plus the app's own `ui/` directory (any `ui/` path segment); the rest
composes components and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the frame (`Shell`, `Place`, `Screen`, `Split`, `Gate`),
the rhythm (`Section`, `Group`, `List`), the row (`ListRow`, `DefinitionRow`, `FormField`), the
control, the text role (`Text`). A `View` rebuilding one is drift. A `Split` is its page's frame
region: it stands as the bleeding `Place`'s (or `Screen`'s) direct child, never inside a component
of the app's, since the page reads its props for its head's back and Details acts; deeper it draws
as a plain region and no head draws them. Its back act returns to the place's route; a list that
stands at a deeper route names it as `back` (`<Split back={treeRoute} …>`), which an open record
returns to, whether its page is a `Place` or a pushed `Screen`, and a missing read in it leads to,
ahead of the `Screen`'s own `back`. A list that stands alone at a deeper route is a pushed `Screen`
whose `back` is the route above it, holding `<Split back={treeRoute} …>`: the `Screen`'s back act
leads up while the list stands alone, and the `Split`'s `back` takes its place once a record is open. A `Place` whose list stands at a deeper route and keeps its toolbar and actions names the route above it as `up` (`<Place up={boardRoute} …>`): its back act leads there at every width while no record stands alone, in the switcher's stead on touch, and gives way to the record's back act once one is open.

An app that selects a record opens the pane's sheet by passing `open` with `onClose` (the two stand
together): `<Split open={selected} onClose={() => setSelected(false)} …>`. The phone stands the pane
as a sheet at every width, so `open` opens it at once; `onClose` hears every close (the close act,
the scrim, the Details act's sheet too), and the app clears `open` in it. A `Split` without them opens
its sheet from the Details act alone.

A record the open record links to opens beside it: the `Split`'s `beside` holds a `Screen` whose
`back` is the open record's route. On the phone it stands in the open record's stead, its back
act on its title's row, its head the page's only head. A `Screen` is one row: the back act, the title wrapping, then the actions, Details and more; when the acts do not fit beside the title's floor they drop whole to a second line at the row's end. The body's first child, an `ItemHeader`, stands a pair, not a sections gap, above an `ActionBar` or a `Banner` directly after it (a `Place`, a `Screen` or a `Split`'s `main`) and, in a `Split`'s `main` when it has no facts line, above the record's first section (not above a `Thread`). The body reads its own children, a fragment seen through: a head or bar reached through a wrapper component keeps the sections step. A record in a `Split`'s `main` carries its own acts: `ItemHeader`'s `actions` (icon acts) and `more` (a menu) stand at the end of the head's first line, the overline's else the title's. They stay in the head, so put them there and not also in the `Place`'s `actions` or `more`. A `beside` record's body stands in the same column as a record in the main, at the measure inside the page inset. An `ItemHeader` fact that opens a sheet is `{ label, onOpen }` and one that goes to another route is `{ label, href }`: each draws the words and a chevron, the second as a link.

```tsx
<Split list={rows} main={<Item />} beside={<Screen title="Run 12" back={itemRoute}><Run /></Screen>} />
```

A `Place`'s `title` is the page's name at every density: a place that draws one section of a larger
area titles itself with the section's name (`Repos`, not `System`), which the sidebar item or the tab
carries; the app never picks another title for the phone. A `Group` or `List` standing directly in a
`Place`'s body stands a page inset under the head's hairline, where a `Section`'s title stands a pair
over its body: the page's title is a strip over a hairline, the section's a line of the body, and a
list that should read as a section's own wants a `Section`.

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
the molecule that owns its role (`title` is `Place`'s, `Screen`'s, `Gate`'s and `ItemHeader`'s, `heading` `Section`'s (a `Section` inside a `Section` names itself at `body` semibold, a level below),
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

## A page outside the shell is a `Gate`

A page with no sidebar or tab bar beside it (sign-in, a consent step) is a `Gate`, never a
`Place`, a `Screen` or a hand-built centred `View`. It takes `title` (the page's one header),
`description` (a meta line as a `Sentence` from `@fcalell/ui-core/descriptors`: runs, each a string,
`{ strong }` at weight 500 or `{ code }` in the inline code style, never a node or one string), `step` (`{ at, of }`, a `StepCount` between
the title), `banner` (a `Banner`, first in the column) and
`children`, the step's body (a `Form`, a `Group`, an `OptionList`, a `List`, `Section`s). It is a root
frame as the `Shell` is: one column at most the `auth` width inside the page inset, standing at the
top, the banner, the lead and the body a sections gap apart, with `toast()` and `confirm()` standing
in it. It keeps the safe area and scrolls over the keyboard. An `Input` or `InputOtp` that mounts in
it takes focus unless a typing control of the column holds it, so the first field of a step takes
it, and a `Form`'s `ActionBar` in it draws `full`. It draws no word of its own.

A first run (no workspace yet, nothing to show) is a `Gate` with no `title` holding one
`EmptyState`: the Gate draws no lead and no header, the `EmptyState`'s title is the page's header,
its `act` the filled one and its secondary act a `<Button act="secondary" />` child, stacked under
it. The column is centred down on the Gate's ground. `step` and `description` come only
with a `title`.

```tsx
<Gate>
  <EmptyState icon="Rocket" title="Deploy your first app" sentence="…" act={connect}>
    <Button act="secondary" label="Start from a template" onAct={fromTemplate} />
  </EmptyState>
</Gate>
```

```tsx
<Gate
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
heads the step's screen, whether that is a `Place`, a sheet page or, as its `step`, a `Gate`, which draws it above the title.

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
an `IconAct` (`{ icon, label, onAct, loading? }`; `loading` is an `Act`'s: the act is running, inert, its glyph swapped for the spinner at the same size), a row's `StatusMark` and `ChipMark`, a menu's `MenuItem`s, a `PlaceSpec`, all from
`@fcalell/ui-core/descriptors`. An icon is an `IconName`, a Lucide glyph's PascalCase name.
`children` is open only where the roster gives it. A `Form`'s `ActionBar` filled act runs its
`onAct`; an `ActionBar` draws its last blocked act's `blocked` reason under the acts at rest, at meta size. To keep the bar's place while the server works, give the `ActionBar` a `pending` (a `PendingBar`'s `sentence`, `until`, `act`): the pending form stands over the bar at the bar's own loaded height, so nothing below moves when it is set or cleared; a `PendingBar` alone is for a place that held no bar. A `FormField` takes a `FieldBinding` from the
app's own form state. A `Form` that stands edited asks once, "Discard your edit?" or Keep editing, when its screen is left (the back, a swipe, a navigate that removes it), so the app writes no `beforeRemove` guard of its own; pressing the filled act ends the edit, so an act that navigates is never asked, and a rejected act puts the edit back. An `Input` with an `act` presses that act on the keyboard's return. A field that replaces what the viewer was reading (an edit swapped in for rendered text) takes `autoFocus`, which focuses it as it mounts with the caret at the end of its text; a field on a form that loads with the page leaves it off. A `confirm()` takes a `Confirmation`, its `cancel` the way out's own label ("Keep editing") where the `cancel` word is not the decision's.

A row's marks are named props on the meta line, at most one each, in order: `status`, `warning`
(what is wrong, a string), `lock` (what it holds, a string, a glyph) and `chip`; the
act that clears a warning is the row's `act`. A `status` whose own read has not answered is
`{ loading: true }` (a `RowStatus`, from a `List`'s `row` map or a `ListRow`): the row is the
two-line row from its first frame and the status stands as a bar of its height, so the row keeps its
height when it answers. A status the app can say shorter gives `short` ("5 min ago") beside its
`label`: the row draws `short` in the label's place while the label would be cut on its meta line
(the short form keeps its width, the first part taking the overflow), and `label` stays its name; stack never shortens a label itself.

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

A `List` decides its rows' separator from its `row` map, never a prop: a map that declares `meta` (two-line rows) draws a full-width hairline once between rows, with no gap and no inset; any other map draws none, rows on the ground at the rows rhythm. The rows of one list never differ, so an item without a meta still stands under its hairline, and the waiting rows match. A tree's rails run unbroken, so a tree draws none, and a `List` in a `Group` takes the group's one hairline and adds none. The references split by row height: single-line and tight inbox rows read by whitespace and a press wash (`patterns/activity-feed.md`: the Linear inbox at about 54 px; `patterns/dark-mode.md`), where tall two-line rows are parted by a hairline (`patterns/chips-and-statuses.md`: Vercel deployment rows; `patterns/data-table.md`: horizontal lines only in lists; the Dribbble messages screen on Mobbin).

A row off a highlighted path (a journey's untaken steps) is `dim`: its title in the meta ink at
400, never faded, still a hit, its glyph and marks keeping their hue. While a row's act pends,
its work's steps are `steps` (a `StatusMark` each, the running one in `running`): one line each
in the meta line's place, so give `meta` back once the act settles. A title read whole (a note,
a memory) is `wrap`: it wraps to every line at 400 with its leading, trailing and acts on the
first line, and a `List`'s `row` map takes it as one boolean for every row. A `{ quoted }` title
marks a model-written name and wraps whole in a row with a second line; `wrap` is for text a person approved. A flag, a path or an identifier in a title is a `{ code }` run: the title is then an array of runs (`[{ code: "--strict" }, " turns strict mode on."]`; backticks in a string are never parsed) that draws the code in the inline code style and truncates at its end as one title; a title that is a single `{ code: path }` is one value that cuts in its middle, keeping its start and its end, so the end of a path stays readable. A `meta` part that is `{ code }` cuts the same way. A row's trailing age is the ISO
moment itself, `trailing: { age: item.madeAt }`: the row words it short ("2 min") and keeps it
current, so pass the moment, never a worded string. A spend or other short value that goes with the age is its `beside`, `trailing: { age: run.startedAt, beside: "$0.12" }`: it stands after the age in the same trailing, and the age keeps ticking.

Rows that branch (a journey's choice points and their legs) are a tree: the `List`'s `row` map gives
`children`, each item's children, and the List draws a rail per level, a fold act on every parent
(open by default) and a lane every row reserves for it, so give
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

An act that is out of reach for a while (a resend after a code is sent) is a `Button` with `wait`, its seconds left, never a `blocked` reason that grows its row: it draws the count in its label, is inert while the count is above zero, and keeps its width at zero. Pass `wait` every tick, `0` once it is live; a `Button` is never wrapped in a context of the roster's own to be inert.

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

A `Form` holds fields and its `ActionBar`. In any sheet (a Split's Details sheet included) the form's direct `ActionBar` stands as the sheet's foot, at the content's end for a short form and pinned above the keyboard while a long form's fields scroll. One form among a screen's sections is `Section > Form`, so
every section's head-to-body gap stays the pair step. `Section`s inside a `Form` (`Form > Section`)
stand at the fields step, so that shape is for a screen every section of which is in the form.

## Collections take data

A collection takes data and draws its states. A `List` takes its `query` (or static `items`) and one
item map, `row` for `ListRow`s, `file` for `FileRow`s, `meter` for `Meter`s or `definition` for
`DefinitionRow`s (facts from data: `label`, `value`, and `description`, `act`, `href` and `onOpen` or
`locked`, with `copyable` one value for the list), one function per slot; declare a slot only if
every item fills it. Pending, it waits in those slots; failed, it shows
`sentence` and Retry; empty, `empty`, with the act that fills it. Rows share one `leading` kind
(`avatar`, `icon` or `status`) or none. The first meta part names the item. A row's meta line
yields from its end, in this strict order: the later parts truncate (a `{ quoted }` part cuts ahead
of the plain ones, so a long quote or reason yields and an age and spend that must read are the
row's `trailing`), then the chip leaves whole,
then the warning's label truncates, and last the first part truncates; the status and the glyphs
stay whole. A row that opens (`href` or `onOpen`) ends in a chevron after its trailing value; a row
with an `act`, `more`, a trailing pick or a tree's fold draws none, and neither does a static row. In a list where some rows declare `more`, the rows without one keep its square blank, so every row's trailing value ends at one x; give `more` only to the rows that have acts.
A row with an `act` stands its acts on a line under its text, at the row's end, so give
`act` the next step and let the row decide where it stands. A table's `selected` row washes in its
list form as in its grid. A file row's `change` (a `ChangeKind`) draws the
change mark ahead of its glyph, and its `chip` says why it is listed; the path yields to it down to
its name's floor (the whole name when it is short, else its first three characters, an ellipsis
and its end, never clipped mid-glyph), and below that the chip's label truncates with an ellipsis; the row never overflows sideways. A Section counts them and waits with them when they stand as its direct children,
inside a direct `Group`, or as a direct `QueryBoundary`'s query; a collection inside the app's own
component, or inside a `QueryBoundary`'s body, draws itself but adds no count and no busy state to
the Section's head. A `definition` list adds no count to a Section's head (facts are not a
collection a viewer counts), though it still makes the head busy while it waits. A `Group` holds static
rows, and items that are no row (a `Meter`, a `FormField`, a `Slider`) which stand at the card's inset with its hairline between and keep their labels (an add field over a `List` is a `FormField` in the `Group`); rows from data in a card are a `List` placed in the `Group`, drawing its states on the card,
never a `.map` of `ListRow`s, `DefinitionRow`s or `Meter`s. A `definition` list stands in a `Group`,
as a `DefinitionRow` does. A waiting `Group` (its `loading`, or a loading `Section`'s) draws one waiting form per `Meter`, `Slider` and `DefinitionRow` it holds, at the loaded card's height (a row's form follows the `description`, `act`, `href`, `locked` or control it is given), and three setting rows for rows of your own. A loading `Section` whose body is a `Prose`, a `Thread`, a `Code`, a `Meter` or a `Slider` draws that part's waiting form, and skeleton fields stand in only for fields and for any other body. A loading `Section` whose body is a `Form` waits as the Form's own fields and its `ActionBar`'s waiting form (a `Form` waits whenever a loading `Section` or `Group` is around it, one skeleton field per `FormField`, the fields kept mounted so typed text outlives the wait). A loading `Section` of `FormField`s and an `ActionBar` with no `Form` stands one skeleton field per field and the bar in its waiting form after them, the fields kept mounted, hidden. A skeleton field stands in the form of the field it stands for, at its height: a label bar over the control's box, a switch's box at the label's end, a checkbox's on the label's line, a bar under the label or the control for a `description`; a `Slider` keeps its own head over its track, an `OptionList` its card of rows (one per static option, four for a query), a `SegmentedControl` its track, an `answered` field its one summary row, a `Select` the plain field. `Slider` and `DefinitionRow` wait through their `Group` or `Section` and take no `loading` of their own. `loading` is a boolean everywhere except where the loaded size is a count you know and the part cannot derive: a `Prose` takes `loading={lines}` (`true` is two paragraphs) and an `ActionBar` takes `loading={acts}` (`true` is one act, and give `acts` as `[]`). Both take a number from 1; `0` and `false` are not waiting, so `loading={rows?.length}` reads the loaded form when it is 0. A loading `Group` or `Section` hands down a boolean, so a `Prose` or `ActionBar` inside it draws the default; set the count on the part itself. A loading `Section` given `description=""` stands a bar where its sentence will be (an undefined `description` stands none, and loaded `""` draws no line, so `description={read?.tally ?? ""}` keeps the head's height). A `List` given `items` and `loading` with a `row` map that has a `trailing` slot (no tree) stands as the loaded rows with their trailing values waiting. A `definition` row's string value that does not fit its room, when it is one word of more than eight characters, cuts in its
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

An address no route serves needs no route of yours: `stack generate` writes `+not-found.tsx` into
the routes directory when it holds none, a one-line re-export of stack's page, "Not found" with
"Nothing is at this address." (the `notFound` and `nowhere` words). It stands where expo-router
stands the route, inside the root layout: a `Place` under a `Shell` whose act goes to the Shell's
first place that is a route, a `Gate` with Back to `/` under a layout with none. A `+not-found.tsx`
of your own wins and is never rewritten; to own the page, replace the file's contents with a
default export composing `<Place title="Not found"><Missing sentence="Nothing is at this address."
act={{ label: "Open Now", href: "/" }} /></Place>`.

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
`recommended`, `blocked` and `group`; it waits, fails and empties inside its card. Its `value` picks the
form: a set (`onChange` hears the set) draws check rows, one value or `null` (`onChange` hears
the value) radio rows, one answer among a few described options. An option that cannot be chosen
now carries `blocked`, a short reason that replaces its description in the disabled ink (in an
`OptionList`, a `Select` and a `Picker`, a `MultiPick` included): it takes no press and keeps its
place in the list. Once the option is in the value it draws and acts as any chosen one and stays
removable, so `blocked` never traps a value.

A `Thread` takes its `query` (or `items`) the same way through a `message` map (`key`,
`author`, `name`, `body`, `at`, `attachments`, `meta`, `streaming`, `onOpen`, `detail`), each reading only its
item, since a message draws again only when its item changes; its `foot` is a `MessageInput`, or a
`Sheet` docked in its place. While a reply from the other author is on its way, set `replying`:
the loaded log ends on one waiting message of theirs, followed as any message is; clear it in the
render that adds the reply's item, which stands where the waiting message stood. A `Thread`'s own
`loading` stays the log being on its way, three waiting messages. Set `streaming` on the reply (an
`other` turn, a `Message` prop and a `message` slot) while its text is still growing: a marker left
open at its end (an emphasis, a strong run, a code span, a link, a fence) draws in its own form from
its first character and the closing marker changes nothing drawn; a finished reply leaves an
unmatched marker as text.
In a `Place`'s body, or in a `Split`'s `main` under the record's `ItemHeader`, it fills what holds
it: its log scrolls and the input docks at the foot. It stands there as the body's direct child,
or as `main` (in a fragment under the record's `ItemHeader`), never inside a component of the
app's, so the frame knows it from its first render. A part above the Thread (a `Banner`, an `ActionBar`) stands as its sibling in the same region, in that fragment, never wrapped together with it; wrapped, the region keeps its scrolling form. In a `Place`'s body the Thread alone runs edge to edge: each part above it keeps the page inset at the sides and the top and stands the body's gap from the log. What a system line names stands under it as
its `detail`, a `MessageDetail`, exactly one of: a `row` (a `ListRow`'s slots, its `title` a `Part` so a `Quoted` one draws its quotes, in a hairline card,
opening its record), a free act's `code` under its verb, or a `fold` of lines the line opens in
place; never a `ListRow` or a `Code` between the messages.

A `MessageInput`'s Send and Stop are icon acts (named "Send" and "Stop"), so the field keeps its width beside the paperclip.
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

A `Sheet` passed as a `Thread`'s or a `Place`'s `foot` docks there, derived from where it stands:
no prop, no scrim. The head keeps the back act before one column, the title (the `heading` role, so a Section
inside reads a level below; it wraps to its whole text, the close act at its first line) over the `description`, with the close act at the title's first line;
the body scrolls between the head and the foot, which hold their height (the `foot` line over the `submit`),
and the body scrolls past two fifths of the region it shares with the log, and its content keeps
three rows whatever the head, the foot line and the log hold (a shorter body pads to them). The log
keeps two rows of its own above the foot while the body can give; where the region is short the body
gives first to the log's two rows, then to its three, then the log goes, and the head, foot line and
submit never give: the submit stays inside the foot. A blocked `submit`’s reason stands
at rest under the act in the foot; a failed run is the `failed`
sentence in that same line, in the field error’s cell and ink, the act ready again and no `Banner`:
clear `failed` when the act runs again, and a blocked `submit`’s reason stands before it. The modal
`Sheet` takes `failed` too, under the head’s submit. That submit stands in the title's row and the title wraps whole inside three fifths
of it (two lines at 25 characters); a submit that does not fit beside that column drops whole, at its 44 px, to a second head line at the
row's end. Pass
the same `<Sheet>` as the modal from a page and as the `foot` of a conversation; closing it (render
the `MessageInput` in its place) returns focus to the input, and each page (a new `title`) opens at
the top of its body, its first field taking focus. A `Sheet` among a `Thread`'s sections draws the same form with no bound.

A column is a width and the region around it aligns it: a docked foot (a `Place`'s `foot`, a
`Thread`'s input) centres a selection bar's column. A region that holds a page's sections (a
`Place`'s body, a `Split`'s list and record, a `Sheet`'s body) stands them a sections gap apart:
never wrap sections in a `View` to space them. A `Split`'s list stands its first section at the page inset, as the record does, so both start on one line. A `Split`'s open record stands in one column at the measure, at its start, so its parts end where a `Prose` does.

A `BarChart` takes data the same way, its `bar` map reading each item's `key`, `value`,
`parts` (by its declared `keys`) and `at`; its failed and empty forms stand at the chart's height.
Its head sums the bars, which is right for a flow (requests per day); bars that are a level (open
flags per round, a reading each hour) take `level`, and the head draws the last bar, never the sum.
A `unit` that takes a plural is `{ one: "flag", other: "flags" }`, never a bare plural: the head reads the
form its figure takes ("1 flag", "6 flags"). Money is `{ currency: "USD" }`: the head and the keys write their figures in the
currency, exact ("$30.97"), the axis whole when its step is, and no word follows; never a spelled `dollars` beside a figure the
page writes with its symbol.

Any other region reading a query sits in its own `QueryBoundary`, naming its loading form; it
draws the not-found form when every failed query answers not found.

A waiting form shows only for a read that lasts. `QueryBoundary`, and a `Section` or `Group` given
`loading` itself, draw nothing until the read has run 200 ms (the waiting form stands undrawn in its
place, so the page keeps its height) and, once drawn, keep it 500 ms (`WAIT_DELAY`, `WAIT_MIN` in
`@fcalell/ui-core/wait`). A read the local server answers in a few milliseconds draws no skeleton.
These two numbers are fixed, not options; a part's own `loading` (a `List`, a `Meter`) is drawn as
given, so drive it from the boundary or the Section around it, never from a raw `isPending`.

## Words are the config's, sentences are props

A word a component draws on its own comes from `nativeUi({ words })`, read with
`useWords()` from `@fcalell/plugin-native-ui/lib/words`; every sentence is a prop.

## A text prop takes one of four sizes

Every string prop's doc ends in the size of text it takes and what the component does past it. The
sizes are fixed, the same as on the web:

| Size | Is | Past it |
| --- | --- | --- |
| a word | one word: a state, a unit, a figure's noun | a slot that bounds it (a `Chip`, a row pick's value) holds the short measure, 18 characters, and truncates |
| a short phrase | a few words on one line: a title, a label, a name | takes the room its line leaves, then truncates with an ellipsis, or wraps where its doc says it wraps |
| a sentence | one sentence, in a slot built to wrap: a description, a banner, an empty state, an error | wraps |
| text | running content of any length: markdown, a message body, code | wraps whole |

A component cuts or wraps past the size and never grows its slot, so a sentence in a word slot is
cut or crowded: a sentence as a `Chip`'s `label` loses everything past 18 characters, a sentence as a `Status`'s `label` crowds its line and truncates when the line is out of room, and a sentence as a `DefinitionRow`'s
`value` shares the row with its label and truncates at its end. Give a slot the size its doc names,
and put a sentence in the prop that takes one (`description`). A string that is an identifier cuts in
its middle, keeping its start and its end: a `DefinitionRow` value of one word over eight
characters, and a title or meta part that is `{ code }`. A string that is no text (an `href`, a
`src`, an id, a key, a file name, an Intl unit) is documented by what it is.

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
