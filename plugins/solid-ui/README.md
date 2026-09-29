# @fcalell/plugin-solid-ui

The SolidJS half of the stack design system: the roster `@fcalell/ui-core` pins, rendered with
Kobalte and Tailwind v4, and the CLI plugin that wires it into a consumer's `stack dev` /
`stack build` flow: the stylesheet, the fonts, the words, the providers, the geometry gate.

## Install

```bash
pnpm add @fcalell/plugin-solid-ui
```

Peer dependencies: `solid-js ^1.9`, `@tanstack/solid-form ^1.28` (optional). `plugin-solid` and
`plugin-vite` must be listed alongside (`stack init` adds them when you pick the design system).

```ts
// stack.config.ts
import { defineConfig } from "@fcalell/cli";
import { solid } from "@fcalell/plugin-solid";
import { solidUi } from "@fcalell/plugin-solid-ui";

export default defineConfig({
  app: { name: "my-app", domain: "example.com" },
  plugins: [solid(), solidUi()],
});
```

## Config options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `theme` | `Theme` | the calibrated defaults | The ui-core contract, flat knobs: `accentHue`, `neutralHue`, `neutralChroma`, `okHue`, `warnHue`, `dangerHue`, `primary` (`ink` \| `accent`), `space`, `radius` (0 squares everything), `text`, `elevation` (`soft` \| `flat`), `density` (`touch` \| `desktop`: `desktop` draws rows, controls and headers on a 32 px floor where the primary pointer is fine, and keeps 44 px on touch), `fonts` (`{ sans?, mono? }` family names), `widths`, `breakpoints`, `defaultMode` (a viewer with no stored choice starts in it, ahead of `prefers-color-scheme`), `overrides`. Every value resolves through `deriveTheme` and lands in the `@theme` block of `.stack/app.css`. |
| `words` | `Words` | English | Every word a molecule draws on its own, every key required: the six status words, `recommended`, `copy`, `copied`, `back`, `close`, `more`, `send`, `stop`, `attach`, `search`, `loading`, `retry`, `add`, `remove`, `duplicate`. Mounted into the generated entry as a `WordsProvider`. |
| `fonts` | `FontEntry[]` | `defaultFonts` (JetBrains Mono Variable) | The font files to load: each is preloaded and gets an `@font-face` with fallback metrics. Which family the contract binds to `sans` or `mono` is `theme.fonts`. |

```ts
solidUi({
  theme: { accentHue: 200, primary: "accent", fonts: { sans: "Inter Variable" } },
  words: { ...ENGLISH, send: "Envoyer" },
  fonts: [interVariable, ...defaultFonts],
});
```

The schema rejects an unknown knob, a hue outside `[0, 360)`, a fractional base, an unknown
width or breakpoint, a color outside the `oklch(L C H)` shape, a scale value that would break
out of its declaration, and a `words` object missing a key, naming the offender.

## The runtime

`createApp` (`@fcalell/plugin-solid-ui/app`) is the generated entry's mount: the router, the
query client, the meta provider, the error boundary and the consumer's icon set. The icon set is
`src/app/icons.ts`, a default export of `IconSet` (a name to a `lucide-solid` glyph, read by
`Icon`, a row's marks and the shell's places), imported by the entry when the file exists. The
composed providers (`words` among them) wrap the app. It mounts no `Suspense`, and no component
does: solid-query reads a query's data through a resource, so under a `Suspense` a refetch takes
the whole subtree out of the page for a tick, and focus with it. `QueryBoundary` and
`ScopeBoundary` draw what loads; a page whose code is still loading draws nothing in its place.
The router draws in the page column a `Shell` gives its place: the viewport's height on
`surface`, a flex column, no banner. So a `Place` or a `Screen` with no shell (a sign-in, the
viewer's own settings) fills the page from tablet up exactly as it fills the shell's column, and
a `Shell` fills it with its own frame.
`useWords()`
(`lib/words`), `useIcon(name)` (`lib/icons`), `toast(sentence, { state?, act? })` (`lib/toast`)
and `confirm({ title, sentence, act, confirmName? })` (`lib/confirm`) are the runtime hooks.
`createApp` draws the toast queue and the decisions at the app's root, so a page with no `Shell`
(a sign-in) shows them too; a `Shell` only places the toasts, over its column and above its tab
bar and any pinned bar. A toast's `state` (`done`, `attention`, `failed`) says how the act it
reports ended: a refused edit is `failed`, a finished one `done`; `useMutation` toasts a refusal
as `failed` and `useApiForm` toasts its `successMessage` as `done`.

A page names itself with `Title` (`@fcalell/plugin-solid-ui/meta`): `<Title>Projects · Acme</Title>`.
`createApp` hands the shell's static `<title>` (plugin-solid's `title`) to the meta provider, so the
static text is the base every page's `Title` overrides while it is drawn and returns to after.

`confirm()` asks a decision from anywhere and resolves to whether the act was taken: the app root
draws the first queued one as a decision sheet (the title, the `sentence`, the act; `act.destructive`
draws it as a destructive button), dismissing it declines, and focus goes back to what held it.
With `confirmName` the act stays blocked, its `blocked` reason under it, until the viewer types
`confirmName.value` into a `source` field labelled `confirmName.label`.

```tsx
import { confirm } from "@fcalell/plugin-solid-ui/lib/confirm";

const removed = await confirm({
  title: "Delete this project?",
  sentence: "Everything in it is deleted with it.",
  act: { label: "Delete project", destructive: true },
  confirmName: { value: project.name, label: `Type ${project.name} to confirm`, blocked: "Type the name first." },
});
```

`useApiForm({ schema, defaultValues, mutation, input? })` (`lib/api-form`) is a TanStack form that
submits through the API, toasts `successMessage` as `done` and puts the server's field errors on
their fields. Its `mutation` is what `useMutation` takes, `() => q.x.mutationOptions()`,
whose key names the procedure, so every successful submit invalidates the queries that read what
the procedure declares it writes, as any mutation's success does; `input` makes the procedure's
input of the form's values (`(values) => ({ projectId, ...values })`), and is required exactly
when the values are not that input. A call outside the API is `() => ({ mutationFn, writes? })`,
`writes` naming the entities it changes as a procedure's `writes` would
(`writes: ["organization"]` for a better-auth organization update), which invalidate the queries
that read them on success the same way. A better-auth answer fails or succeeds the submit as
`useMutation`'s does (below), and `onSuccess` receives its `data`. A field error, the server's or the schema's,
holds until that field changes, and the next submit sends again.
Its `bind(name)` is the field's `FieldBinding` (value, change handler, error), typed by the
form's data; a `FormField` given one as `field` draws the error and hands its control the rest, so
every control is one spread:

```tsx
const form = useApiForm({ schema, defaultValues: { name: "", type: "", values: [] }, mutation: () => q.fields.create.mutationOptions() });

<Form onSubmit={form.handleSubmit}>
  <FormField label="Name" field={form.bind("name")}>{(control) => <Input {...control} />}</FormField>
  <FormField label="Type" field={form.bind("type")}>
    {(control) => <Picker label="Type" options={groups} {...control} />}
  </FormField>
  <FormField label="Allowed values" field={form.bind("values")}>
    {(control) => <EnumInput {...control} />}
  </FormField>
</Form>
```

`bind(name, { commit: true })` makes the field autosave: its control's commit (the viewer left
the field or pressed Enter on an `Input`, having changed the value since focus; Escape puts
the value at focus back first) submits the form through its `mutation`, so a form that saves
per field has no save act. A pick applies at once, which is a `Picker` in a `DefinitionRow`
with its own `onChange`:

```tsx
const details = useApiForm({
  schema,
  defaultValues: { name: project.name, description: project.description },
  mutation: () => q.projects.update.mutationOptions(),
  input: (values) => ({ projectId: project.id, ...values }),
});

<Form onSubmit={details.handleSubmit}>
  <FormField label="Name" field={details.bind("name", { commit: true })}>{(control) => <Input {...control} />}</FormField>
  <FormField label="Description" field={details.bind("description", { commit: true })}>
    {(control) => <TextArea {...control} />}
  </FormField>
</Form>
```

`useMutation(() => ({ mutation, updates?, onSuccess?, onError?, errorMessage?, errorHandler? }))`
(`lib/query`) runs one procedure: its variables and its answer are read off `mutation`
(`q.x.mutationOptions()`), so the call site names no type. The procedure's declared `writes`
invalidate every query that read them, as every mutation's do; a `mutation` outside the API is
`() => ({ mutationFn, writes })`, and its `writes` (entity names, as a procedure declares them)
invalidate the same way after success on the default client; `updates` (up to four, each
`{ queryKey, updater?, onSuccessUpdater? }`) change cached queries in addition, never instead:
`queryKey` is the query's tagged key (`q.x.queryKey(...)`), which types `old` as that query's data,
a list or a single record alike; `updater` applies as the mutation starts and rolls back if it
fails, `onSuccessUpdater` applies with the answer, and an update that finds nothing cached leaves
the cache alone. A refusal toasts as `failed`, in the procedure's words or `errorMessage`.
A better-auth client call resolves `{ data, error }` instead of throwing: a refusal
(`{ data: null, error: { code, message, status } }`) fails the mutation as the `ApiError` of that
code and message, so it toasts in better-auth's words (a server failure, 5xx, as `errorMessage`)
and `onSuccess` never runs; a success unwraps, so the mutation's data and `onSuccess`'s argument
are the answer's `data`, typed so. Any other value, and a thrown error, pass as they are.

A `useQuery` outside the API (a better-auth read) records no reads from a response, so it declares
them as `meta: { reads }`, the entity names a procedure's `reads` would; a mutation's `writes`
then invalidate it as they do an API query:

```tsx
const full = useQuery(() => ({
  queryKey: ["organization", "full", organizationId()],
  queryFn: async () =>
    answered(await authClient.organization.getFullOrganization({ query: { organizationId: organizationId() } })),
  meta: { reads: ["member", "invitation"] },
}));
const remove = useMutation(() => ({
  mutation: () => ({
    mutationFn: (memberIdOrEmail: string) => authClient.organization.removeMember({ memberIdOrEmail }),
    writes: ["member"], // refetches `full`
  }),
}));
```

`answered` (`lib/refusal`) is the same unwrap for a query's `queryFn`: it throws a refusal as its
`ApiError` and returns a success's `data`.

```tsx
const setUp = useMutation(() => ({
  mutation: () => q.projects.update.mutationOptions(),
  updates: [{ queryKey: () => q.projects.get.queryKey({ input: { projectId } }), updater: (old, vars) => ({ ...old, ...vars }) }],
  errorMessage: "The change could not be saved. Try again.",
}));
```

`QueryBoundary` draws a screen's queries: `<QueryBoundary query={[pages, schema]} sentence="The pages
did not load.">{(data) => …}</QueryBoundary>` shows the loading form while any is pending, the
`EmptyState` with `sentence` and a retry act when one fails, and the children with `data()`, one
value per query in order.

With `auth` in the config the plugin generates `.stack/auth-client.ts`, the web auth client with
the flags the `auth` options imply. `SessionBoundary` (`lib/session`) guards a layout with it: the
children render with a session (better-auth's `{ session, user }`, never any other body),
nothing draws while the first answer is pending, and a viewer without a session (no body, or a
401) goes to `signIn` with the address they asked for as `redirect`. A check that failed any
other way, or answered with something that is no session, draws `sentence` with a retry act,
never the sign-in and never the children. An error its children throw that is a 401 (the api's
`UNAUTHORIZED`: a sign-out, an expiry, another tab signing out) re-asks the session and the
viewer goes to `signIn`; it never reaches the app's error boundary. A 401 while the session still
stands, and every other error, does. Its children read the signed-in user's id with
`useViewer()`; when the session ends (a sign-out anywhere, an expiry, another tab signing out or
in as someone else) the last scope that user left is forgotten. The children render for one
viewer: before they first read the query cache it is emptied if it was last read for another user
(kept per query client, since the sign-in between two viewers happens outside the guarded layout),
and a viewer changing in place draws them afresh over the emptied cache, so no query answered for
one viewer (their organizations, their role's rules) is read by another.

```tsx
// src/app/pages/(app)/_layout.tsx
import { SessionBoundary } from "@fcalell/plugin-solid-ui/lib/session";
import { authClient } from "../../../../.stack/auth-client.ts";

export default (props) => (
  <SessionBoundary
    session={authClient.useSession()}
    signIn="/login"
    sentence="The session check did not answer."
  >
    {props.children}
  </SessionBoundary>
);
```

`ScopeBoundary` (`lib/scope`) resolves a URL slug to a scope's row (see plugin-auth's Scopes) and
provides the chain to its children. It nests: a project boundary under an organization boundary
sends the organization's id with its slug. It draws nothing before the first answer; when the
slug changes (a switcher's pick) its children stay drawn on the previous chain until the next
answer, then read the new one in place. It draws `notFound` when there is no such row or the
viewer is no member; a 401 under a `SessionBoundary` is
the session's (above), and any other error reaches the app's error boundary. `useScope(scope)`
returns a row, defined for every child; `useMember()` returns the viewer's membership;
`useLastScope()`, under a `SessionBoundary`, is the signed-in viewer's "open where I left off"
address: `address()` returns the deepest scope a boundary last resolved for this user in this
browser (`/acme/projects/shop`, never a page under it), and `forget()` forgets it, for the viewer
deleting or leaving the scope they are in. It is kept per user, so two people on one browser never
read each other's, and it goes when the session ends (above). An address under a scope that
resolves nothing is never recorded, and a boundary that resolves to `NOT_FOUND` forgets the
remembered address when it is its own or one under it, so the next `/` falls through to the
consumer's next choice. A boundary on a route that passes through a scope rather than being a
place to return to (an onboarding step at `/onboarding/<org>`) takes `remember={false}`: it
resolves and provides the chain as any boundary does, and neither it nor a boundary above it
records an address while it is drawn.

```tsx
// src/app/pages/(app)/[org]/projects/[project]/_layout.tsx
import { ScopeBoundary } from "@fcalell/plugin-solid-ui/lib/scope";
import { project } from "../../../../../shared/scopes.ts";

export default (props) => (
  <ScopeBoundary scope={project} slug={useParams().project} notFound={<ProjectNotFound />}>
    {props.children}
  </ScopeBoundary>
);

// any child
const row = useScope(project); // Accessor<the project row>
```

`useAbility` (`lib/ability`) takes the organization explicitly:
`useAbility(() => useScope(organization)().id)`. `ability()` is deny-all while the organization's
rules load, which hides an affordance safely but reads as a denial; `ability.pending()` is true
exactly while those rules are fetched for the first time (false once they answered or failed, on a
background refetch, and with no organization), so a guard that acts on a denial waits for it:
`if (!ability.pending() && ability().cannot("create", "project")) navigate(...)`.

`@fcalell/plugin-solid-ui/router` is the router with the generated `routes` builders, plus
`useRouteParams(builder)`, `useSearch(schema)` and `useLeaveGuard(dirty)`; plugin-solid's README
(Use typed routes) shows them.

## The roster

Every component takes exactly the props below and closes `class`, `className`, `classList` and
`style` as `?: never`. A prop named `act` is an `Act` (`{ label, onAct, blocked?, loading?, spinner? }`)
unless it is a `Button`'s kind; `href` routes and `onOpen` opens; `loading` draws the molecule's
own three-row form. `Part` is a string or `{ quoted }`, drawn in typographic quotes.

### Atoms

| Atom | Props | Notes |
| --- | --- | --- |
| `Text` | `role`, children | the only way to set type; ink and family follow the role |
| `Icon` | `name` | from the consumer's icon set, sized by the role around it |
| `Button` | `act` (`primary` \| `secondary` \| `destructive`), `label`, `onAct`, `loading`, `spinner` (the busy glyph), `blocked` | a pill; `blocked` is the reason, under it once tapped or once its form or sheet has taken input |
| `IconButton` | `icon`, `label`, `onAct` | a circle at the floor; the label is read aloud |
| `Count` | `value` | a number in a pill |
| `Status` | `state`, `label`, `onOpen` | a glyph and the state's word; a chip with `onOpen` |
| `Chip` | `label`, `family` (`1` to `6`) | a data value's tag on its family's `chip-n` fill; the consumer gives each family of values one; no act |
| `Input` | `kind` (`text` \| `search` \| `secret` \| `source` \| `number` \| `email`), `value`, `onChange`, `onCommit`, `placeholder`, `unit`, `act` | `search` is a pill; `source` is mono, never corrected; `email` is `type=email` with the email keyboard and `autocomplete=email`, never corrected or capitalized; `unit` follows a `number`; `act` sits inside the field; `onCommit` hears the value when the viewer leaves the field or presses Enter having changed it since focus, never when unchanged, and with it Escape puts back the value at focus |
| `TextArea` | `kind` (`prose` \| `source`), `value`, `onChange`, `onCommit`, `placeholder`, `budget` | `source` is mono; `budget` draws a word counter; `onCommit` as `Input`'s on leaving the field, Enter being a new line |
| `InputOtp` | `length`, `value`, `onChange`, `onComplete`, `loading` | `length` boxes over one input (`inputmode="numeric"`, `autocomplete="one-time-code"`), so a pasted or suggested code fills every box; the arrows move between boxes and a digit on a filled box replaces it; `onComplete` hears the full code; `loading` holds it read-only while the code is checked, keeping its focus; it takes focus when it is drawn unless the viewer is in another element, so the code step a sent code opens needs no tap; inside a `FormField` it takes the field's id and error |
| `EnumInput` | `value` (`string[]`), `onChange`, `placeholder` | each value on a `source` cell with a remove act, then a `source` field that adds on its act or Enter; a value already listed is refused, `words.duplicate` under the field |
| `Slider` | `label`, `value`, `onChange`, `min`, `max`, `step`, `unit` | the value beside the label, in `unit` (an Intl unit identifier such as `percent`) |
| `Switch`, `Checkbox` | `checked`, `onChange`, `label` | the label is the hit line; with none, the `DefinitionRow` it is the value of names it by the row's label |
| `Spinner` | `kind` (`circle` \| `scramble`) | in the ink around it; `scramble` cycles mono glyphs and holds still under reduced motion |
| `Avatar` | `name`, `src` | initials on the ladder fill picked by the name |
| `Link` | `href`, children | inline |

### Layout molecules

| Molecule | Props | Owns |
| --- | --- | --- |
| `Place` | `title`, `actions` (`IconAct[]`, two shown, the rest under more), `act`, `more` (labelled `Act`s under the more circle), `bleed`, children | the large title, which wraps and is never truncated, on its own line under the switcher and the circles under tablet; the scroll, the floating act; `bleed` hands the body the whole box under the top bar with no inset, no measure and no scroll, for a child that pans and scrolls itself (a canvas) |
| `Screen` | `title`, `back` (a route), `actions`, children | the back circle, the compact title on scroll; covers the shell on the phone |
| `Split` | `list`, `main`, `pane`, `empty` | the columns from desktop, one slot under it; the pane pushes `main` narrower from desktop, or from wide beside a `list`, and folds over it under that; `empty` fills `main` from desktop while nothing is picked |
| `Section` | `title` (a part), `count`, `description`, `folded`, `onToggle`, `act`, `loading`, children | the label header, folding; a foldable one is a group, never a landmark, and `onToggle` reports its new state; a blocked `act` stays focusable and says its reason under the header once tapped or once its form or sheet is touched, as `Button` does |
| `Group` | `loading`, children | the group box with hairlines |
| `List` | `loading`, children | rows on the surface |
| `Form` | `onSubmit`, children | fields at `stack`, its bar in flow |
| `Toolbar` | children | one row of controls |
| `ActionBar` | children | pinned under a `Screen`, in flow under a `Form` or a `Sheet` |
| `Columns` | children | sections side by side from desktop |
| `Shell` | `places` (`PlaceSpec[]`), `banner`, `switcher`, children | the tab bar (its tabs at the side inset, at most five: past five places the first four and a `more` tab whose sheet holds the rest, drawn selected while one of them is), the sidebar, the toast queue, the `confirm()` decisions; the place whose route is the longest prefix of the address is selected, drawn `accent-soft` in the sidebar and read as `aria-current`; `switcher` (an organization or project switcher) heads the sidebar from tablet and starts each `Place`'s top bar under it |

### Shared molecules

| Molecule | Props |
| --- | --- |
| `ListRow` | `leading` (`{ icon }` \| `{ status }`), `title`, `meta` (parts, one or two lines), `trailing` (`{ age }` \| `{ count }` \| `{ value }`), `marks`, `act`, `more` (the row's `Menu` items, a more circle at its end beside what opens the row), `href`, `onOpen` |
| `DefinitionRow` | `label`, `description`, `value` (a string, `{ status }` or a control), `copyable`, `act`, `href`, `onOpen`; a `Picker` value stacks the row under tablet: the label and the description, then the picker across the row with the act at its end; a `Switch` or a `Checkbox` value with no label of its own is named by the row's label |
| `FormField` | `label`, `description`, `error`, `field` (a `FieldBinding`; then children is `(control) => …` and the error is the form's; an autosaving binding hands the control `onCommit`), children |
| `ItemHeader` | `overline`, `title`, `facts`, `loading` |
| `SegmentedControl` | `options`, `value`, `onChange` |
| `Sheet` | `open`, `onClose`, `title`, `description`, `back`, `submit` (`{ label, onAct, blocked }`), `foot`, children; the title names a typing control inside that no `FormField` labels |
| `Picker` | `label`, `options` (`Option<V>[]` or `OptionGroup<V>[]`), `value`, `onChange`; generic over its value `V`, read off `options` alone, so an enum's options pick that enum: a bound enum field is one spread with no cast, and a value or handler outside the options is a type error; no `value`: nothing selected, the placeholder, and `onChange` still hears `V`; a `null` option: the explicit empty choice, drawn as the placeholder is, in `ink-meta`, which makes `V` nullable, so a nullable enum field is the same spread and `onChange` hears `null`; in a `FormField` it takes the field's surface, label and error; a press on the open control closes its list |
| `Menu` | `label` (read aloud on its more circle, the sheet's title), `items` (`MenuItem[]`, or `MenuItem[][]` for groups under separators: `{ label, onAct, icon?, destructive?, blocked? }`); anchored under the circle from tablet, a `Sheet` under it; arrows, Enter, Escape, focus back on the circle; the more circle of `Place` and `Screen` is the same menu |
| `QueryBoundary` | `query` (one query or a tuple), `sentence`, children (`(data) => …`, an accessor) |
| `OptionList` | `options`, `value`, `onChange`, `loading`, children |
| `EmptyState` | `title`, `sentence`, `act`, children |
| `Toast` | `sentence`, `state` (`done` \| `attention` \| `failed`), `act` |
| `Banner` | `kind` (`note` \| `warn` \| `danger`), `sentence`, `act` |
| `PendingBar` | `sentence`, `until` (a `Date`), `spinner`, `act` |

### Content molecules

| Molecule | Props |
| --- | --- |
| `Prose` | `markdown`, `loading` |
| `Code` | `text`, `title` (a file's name, the tool the text goes into; the copy act sits in its row), `tail`, `copy`, `loading` |
| `Diff` | `hunks`, or `before` and `after` (two texts diffed by line, three lines of context), `loading`; one column at every width |
| `Table` | `columns` (`TableColumn[]`: `key`, `label`, `kind` (`text` \| `source` \| `number` \| `chip` with `family` \| `check` \| `status` \| `age`), `width` (a `widths` rung or `1/4` to `3/4`), `align`, `sortable`, `edit` (`{ control: "input" }`, `{ control: "picker", options }`, a `null` option clearing the cell, or `{ control: "checkbox" }`, typed by the kind)), `rows` (`{ id, cells }[]`), `selected` (the open row's id, on `accent-soft`), `onOpen(id)`, `onEdit(id, key, value)` (once per commit that changed the value, `null` for a cleared cell), `empty` (the `EmptyState` under the header), `loading`; a click or Enter edits a cell whose column has `edit` in place, Enter or blur commits, Escape cancels; the arrows move the focused cell, Tab steps across; 32 px rows under `density: "desktop"`, 44 on touch; under tablet the rows are a `List` of `ListRow`s from the same columns, as on native (the first column the title, the first `status` the leading glyph, the first `age` the trailing age, the rest the meta line), a tap opening the row |
| `FileRow` | `path`, `added`, `removed`, `seen`, `href`, `onOpen`, `loading` |
| `ProseDiff` | `before`, `after`, `loading` |
| `Comparison` | `rows`, `loading` |
| `Message` | `author` (`you` \| `other` \| `system`), `name`, `body`, `at`, `onOpen`, `loading` |
| `MessageInput` | `value`, `onChange`, `attachments`, `onAttach`, `placeholder`, `notice`, `working`, `onSend`, `onStop` |
| `Meter` | `label`, `value`, `max`, `meta`, `loading` |
| `BarChart` | `series`, `unit`, `loading` |
| `QrCode` | `value`, `loading` |

## The boundary

A class attribute lives only inside this package and a consumer's `ui/`; the geometry gate
(`@fcalell/ui-core/gate`) fails `stack build` on any other call site naming a class outside the
geometry vocabulary. A product's `ui/` molecule composes these molecules and never a host
element; a look the roster does not cover is a matrix cell in ui-core or a `ui/` primitive, in
that order. No component draws a sentence of its own: every sentence is a prop, every word is
`words`.

## How it works

`plugin-solid-ui` contributes typed values into the slots `plugin-solid` and `plugin-vite` own:
the Tailwind Vite plugin, the fonts plugin, the `MetaProvider` and `WordsProvider` providers,
the `.stack/app.css` artifact (`tailwindcss` imported with `source(none)` so only the consumer's `src`, this package's components and ui-core are scanned, contract tokens, two shadow utilities, the dark layer, the compact sizes under `(pointer: fine)` when `density` is `desktop`, a safelist
of the role and rung cells the matrices compose at runtime), the pre-build geometry gate, and
the home-page scaffold. `pnpm --filter @fcalell/plugin-solid-ui verify` reproduces every claim
above against the real plugin graph, a Tailwind build, and the roster.
