# Rules for the phone UI

Each phone `.tsx` obeys these rules. Its design system is the roster
(`node_modules/@fcalell/ui-core/src/roster.ts`, web prop names; cells, states and tokens in
ui-core's `DESIGN.md`) plus the app's own `ui/` directory (any `ui/` path segment); the rest
composes components and never restyles them.

## Pick the component first

Find the roster component that owns the shape: the frame (`Shell`, `Place`, `Screen`, `Split`),
the rhythm (`Section`, `Group`, `List`), the row (`ListRow`, `DefinitionRow`, `FormField`), the
control, the text role (`Text`). A `View` rebuilding one is drift. A `Split` is its page's frame region: it stands as
the bleeding `Place`'s (or `Screen`'s) direct child, never inside a component of the app's,
since the page reads its props for its head's back and Details acts; deeper it draws as a plain
region and no head draws them.

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
the molecule that owns its role (`title` is `Place`'s and `Screen`'s, `heading` `Section`'s); colour
comes through a component's props.

## A picture is an `Image`

A picture is an `Image`, never React Native's: `src`, `alt` (a sentence naming what it shows), a
`fit` (`thumb`, a square tile beside the lines that say where it came from, or `content`, the
container's width at the picture's own aspect, capped in height) and `loading`. It draws its own
waiting and failed forms (the failed form says the `alt`), and a press opens the full picture in a
modal over the scrim with a Close act, the system's back and a press on the scrim. The full view
takes no pinch-zoom.

```tsx
<Image src={shot.url} alt={shot.title} fit="thumb" loading={shot.pending} />
```

## Data, never nodes

A composed region is data its molecule draws: an `Act` (`{ label, onAct, destructive? }`),
an `IconAct`, a row's `StatusMark` and `ChipMark`, a menu's `MenuItem`s, a `PlaceSpec`, all from
`@fcalell/ui-core/descriptors`. An icon is an `IconName`, a Lucide glyph's PascalCase name.
`children` is open only where the roster gives it. A `Form`'s `ActionBar` filled act runs its
`onAct`, the form busy while it pends. A `FormField` takes a `FieldBinding` from the
app's own form state; a `confirm()` takes a `Confirmation`.

A row's next step is its `act`, one labelled `Act` at its end ahead of the more menu (an act the
row waits on keeps its pending press there, never also in `more`). An input on a row is its
`entry`, a `RowEntry` (`label`, `field`, `placeholder`, `act`, `error`) standing under the title
in the meta line's place; once its act settles, give the row `meta` or `status` instead of
`entry`. A `List`'s `row` map declares `act` and `entry` only if every item fills them.

Rows of inline terms (a mapping of sources to targets, a filter's conditions) are `Rules`, each
rule a card of stacked terms: each `Rule` is `{ id, terms, onRemove? }`, its `terms` a pair
(`{ from, to }`) or a condition (`{ field, operator, value }`), each term a `RuleValue`, one of
`{ pick }` (an `OptionPick`), `{ picks }` (a `MultiPick`, the chosen values as removable chips)
or `{ either }` (an `EitherPick`: a picked option or a typed value, `{ picked }` or `{ typed }`,
with a way back). `add` is the act that ends the list. A pick of several outside a rule is a
`Picker` given an array `value`.

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
cell from the item by `cell`, and `row` gives the row's `id`, `href` and `locked`. It draws its
states itself, with no `QueryBoundary` around it.

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
`author`, `name`, `body`, `at`, `onOpen`, `detail`), each reading only its item, since a message
draws again only when its item changes; its `MessageInput` stays the `foot`. In a
`Place`'s body, or in a `Split`'s `main` under the record's `ItemHeader`, it fills what holds it:
its log scrolls and the input docks at the foot. It stands there as the body's direct child, or
as `main` (in a fragment under the record's `ItemHeader`), never inside a component of the
app's, so the frame knows it from its first render. What a
system line names stands under it as its `detail`, a `MessageDetail`, exactly one of: a `row`
(a `ListRow`'s slots, in a hairline card, opening its record), a free act's `code` under its
verb, or a `fold` of lines the line opens in place; never a `ListRow` or a `Code` between the
messages.

A field that stays in view while a `Place`'s sections scroll under it (an ask box over a
home's sections) is the Place's `foot`: it docks at the Place's bottom, above the tab bar on
touch. A Place takes a `foot` or an `act`, never both, since each holds the screen's filled act.
A `Thread` in a Place with a `foot` stands among its sections, inline, its `foot` left empty.

A `BarChart` takes data the same way, its `bar` map reading each item's `key`, `label`, `value`,
`parts` (by its declared `keys`) and `at`; its failed and empty forms stand at the chart's height.

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
