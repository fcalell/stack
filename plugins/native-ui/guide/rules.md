# Rules for the phone UI

Each phone `.tsx` obeys these rules. Its design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`, web prop names; cells, states and tokens in
ui-core's `DESIGN.md`) plus the app's own `ui/` directory (any `ui/` path segment); the rest
composes components and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the frame (`Shell`, `Place`, `Pane`, `Gate`),
the rhythm (`Section`, `Group`, `List`), the row (`ListRow`, `DefinitionRow`, `FormField`), the
control, the text role (`Text`). A `View` rebuilding one is drift.

A phone route renders one `Pane`. A route a tab opens stands it in a `Place`, the place's container,
which draws the tab bar under it, with the props of the web's `Place` (`distance`) and no reading of
its children. A route pushed in expo-router's stack renders its `Pane` alone, with no `Place`: the
stack animates the push and covers the tab bar, so nothing marks a page as pushed:

```tsx
<Place>
  <Pane title="Agents" actions={[newAgent]}>…</Pane>
</Place>
```

A list and the record it opens are two routes, each rendering its own `Pane`; the record's `back` is
the list's route. A record the open record links to, and what a record's details held, are routes
pushed deeper in the same way, never a sheet. `cover` and `wide` change nothing on the phone: a
`Pane` fills its route, and its body is one column.

A `Pane`'s bar holds its `back` act, its `title` (a short phrase), its `actions` (icon acts; a
create act is one, an `IconAct` with the `Plus` icon) and `more` (the acts past them, in a menu).
There is no filled act and no Details act. The bar is one row: the leading act (the shell's
switcher where there is no `back`), the title wrapping, then the actions and `more`; when the acts
do not fit beside the title's floor they drop whole to a second line at the row's end. The body
scrolls under the bar and its children stand a `sections` gap apart at the page inset: never wrap
sections in a `View` to space them. A `foot` docks under the body.

A record's name and acts are its `Pane`'s bar: `title` is the record's name as a selection of the
record's read (`title={deploy.at((d) => d.commit)}`), painted until it lands, and `actions` and `more`
are its acts, each a constant or a selection, painted and inert while the `Pane`'s read waits. An
`ItemHeader` at the top of the body holds what the bar does not: the record's place (`overline`, its
project, key or cycle) and its `facts` in a wrapping line, each part a constant or a selection that
paints in its place until it lands. A fact that opens a
sheet is `{ label, onOpen }` and one that goes to another route is `{ label, href }`: each draws the
words and a chevron, the second as a link.

The first `Pane`'s `title` is the page's name at every density: a place that draws one section of a
larger area titles itself with the section's name (`Repos`, not `System`), which the sidebar item or
the tab carries; the app never picks another title for the phone. A `Group` or `List` standing
directly in a `Pane`'s body stands a page inset under the bar's hairline, where a `Section`'s title
stands a pair over its body: the `Pane`'s title is a bar over a hairline, the section's a line of
the body, and a list that should read as a section's own wants a `Section`.

## Classes are geometry, on hosts only

A component takes no `class`, `className`, `classList` or `style`, nor uniwind's host class
channels (`colorClassName` and the rest): its props type declares each `?: never`. A class
belongs only on a `View`, `Pressable`, `ScrollView` or `Animated.View`, only for geometry: flex
plumbing, alignment, zero offsets, fill sizes, gap rungs. A fill, radius, border, shadow, weight,
tone, transition or state is a look, and a numeric dimension is never geometry. Copy never sits
in React Native's `Text`.

## Tokens only

Every colour, size, radius and spacing is a contract token, never an arbitrary value (`h-[34px]`),
a literal colour or raw pixels. Copy renders through `Text` (`body` or `meta`, a `Strong` for a run of
emphasis inside it) or the molecule that owns its role (`title` is `Pane`'s and `Gate`'s, `heading` `Section`'s (one size everywhere, in a sheet too),
`figure` `Stats`', `display` `Stat`'s); colour comes through a component's props.

## A picture is an `Image`

A picture is an `Image`, never React Native's: `src`, `alt` (a sentence naming what it shows), a
`fit` (`thumb`, a square tile beside the lines that say where it came from, or `content`, the
container's width at the picture's own aspect, capped in height), and an `aspect`. Its `src` is a constant or a
selection, which paints the tile at the loaded height until its read lands. It draws its own failed
form (the failed form says the `alt`; a `thumb`, too small for a
sentence, draws the glyph alone and the `alt` names it), and a press opens the full picture over
the scrim (under any toast) with a Close act, the system's back and a press on the scrim. The full
view takes no pinch-zoom.

A `content` picture has no aspect until its bytes arrive, so `aspect` is required: its width over
its height (`16 / 9`), and its box holds that aspect in every state (waiting, failed and loaded),
the picture cover-cropped to it, so nothing moves when the bytes land. A `content` picture without
one is a type error; store the picture's width and height with its address. A `thumb` is always
square and takes none.

```tsx
const shot = orpc.deploys.shot.read({ id });

<Image src={shot.at((s) => s.url)} alt="Latest preview" fit="thumb" />
<Image src={shot.at((s) => s.url)} alt="Latest preview" aspect={16 / 9} />
```

## A page outside the shell is a `Gate`

A page with no sidebar or tab bar beside it (sign-in, a consent step) is a `Gate`, never a
`Place` or a hand-built centred `View`. It takes `title` (the page's one header),
`description` (a meta line as a `Sentence` from `@fcalell/ui-core/descriptors`: runs, each a string,
`{ strong }` at weight 500 or `{ code }` in the inline code style, never a node or one string), `step` (`{ at, of }`, a `StepCount` between
the title), `banner` (a `Banner`, first in the column), `form` (a `Form`'s props, drawn after the
body in the auth column) and `children`, the step's body (a `Group`, an `OptionList`, a `List`, `Section`s). It is a root
frame as the `Shell` is: one column at most the `auth` width inside the page inset, standing at the
top, the banner and the step a sections gap apart (the step's count, title, description and body one fields gap apart), with `toast()` and `confirm()` standing
in it. It keeps the safe area and scrolls over the keyboard. An `Input` or `InputOtp` that mounts in
it takes focus unless a typing control of the column holds it, so the first field of a step takes
it, and the `form`'s `bar` draws `full`; a new `title` is a new step, its form starting afresh. It draws no word of its own.

A first run (no workspace yet, nothing to show) is a `Gate` with no `title` and an `empty`
(`{ icon?, title?, sentence, act?, children? }`): the Gate draws no step stack and no header, the `empty`'s title is the page's header,
its `act` the filled one and its secondary act a `<Button act="secondary" />` in its `children`, stacked under
it. The column is centred down on the Gate's ground. `step` and `description` come only
with a `title`.

```tsx
<Gate
  empty={{
    icon: "Rocket", title: "Deploy your first app", sentence: "…", act: connect,
    children: <Button act="secondary" label="Start from a template" onAct={fromTemplate} />,
  }}
/>
```

```tsx
<Gate
  step={{ at: 1, of: 2 }}
  title="Choose a workspace"
  description={["Signed in as ", { strong: "ana@acme.dev" }]}
  banner={expired ? <Banner kind="warn" sentence="This request has expired." /> : undefined}
>
  <Group list={{ items: workspaces, row }} />
</Gate>
```

## An onboarding step shows its count

A flow of two to four steps shows where it stands as a `StepCount`: `at` (counted from one) and
`of`. It draws a segment per step and "Step n of m", never a hand-built bar or a row of dots. It
heads the step's screen, whether that is a `Pane`, a sheet page or, as its `step`, a `Gate`, which draws it above the title.

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
`counts` link is a standalone link on the target height. A cell's `value` is a constant or a selection
(`usage.at((u) => u.requests)`): a selection paints the figure, inert and no link, until its read
lands, the label, unit and line (`meta` or `counts`) standing as given, so the cell keeps its loaded
height.

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
`Stat`, and its `Pane` takes no `more` or `foot`, whose layers open outside it. Set it on the
screen's one page, never on a part of a page. A scaled size is fractional. The page keeps the app's
mode, and a screen across a room reads best dark, so run the app dark (`defaultMode: "dark"`).

```tsx
<Place distance="room">
  <Pane title="Deploys">
    <Stat label="need you" value={3} />
    <Stats items={[{ label: "Deployed", value: 14 }, { label: "Failed", value: 1 }]} />
  </Pane>
</Place>
```

## A toolbar takes descriptors

A `Toolbar` over a list takes `search` (`{ value, onChange, placeholder }`, the search box it draws),
`chips` (the applied filters, each `{ family, label, onRemove }`, removable chips it draws in a row
under the acts) and as `children` the acts at the bar fit: a filter's `Button` with its count, an
`IconButton`, a `Picker`. It reads none of its children: a search `Input` or a `Chip` passed as a
child stands in the acts' row like any act, so the search and the filters go in the two props. Never
a filled act: the create act is the `Pane`'s.

## Data, never nodes

A composed region is data its molecule draws: an `Act` (`{ label, onAct, destructive?, quiet? }`; `quiet` draws an `ActionBar`'s
act as words in the meta ink with no hairline, a resend or a skip, never its filled act),
an `IconAct` (`{ icon, label, onAct }`; the promise `onAct` returns holds the act, below), a row's `StatusMark` and `ChipMark`, a menu's `MenuItem`s, a `PlaceSpec`, all from
`@fcalell/ui-core/descriptors`. An icon is an `IconName`, a Lucide glyph's PascalCase name.
`children` is open only where the roster gives it. A `Form`'s `bar` (the `ActionBar`'s own props) filled act runs its
`onAct`, and the bar holds its acts' run; an `ActionBar` draws its last blocked act's `blocked` reason under the acts at rest, at meta size. To keep the bar's place while the server works, give the `ActionBar` a `pending` (a `PendingBar`'s `sentence`, `until`, `act`): the pending form stands over the bar at the bar's own loaded height, so nothing below moves when it is set or cleared; a `PendingBar` alone is for a place that held no bar. A `FormField` takes a `FieldBinding` from the
app's own form state. A `Form` that stands edited asks once, "Discard your edit?" or Keep editing, when its screen is left (the back, a swipe, a navigate that removes it), so the app writes no `beforeRemove` guard of its own; pressing the filled act ends the edit, so an act that navigates is never asked, and a rejected act puts the edit back. An `Input` with an `act` presses that act on the keyboard's return. A field that replaces what the viewer was reading (an edit swapped in for rendered text) takes `autoFocus`, which focuses it as it mounts with the caret at the end of its text; a field on a form that loads with the page leaves it off. A `confirm()` takes a `Confirmation`, its `cancel` the way out's own label ("Keep editing") where the `cancel` word is not the decision's.

A row's marks are named props on the meta line, at most one each, in order: `status`, `warning`
(what is wrong, a string), `lock` (what it holds, a string, a glyph) and `chip`; the
act that clears a warning is the row's `act`. A status has one form, its `label`, truncating where the meta line is out of room. Keep a status word short; stack never shortens a label itself.

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

A `List` decides its rows' separator from its `row` map, never a prop: a map that declares `meta` (two-line rows) draws a full-width hairline once between rows, with no gap and no inset; any other map draws none, rows on the ground at the rows rhythm. The rows of one list never differ, so an item without a meta still stands under its hairline, and the painted rows match. A tree's rails run unbroken, so a tree draws none, and a `List` in a `Group` takes the group's one hairline and adds none. The references split by row height: single-line and tight inbox rows read by whitespace and a press wash (`patterns/activity-feed.md`: the Linear inbox at about 54 px; `patterns/dark-mode.md`), where tall two-line rows are parted by a hairline (`patterns/chips-and-statuses.md`: Vercel deployment rows; `patterns/data-table.md`: horizontal lines only in lists; the Dribbble messages screen on Mobbin).

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
`{ pick }` (a pick of constants), `{ picks }` (a several-pick of constants, the chosen values as removable chips)
or `{ either }` (an `EitherPick`: a picked option or a typed value, `{ picked }` or `{ typed }`,
with a way back). `add` is the act that ends the list. A rule's picks are constants: its name and chips are worded from them. A pick of several outside a rule is a
`Picker` given an array `value`; a `Picker`'s and a `Select`'s `options` are a `Datum` as its `value` is, so a pick over a
record's read is built from selections of it and paints until they land.

A value outside its editable context is a `DefinitionRow` with `locked`, a `Lock` (`reason`,
`href`): the value stays, a lock follows it and the reason stands under it, the whole line a link
with an `href` ("Held by CR-12, Ana"). A locked row takes no `description`, `act`, `href` or
`onOpen`. A held value is never a disabled `FormField`.

An act that is out of reach for a while (a resend after a code is sent) is a `Button` with `wait`, its seconds left, never a `blocked` reason that grows its row: it draws the count in its label, is inert while the count is above zero, and keeps its width at zero. Pass `wait` every tick, `0` once it is live; a `Button` is never wrapped in a context of the roster's own to be inert.

## An act holds its run

Every act's `onAct` returns the promise of the work it starts: `onAct: () => save.mutateAsync(v)`,
never `mutate()`, and `async () => { await remove.mutateAsync({ id }); router.back(); }` when more
follows. The act renderer holds the run, so the app passes no `loading` and reads no `isPending`:

- the act is inert at the press, draws its pending look (the pending fill, label and glyph hidden,
  the spinner) only after `ACT_DELAY`, 300 ms (it snaps in; the delay is no option), and is ready the
  moment its promise settles;
- a host takes over its acts' run: an `ActionBar` pends one act and the rest stand inert, a `Sheet`
  holds its head submit, foot bar and form bar and its dismissal with them, and a `confirm()` act
  closes its sheet when it resolves and stays open, ready, with the sentence in its bar line when it
  rejects;
- a rejection is drawn by the host, in its line (an `ActionBar`'s kept line, a `Sheet`'s, a
  standing `Button`'s under itself) and otherwise in a failed toast whose Retry runs the whole act
  again, a navigation included. The sentence is `refusal(error)` from `@fcalell/plugin-api/acts` (a 4xx the procedure worded itself,
  except 401, 403, 404 and 429), else "That didn't go through."
  (`words.actFailed`); an act carries no sentence of its own. `.catch` nothing: a handler that
  catches a rejection to toast it draws it twice;
- an act pressed offline, or while the app's connection read says the server is out of reach, is
  refused at the press: it rejects with `Unreached`, nothing is sent and nothing queues for later,
  and the host draws "That didn't go through." where its failure goes, with no Retry and nothing
  else held; the connection's reason is the offline banner's, said once.

A control that saves as the viewer changes it returns the save's promise from `onChange` (`Switch`,
`Checkbox`, `Select`, `SegmentedControl`, `Picker`, `OptionList`, a `DefinitionRow` `switch` or `pick`)
or from `onCommit` (`Input`, `TextArea`, and `Slider`, whose `onChange` hears each step and whose
`onCommit` the value it is let go on). The control shows the viewer's value, a selection's or a
constant's, while the latest save pends and then follows its datum once the refetch the write
invalidated has landed, so nothing flickers back and no saving mark is drawn. Each change
supersedes the one before; a refusal puts the value back and draws its reason in the field's error
line when the control is one of a `FormField`'s descriptors (`switch`, `checkbox`, `slider`,
`select`, `options`, `segments`), which the field hosts, else in a failed toast whose Retry saves the
same value again. An `InputOtp`'s `onComplete` returns the check's promise: the boxes hold the code
and a checking line stands under them at once, with no delay, and a refusal stands in the control's
own line under the boxes.

In dev, `QueryProvider` logs an error for a mutation an `onAct` started without returning its promise
and for a mutation failure nothing drew; a mutation with its own `onError` is exempt.

## A form about an object opens on that object

A form about an object (a domain, a project) opens on that object as one `ListRow` in a `Group`,
the `Form`'s first child: the object's glyph as `leading`, its name as `title`, where it lives as
`meta`, and `href` to the route that changes it.

```tsx
<Form>
  <Group
    items={[
      {
        key: "domain",
        row: (
          <ListRow
            leading={{ icon: "Globe" }}
            title="shop.acme.dev"
            meta={["acme-web", "Production"]}
            href={domainRoute}
          />
        ),
      },
    ]}
  />
  <FormField label="Code">…</FormField>
</Form>
```

A `Form`'s structure is its props, one of two: `children`, a flat run of `FormField`s a fields step
apart, or `groups`, `{ title?, description?, lead?, fields, read?, empty?, failed? }[]`, each drawn as a titled
group (the title a header, the group a labelled accessibility group; an untitled group, for fields
that lead or close the form among titled ones, draws no header), the groups a sections step apart and each
group's `description`, `lead` (a note, a `Banner`) and `fields` a fields step apart. A form never takes
both, and never a `Section` or an `ActionBar` as a child: its `bar` is the `ActionBar`'s own props,
which the form draws in its foot and whose filled act submits it. A `Form` placed alone is the
screen's. A form in a `Sheet` or a `Gate` is that drawer's `form` prop (a `Form`'s props), drawn after its
`children`: a `Sheet`'s `form.bar` stands as the sheet's foot, at the content's end for a short form and
pinned above the keyboard while a long form's fields scroll, and the sheet asks nothing when it
closes; the sheet's own `submit` and the form's `bar` are two ways to complete the task: give one,
never both. A `Section` never stands in a `Section`, and its title is one size (the heading)
everywhere, a sheet's body included. A `Pane`, `Section`, `Sheet`, `Form` and form group take `empty` (`{ sentence, act? }`) for a body that
holds nothing yet, drawn in place of the body only when the frame's own `read` is empty: a frame with no `read`
has no `empty`, and the read alone decides, never a count the app checks. The `Pane`'s centres in what the body
leaves, its act the filled one with the plus; a `Section`'s stands in a hairline frame, its act the hairline one,
or is one quiet sentence at the meta role when only `sentence` is given. A collection a frame holds the read of
leaves its empty to that frame; a collection of its own read draws its own, generic one ("Nothing here yet."). There is no `EmptyState` component to place. One form among a screen's sections is `Section > Form`, so every section's
head-to-body gap stays the pair step; a form of several titled parts under one Save is `groups`. A `Form`
given a `read` is a frame, and so is a group given its own: the fields paint while it waits and its
failure stands in their place. The form's bar waits only on the form's own read (a group's never reaches it): it paints while that read waits and is blocked with the failed sentence once it failed. A field's value is
a selection (`value={workspace.at((w) => w.name)}`) that the viewer's edit replaces.

A `FormField` takes its control as exactly one descriptor, the component's own props less the label
the field supplies: `switch` (at the label's end), `checkbox` (ahead of it), `slider`, `select`,
`options` (an `OptionList`'s) or `segments`; any other control (an `Input`, a `TextArea`, a
`Picker`) is its `children`. The descriptor sets the field's form, so the field never reads what
its child is.

```tsx
<FormField label="Failed deploys" description="An email the moment a deploy fails."
  switch={{ checked: failed, onChange: setFailed }} />
<FormField label="Workspace name"><Input value={name} onChange={setName} /></FormField>
```

A `DefinitionRow` shows an in-place `switch` (the Switch's own props, named by the row's label) or an
in-place `pick` (the Picker's props: `label`, `options`, `value`, `onChange`; `options` and `value` are each a constant or a
selection, and the picker paints, inert, until they land; the row draws it at the row fit, named by the row's label) in place of
its `value`, never more than one.

A `Section`'s head ends in its `act`, then its `more` (a `MenuItem[]`, destructive ones marked, shaped as a `ListRow`'s): a block's other acts (move, remove) stay on its head row beside the title, which never moves, and a foldable Section's more does not fold it. With a labelled `act` the pair wraps under the title on touch together.

## Collections take data

A collection takes data and draws its rows. Given a selection, a collection is a frame of its own
items: it draws its failed form with Retry, its missing form and its empty form in its own box with the
generic sentences, and the stale and paused line above its rows, whatever stands above it; a `Pane`,
`Section`, `Sheet` or `Form` that holds the same read draws instead, and the collection is not mounted
under its failure. A `List` takes `items` (static, or
a selection of a read) and one item map, `row` for `ListRow`s, `file` for `FileRow`s, `meter` for `Meter`s or `definition` for
`DefinitionRow`s (facts from data: `label`, `value`, and `description`, `act`, `href` and `onOpen` or
`locked`, with `copyable` one value for the list), one function per slot; declare a slot only if
every item fills it. Pending, it paints four rows in those slots, run over the placeholder;
a failed list shows the failure with Retry. Rows share one `leading` kind
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
and its end, never clipped mid-glyph), and below that the chip's label truncates with an ellipsis; the row never overflows sideways. A `Section` given a `read` is the frame of its body: the heading stays and the body's failed, missing and empty forms stand in the body's place, and a collection in the body paints its rows while its selection waits. The count after the title is the array's length once an array read lands and is never drawn while the body waits; a read that is no array takes a static `count`. A `Group`'s structure is its prop,
exactly one of `items` and `list`. `items` are the card's entries: `{ key, row }` is a `ListRow`, `FileRow` or
`DefinitionRow` drawn bare (the row pads itself) and `{ key, item }` is a thing that is no row (a `Meter`, a `FormField`, a
`Slider`) drawn in a box at the card's inset, the group's one hairline between entries and the label kept; an add field over
a `List` is a `FormField` item in one `Group` and the `List` the `list` of a second. `list` is a `List` the card frames:
rows from data in a card, painted on the card while their selection waits, with no bleed of their own, never a `.map` of `ListRow`s,
`DefinitionRow`s or `Meter`s. A `definition` list stands in a `Group`'s `list`, as a `DefinitionRow` does in its `items`.
A row is one form everywhere, square at the card's inset, and a `List` outside a `Group` bleeds that inset, so its rows' text meets the title over it.
Every leaf paints on its own selection: a `Meter`, a `Slider`, a `DefinitionRow`, a `FormField`'s control, a `Prose`, a `Code`, a `Diff`, a `Thread`, a `Stat` and a `Stats` cell take a constant or a selection of the read, and a selection whose read waits draws the part's loaded form painted, at its loaded height, a `Select`, `Slider`, `Switch` and the rest as the box the control keeps. A leaf paints only while its read waits: a text or mark leaf (a `Section`'s `description`, a `DefinitionRow`'s value and description, a `Chip`, `Status`, `Count`, `Avatar`, a `Banner`'s sentence, an `ItemHeader`'s parts, a `Prose`, `ProseDiff`, `Code`, `Stat`, `Stages`, `Image`, `QrCode`) whose read ended draws its loaded-empty form, no line for a text and nothing for a mark (a `DefinitionRow` its label alone), and the frame that holds the read says why, once. A part of your own draws as it is: read what it needs with `useRead(selection)`, which is `undefined` while the read waits. A control's value follows its selection until the viewer edits it (`useDraft`), so typed text outlives a refetch. A `Section`'s `description` is a `Datum<string>`: it paints where the sentence will stand, and a loaded `""` draws no line, as an undefined one, so `description={report.at((r) => r.tally ?? "")}` keeps the head's height while it waits. A `definition` row's string value that does not fit its room, when it is one word of more than eight characters, cuts in its
middle (its start and its last four characters stay, `SHA256:uNiV…k3Qz`) on one line (any other value truncates at its end); the whole value
stays its read text and, with `copyable`, what the copy act copies, so a value never needs a wrapper
that truncates it.

A frame given a root read (`orpc.x.read()`) that answers not found (the procedure throws
`NOT_FOUND`, a 404) draws "This no longer exists." (the `missing` word) with Back, never Retry: Back
goes to the enclosing `Pane`'s `back`, else to the place's route, and with neither there is no act.
Give the frame the read itself, not a selection of it, so its error arrives; a record opened by an
address after it was removed then needs no screen of its own.

A missing state decided from data (a record the loaded list lacks, an address nothing serves) is
a `Missing`, never a Pane's or a Section's `empty`: its `sentence` defaults to the `missing` word and its `act` is
a `LinkAct` (`{ label, href }`, a way back) defaulting to the same Back, drawn as the hairline
act with no plus in a hairline frame. An `empty`'s act is the create act.

An address no route serves needs no route of yours: `stack generate` writes `+not-found.tsx` into
the routes directory when it holds none, a one-line re-export of stack's page, "Not found" with
"Nothing is at this address." (the `notFound` and `nowhere` words). It stands where expo-router
stands the route, inside the root layout: a `Place` holding a `Pane` under a `Shell` whose act goes to the Shell's
first place that is a route, a `Gate` with Back to `/` under a layout with none. A `+not-found.tsx`
of your own wins and is never rewritten; to own the page, replace the file's contents with a
default export composing `<Place><Pane title="Not found"><Missing sentence="Nothing is at this
address." act={{ label: "Open Now", href: "/" }} /></Pane></Place>`.

A failure that is no read (a mutation that opens a file) is a `Failed`, never an
`empty` and never a read faked for a frame: its `sentence` says what did not load and
its `act` is a function act (`{ label, onAct }`, Retry), never a `LinkAct`, drawn under the alert
mark as the hairline act with no plus, the form a frame draws for a failed read. A way back
that creates nothing is a `Missing`; a read is a frame's `read`, and a frame says "This didn't load." with Retry whatever failed, and takes no sentence of its own.

A `Table` takes its data the same way: `items`, a constant or a selection that paints four rows until it lands; each column reads its
cell from the item by `cell`, and `row` gives the row's `id`, `href`, `locked`, `warning` (what is
wrong with it, drawn after its name) and `change` (where it stands in a change set, its mark ahead
of its name). Its failed, missing and empty forms are its own. A collection over a paginated read (`orpc.x.list.pages(input)`) ends in a more row of its own: "Show more", pressed by the viewer (nothing loads by scrolling); while the next page loads, `PAINT_ROWS` painted rows follow the loaded ones; a failed page is "Couldn't load more." with Retry. The frame is not busy for it and its Section draws no count while more remains; an empty first page with more is fetched on, not drawn empty. A `Table` paints its next page as rows in the same slots, and `items={deploys}` is all a collection takes. An editable table
(`onEdit`) draws a lock after a cell its row locks; a column's own `locked` makes it read
only, its lock in the head alone.

A table that acts on rows takes `choose`: `chosen` (the ticked ids) and `onChange`, with `blocked`
and `moved` reading a row's reason from its item. Below `tablet` each row leads with its tick (a
`ListRow` `leading: { check }`, a `blocked` reason leading its meta line, a `moved` one too); from
`tablet` a tick column leads the grid and its head tick is unchecked, mixed or checked over the rows
that can be ticked. `onChange` hears the viewer's tick and your rule decides what the set becomes
(ticking a change under a new parent ticks the parent): return the ruled set through `chosen`. The
table draws no count. Its count is the `ActionBar`'s: dock `<ActionBar chosen={{ count, of, onAll }}
acts={[publish]} />` as the Pane's `foot`, and it reads "N of M chosen" over the full-width act,
whose label you set ("Publish 4 changes") and whose `blocked` reason you give when nothing can go.
The phone has no head tick, so `onAll` puts two acts beside the count: "Select all", live while
some rows stand unchosen, and "Deselect all", live while any are chosen (`of` counts the rows that
can be chosen). They call `onAll(true)` and `onAll(false)`: apply your rule to them as to a tick.
The bar's column stands centred in the foot.

```tsx
const notes = orpc.notes.list.read();

<Section
  title="Notes"
  read={notes}
  empty={{ sentence: "No notes.", act: { label: "New note", onAct: create } }}
>
  <List
    items={notes}
    row={{ key: (n) => n.id, title: (n) => n.title, meta: (n) => [n.edited] }}
  />
</Section>
```

An `OptionList` holds a static set in `options`, which never paints. Options from a read take `items`
(constants or a selection) and an `option` map over the check row: `value`, `label`, `description`,
`recommended`, `blocked` and `group`; while the read waits it paints four rows in the shape the map
declares. An `OptionList` shows its options' state itself: a failed or missing read is the failed sentence with Retry (or the missing one) in a line under the control, with no frame needed. A `value` selection paints the boxes or rings until it lands. The `value` picks the
form: a set (`onChange` hears the set) draws check rows, one value or `null` (`onChange` hears
the value) radio rows, one answer among a few described options. An option that cannot be chosen
now carries `blocked`, a short reason that replaces its description in the disabled ink (in an
`OptionList`, a `Select` and a `Picker`, a `MultiPick` included): it takes no press and keeps its
place in the list. Once the option is in the value it draws and acts as any chosen one and stays
removable, so `blocked` never traps a value.

A `Thread` takes its `items` (constants, or a selection, which paints four messages of the other author until its read lands; its failed and missing forms stand in the log's place, its empty form is an empty log with no sentence, and its foot and reply stand through each) through a `message` map (`key`,
`author`, `name`, `body`, `at`, `attachments`, `meta`, `streaming`, `onOpen`, `detail`), each reading only its
item, since a message draws again only when its item changes; its `foot` is a `MessageInput`, and
its `sheet` (a `Sheet`'s props) docks in the input's place while it is `open`. While a reply from the other author is on its way, set `replying`:
the loaded log ends on one waiting message of theirs, followed as any message is; clear it in the
render that adds the reply's item, which stands where the waiting message stood. Set `streaming` on the reply (an
`other` turn, a `Message` prop and a `message` slot) while its text is still growing: a marker left
open at its end (an emphasis, a strong run, a code span, a link, a fence) draws in its own form from
its first character and the closing marker changes nothing drawn; a finished reply leaves an
unmatched marker as text. The turn being written is `reply`, a selection the app declares (a stream read, `read(options, { kind: "stream" })` over `streamedQuery`, or a slice of a channel read): it draws after the items from its own subscription, so a chunk renders only it. Waiting for the first chunk it is one waiting message of the other author, then the message with `streaming` set while it grows, then the message; held as a root read, a stream that fails keeps the partial message and says "The reply stopped." with Retry, which runs the stream again. It steps aside once the last item has its key, so a history that catches up draws no second turn; `null` or `undefined` is no turn. `replying` stays the boolean for a reply the app does not stream.
A `Thread` fills what it stands in by plain flex: in a `Pane`'s body it takes the free height, its
log scrolls and its input docks at its foot a sections gap under the log; among sections it stands
at its content's height. It stands as the body's direct child, never inside a wrapper of the app's
that is no flex column, which leaves it its content's height. A part above the `Thread` (a
`Banner`, an `ActionBar`) is its sibling in the body, a sections gap from it. What a system line names stands under it as
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

A `FileInput` draws a file of another type in its own line under its box, in a `FormField` or out
of one; the line clears on the next pick.

```tsx
<FormField label="Leads file">
  <FileInput value={file} onChange={setFile} accept={["text/csv"]} />
</FormField>
```

A field that stays in view while a `Pane`'s sections scroll under it (an ask box over a
home's sections) is the `Pane`'s `foot`: it docks under the body, above the tab bar; a selection
bar (an `ActionBar` with `chosen`) docks the same way. A `Thread` in a `Pane` with a `foot` leaves
its own `foot` empty.

A `Pane` or a `Thread` takes `sheet` (a `Sheet`'s props) beside its `foot` and draws the docked
sheet itself, in the foot's place while `sheet.open`, no scrim; a `Sheet` placed anywhere else is
always the modal one. The head keeps the back act before one column, the title (the `heading` role, a Section
inside at the same size; it wraps to its whole text, the close act at its first line) over the `description`, with the close act at the title's first line;
the body scrolls between the head and the foot, which hold their height (the `foot` line over the `submit`),
and the body scrolls past two fifths of the region it shares with the log, and its content keeps
three rows whatever the head, the foot line and the log hold (a shorter body pads to them). The log
keeps two rows of its own above the foot while the body can give; where the region is short the body
gives first to the log's two rows, then to its three, then the log goes, and the head, foot line and
submit never give: the submit stays inside the foot. A blocked `submit`’s reason stands
at rest under the act in the foot; a rejected act is its sentence in that same line, in the field
error’s cell and ink, the act ready again and no `Banner`: the line clears on the next press, and a
blocked `submit`’s reason stands before it. The modal `Sheet` draws it under the head’s submit. The
sheet holds the run of its head submit, its foot bar and its form’s bar, so it cannot be dismissed
while one pends. That submit stands in the title's row and the title wraps whole inside three fifths
of it (two lines at 25 characters); a submit that does not fit beside that column drops whole, at its 44 px, to a second head line at the
row's end. Pass
the same props as the modal `<Sheet>` from a page and as the `sheet` of a conversation; closing it (`open` false, the
`MessageInput` drawing in its place) returns focus to the input, and each page (a new `title`) opens at
the top of its body, its first field taking focus.
The modal `Sheet` is as tall as its content, growing with it up to the screen under the top inset and
scrolling its body past that, so a `TextArea` that grows grows the sheet a line at a time; its foot (the
`foot` line, the `submit`'s bar) stands above the keyboard. It takes no height prop; a pick that
searches is the one sheet that stands tall from its first frame.

A column is a width and the region around it aligns it: a docked foot (a `Pane`'s `foot`, a
`Thread`'s input) centres a selection bar's column. A region that holds a page's sections (a
`Pane`'s body, a `Sheet`'s body) stands them a sections gap apart: never wrap sections in a `View`
to space them.

A `BarChart` takes data the same way, its `bar` map reading each item's `key`, `value`,
`parts` (by its declared `keys`) and `at`; it draws its failed and empty forms, and while `items` waits the total and the legend's figures are painted and the plot is one painted box at the loaded height.
Its head sums the bars, which is right for a flow (requests per day); bars that are a level (open
flags per round, a reading each hour) take `level`, and the head draws the last bar, never the sum.
A `unit` that takes a plural is `{ one: "flag", other: "flags" }`, never a bare plural: the head reads the
form its figure takes ("1 flag", "6 flags"). Money is `{ currency: "USD" }`: the head and the keys write their figures in the
currency, exact ("$30.97"), the axis whole when its step is, and no word follows; never a spelled `dollars` beside a figure the
page writes with its symbol.

A region that reads is a frame. Give a `Pane`, `Section`, `Sheet` or `Form` (or one of a form's groups) its `read`: a read (`orpc.deploys.get.read({ id })`), a selection of one (`deploy.at((d) => d.steps)`) or a `combine` of several. A frame holds one read: the one read of its selection that no enclosing frame holds and that is not quiet. A Section given a selection of the read its Pane holds draws nothing of that read's state, and a second held read in one frame is a dev error naming both keys, so a region that draws two reads is two frames and a leaf that needs both takes `combine`. `or` is for enrichments only: `names.or("a board")` falls back quietly and never fails a frame, so it serves a name, a badge or a lane order, and a read whose rows, options, facts or text are drawn is never `or`. Sibling regions that draw one read each hold it and each fail in place; a repeated line is accepted, and a read is never lifted into a frame around its siblings. A frame draws the failed form when its read fails, the missing form when it answers not found, and its `empty`, a `{ sentence, act? }`, when its own read is an empty array, `null` or `undefined` on real data; a frame with no read has no `empty`. A failed Pane is the whole page with Retry as its one act, but its foot and docked sheet stand, since they answer to their own reads. Acts paint by their own datum: a constant act is always live, and an act given as a selection paints while its read waits, stands still with no sentence when its read is not asked for, and is blocked once its read ended, with the failed sentence (`words.missing` when missing). A collection (`List`, `Table`, `Thread`, `BarChart`, `Comparison`, `Canvas`, `Diff`) and an option control (`Picker`, `Select`, `OptionList`) given a selection show their own read's state in their own box, whatever stands above them. A field hosts its control's save, so a refusal draws in the field's line (a control standing alone toasts it), and a form's bar waits only on the form's own read. No act queues offline: an act pressed with no connection is refused and draws the generic "That didn't go through." where its failure goes, the connection's reason being the offline banner's, and nothing is sent later. A read held by the app's own `useQuery` is not a frame's; that region draws its states itself.

The waiting form is the loaded form painted (structure rule 15): while a selection's read waits, each leaf draws its loaded tree with filler in place of its text, at the loaded heights, in the `skeleton` colour (`PAINT`: filler glyphs for text, the component's own box for a mark or a control). A painted part is inert and hidden from the screen reader: no press, no focus, no link. A collection paints four rows (`PAINT_ROWS`) in the slots its item map declares, run over a placeholder, so write each slot plainly (`p.name`, `d.steps.length`); a slot that throws there paints itself, silently. Nothing shows for 400 ms (`WAIT_DELAY` in `@fcalell/ui-core/paint`): the paint stands transparent in its place, so the screen keeps its height, then its fill snaps in (the phone has no fade). A read the local server answers in a few milliseconds draws none. The delay is fixed, not an option. Only a frame that holds a read is busy to assistive tech (`accessibilityState`), while it waits.

After the first answer the frame that holds the read says what the read does, and the data stays. A refetch is a spinner after the heading (the Pane's title, a Section's title and count, a Sheet's title, a form group's legend; a frame with no heading shows none), shown after `WAIT_DELAY` so a fast refetch draws nothing; only that frame renders for it, never its body. A refetch that failed (stale) is the line "Couldn't refresh." with a quiet Retry, pending while it runs, and a read waiting for a connection (paused) is "Waiting for a connection." with nothing to press; both stand under the heading row (a Pane under its top bar, a Section after its description, a Form at its top). A read not asked for yet (`enabled: false`, `skipToken`) or paused with no data paints still: the loaded form painted and inert, with no busy mark. Busy to assistive tech (`accessibilityState`) is the first wait alone, never a refetch.

The switch from the painted form to the loaded one is the page's one large motion, the settle: the
layout it changes moves between its two places and fades in on a `LayoutAnimation` over a rung of the
duration scale, and snaps under the system's reduced motion, while the app is in the background and
while a field has the keyboard. It is not an option, and `QueryProvider` is given it by the plugin;
draw nothing for it.

A waiting screen is the loaded tree, never a second tree: a page's outline
comes from its route and its data fills it. A `Section` stands whatever its data holds and draws its
`empty` when there is none, never gated on the data's length; a Section that must stay optional stands
after every Section that always stands, so its arrival moves nothing.

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

A word no line can break (a 300-character token, a URL) never pushes a row past the edge. React
Native's text does not shrink in a row, so each `Text` that stands in a `flex-row` decides: `shrink`
(`flex-1`, `min-w-0`) where its words may be long, `shrink-0` where it is a figure or a stand-in
that must hold; a unit, a slider's output and a chart's tick also carry one line and the short
measure. `plugins/native-ui/test/row-text.test.ts` reads the sources for a row's `Text` that
decides neither.

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
