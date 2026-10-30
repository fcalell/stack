# Rules for the web UI

Every app `.tsx` follows these rules. The design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`; cells, states and tokens in ui-core's `DESIGN.md`)
plus the app's own `ui/` directory (any `ui/` path segment); everything else composes components
and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the frame (`Shell`, `Pane`, `Gate`),
the rhythm (`Section`), the row (a `Section`'s `items`, a `Form`'s fields), the
control, the text role (`Text`). A host element that rebuilds one of these is drift. A composed
region is data its molecule renders, never nodes. A shape no component owns takes the nearest one the
roster draws, the compromise named; only a bug, or a part the screen cannot ship without, is a gap
(`node_modules/@fcalell/cli/guide/gap.md`).

A page is its `Pane`s in order, each deeper one a step into what the one before it lists. The
`Shell` draws the place that holds them and reads none of them, so a route renders its `Pane`s and
no place of its own; each `Pane` draws its own bar and body:

```tsx
<>
  <Pane title="Agents" actions={[newAgent]}>…</Pane>
  {open && <Pane title="Stead" back={agentsRoute}>…</Pane>}
</>
```

`back` is the route the `Pane` returns to. Absent, it is the parent route the router gives: the
nearest ancestor in the route tree whose path differs from the page's own and that is a page itself (it
has an index route, or no children). Where the router cannot give one (the top of the tree, or routes
off) the `Pane` draws no back act. Give `back` only to override it, and `back={false}` for a `Pane` that
returns nowhere (a place's first `Pane`, which the sidebar leaves). It draws as Back where the `Pane`
stands alone (below `tablet` of the place, first standing in it, a `Pane` folded away before it standing
nowhere, or covering it) and as Close, at the bar's end,
where another `Pane` stands before it. An open record is a `Pane` after the list, its parent the
list's route; a read inside a `Pane` that answers not found leads to that `back`.

The `Shell` takes its data as the rest of the roster does: a switcher's `options` and `value`, and a group's `places`, are constants or selections. While a selection waits the switcher paints its avatar and name and keeps its chevron, a group draws its label over painted place rows, all inert; a value no option matches, or a read that ended, draws the switcher with no name, never its own label as one. A `Gate` stands its `Button`s in `acts`, one line under the body, the primary first; the body stays for prose.

The shape of a page is its `Pane`s. A list and the record it opens are two; with nothing open the
list's `Pane` is the last and takes the room. A record the open record links to is one more `Pane`
after it, and what a record's details held is a deeper `Pane`, never a sheet. A page pushed over the
current one (a form, a step) is a `cover` `Pane` (its `back` the parent route unless overridden). A `Pane` that opens from a press in
another takes the keyboard on its first control, so the next Tab is not the list's next row. A record's
`Pane` puts where the record lives (`record.within`) in its bar before the name, a slash apart, on the
desktop; on touch the bar holds its back act and the name alone, so a name is never cut to a few letters
(the bar's name standing only once the head's has scrolled up under the bar, so it never repeats the name cut; a browser without scroll-driven animations keeps it standing),
and the place leads the record head's overline instead: give it once, in `within`, never again in `overline`.

The first `Pane`'s `title` is the page's name at every density: a place that draws one section of
a larger area titles itself with the section's name (`Repos`, not `System`), which the sidebar item
or the tab carries; the app never picks another title for the phone. A `Section` with `items` and no `title` standing
directly in a `Pane`'s body stands a page inset under the bar's hairline, where a titled `Section`'s
title stands a gap over its body: the `Pane`'s title is a bar over a hairline, the section's a line of
the body, and a list that should read as a section's own wants a `title`.

A `Pane`'s body is a two-column grid: every `Section` and `Form` in it passes the columns down to its
rows, so the labelled rows of one `Pane` share one label column, as wide as the widest label; a
labelled value with a description beside a pick or a switch keeps the description at the short
measure at least, and stands the control under it at the line's end where both do not fit. A
`Pane` whose body is one filler, a `Thread` or a `Canvas`, takes `fill`: its body is then a flex
column that gives the filler the free height, and its Sections keep their own label columns. The
`Pane`'s own failed, missing and empty forms fill the body without it.

## One `Button`, one `Input`, one `Switch`

A `Button` is every act: labelled it runs `onAct`; with an `href` it is a link (an anchor in an act's
look, or with no `act` in accent ink, `fit="inline"` for a run of a line of text); with `glyph` it is
the icon alone, its `label` the accessible name and the tooltip. An `Input` is every typed or picked
value, chosen by `kind`: a line of text (`text`, the default, `search`, `secret`, `source`, `number`,
`email`, `date`), `prose` for many lines, `code` for a one-time code, `file` for a file. A `Switch` is every
boolean. A choice among others in a `Table` or a list is the owner's selection,
never a control the screen places.

Every control is a field and takes its `label`; no screen draws a control's name itself. Placed
alone (in a `Card`, a `Sheet`'s body, a `Gate`) an `Input`, a `Picker` at its field fit, as a list
or as choice segments, a `Switch` and a `Slider` draw their field: the label over the control (a
switch at the end of its label's line), the word `optional` under the label with `optional`, and
`description` or `error` under the control, where a refused save's reason also stands until the next
change. `error` is a sentence, words or runs (`["No package at ", { code: "packages/lead-mail" }, "."]`),
so a machine name in it stands boxed in the mono (voice 7). A `Form` draws its own fields from their `label`s, and a `Toolbar` names its acts, so a
control there draws nothing around itself; nor does a `search` or a `Picker` at the `bar`, `row` or
`pill` fit, which reads its label in its box. A label is never a `Text` over a bare control, and a
`Section`'s title is the Section's, never its control's label. A list an answer picks from heads as
every other Section does: the `Section` is titled and its body is one `Picker` with `fit="list"` and
`headed`, which draws no field, the title naming it and the Section's `description` describing it
(`<Section title="Concerns" description="…"><Picker fit="list" headed label="Concerns" … /></Section>`;
`label` is the list's accessible name, the title's words, and a `headed` list takes no `description`,
`optional` or `error` of its own).

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

## A route act is a link

A labelled act that goes to a route is a link, not an `onAct: () => navigate(route)`; the check
flags an act whose `onAct` only calls `navigate(...)` (`no-navigate-act`). An act that does work first
and then goes to a route is not a link: it carries `to`, below. Wherever a host
takes an `Act` for a labelled act (a `Banner`'s, a `Toast`'s, a `Canvas`'s,
an `empty`'s) it takes a `LinkAct`,
`{ label, href }`, and a menu (a `more`'s entries) takes `{ label, href }` as an entry; so do a `Pane`'s `actions` (`IconLinkAct`), a Section's `empty` act, a band's and a row's icon act, and the act of a `Picker` or the shell's switcher ("New organization"). It is
drawn as an `<a href>` in the look of the act it stands for (the hairline Button; quiet in a
`Banner`; the outlined button under its sentence in an `empty`), so a new tab, a copied link and a middle
click work, a plain click opens the route through the router, and a rest on it preloads the route
like any anchor. It runs nothing: it never pends and has no `destructive` or
`quiet`; with a `blocked` reason it draws inert and gives the reason, as a blocked act does (a link whose page is missing); in a `more` menu it is a link entry. An act beside a heading or a title, or at a row's end, is an icon act (`IconAct`, or `IconLinkAct` for a route): a `Section`'s and a row's `act` take nothing else, its words standing in its tooltip and accessible name. Acts that stand side by side fold by one rule, never by the room: the first stands and the rest stand in the more menu, in their order, at every width. A `Pane`'s first `actions` entry stands at its icon and the rest lead its `more`, the act named More and its sheet on touch titled by the Pane's title (a record's name); a row's `act` is its one act and its others are its `more`, its sheet titled by the row; a selection bar stands the first of choose-all and clear that applies. Put the act used most first. A
A `Sheet`'s submit, an `ActionBar`'s and a `Form`'s bar act, a `Rules` add, a table's `select` acts, an `Input`'s act and a
`RowEntry`'s act stay function acts: each runs something over the surface it stands on (the task, the
selection, the typed value) or must pend it, which a way to a route does not.

## A record's decision is an `ActionBar`

Acts that stand together at the end of what they decide (a record's Approve and Decline, a step's
Back and Continue, a pane body's Discard and Save) are one `ActionBar`
(`@fcalell/plugin-react-ui/components/action-bar`), never `Button`s the screen lines up: `acts` in
reading order, the one filled act last (a `destructive` one draws it `danger`).

```tsx
<ActionBar
  acts={[
    { label: "Decline", onAct: () => decline.mutateAsync({ id }), destructive: true, confirm },
    { label: "Approve", onAct: () => approve.mutateAsync({ id }), done: "Approved" },
  ]}
/>
```

At its default `fit: "end"` the acts stand at their own width at the end of the line, the filled act
last, wrapping to a further row only when the line cannot hold them; `fit: "full"` stacks them across
the column at the field's height, one a row and the filled act first, at every density (a `Gate`'s
form, a page outside the shell). On touch both stack the acts so. The bar holds its acts' run: while one act's `onAct` pends the others are inert,
a rejection stands in the bar's line under the acts with the act ready again, and a blocked act waits for
a touch: inert and silent until it is pressed, or until its form or sheet has taken input, then its reason
stands under the acts (beside them on the desktop at `end`).
`pending` (a `PendingBar`'s `sentence`, and its `until` and `act`) stands the server's work in the
bar's place at the bar's height. A `Form`'s `submit` and `acts`, a `Sheet`'s foot and a `Table`'s
`select` draw this bar themselves; give a bar of your own only where no form, sheet or table stands.

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
| a string | a line of text (`control: "mono"` the line in the mono, `Input kind="source"`, for a machine name a person types: a path, a host, a flag, an identifier, so the value reads as the issue under it quotes it (voice 7); `"prose"` many lines, `"source"` many lines in mono, `"code"` the one-time code boxes (`Input kind="code"`, as many as the schema's fixed length: `z.string().length(n)`, else the field throws naming its key; the submit stays blocked until every box is filled), `"date"` a date line; a `format: date` string is one already) |
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

A `Sheet`'s own `submit` stands in its foot after the body, so it follows the fields it submits: after
Cancel on the desktop, alone on touch, where the close act leads the head. A `submit` with no `onAct`
(`{ label: "I saved them" }`) acknowledges what the sheet shows: its press closes the sheet, and no
Cancel stands beside it.

## A `Section` never stands in a `Section`

A `Section` never stands in a `Section`, and its title is one size (the heading) everywhere, a
sheet's body and a fold included: a parted page is `Section`s in a `Pane`, a parted form is `groups`.

## Collections take data

A collection takes its rows as data: a `Section`'s `items` are rows (a row item or a
file), built from the records by one `toRow` function, and nothing public draws a single row. Give
`items` the selection mapped to rows, or an array for a constant collection; a titled `Section`
stands over its sheet, an untitled one is the sheet alone. A row with a `label` is a fact (`{ label, title }`: the label in the meta ink in a column as wide
as the widest of the Pane, the title its value, `meta` its description; `wrap` where the value must stand whole), so facts are one `Section` of
labelled rows; `lock` names why a row cannot change (a row's marks, its `status`, `warning`, `lock`,
`chip` and `marks`, lead its meta line under the title, so a row with one is two lines at every
width, except in a room place, where a row whose only mark is a `status` is one line with the status
after the meta at the end group's start; a line the marks and parts wrap to starts under the status's
word, its dot hanging before the line), `title: { code, copy: true }` is a copyable
identifier (cut in its middle where it is too long for its room; with `wrap` whole on as many lines as it
takes, breaking anywhere, as a fingerprint must), and a part that is no row (a `Slider`) stands in
a `Card`. The count beside a titled `Section`'s title is its loaded rows' and is a list's: a `Section` whose
body is `children` (cards, controls), or whose every row has a `label` (facts, a definition list), draws
none, whatever its `read` holds. A field that holds one thing (a unit, a file) is a value, no list: give
its `Section` the row alone, `items={toRow(unit)}`, not in an array, and its head draws no count.

The rows of one sheet share one `leading` kind or none, so their titles share one start: an avatar, a
glyph, a type's mark and a tick stand in one slot at the avatar's size, a status in its dot's room, and
a row with no `leading` reserves none (voice 9), so its title stands where the others' marks do. A
`leading: { status }` is for a list whose every row has a state; where only some do (a sensor among
lamps), the state is the row's `status`, leading its meta line, and the leading is a kind every row
has (a glyph) or none.

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

`Row` is `import type { Row } from "@fcalell/plugin-react-ui/components/section"`.

A `Table` that acts on rows takes `choose` (`chosen`, the ticked ids, and `onChange`, which hears the set a tick
makes: apply your rule to it and return the ruled set through `chosen`; `blocked` and `moved` read a row's reason
from its item) and, for the acts, `select: { acts }`. The table then draws the selection bar itself, docked as the
foot of the `Pane` it stands in (a table with `select` stands in one, and throws outside one): "N of M chosen"
over a deselect-all act and, below `tablet`, a select-all act (`of` counts the rows that can be ticked; `choose.noun`,
a plural word, names them: "N of M promotable chosen"), at the table's own width and start, then
your acts, whose `blocked` reasons you read off your own `chosen`. A docked `sheet` takes the foot over while it
is open. `Pane`'s `foot` is for a `Thread`'s composer. A `Thread` that fills its `Pane` (`fill`, the
body's one filler) stands its composer at the foot itself; one standing among a `Pane`'s sections (in a
`Section`, as an ask box on a list) keeps its composer under its log on the desktop, and on touch hands
it to that `Pane`'s foot, above the tab bar, its docked `sheet` with it, so the field stays in reach
however long the list. Give the `Thread` its `composer` either way; a `foot` the `Pane` is given comes
first.
A row that is simply not editable in place is `row: { editable: () => false }` (its cells draw plain); `locked`
is the hold of an open change set and draws the lock. A `chip` column's `cell` returns the label (on the column's
`family`) or `{ label, family }` for a hue of its own.

A record that is not there is the `Pane`'s own `read` answering not found, never a Pane's or a
Section's `empty`: the `Pane` fills its page with the missing form, an empty's one form (voice
decision 15): the sentence in the meta ink over the `Pane`'s `back` as an outlined button, both
centred. Give the `Pane` a `noun`
(`noun="project"`) and the sentence names the kind: "Couldn't find this project."; without one it
is "Couldn't find this.". An `empty`'s act stands the same way. A frame says "This didn't load." with
Retry whatever failed, and takes no sentence of its own.

## A picked file's `src` is revoked by you

A picked file's `src` is a local address to draw it from before it is uploaded. On the web only
a `Thread`'s `composer` sets it, as an object URL for an attached image (a `file` `Input`'s file carries no
`src`), and it stays until you revoke it (`URL.revokeObjectURL(file.src)`) once you drop the
attachment.

## A code a camera reads is a `QrCode`

A code another device scans is a `QrCode`, never a picture of one: `value`, the text it carries
(an address), and `label`, what it is for ("Code that adds a device"), its accessible name; the
text is never drawn nor read aloud. It draws its modules dark on a light tile in both modes, inside
a four-module quiet zone, a square at its container's width down to the image cap and centred, so
it is never cropped. Its `value` is a constant or a selection, which paints the tile at that square
until its read lands. It takes no press: stand the address beside it as a `Code` with `copy`, the
way in for a device with no camera.

```tsx
const invite = orpc.devices.invite.read();

<QrCode value={invite.at((i) => i.url)} label="Code that adds a device" />
<Code text={invite.at((i) => i.url)} copy />
```

## A region that reads is a frame

A region that reads is a frame. Give a `Pane`, `Section`, `Sheet` or `Form` (or one of a form's groups) its `read`: a read (`orpc.deploys.get.read({ id })`), a selection of one (`deploy.at((d) => d.steps)`) or a `combine` of several. A frame holds one read: the one read of its selection that no enclosing frame holds and that is not quiet. A Section given a selection of the read its Pane holds draws nothing of that read's state (its title too may be such a selection, a `Datum` painted while it waits, for a Section titled by its record), and a second held read in one frame is a dev error naming both keys, so a region that draws two reads is two frames and a leaf that needs both takes `combine`. `or` is for enrichments only: `names.or("a board")` falls back quietly and never fails a frame, so it serves a name, a badge or a lane order, and a read whose rows, options, facts or text are drawn is never `or`. Sibling regions that draw one read each hold it and each fail in place, while its refetch draws one busy mark, beside the first of them; a repeated line is accepted, and a read is never lifted into a frame around its siblings. A frame draws the failed form when its read fails, the missing form when it answers not found, and its `empty`, a `{ sentence, act? }`, when its own read is an empty array, `null` or `undefined` on real data; a frame with no read has no `empty`. A failed Pane is the whole page with Retry as its one act, and a missing one with its way back (beside another Pane, its Back in place of the bar's Close): its bar draws none of its `actions` and no more menu, but its foot and docked sheet stand, since they answer to their own reads; a record's bar, failed or missing, keeps the record's place (no slash after it) and the way back. Acts paint by their own datum: a constant act is always live, and an act given as a selection paints while its read waits, stands still with no sentence when its read is not asked for, and is blocked once its read ended, with the failed sentence (`words.missing` when missing). A collection (a `Section` with `items`, `Table`, `Thread`, `BarChart`, `Table`, `Canvas`, `Diff`) and an option control (`Picker` at any fit) given a selection show their own read's state in their own box, whatever stands above them. A form's field hosts its control's save, so a refusal draws in the field's line (a control standing alone toasts it), and a form's bar waits only on the form's own read. No act queues offline: an act pressed with no connection is refused and draws the generic "That didn't go through." where its failure goes, the connection's reason being the offline banner's, and nothing is sent later. A held read that waits for a connection (paused) draws "Waiting for a connection." under the frame's heading row with nothing to press, over its data when it has some; with no data, or not asked for yet, the frame stands still: its loaded form painted and inert with that line over it and no sentence of its own, never the line alone and never painted rows with no line, and nothing breathes (`data-still` on the frame's box, a collection's own box too). A `Pane` stands for a read the app holds itself (a session id that decides what its body draws) only when it is given that read: a Pane with no `read` draws nothing of any read's state. A read held by the app's own `useQuery` is not a frame's; that region draws its states itself.

A waiting screen is the loaded tree, never a second tree: a page's outline
comes from its route and its data fills it. A `Section` stands whatever its data holds and draws its
`empty` when there is none, never gated on the data's length; a block that stands only with its data (a
Banner) stands where it reads best, and what is under it moves once when it arrives:
the shift check reports that move and fails any other. A waiting `Canvas` is its bare surface: the dotted ground and its zoom stack, no node, since a
graph has no geometry before its data.

## An act holds its run

Every act's `onAct` returns the promise of the work it starts: `onAct: () => save.mutateAsync(v)`,
never `mutate()`. The act renderer holds the run, so the app passes no `loading` and reads no
`isPending`.

What happens around the work is the act's data, never code beside it. An `Act` carries, beside
its `label` and `onAct`:

- `confirm: { title, sentence }` is asked first, as a decision over the page whose act wears the act's
  own `label` and `destructive`; declined, nothing runs. The app calls no `confirm()` or `ask()` for an
  act it draws (`confirm()` stays for a decision no act starts).
- `done: "Saved"` is a sentence toasted once `onAct` resolves; a rejection toasts the error's sentence as a
  failed toast, as it does without it. `toast()` is for what no act started.
- `to: route` is gone to once `onAct` resolves and `done` is toasted, through the router a `LinkAct`
  goes through: `async () => { await remove.mutateAsync({ id }); navigate("/deploys"); }` is
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
form's or sheet's bar, a `Section`'s head, band, rows and empty form, a `Pane`'s bar, a
`Banner`, a `Toast`, a menu, an `Input`'s or `Picker`'s act, a `Sheet`'s submit) runs it, so the
sequence is the same wherever the act stands. An act that needs another order (a toast before a
confirm, two sheets) has no form: file the gap, hand-wire nothing. A retry after a failure runs the
work again (`onAct`, `done`, `to`), not the confirm.

A sheet that no act opens (a deep link, a row that opens its record's sheet) is addressed by the
route: a `sheet` search param (`?sheet=invite`) the route reads with the router, its `open` the param's
presence and its `onClose` clearing it. The app holds no open flag for it.

## Words are the config's, sentences are props

A word a component draws on its own comes from `reactUi({ words })`, read with
`useWords()` from `@fcalell/plugin-react-ui/lib/words`; every sentence the app shows is a prop.

## A text prop takes one of four sizes

Every string prop's doc ends in the size of text it takes and what the component does past it. The
sizes are fixed:

| Size | Is | Past it |
| --- | --- | --- |
| a word | one word: a state, a unit, a figure's noun | a slot that bounds it (a chip, a row pick's value) holds the short measure, 20 characters, and truncates |
| a short phrase | a few words on one line: a title, a label, a name | takes the room its line leaves, then truncates with an ellipsis, or wraps where its doc says it wraps |
| a sentence | one sentence, in a slot built to wrap: a description, a banner, an empty state, an error | wraps |
| text | running content of any length: markdown, a message body, code | wraps whole |

## The app's `ui/`

A shape that needs the app's nouns (`ProjectRow`, taking a `project`) lives in `ui/`, composes
roster components only, never a host element with a look, and reads no data.

## What the check enforces

`pnpm check` fails the lint rules on the app's own sources (the directory its routes sit in);
`stack generate` writes them into `.stack/biome.json`, which the app's
`biome.json` extends. The rules are `LINT_RULES` in `plugins/react-ui/src/node/lint.ts`, each a
`plugins/react-ui/lint/<rule>.grit` whose header states what it forbids. The rest stays a rule a
reviewer holds.
