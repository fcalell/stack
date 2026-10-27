# Rules for the phone UI

Each phone `.tsx` obeys these rules. Its design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`, web prop names; cells, states and tokens in
ui-core's `DESIGN.md`) plus the app's own `ui/` directory (any `ui/` path segment); the rest
composes components and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the frame (`Shell`, `Pane`, `Gate`),
the rhythm (`Section`), the row (a `Section`'s `items`, a `Form`'s fields), the
control, the text role (`Text`). A `View` rebuilding one is drift.

A phone route renders one `Pane` and no place of its own: the `Shell` draws the place around the
router's stack, the container that draws the tab bar under the screen and reads none of it. A route
pushed in expo-router's stack renders its `Pane` alone: the stack animates the push and covers the
tab bar, so nothing marks a page as pushed:

```tsx
<Pane title="Agents" actions={[newAgent]}>…</Pane>
```

A list and the record it opens are two routes, each rendering its own `Pane`; the record's `back` is
the list's route, which the router gives: absent, `back` is the nearest path above the route's own
(its last segment dropped, then the next, up to `/`) at which expo-router serves a screen, and the
shell's switcher stands there where none is. Give `back` only to override it, and `back={false}` for
a screen that keeps the switcher (a tab's first screen). A record the open record links to, and what a record's details held, are routes
pushed deeper in the same way, never a sheet. `cover` and `wide` change nothing on the phone: a
`Pane` fills its route, and its body is one column.

A `Pane`'s bar holds its `back` act, its `title` (a short phrase), its `actions` (icon acts; a
create act is one, an `IconAct` with the `Plus` icon) and `more` (the acts past them, in a menu).
There is no filled act and no Details act. The bar is one row: the leading act (the shell's
switcher where there is no `back`), the title, then the actions and `more`, on one line. The title
truncates and keeps two fifths of the row; the first of the `actions` stands at its icon and the rest
stand in the `more` menu, before its own items, in their order, at every width. Order `actions` by
weight, the primary act first: it is the one that stands, and the order is yours, never sorted for you. A title whose read
failed, with no `.or` fallback, draws nothing: the bar keeps its height, its back act and its actions, and the body line
says why. The body
scrolls under the bar and its children stand a `section` gap apart at the page inset: never wrap
sections in a `View` to space them. A `foot` docks under the body.

A record's `Pane` gives `title`, the record's name as a selection of the record's read
(`title={deploy.at((d) => d.commit)}`), and a `record`: its bar holds `record.within`, where the
record lives (`"Agents"`, `"Work · Code"`), with the back act and the acts (`actions` and `more`,
each a constant or a selection, painted and inert while the `Pane`'s read waits), and the body opens
with the record's head, where the `title` stands once, whole and wrapping, as the screen's header,
between `record.overline` (the record's project, key or cycle; never `within` again, which the bar
holds) and `record.facts` in a wrapping
line, each part a constant or a selection that paints in its place until it lands. A `Pane` with a
`record` always draws its name, so the name has one source, the `title`; a `Pane` without one keeps
its title in the bar as the header. A fact that opens a
sheet is `{ label, onOpen }` and one that goes to another route is `{ label, href }`: each draws the
words and a chevron, the second as a link.

The first `Pane`'s `title` is the page's name at every density: a place that draws one section of a
larger area titles itself with the section's name (`Repos`, not `System`), which the sidebar item or
the tab carries; the app never picks another title for the phone. A `Section` with `items` and no
`title` standing directly in a `Pane`'s body stands a page inset under the bar's hairline, where a
titled `Section`'s title stands a gap over its body: the `Pane`'s title is a bar over a hairline, the
section's a line of the body, and a list that should read as a section's own wants a `title`.

## One `Button`, one `Input`, one `Switch`

A `Button` is every act: labelled it runs `onAct`; with an `href` it is a link in accent ink
(`fit="inline"` for a run of a line of text); with `glyph` it is the icon alone, its `label` the
accessible name. An `Input` is every typed or picked value, chosen by `kind`: a line of text (`text`,
the default, `search`, `secret`, `source`, `number`, `email`, `date`), `prose` for many lines, `code` for a
one-time code, `file` for a file. A `Switch` is every boolean. A choice among others in a `Table` or a
list is the owner's selection, never a control the screen places.

Every control is a field and takes its `label`; no screen draws a control's name itself. Placed
alone (in a `Card`, a `Sheet`'s body, a `Gate`) an `Input`, a `Picker` at its field fit, as a list
or as choice segments, a `Switch` and a `Slider` draw their field: the label over the control (a
switch at the end of its label's line), the word `optional` under the label with `optional`, and
`description` or `error` under the control, where a refused save's reason also stands until the next
change. `error` is a sentence, words or runs (`["No package at ", { code: "packages/lead-mail" }, "."]`),
so a machine name in it stands in the mono (voice 7). A `Form` draws its own fields from their `label`s, and a `Toolbar` names its acts, so a
control there draws nothing around itself; nor does a `search` or a `Picker` at the `bar` or `row`
fit, which reads its label in its box. A label is never a `Text` over a bare control, and a
`Section`'s title is the Section's, never its control's label.

## Classes are geometry, on hosts only

A component takes no `class`, `className`, `classList` or `style`, nor uniwind's host class
channels (`colorClassName` and the rest): its props type declares each `?: never`. A class
belongs only on a `View`, `Pressable`, `ScrollView` or `Animated.View`, only for geometry: flex
plumbing, alignment, zero offsets, fill sizes, gap rungs. A fill, radius, border, shadow, weight,
tone, transition or state is a look, and a numeric dimension is never geometry. Copy never sits
in React Native's `Text`.

## Tokens only

Every colour, size, radius and spacing is a contract token, never an arbitrary value (`h-[34px]`),
a literal colour or raw pixels. Copy renders through `Text` (`body` or `meta`, a `{ strong }` run for emphasis inside it: `<Text>{["Signed in as ", { strong: email }]}</Text>`) or the molecule that owns its role (`title` is `Pane`'s and `Gate`'s, `heading` `Section`'s (one size everywhere, in a sheet too),
`figure` `Stats`'); colour comes through a component's props.

## A picture is an `Image`

A picture is an `Image`, never React Native's: `src`, `alt` (a sentence naming what it shows), a
`fit` (`thumb`, a square tile beside the lines that say where it came from, or `content`, the
container's width at the picture's own aspect, capped in height), and an `aspect`. Its `src` is a constant or a
selection, which paints the tile at the loaded height until its read lands. It draws its own failed
form (the failed form says the `alt`; a `thumb`, too small for a
sentence, draws the glyph alone and the `alt` names it), and a press opens the full picture over
the scrim (under any toast) with a Close act, the system's back and a press on the scrim. The full
view takes no pinch-zoom, and it rises from the bottom edge as a sheet does; it does not grow from its thumbnail.

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
hand-built centred `View`. It takes `title` (the page's one header),
`description` (a meta line as `Runs` from `@fcalell/ui-core/descriptors`: runs, each a string,
`{ strong }` at weight 500, `{ code }` in the inline code style or `{ quoted }` in typographic quotes, never a node or one string), `step` (`{ at, of }`, a step count between
the title), `banner` (a `Banner`, under the description and before the body, so a verdict stands with the content it is about), `form` (a `Form`'s props, drawn after the
body in the auth column) and `children`, the step's body (a `Picker` in `fit: list`, `Section`s). It is a root
frame as the `Shell` is: one column at most the `auth` width inside the page inset, standing at the
top, the step's count, title, description, banner and body a stack apart, with `toast()` and `confirm()` standing
in it. It keeps the safe area and scrolls over the keyboard. An `Input` that mounts in
it takes focus unless a typing control of the column holds it, so the first field of a step takes
it, and the `form`'s `bar` draws `full`; a new `title` is a new step, its form starting afresh. It draws no word of its own.

A first run (no workspace yet, nothing to show) is a titled `Gate` like any step: the `title` says
what is missing, the `description` what the act makes, and the `children` are its `Button`s, the
primary act first and the secondary one a `<Button act="secondary" />`. It has no icon; the app's
mark leads it. The column stands at the top, like every step's. `title` is
required, and there is no untitled form or `empty` on a `Gate`.

```tsx
<Gate title="Deploy your first app" description={["Connect a repository and Acme builds and deploys every push to main."]}>
  <Button label="Connect a repository" onAct={connect} />
  <Button act="secondary" label="Start from a template" onAct={fromTemplate} />
</Gate>
```

```tsx
<Gate
  step={{ at: 1, of: 2 }}
  title="Choose a workspace"
  description={["Signed in as ", { strong: "ana@acme.dev" }]}
  banner={expired ? <Banner tone="attention" sentence="This request has expired." /> : undefined}
>
  <Section items={workspaces.map(toRow)} />
</Gate>
```

## Tone is one vocabulary

A status, a `Banner` and a `toast()` name a tone with one prop, `tone`, from one set:
`active` (news, the accent), `running` (the accent, a spinner where a status draws a mark),
`waiting` and `idle` (the meta ink; `idle` a hollow dot), `done` (ok), `attention` (warn) and
`failed` (danger). A row's `status` is `{ tone, label? }`, a pick option's `status` and a
row's `{ status, label? }` title take the tone alone; the tone's own word is the default `label`. A `Banner`
defaults to `active` and announces `failed` at once; `toast("Saved")` is `done`, and a refusal is
`toast(sentence, { tone: "failed" })`. A run in progress with a deadline is a `Banner` with `until` (`tone="running"`, its `act` the cancel): the banner draws the time left and a line along its foot that fills toward the deadline, and stops at 0:00. A status, a chip, an avatar, a glyph, a count and a menu are not components a
screen places: the owner draws each from its data (a `Section` item's `status`, `chip`, `leading`, `more`; a
`Toolbar`'s `chips`; a `Gate`'s `step`).

## An onboarding step shows its count

A flow of two to four steps shows where it stands as a `Gate`'s `step`: `at` (counted from one) and
`of`. It draws a segment per step and "Step n of m" above the title, never a hand-built bar or a row of dots.

```tsx
<Gate title="Connect" step={{ at: 2, of: 3 }}>…</Gate>
```

## A rail of fixed states is `Stages`

A known sequence with a position in it (Submitted, In spec, In build, Live) is `Stages`, never a
`Section` of rows or a status per line: `steps`, each a `Stage` (`{ label, state, at? }` from
`@fcalell/ui-core/descriptors`, `state` `done`, `current` or `later`, `at` an ISO moment a done or
current stage may carry), and `ended`, the terminal row (`{ label, reason }`) that replaces every
stage after the last done one. A feed of what happened is not a rail.

```tsx
<Stages steps={request.stages} ended={request.rejection} />
```

## Counts are `Stats`

A strip of counts is `Stats`, never a row of `Text`: `items`, each a `StatSpec` (`label`,
`value`, `unit`, `meta`) that is either the whole cell a link (`href`) or carries `counts` (each a
`CountLink` with its own `href`), never both. Zeros are counts, drawn. A cell with a `bound` (a
quota's limit) is a share of it: the label with the share in percent at its end over a bar that fills by
the share, amber near full and `danger` over, then its `meta` or `counts`; `mark` is a tick across the
bar, the point the fill turns amber at, and the cell takes no `unit` or `href`. Its `label`, `value` and
`bound` are constants or selections, and a cell whose read failed is the failed form itself, in the same
box, pressed to retry. It stands two cells to a
row. One figure is a one-item `Stats`. Each
`counts` link is a standalone link on the target height. A cell's `value` is a constant or a selection
(`usage.at((u) => u.requests)`): a selection paints the figure, inert and no link, until its read
lands, the label, unit and line (`meta` or `counts`) standing as given, so the cell keeps its loaded
height.

A `Button` with an `href` is a link in accent ink that runs nothing (`fit="inline"` makes it a run of the line it stands in). Its `href` is a route of the app (it navigates through the router) or an external URL
(the OS opens it).

```tsx
<Stats items={[
  { label: "Projects", value: projects.length, href: "/projects" },
  { label: "Tests", value: 1284, counts: [{ label: "failing", value: 3, href: "/tests/failing" }] },
]} />
```

## A toolbar takes descriptors

A `Toolbar` over a list takes `search` (`{ value, onChange, placeholder }`, the search box it draws),
`filters` (the list's filters as data, below), `chips` (the app's own applied filters, each
`{ family, label, onRemove }`, removable chips it draws in a row under the acts, after the filters'
chips) and as `children` the other acts: a `Button` (labelled, or `glyph` for the icon alone), never a
filled act (the create act is the `Pane`'s).

Each filter is a `Picker`'s own props: `{ label, options, value, onChange }` (`options` a list, flat
or under group labels, or a read of one, as a `Picker` takes it; `placeholder` and `act` too). A
`value` that is a string is set, `null` or absent is not, and the `null` option (the empty choice) is
the way to clear; `onChange` hears `null` there. A `value` that is an array picks several (the entry carries `several: true`, so an inline `onChange` reads its value's type), set while
it holds any, cleared to `[]`. **Pass them all as `filters` and the toolbar decides how they stand**:
two or fewer sit beside the acts as `Picker`s (set, one reads its `label`, a colon and its value, "Work
type: Change"; unset, or on its `null` option, its `label` alone); three or more fold, all of them,
behind one outlined "Filters" act with the count of those set ("Filters 2"), which opens the labelled
picks in a sheet. A pick applies at once (there is no Apply act, so `onChange` is where the list
behind it updates), "Clear filters" ends the sheet while any is set, and each set filter shows as a
removable chip in the chips row, "Work type: Change" (a pick of several "Projects: 5 projects", or
its one value), so nothing set is hidden; removing the chip sets the filter to its empty value. The
threshold is the contract's, never an option. Hold filters that more than one pick can set in one
place (a URL's search parameters): clearing calls every filter's `onChange` with its empty value one
after another. It reads none of its children: a search `Input` or a `Picker` passed as a
child stands in the acts' row like any act, so the search and the filters go in their props.

## Data, never nodes

A composed region is data its molecule draws: an `Act` (`{ label, onAct, destructive?, quiet? }`; `quiet` draws a bar's
act as words in the meta ink with no hairline, a resend or a skip, never its filled act),
an `IconAct` (`{ icon, label, onAct }`; the promise `onAct` returns holds the act, below), a row's `StatusMark` and `ChipMark`, a menu's `Act`s, a `PlaceSpec`, all from
`@fcalell/ui-core/descriptors`. An icon is an `IconName`, a Lucide glyph's PascalCase name.
`children` is open only where the roster gives it. A `Form`'s filled act runs the procedure, and its bar holds its acts' run; a blocked act waits for a touch: it is inert and silent until it is pressed, or until its form or sheet has taken input, and then the bar draws its `blocked` reason (the pressed act's, else the last blocked act's) under the acts at meta size, in a line drawn only then and kept after, so a blocked act takes no room before it is touched (the filled act of a `Form` or `Sheet` whose read ended draws its reason on a press alone). A `Form` that stands edited asks once, "Discard your edit?" or Keep editing, when its screen is left (the back, a swipe, a navigate that removes it), so the app writes no `beforeRemove` guard of its own; pressing the filled act ends the edit, so an act that navigates is never asked, and a rejected act puts the edit back. An `Input` with an `act` presses that act on the keyboard's return. A field that replaces what the viewer was reading (an edit swapped in for rendered text) takes `autoFocus`, which focuses it as it mounts with the caret at the end of its text; a field on a form that loads with the page leaves it off. A `confirm()` takes a `Confirmation`, its `cancel` the way out's own label ("Keep editing") where the `cancel` word is not the decision's.

A row's marks are named props, at most one each, in order: `status`, `warning` (what is wrong, a
string), `lock` (what it holds, a string, a glyph), `chip` and `marks` (boolean facts, each `{ ring: boolean, label }` (the required ring, filled when true) or `{ flag: IconName, label }` (a flag glyph), named by its `label`); the act that clears a warning is the
row's `act`. The marks lead the row's meta line, under the title, in that order: the status (its dot and
its word, a given `label` too), the warning (its glyph and sentence), the lock (its glyph and reason, a link with an
`href`), the chip (compact) and the boolean marks (each its glyph and its `label`; a ring that is false says no fact and draws
nothing), then the meta parts. The line wraps whole, a gap apart, so none is ever cut, folded or dropped, and a line it wraps to starts under the status's word, its dot hanging before the line; a row with a mark is the two-line
row. The trailing value stays in the end group, cut to the room the rest leave. Put the mark that must be seen first. Keep a status word short; stack never shortens a label itself.

Where a row, a fact or a field stands in a change set is its `change` (`ChangeKind`: `added`,
`changed`, `removed`, `unchanged`, `stale`), one field of a row item and a file, a prop of a form's field
and a `change` slot on a `Table`'s `row`: a glyph in the kind's ink in a
lane at the row's start, named by the kind's word. Mark every row of a set, the untouched ones
`unchanged`, so the titles line up.

A row's next step is its `act`, one icon act at its end ahead of the more menu (an `IconAct`, or an
`IconLinkAct` for a route; its words are its accessible name; an act the row waits on keeps its pending press there, never also in
`more`), and the row's other acts are its `more`. An input on a row is its
`entry`, a `RowEntry` (`label`, `field`, `placeholder`, `act`, `error`) standing under the title
in the meta line's place; once its act settles, give the row `meta` or `status` instead of
`entry`.

A sheet draws a full-width hairline once between its rows, with no gap and no inset, and the painted rows match. A tree's rails run unbroken. The references split by row height: single-line and tight inbox rows read by whitespace and a press wash (`patterns/activity-feed.md`: the Linear inbox at about 54 px; `patterns/dark-mode.md`), where tall two-line rows are parted by a hairline (`patterns/chips-and-statuses.md`: Vercel deployment rows; `patterns/data-table.md`: horizontal lines only in lists; the Dribbble messages screen on Mobbin).

A row off a highlighted path (a journey's untaken steps) is `dim`: its title in the meta ink at
400, never faded, still a hit, its glyph and marks keeping their hue. While a row's act pends,
its work's steps are `steps` (a `StatusMark` each, the running one in `running`): one line each
in the meta line's place, so give `meta` back once the act settles. A title read whole (a note,
a memory) is `wrap`: it wraps to every line at 400 with its leading on the first line and its
trailing and acts centred on the row, and a row takes it as one boolean. A `{ quoted }` title
marks a model-written name and wraps whole in a row with a second line; `wrap` is for text a person approved. A flag, a path or an identifier in a title is a `{ code }` run: the title is then an array of runs (`[{ code: "--strict" }, " turns strict mode on."]`; backticks in a string are never parsed) that draws the code bare in the mono (a machine name in a row is never boxed; voice 7) and truncates at its end as one title; a title that is a single `{ code: path }` is one value that cuts in its middle, keeping its start and its end, so the end of a path stays readable. A `meta` part that is `{ code }` is bare in the mono too, and wraps as the meta line does. A row's trailing age is the ISO
moment itself, `trailing: { age: item.madeAt }`: the row words it short ("2 min") and keeps it
current, so pass the moment, never a worded string. A spend or other short value that goes with the age is its `beside`, `trailing: { age: run.startedAt, beside: "$0.12" }`: it stands after the age in the same trailing, and the age keeps ticking.

Rows that branch (a journey's choice points and their legs) are a tree: a row item gives
`children`, its child items, and the `Section` draws a rail per level and a fold act (open by
default) last in the end group of every parent, no row reserving a lane for it, so give
each item a `key` unique across the whole tree; the fold act's expanded state is the branch's
accessibility state, and the phone has no keyboard focus to rove. Never indent rows with a class or a
nested sheet of your own. A `dim` branch gives `dim` to the parent and every child.

Rows of inline terms (a mapping of sources to targets, a filter's conditions) are `Rules`, each
rule a card of stacked terms: each `Rule` is `{ id, terms, onRemove? }`, its `terms` a pair
(`{ from, to }`) or a condition (`{ field, operator, value }`), each term a `RuleValue`, one of
`{ pick }` (a pick of constants), `{ picks }` (a several-pick of constants, the chosen values as removable chips)
or `{ either }` (an `EitherPick`: a picked option or a typed value, `{ picked }` or `{ typed }`,
with a way back). `add` is the act that ends the list. A rule's picks are constants: its name and chips are worded from them. A pick of several outside a rule is a
`Picker` given an array `value`; a `Picker`'s `options` are a `Datum` as its `value` is, so a pick over a
record's read is built from selections of it and paints until they land.

A value outside its editable context is a row with `lock`, a reason or a `Lock` (`reason`,
`href`): the value stays and one lock mark follows it in the end group, the meta glyph named by the
reason, a link to what holds the fact with an `href` ("Held by CR-12, Ana") and inert without one. A
locked row takes a `meta` (under the title) and no `act`, `href` or `onOpen`. A held value is never a
disabled field.

An act that is out of reach for a while (a resend after a code is sent) is a `Button` with `wait`, its seconds left, never a `blocked` reason that grows its row: it draws the count in its label, is inert while the count is above zero, and keeps its width at zero. Pass `wait` every tick, `0` once it is live; a `Button` is never wrapped in a context of the roster's own to be inert.

## An act holds its run

Every act's `onAct` returns the promise of the work it starts: `onAct: () => save.mutateAsync(v)`,
never `mutate()`. The act renderer holds the run, so the app passes no `loading` and reads no `isPending`:

- the act is inert at the press, draws its pending look (the pending fill, label and glyph hidden,
  the spinner) only after `ACT_DELAY`, 300 ms (it snaps in; the delay is no option), and is ready the
  moment its promise settles;
- a host takes over its acts' run: a form's or sheet's bar pends one act and the rest stand inert (acts that
  stand together at the end of what they decide, a record's Approve and Decline, are one `ActionBar` from
  `@fcalell/plugin-native-ui/components/action-bar`: `acts` in reading order with the filled act last, drawn
  stacked full width with the filled act on top), a `Sheet`
  holds its head submit, foot bar and form bar and its dismissal with them, and a `confirm()` act
  closes its sheet when it resolves and stays open, ready, with the sentence in its bar line when it
  rejects;
- a rejection is drawn by the host, in its line (a bar's kept line, a `Sheet`'s, a
  standing `Button`'s under itself) and otherwise in a failed toast whose Retry runs the whole act
  again, a navigation included. The sentence is `refusal(error)` from `@fcalell/plugin-api/acts` (a 4xx the procedure worded itself,
  except 401, 403, 404 and 429; for an input the procedure's schema refused, the schema's first issue
  message), else "That didn't go through."
  (`words.actFailed`). `issues(error)` from the same module gives every issue's message and path, so
  a `Form` puts each under its field itself; an act carries no sentence of its own. `.catch` nothing: a handler that
  catches a rejection to toast it draws it twice;
- an act pressed offline, or while the app's connection read says the server is out of reach, is
  refused at the press: it rejects with `Unreached`, nothing is sent and nothing queues for later,
  and the host draws "That didn't go through." where its failure goes, with no Retry and nothing
  else held; the connection's reason is the offline banner's, said once.

A labelled act that goes to a route is a `LinkAct`, `{ label, href }`, not an
`onAct: () => router.navigate(route)`. Wherever a host takes an `Act` for a labelled act (a `Banner`'s,
a `Toast`'s, an `empty`'s) it takes a `LinkAct`, and a menu (a `more`'s entries) takes `{ label, href }` as
an entry; so do a `Pane`'s `actions`, a `Section`'s and a row's `act` (`IconLinkAct`), a Section's `empty` act, a band's icon act, and the act of a `Picker` or the shell's switcher. It is drawn as the act it stands for and a press navigates to the route; it runs
nothing, so it never pends. With a `blocked` reason it draws inert and gives the reason, as a blocked act does. An act beside a heading or a title, or at a row's end, is an icon act (`IconAct`, or `IconLinkAct` for a route): a `Section`'s and a row's `act` take nothing else. Acts that stand side by side fold by one rule, never by the room: the first stands and the rest stand in the more menu, in their order, at every width. A `Pane`'s first `actions` entry stands at its icon and the rest lead its `more`, the act named More and its sheet titled by the Pane's title (a record's name); a row's `act` is its one act and its others are its `more`, its sheet titled by the row; a selection bar stands the first of choose-all and clear that applies. Put the act used most first. A `Sheet`'s submit, an `ActionBar`'s act, a `Rules` add, a table's `select` acts, an `Input`'s act and a `RowEntry`'s act stay function acts: each runs something over the surface it stands on or must pend it.

An act whose work goes on to a route, asks first, toasts or opens a sheet says so as data. An `Act`
carries, beside its `label` and `onAct`:

- `confirm: { title, sentence }` is asked first, as a decision over the screen whose act wears the act's
  own `label` and `destructive`; declined, nothing runs. The app calls no `confirm()` or `ask()` for an
  act it draws (`confirm()` stays for a decision no act starts).
- `done: "Saved"` is a sentence toasted once `onAct` resolves; a rejection toasts the error's sentence as a
  failed toast, as it does without it. `toast()` is for what no act started.
- `to: route` is gone to once `onAct` resolves and `done` is toasted, through the router a `LinkAct`
  goes through: `async () => { await remove.mutateAsync({ id }); router.navigate("/deploys"); }` is
  `{ onAct: () => remove.mutateAsync({ id }), to: "/deploys" }`.
- `sheet: { title, submit, form, … }` is a `Sheet`'s props but `open` and `onClose`, opened by the press in
  place of running `onAct` (the two are exclusive; the types forbid both: an act that opens a sheet has no `onAct`). The host that draws
  the act holds the sheet's open state: it opens on the press and closes when the sheet is dismissed or
  its `submit` act or its `form` resolves, and the `submit` takes the same `confirm`, `done` and `to`. A sheet
  that opens from an act holds no `useState(false)` flag in the screen. The sheet draws from the act's
  current `sheet` on every render, the host re-rendering with its act, so props that change while it is open
  (a read landing, a field of a record) reach it; only the open state is held. Give the sheet through
  `sheetOf({ … })`, which reads the procedure off the form's `act` so `onDone` hears that procedure's
  typed output and the fields are checked against its input; an act's slot holds acts of different
  procedures, which no type follows, so `sheetOf` is where the procedure is typed and `sheet` is
  procedure-less after it. A `Pane`'s and a `Thread`'s `sheet` is typed by its own form's procedure
  directly.

The order is fixed: confirm, run, toast, go. Every host that draws an act (a `Button`, a
form's or sheet's bar, a `Section`'s head, band, rows and empty form, a row, a `Pane`'s bar, a
`Banner`, a `Toast`, a menu, an `Input`'s or `Picker`'s act, a `Sheet`'s submit) runs it, so the
sequence is the same wherever the act stands. An act that needs another order (a toast before a
confirm, two sheets) has no form: file the gap, hand-wire nothing. A retry after a failure runs the
work again (`onAct`, `done`, `to`), not the confirm.

A sheet that no act opens (a deep link, a row that opens its record's sheet) is addressed by the
route: a `sheet` search param (`?sheet=invite`) the screen reads with expo-router's
`useLocalSearchParams`, its `open` the param's presence and its `onClose` clearing it
(`router.setParams({ sheet: undefined })`). The app holds no open flag for it.

A control that saves as the viewer changes it returns the save's promise from `onChange` (`Switch`, `Picker` at any fit, a row's `switch` or `pick`)
or from `onCommit` (`Input`, and `Slider`, whose `onChange` hears each step and whose
`onCommit` the value it is let go on). The control shows the viewer's value, a selection's or a
constant's, while the latest save pends and then follows its datum once the refetch the write
invalidated has landed, so nothing flickers back and no saving mark is drawn. Each change
supersedes the one before; a refusal puts the value back and draws its reason in the field's error
line when the control is a form field's (`switch`, `checkbox`, `slider`,
`picker`, `options`, `segments`), which the field hosts, else in a failed toast whose Retry saves the
same value again. A `code` `Input`'s `onComplete` returns the check's promise: the boxes hold the code
and a checking line stands under them at once, with no delay, and a refusal stands in the control's
own line under the boxes.

In dev, `QueryProvider` logs an error for a mutation an `onAct` started without returning its promise
and for a mutation failure nothing drew; a mutation with its own `onError` is exempt.

## A form is its procedure and its field labels

A `Form` takes the procedure it submits and the labels of the fields it shows; the procedure's input
schema (`stack generate` writes it to `.stack/schema.ts`) gives everything else.

```tsx
<Form
  act={orpc.requests.submit}
  given={{ organizationId: organization.id }}
  fields={{
    title: { label: "What should change?" },
    why: { label: "Why?", control: "prose" },
    kind: { label: "Kind of request" },
    dueDate: { label: "By when?" },
  }}
  submit={{ label: "Submit" }}
  onDone={(request) => navigate(`${base}/requests/${request.id}`)}
/>
```

`fields` are keyed by the input's keys (a key the input lacks is a type error), in the order they stand;
`groups` (`{ title, description?, fields }[]`) partition them under bands instead. `given` holds the input
keys the screen supplies; a required key that is neither a field nor given throws. `values` are the fields'
first values (a form about a record: a selection paints the controls until its read lands, and is the form's
`read`); a submit that resolves puts the fields back to them and `onDone` hears the output and the input it sent. `can` is the ability
the caller needs, `[action, subject]` (`can={["create", "request"]}`), asked in the organization of the route's
scope: a caller who may not has the fields disabled and the submit blocked with the word `denied`, and the
form paints, inert, until the ability's read lands.

| The schema says | The field draws |
| --- | --- |
| a string | a line of text (`control: "prose"` many lines, `"source"` many lines in mono, `"code"` the one-time code boxes (`Input kind="code"`, as many as the schema's fixed length: `z.string().length(n)`, else the field throws naming its key; the submit stays blocked until every box is filled), `"date"` a date line; a `format: date` string is one already) |
| an enum, or a string with `options` | a pick (`options` gives the labels, or the choices of a string the schema does not list; a function of the draft, `(draft) => options`, narrows them by the fields before it as the draft changes, may answer a read so the pick paints while it waits, and a chosen value that is no longer among them is cleared) |
| a boolean | a switch |
| a number | a numeric line |
| a list of an enum, or of strings with `options` | a pick of several |
| a list of strings, numbers, booleans or `null` with `control: "lines"` | a text area, one item per line (each line trimmed, blank lines dropped); the array is sent, each line read as the item type the schema allows (`true`/`false` a boolean, `null` null, a number a number, else the text), and a line that fits none stands as the field's issue ("Line 3 isn't a value this list takes."); `values` joins the array with newlines; empty sends `null` where nullable, the key absent where optional |
| an object, a list of objects, or any value with `control: "json"` | a mono text area (`Input kind="prose" source`) holding the JSON text, parsed when the form commits (the submit, or the field's commit); a parse error stands as the field's issue, the parser's message and position; the parsed value is sent; `values` pretty-prints with two-space indent; empty sends `null` where nullable, the key absent where optional |
| a date (`date-time`) | a date line (`Input kind="date"`), sent as a `Date` |
| a string with `control: "file"` | a file pick (`Input kind="file"`) over the `accept` the field gives (JSON Schema has no form for it); the picked file is read into the string, as text, or as base64 where the schema entry is `contentEncoding: "base64"` (a `z.base64()`); `name: "fileName"` names the input's string key that receives the picked file's name, for an input of `{ file, fileName }` |
| optional | the pick offers an empty choice; the field left empty is not sent (`null` where nullable), a pick committed empty by field included; the word `optional` stands under its label, on a second line of the label column, in the meta ink |
| required | the submit stays blocked while the field is empty, its reason naming the field by its label ("Give the package directory.", "Pick the region."; a label that is a question, "By when?", is its own reason), the words `giveField` and `pickField` |

`submit: { label, done, to, destructive }` words the bar's filled act; `destructive` draws it destructive (a form that rejects, abandons or closes something). `acts` are the other acts standing in the bar before it (a Cancel, a destructive Decline with `confirm`), each an act of any bar; a `Gate`'s form passes them through, and with `commit: "field"` they stand in a bar of their own under the fields, the last of them filled.

The server's refusal of a value (a `BAD_REQUEST` from the input schema) stands under its field until the
field changes, once: where every issue names a field the form shows the bar draws none of them, and an
issue on a key the form does not show stands in the bar; the submit act is pending while the procedure
runs, and any other rejection stands in the bar. The server words a machine name in a refusal between
backticks (``z.string().refine(known, "No package at `packages/lead-mail`")``, ``new ApiError("BAD_REQUEST",
{ message: "No package at `packages/lead-mail`" })``) and the field draws the span as a `{ code }` run;
an `error` a screen passes itself from a server message goes through `markedRuns` from
`@fcalell/ui-core/form`. A field the schema cannot describe takes a `control` hint; a shape no control draws (an object or a
list of objects without `json`, a list of anything but an enum without `lines`, a union) throws naming the key, as does a `lines` or `json` hint the schema does not fit. A field with `locked: "reason"` stands inert with the
reason under it, as a row's `lock` does.

A settings page is a `Form` with `commit: "field"`: it draws no bar, and each field sends `given` and its
own key when its control commits (a text on leaving it or on Enter, a switch or a pick on its change, a file
as it is picked), so every required key of the procedure the form neither `given`s nor shows throws (a form's own field may be required: it sends itself). A
field holds its own save: its value stays while the save runs, the server's refusal stands under it and
the value falls back. `submit.done` is toasted per commit and `onDone` hears each output and input; `submit.label`
and `to` have no place without a bar, and the form asks nothing when its page is left.

What is not a `Form`: a filter is a `Toolbar` pick or search, a local setting is a `Switch` in a row. A
form over no procedure is a gap to report, not a `Form` with hand-drawn fields.

A form in a `Sheet` is the sheet's `form`, these same props, and a pane's or an act's `sheet` takes it too: its
bar submits, `onDone` closes the sheet (an act's `sheet` closes itself), the sheet gives no `submit` of its own,
and the viewer's edits are dropped as it opens again. A `Gate`'s `form` takes these same props too, drawn after
the step's body with its bar across the column; a `Gate` step that holds local state and submits nothing
draws its controls as its `children`.

A `Pane`, `Section`, `Sheet`, `Form` and form group take `empty` (`{ sentence, act? }`) for a body that
holds nothing yet, drawn in place of the body only when the frame's own `read` is empty: a frame with no `read`
has no `empty`, and the read alone decides, never a count the app checks. The `Pane`'s centres in what the body
leaves, its act the filled one with the plus; a `Section`'s always stands in a hairline frame, so it never reads as
part of the head: the sentence at the meta role, then the act, the hairline one. A `Section` with a `description` draws no
sentence of its own (the description says what it holds, and its `empty` is typed `{ act }`, no sentence): its frame reads the word for none ("None"),
or holds the act alone when `empty` gives one. A collection a frame holds the read of
leaves its empty to that frame; a collection of its own read draws its own, generic one ("Nothing here yet."). There is no `EmptyState` component to place. One form among a screen's sections is `Section > Form`, so every section's head-to-body gap stays the gap. A `Form`
given a `read` is a frame, and so is a group given its own: the fields paint while it waits and its
failure stands in their place. The form's bar waits only on the form's own read (a group's never reaches it): it paints while that read waits and is blocked once it failed or is missing, its sentence drawn when the act is pressed and never at rest, since the body already says it. A field's value is
a selection (`value={workspace.at((w) => w.name)}`) that the viewer's edit replaces.

A fact is a row with a `label`: the label in the body role and the meta ink (the code role for a `{ label: { code } }` machine name) over the row's line, the value under it at the row's whole width (the phone is always compact; a label column would leave an email or a domain no room), the title its value (one line that truncates, unless the row gives `wrap` where the value must stand whole, a sentence or a whole URL; a `{ code }` title cuts in its middle, `{ absent }` is in the meta ink, `{ status }` is the status at the title's start, `{ code, copy: true }` is an identifier in the mono with its copy act) and `meta` its description under it. A row with a label and nothing else to say (a switch, a pick or an act at its end) draws the label as its text, on the line the end group shares. A row shows an in-place `switch` (`{ checked, onChange }`, named by the row's label) or an
in-place `pick` (the Picker's fields: `label`, `options`, `value`, `onChange`; `options` and `value` are each a constant or a
selection, and the picker paints, inert, until they land; the row draws it at the row fit, named by the row's label) in its end group, never both. A row's value, control, act, copy act, more menu and fold stand in one end group centred on the row, under a description too; a row with nothing at its end reserves none, so the values of rows that end differently end at different x.

A `Section`'s head ends in its `act`, then its `more` (an `Act[]`, destructive ones marked, shaped as a row's `more`): a block's other acts (move, remove) stay on its head row beside the title, which never moves, and a foldable Section's more does not fold it. The head is one line at every width, the title keeping two fifths of it, and its `act` is an icon act (`IconAct`, or `IconLinkAct` for a route; its words are its accessible name) that always stands.

## Collections take data

A collection takes its rows as data: a `Section`'s `items` are rows (a row item or a
file), built from the records by one `toRow` function, and nothing public draws a single row. Give
`items` the selection mapped to rows, or an array for a constant collection; a titled `Section`
stands over its sheet, an untitled one is the sheet alone. A row with a `label` is a fact
(`{ label, title }`, `meta` its description), so facts are one `Section` of labelled rows, and a
part that is no row (a `Slider`) stands in a `Card`. One `RowItem` shape is every row: it draws
whichever slots it fills, on one box.

```tsx
const toRow = (member: Member): Row => ({
  key: member.id,
  leading: { avatar: { name: member.name } },
  title: member.name,
  meta: [member.role],
  href: memberRoute(member.id),
});

<Section title="Members" items={members.at((rows) => rows.map(toRow))} />
```

`Row` is `import type { Row } from "@fcalell/plugin-native-ui/components/section"`.

Given a selection, a `Section` with `items` is a frame of its own items: it draws its failed form with
Retry, its missing form and its empty form in its sheet's place with the generic sentences, and the
stale and paused line above its rows, whatever stands above it; a `Pane`, `Section`, `Sheet` or `Form`
that holds the same read draws instead, and the sheet is not mounted under its failure. Pending, it
paints four rows, each a title line over a meta line whatever the rows will be (a tree draws flat
then). A fact takes `meta`, `act`, `href` and `onOpen` or `lock`, a `{ code, copy: true }` title
for an identifier, and `wrap` where its title must stand whole. The rows of a sheet share one `leading` kind
(`avatar`, `icon` or `status`) or none, so the titles share one x: an avatar and an icon stand in a slot at the avatar's size, a status in the room of its mark, and a row with no `leading` reserves none. Where only some rows have a state (a sensor among lamps), the state is the row's `status`, leading its meta line, and the leading is a kind every row has (an icon) or none. The first meta part names the item. The phone is always compact: a row's meta line stands under its title, never after it, and is the parts, a middle dot apart, and where a line breaks between two parts no dot shows at either end: as one text it takes up to two lines and ends in an ellipsis at the end of the second, the dot bound to the words beside it, so it breaks only between a part's words; after a row's marks each part wraps whole, beside the marks where the line holds it, its words wrapping only where it is longer than the line; a `{ quoted }` part is cut at 40 characters, and a `{ code }` part stands bare in the mono. The marks and the parts after them stand a middle dot apart. An age and spend that must read are the row's `trailing`, `{ age, beside: "$0.42" }`. The marks lead the meta line, so a row with a mark is two lines. A row
is a text group (the title over the meta line) and an end group centred on the row: a trailing
value, a switch, a pick, the act, the copy act, the more menu and a tree's fold stand in it, in that order, never
on the title's or the meta line's line. The text group keeps two fifths of the row; the end group takes the rest, its value cut to it. A row that opens (`href` or `onOpen`) draws no chevron: the whole row is the one hit, and what its end group holds that is a target of its own (an act, the more menu, a pick, a tree's fold) keeps its target size. A row with nothing at its end draws no end group and reserves no room for one, so the rows of a list that end differently end at different x; give `more` only to the rows that have acts.
A row's `act` is an icon act and always stands, beside the more menu; give `act` the next step and put the row's
other acts in `more`, which runs them in their order. A table's `selected` row washes in its
list form as in its grid. A file row's `change` (a `ChangeKind`) draws the
change mark ahead of its glyph, and its `chip` says why it is listed; the path yields to it down to
its name's floor (the whole name when it is short, else its first three characters, an ellipsis
and its end, never clipped mid-glyph), and below that the chip's label truncates with an ellipsis; the row never overflows sideways. A `Section` with `children` given a `read` is the frame of its body: the heading stays and the body's failed, missing and empty forms stand in the body's place, and the parts in the body paint while its selection waits. The count after the title is the loaded rows' length of a `Section` with `items`, never drawn while the body waits, and is a list's: a `Section` whose every row has a `label` (facts, a definition list) draws none. A `Section`'s `groups` (`{ key, label, act? }`) draw a band over the rows whose `group` is its `key`: the label, the count of its rows and its icon act, closed by its own rule (one band, one count: a lone band holding every row under the title's count draws none); rows with no group stand before the first band, a tree's group is its root rows', and a painted sheet draws none. A row is one form everywhere, at the card's inset and the row radius (the card's clip rounds only its outer corners).
Every leaf paints on its own selection: a `Slider`, a row, a form field's control, a `Prose`, a `Code`, a `Diff`, a `Thread` and a `Stats` cell take a constant or a selection of the read, and a selection whose read waits draws the part's loaded form painted, at its loaded height, a `Picker`, `Slider`, `Switch` and the rest as the box the control keeps. A leaf paints only while its read waits: a text or mark leaf (a `Section`'s `description`, a row's title and meta, a `Chip`, `Status`, `Count`, `Avatar`, a `Banner`'s sentence, an `Pane`'s record head's parts, a `Prose`, `Diff` by word, `Code`, `Stages`, `Image`) whose read ended draws its loaded-empty form, no line for a text and nothing for a mark (a row outside every frame holding its read is the failed row below), and the frame that holds the read says why, once. A part of your own draws as it is: read what it needs with `useRead(selection)`, which is `undefined` while the read waits. A control's value follows its selection until the viewer edits it (`useDraft`), so typed text outlives a refetch. A control whose value's read ended (a `Switch`, `Slider`, `Input`, a `Picker` at any fit, a form field's control) stands in its box with no value (no switch position, no segment, an empty pick) and is blocked like an ended act: a press or a keystroke changes nothing and says the failed sentence (`words.missing` when missing) where that control says a refused save, a toast alone and the field's line in a form; a `Picker` opens no list. A `Stats` meter or a row is the frame of the selections it draws (a row's `title` and `meta`, a meter's `label`, `value` and `max`), as a collection is its items': when one failed and no frame above holds that read, the row draws the failure in place and no `read` prop is needed. A failed row keeps its label, shows the failure mark and the retry icon in its end group, says "This didn't load." in the meta line's place, and loses its title; pressing the row retries, and loaded it opens again. A failed `Stats` meter keeps its label, shows the failure mark and the retry icon in its head's end, says the sentence under its bar, and pressing it retries. A read the enclosing frame holds is that frame's failed form alone, once, and the row draws nothing of its own. Two unheld reads in one row are a dev `console.error`, as in a frame (give the second `.or(fallback)` when it only names). A `Section`'s `description` is a `Datum<string>`: it paints where the sentence will stand, and a loaded `""` draws no line, as an undefined one, so `description={report.at((r) => r.tally ?? "")}` keeps the head's height while it waits. A parts line (an `Pane`'s record head's `overline`, a row's or a message's `meta`) drops a loaded part with no text (`""`, an empty `quoted` or `code`) before it joins, so no separator dangles after the part before it, and a line whose parts are all empty is not drawn. A fact's title stands on one line under its label and truncates, so a value that must read whole takes `wrap` and wraps at the row's width; a `{ code, copy: true }` identifier that does not fit its room, when it is one word of more than eight characters, cuts in its
middle (its start and its last four characters stay, `SHA256:uNiV…k3Qz`) on one line; the whole value
stays its read text and, in a `{ code, copy: true }` title, what the copy act copies, so a value never needs a wrapper
that truncates it. With `wrap` the identifier stands whole on as many lines as it takes, breaking anywhere, as a
fingerprint must.

A frame given a root read (`orpc.x.read()`) that answers not found (the procedure throws
`NOT_FOUND`, a 404) draws "Couldn't find this." (the `missing` word) with Back, never Retry: Back
goes to the enclosing `Pane`'s `back`, else to the place's route, and with neither there is no act.
Give the frame the read itself, not a selection of it, so its error arrives; a record opened by an
address after it was removed then needs no screen of its own.

A record that is not there is the `Pane`'s own `read` answering not found, never a Pane's or a
Section's `empty`: the `Pane` fills its page with the missing form, the sentence in the meta ink in a
hairline frame and the `Pane`'s `back` after it as the hairline act with no plus. Give the `Pane` a
`noun` (`noun="project"`) and the sentence names the kind: "Couldn't find this project."; without
one it is "Couldn't find this.". An `empty`'s act is the create act.

An address no route serves needs no route of yours: `stack generate` writes `+not-found.tsx` into
the routes directory when it holds none, a one-line re-export of stack's page, "Not found" with
"Nothing is at this address." (the `notFound` and `nowhere` words). It stands where expo-router
stands the route, inside the root layout: a `Pane` under a `Shell` whose act goes to the Shell's
first place that is a route, a `Gate` with Back to `/` under a layout with none. A `+not-found.tsx`
of your own wins and is never rewritten; to own the page, replace the file's contents with a
default export composing a `Pane` titled "Not found".

A frame says "This didn't load." with Retry whatever failed, and takes no sentence of its own.

A comparison is a `Table` whose cells hold a value per column: its first column names the fact, a column
follows for each compared thing, and a `chip` or `status` column carries a fact's mark or verdict.

A `Table` takes its data the same way: `items`, a constant or a selection that paints four rows until it lands; each column reads its
cell from the item by `cell`, and `row` gives the row's `id`, `href`, `locked`, `warning` (what is
wrong with it, drawn after its name) and `change` (where it stands in a change set, its mark ahead
of its name). Its failed, missing and empty forms are its own. A collection over a paginated read (`orpc.x.list.pages(input)`) ends in a more row of its own: "Show more", pressed by the viewer (nothing loads by scrolling); while the next page loads, `PAINT_ROWS` painted rows follow the loaded ones; a failed page is "Couldn't load more." with Retry. The frame is not busy for it and its Section draws no count while more remains; an empty first page with more is fetched on, not drawn empty. A `Table` paints its next page as rows in the same slots, and `items={deploys}` is all a collection takes. An editable table
(`onEdit`) draws a lock after a cell its row locks (the leading cell too, after its name); a column's own `locked` makes it read
only, its lock in the head alone.

A table that acts on rows takes `choose`: `chosen` (the ticked ids) and `onChange`, with `blocked`
and `moved` reading a row's reason from its item. Below `tablet` each row leads with its tick (a
a row's `leading: { check }`, a `blocked` reason leading its meta line, a `moved` one too); from
`tablet` a tick column leads the grid and its head tick is unchecked, mixed or checked over the rows
that can be ticked. `onChange` hears the viewer's tick and your rule decides what the set becomes
(ticking a change under a new parent ticks the parent): return the ruled set through `chosen`. The
table draws no count. Give it `select: { acts }` and it draws the selection bar itself, docked as the
foot of the `Pane` it stands in (a table with `select` stands in one): "N of M chosen" over the full-width act,
whose label you set ("Publish 4 changes") and whose `blocked` reason you give when nothing can go
(read your own `chosen`). `of` counts the rows that can be chosen. The phone has no head tick, so the
bar puts the acts beside the count: "Select all", while some rows stand unchosen, and "Deselect all",
while any are chosen; the first that applies stands and the other is in a more menu beside it. Both hand
`choose.onChange` the set, so apply your rule to them as to a tick.
The bar's column stands centred in the foot, which a docked `sheet` takes over while it is open.

```tsx
const notes = orpc.notes.list.read();

<Section
  title="Notes"
  items={notes.at((rows) =>
    rows.map((n) => ({ key: n.id, title: n.title, meta: [n.edited] })),
  )}
  empty={{ sentence: "No notes.", act: { label: "New note", onAct: create } }}
/>
```

A `Picker` in `fit: list` holds a static set in `options`, which never paints. Options from a read take `items`
(constants or a selection) and an `option` map over the check row: `value`, `label`, `description`,
`recommended`, `blocked` and `group`; while the read waits it paints four rows in the shape the map
declares. A list shows its options' state itself: a failed or missing read is the failed sentence with Retry (or the missing one) in a line under the control, with no frame needed. A `value` selection paints the boxes or rings until it lands. The `value` picks the
form: a set (`onChange` hears the set) draws check rows, one value or `null` (`onChange` hears
the value) radio rows, one answer among a few described options. An option that cannot be chosen
now carries `blocked`, a short reason that replaces its description in the disabled ink (in a `Picker` at the menu and list fits, a `MultiPick` included): it takes no press and keeps its
place in the list. Once the option is in the value it draws and acts as any chosen one and stays
removable, so `blocked` never traps a value.

A `Diff` is `hunks`, or the two texts it compares (`before` and `after`) `by` line (the default: code, each
line marked and numbered) or `by` word (prose, its edit marked in place). A hunk's ranges are never drawn: lines
left out between hunks are one elided row (a meta-ink ellipsis in the mark column, the context git writes after
the ranges in the code column), and a long line breaks at its spaces and after a token's punctuation, never
mid-token, and wraps under itself at the line's start. An inserted word keeps a dotted `ok` underline beside its wash, so the edit reads without colour
and never as a link.

A `Thread` takes its `items` (constants, or a selection, which paints four messages of the other author until its read lands; its failed and missing forms stand in the log's place, its empty form is one sentence in the meta ink (`empty`, else the generic one) over its act, and its composer and reply stand through each) through a `message` map (`key`,
`author`, `name`, `body`, `at`, `attachments`, `meta`, `streaming`, `onOpen`, `detail`), each reading only its
item, since a message draws again only when its item changes; its `composer` is the input under the log (`value`, `onChange`, `attachments`, `onAttach`, `onDetach`, `placeholder`, `notice`, `working`, `onSend`, `onStop`, `disabled`), and
its `sheet` (a `Sheet`'s props) docks in the input's place while it is `open`. While a reply from the other author is on its way, set `replying`:
the loaded log ends on one waiting message of theirs, followed as any message is; clear it in the
render that adds the reply's item, which stands where the waiting message stood. Set `streaming` on the reply (an
`other` turn, a `Message` field and a `message` slot) while its text is still growing: a marker left
open at its end (an emphasis, a strong run, a code span, a link, a fence) draws in its own form from
its first character and the closing marker changes nothing drawn; a finished reply leaves an
unmatched marker as text. The turn being written is `reply`, a selection the app declares (a stream read, `read(options, { kind: "stream" })` over `streamedQuery`, or a slice of a channel read): it draws after the items from its own subscription, so a chunk renders only it. Waiting for the first chunk it is one waiting message of the other author, then the message with `streaming` set while it grows, then the message; held as a root read, a stream that fails after some text keeps the partial message and says "The reply stopped." with Retry, and one that fails (or goes missing) before any text says "This didn't load." with Retry; Retry runs the stream again. It steps aside once the last item has its key, so a history that catches up draws no second turn; `null`, `undefined` and the empty string are no text, so no turn, and a held read that failed with only that says "This didn't load." with Retry. `replying` stays the boolean for a reply the app does not stream.
A `Thread` fills what it stands in by plain flex: in a `Pane`'s body it takes the free height, its
log scrolls and its input docks at its foot a section under the log; among sections it stands
at its content's height. It stands as the body's direct child, never inside a wrapper of the app's
that is no flex column, which leaves it its content's height. A part above the `Thread` (a
`Banner`, a `Section`) is its sibling in the body, a section from it. What a system line names stands under it as
its `detail`, a `MessageDetail`, exactly one of: a `row` (a row item's fields, its `title` a `Run` so a `{ quoted }` one draws its quotes, in a hairline card,
opening its record), a free act's `code` under its verb, or a `fold` of lines the line opens in
place; never a row or a `Code` between the messages.

A `composer`'s Send and Stop are icon acts (named "Send" and "Stop"), so the field keeps its width beside the paperclip.
A `composer`'s `onAttach` hears `PickedFile`s: the paperclip opens the photo library or the
files, and a file picked comes through it. A paste into the text brings nothing, since React
Native's `TextInput` hands over no pasted image. Turn each file into an `Attachment`
(`{ id, name, src? }`, the picked file's own `src` for an image) and pass it back through
`attachments`: an image draws as a thumbnail with its remove act, a file as a chip. A message
for `you` or `other` takes the same `attachments`, and `meta` (`"by voice"`, `"Kitchen"`) before
its time.

A picked file's `src` is a local address to draw it from before it is uploaded: the asset's uri,
set on every file the photo library and the file picker hand over. It is the asset's own address,
so nothing needs revoking.

A `file` `Input` draws a file of another type in its own line under its box, in a form or out
of one; the line clears on the next pick.

```tsx
<Input kind="file" value={file} onChange={setFile} accept={["text/csv"]} />
```

A field that stays in view while a `Pane`'s sections scroll under it (an ask box over a
home's sections) is the `Pane`'s `foot`: it docks under the body, above the tab bar; a `Table`'s
selection bar (its `select`) docks there the same way. A `Thread` in a `Pane` with a `foot` leaves
its own `composer` unset.

A `Pane` or a `Thread` takes `sheet` (a `Sheet`'s props) beside its `foot` or `composer` and draws the docked
sheet itself, in the foot's place while `sheet.open`, no scrim; a `Sheet` placed anywhere else is
always the modal one. The head keeps the back act before one column, the title (the `heading` role, a Section
inside at the same size; it wraps to its whole text, the close act at its first line) over the `description`, with the close act at the title's first line;
the body scrolls between the head and the foot, which hold their height (the `submit`'s bar),
and the body scrolls past two fifths of the region it shares with the log, and its content keeps
three rows whatever the head, the foot and the log hold (a shorter body pads to them). The log
keeps two rows of its own above the foot while the body can give; where the region is short the body
gives first to the log's two rows, then to its three, then the log goes, and the head and
submit never give: the submit stays inside the foot. A blocked `submit`’s reason stands
at rest under the act in the foot; a rejected act is its sentence in that same line, in the field
error’s cell and ink, the act ready again and no `Banner`: the line clears on the next press, and a
blocked `submit`’s reason stands before it. The modal `Sheet` draws it under the head’s submit. The
sheet holds the run of its head submit, its foot bar and its form’s bar, so it cannot be dismissed
while one pends. That submit stands in the title's row, whole, at its 44 px, and the head is one line: the title truncates
with an ellipsis. Pass
the same props as the modal `<Sheet>` from a page and as the `sheet` of a conversation; closing it (`open` false, the
`composer` drawing in its place) returns focus to the input, and each page (a new `title`) opens at
the top of its body, its first field taking focus.
The modal `Sheet`'s first `Input` takes focus as it opens, as a `Gate`'s step does.
The modal `Sheet` is as tall as its content, growing with it up to the screen under the top inset and
scrolling its body past that, so a `prose` `Input` that grows grows the sheet a line at a time; its foot (the
`submit`'s bar) stands above the keyboard. It takes no height prop; a pick that
searches is the one sheet that stands tall from its first frame.

A column is a width and the region around it aligns it: a docked foot (a `Pane`'s `foot`, a
`Thread`'s input) centres a selection bar's column. A region that holds a page's sections (a
`Pane`'s body, a `Sheet`'s body) stands them a section apart: never wrap sections in a `View`
to space them.

A `BarChart` takes data the same way, its `bar` map reading each item's `key`, `value`,
`parts` (by its declared `keys`) and `at`, which only the first and the last bar are read for: the time line under the plot draws each of the two centred under its bar, kept whole inside the plot, and no bar between them a time. Each bar stands in its slot of the plot, at least seven slots (`CHART_SLOTS`), so a series shorter than a week (a day's first hours just past midnight) stands in the first of them and never as a slab across the plot; it draws its failed and empty forms, and while `items` waits the total and the legend's figures are painted, the plot is one painted box at the loaded height and the time line is two painted words at its place.
Its head sums the bars, which is right for a flow (requests per day); bars that are a level (open
flags per round, a reading each hour) take `level`, and the head draws their span, the lowest bar to
the highest ("18.2–21°C"), never the sum and never the last bar, the thing's own reading its record
says once; a span that is one reading (one bar, a flat day) is that reading, so the head draws no
figure, and a key its name and mark alone. A unit that never sums (`%`, `°C`) is a level without `level`. A level's bars stand on
zero as a flow's do, since a bar's length is its value.
A `unit` that takes a plural is `{ one: "flag", other: "flags" }`, never a bare plural: the head reads the
form its figure takes ("1 flag", "6 flags"). Money is `{ currency: "USD" }`: the head and the keys write their figures in the
currency, exact ("$30.97"), the axis whole when its step is, and no word follows; never a spelled `dollars` beside a figure the
page writes with its symbol.

A region that reads is a frame. Give a `Pane`, `Section`, `Sheet` or `Form` (or one of a form's groups) its `read`: a read (`orpc.deploys.get.read({ id })`), a selection of one (`deploy.at((d) => d.steps)`) or a `combine` of several. A frame holds one read: the one read of its selection that no enclosing frame holds and that is not quiet. A Section given a selection of the read its Pane holds draws nothing of that read's state, and a second held read in one frame is a dev error naming both keys, so a region that draws two reads is two frames and a leaf that needs both takes `combine`. `or` is for enrichments only: `names.or("a board")` falls back quietly and never fails a frame, so it serves a name, a badge or a lane order, and a read whose rows, options, facts or text are drawn is never `or`. Sibling regions that draw one read each hold it and each fail in place; a repeated line is accepted, and a read is never lifted into a frame around its siblings. A frame draws the failed form when its read fails, the missing form when it answers not found, and its `empty`, a `{ sentence, act? }`, when its own read is an empty array, `null` or `undefined` on real data; a frame with no read has no `empty`. A failed Pane is the whole page with Retry as its one act, but its foot and docked sheet stand, since they answer to their own reads. Acts paint by their own datum: a constant act is always live, and an act given as a selection paints while its read waits, stands still with no sentence when its read is not asked for, and is blocked once its read ended, with the failed sentence (`words.missing` when missing). A collection (a `Section` with `items`, `Table`, `Thread`, `BarChart`, `Table`, `Canvas`, `Diff`) and an option control (`Picker` at any fit) given a selection show their own read's state in their own box, whatever stands above them. A form's field hosts its control's save, so a refusal draws in the field's line (a control standing alone toasts it), and a form's bar waits only on the form's own read. No act queues offline: an act pressed with no connection is refused and draws the generic "That didn't go through." where its failure goes, the connection's reason being the offline banner's, and nothing is sent later. A read held by the app's own `useQuery` is not a frame's; that region draws its states itself.

The waiting form is the loaded form painted (structure rule 15): while a selection's read waits, each leaf draws its loaded tree with filler in place of its text, at the loaded heights, in the `skeleton` colour (`PAINT`: filler glyphs for text, the component's own box for a mark or a control). A painted part is inert and hidden from the screen reader: no press, no focus, no link. A `Section` with `items` paints four rows (`PAINT_ROWS`), each a title line over a meta line, whatever the loaded rows are. A painted row draws no `chip` (whether an item has one is its own data), a waiting description is one clipped line (a `Section`'s) and a waiting meta line likewise and a waiting `Prose` is one paragraph of four clipped lines (`PAINT_ROWS`: a text block of unknown length paints that many lines), so a long text lands taller by the lines past them. Nothing shows for 400 ms (`WAIT_DELAY` in `@fcalell/ui-core/paint`): the paint stands undrawn in its place, so the screen keeps its height, then it fades in over the `base` rung and breathes: the painted part's opacity (its content is not drawn, so its fill's alpha) moves between full and 55 % over the `pulse` (1600 ms), every part of the screen on one shared value, so a screen breathes as one surface. The reduced motion the system asks for keeps the delay, snaps the fade and stills the fills. A text slot breathes on its root `Text`, whose nested filler it holds. A read the local server answers in a few milliseconds draws none. The delay is fixed, not an option. Only a frame that holds a read is busy to assistive tech (`accessibilityState`), while it waits.

The theme can paint a kind of glyph slot by the scramble instead of the pulse (`theme.loading`: `text`, `figure` and `id`, each `pulse` or `scramble`; a shape, a sentence and a paragraph always pulse), set once at startup in the generated `.stack/native-theme.ts` (`setLoading`). A scrambled slot is a memoised nested `Text` over the page's one clock (`useSyncExternalStore` over the ticker, so a tick renders that text alone), its characters generated Latin in the ink of the `Text` that holds it, no fill under them; the root `PaintText` fades in and does not breathe, which it knows from the `fills` prop (the role its filler stands for), so give a `PaintText` its `fills` whenever it holds a `Painted` of a one-line role. A phone cannot clip a nested text, so a scrambled slot's width is its generated characters', held by the tabular or mono face for figures and ids; it is a still bar under the system's reduced motion. A figure or id of a read that showed its scramble arrives by locking its characters from the reading start across `slow`: draw the slot through `Decoded` (`lib/slot`), which draws both its forms (its `PaintText` filler while `painted`, then the text) so it remembers it waited, where it is a figure or an id of a frame's own part; a collection's cells and text arrive by the settle's crossfade. Where text scrambles the busy glyph (`Spinner`) is three mono glyphs cycling at the tick, `···` under reduced motion.

After the first answer the frame that holds the read says what the read does, and the data stays. A refetch is a spinner after the heading (the Pane's title, a Section's title and count, a Sheet's title, a form group's legend; a frame with no heading shows none), shown after `WAIT_DELAY` so a fast refetch draws nothing; only that frame renders for it, never its body. A refetch that failed (stale) is the line "Couldn't refresh." with a quiet Retry, pending while it runs, and a read waiting for a connection (paused) is "Waiting for a connection." with nothing to press; both stand under the heading row (a Pane under its top bar, a Section after its description, a Form at its top). A read not asked for yet (`enabled: false`, `skipToken`) or paused with no data paints still: the loaded form painted and inert, with no busy mark. Busy to assistive tech (`accessibilityState`) is the first wait alone, never a refetch.

The switch from the painted form to the loaded one lands at once: the painted form is the loaded
one's geometry, so nothing moves. Draw nothing for it.

A control answers the viewer without being asked. The phone has no hover: a press lands as a wash on
`instant` and fades out on `fast` when the finger lifts (a pressed fill releases, it never snaps
back), and a filled control (a `Button`, an icon `Button`, a chip's remove, a segment, a tab) gives to
the press scale under it (a full-width `Button` answers and does not give). A `Switch`'s thumb
travels, a selection tick's mark grows from 0.6 with its opacity, an option's radio dot grows from
nothing, and a disclosure chevron or a sort arrow turns on `fast`, in and out, instead of swapping
glyphs. The components carry all of it (`usePress`, `useToggle` in `lib/motion`): add no animation of
your own to a part you draw, and every rung follows the system's reduced motion. A `Picker` in `fit: segments` switches its selection wash to the chosen segment at once.

A `Picker` in `fit: segments` keeps every segment at its natural width and never cuts a label: where the
segments do not fit its room (five at 320) the track scrolls sideways with no indicator, and the
chosen segment scrolls into view on mount and on change.

A segment given an `href` and no value is a link: the `Picker`'s segments are then the tabs of a place, each
`{ label, href }`, with no `value` and no `onChange`. The one whose `href` is the route's path (the pathname
expo-router reports) or its nearest parent is the chosen one, and a press opens its `href`. The
`Toolbar` draws no tabs on the phone.

A line that appears in flow (a blocked act's reason, a field's error, the OTP checking line, a
message input's notice, a stage's moment) fades in on `fast` (`lineIn` in `lib/motion`, the
`entering` of a `FadingText` or `FadingView`) and pushes what follows at once; it leaves at once,
and where a line's room is already held (a form bar's kept line) only its words fade in. A block
(a `Banner`, a docked sheet, a folded body, an answered field, an option's children, a chip, a list
row, a rule, an attachment) that the viewer's act adds or takes out lands at once, what follows
with it: an app's own act that adds or removes a block sets its state and draws nothing for it. A
block that arrives on its own (a row the server pushed, a fact that appeared after the first draw)
fades in on `base` (`blockIn`) and pushes what follows at once; what the first draw held does not
fade.

A value that changes while shown moves by transform, never by a size. A bound `Stats` cell, `BarChart`
and a `Gate`'s step count draw it: a fill is the full track scaled from its start (a bar from the
baseline) on `slow`, a stacked bar's parts lifted over one another, a meter's tick travelling, and a
rescaled axis moving every bar together while its tick labels cross-fade. A figure (a count,
`Stats`, a meter's share, a chart's total, a file's counts) rolls on `fast` when its data changes: the
old leaves and the new rises from the side the change went to, up for a larger number and down for
a smaller one. A mark (a status dot, a stage's mark, a file's seen glyph, a copy act's check)
cross-fades with a scale from 0.6. None of it plays when a figure or a mark first arrives, and a clock's tick
switches at once. The components
carry all of it (`useValue` in `lib/motion`, `Roll` and `Swap` in `lib/swap`): add no animation of
your own to a fill, a figure or a mark, and every rung follows the system's reduced motion.

A push and a pop are the consumer's `Stack` (the expo guide's root layout draws one, its place
screens with no animation of their own); a place's root fades in on `fast` as it mounts
(`placeIn`). A message that
arrives at the end of a log rises a `gap` as it fades in on `base` (`streamIn`), the Latest act
rising in on `fast` (`latestIn`) and falling out (`latestOut`).

What a finger carries follows it 1:1, with no easing, and only its release eases. A `Toast` follows
a swipe toward the inline end (`useSwipe` in `lib/follow`, a pan from `react-native-gesture-handler`
that fails on a vertical pull) and a bottom `Sheet` follows a pull down on its head (gorhom's own
drag); past the reach (40% of the screen's width or the sheet's height) or flung (0.5 px a ms) the
release leaves, else it settles back on `base` `out` (the sheet's `animationConfigs` once it has
settled open). Add none of it by hand: a part you draw that a finger should carry takes `useSwipe`,
never an animation of your own, and the decision is `@fcalell/ui-core/follow`'s. Under the system's
reduced motion the finger still leads and only the release snaps.

A waiting screen is the loaded tree, never a second tree: a page's outline
comes from its route and its data fills it. A `Section` stands whatever its data holds and draws its
`empty` when there is none, never gated on the data's length; a block that stands only with its data (a
Banner) stands where it reads best, and what is under it moves once when it arrives:
the shift check reports that move and fails any other.

## Words are the config's, sentences are props

A word a component draws on its own comes from `nativeUi({ words })`, read with
`useWords()` from `@fcalell/plugin-native-ui/lib/words`; every sentence is a prop.

## A text prop takes one of four sizes

Every string prop's doc ends in the size of text it takes and what the component does past it. The
sizes are fixed, the same as on the web:

| Size | Is | Past it |
| --- | --- | --- |
| a word | one word: a state, a unit, a figure's noun | a slot that bounds it (a chip, a row pick's value) holds the short measure, 20 characters, and truncates |
| a short phrase | a few words on one line: a title, a label, a name | takes the room its line leaves, then truncates with an ellipsis, or wraps where its doc says it wraps |
| a sentence | one sentence, in a slot built to wrap: a description, a banner, an empty state, an error | wraps |
| text | running content of any length: markdown, a message body, code | wraps whole |

A component cuts or wraps past the size and never grows its slot, so a sentence in a word slot is
cut or crowded: a sentence as a chip's `label` loses everything past 20 characters, a sentence as a status's `label` crowds its line and truncates when the line is out of room, and a sentence as a labelled row's
`title` wraps whole under its label. Give a slot the size its doc names,
and put a sentence in the prop that takes one (`description`). A string that is an identifier cuts in
its middle, keeping its start and its end: a `{ code, copy: true }` title of one word over eight
characters, and a title or a meta that is one `{ code }`. A string that is no text (an `href`, a
`src`, an id, a key, a file name, an Intl unit) is documented by what it is.

A word no line can break (a 300-character token, a URL) never pushes a row past the edge. React
Native's text does not shrink in a row, so each `Text` that stands in a `flex-row` decides: `shrink`
(`flex-1`, `min-w-0`) where its words may be long, `shrink-0` where it is a figure or a stand-in
that must hold; a unit, a slider's output and a chart's tick also carry one line and the short
measure.

## The app's `ui/`

A shape that needs the app's nouns (`ProjectRow`, taking a `project`) lives in `ui/`, composes
roster components only, never a host with a look, and reads no data.

## What the roster lacks

A shape no component owns, or a look its props cannot express, takes the nearest shape the roster
draws: another component, a plainer layout, a nicety dropped, named as a known limit. Only a bug,
or a part the screen cannot ship without that no composition delivers, is a gap
(`node_modules/@fcalell/cli/guide/gap.md`). Never a call-site class, a wrapper that re-adds
a look, a local copy of a stack component, or a host carrying tokens.

## Done

`pnpm check` passes; the screen is checked on a device or simulator, light and dark.
