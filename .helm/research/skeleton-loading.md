# Skeleton loading: where a skeleton's shape comes from

2026-10-04. Feeds story 003-02 (`.helm/board/epics/003-stack-gaps/02-list-skeleton-leading.md`)
and the loading guide (`packages/ui-core/guide/screen.md` step 5,
`patterns/loading-and-pending.md`). It drains into them when the story ships; delete it then.

Desk research only: docs and READMEs as published on this date. Nothing was built.

## Verdict

Every mature system gets the skeleton's shape from one of five places. Each bends one of stack's
constraints, and one bend is shared by all of them. **No system knows a data-dependent branch
before the data.** Whether *this* note has a leading slot is decided per item, so before the
items exist the skeleton can only draw something declared or something faked. The question is
which bend costs least.

**Recommendation: declare the slots as data (family 4), the way `Table` already declares
`columns`.** A data-bound molecule takes the query and a per-slot projection:

```tsx
<List
  query={notes}
  sentence="The notes did not load."
  row={{ title: (n) => n.title, meta: (n) => [ago(n.updatedAt)], href: (n) => `/notes/${n.id}` }}
/>
```

- **Where the shape comes from.** The skeleton reads the keys of `row` (`leading`? `meta`?
  `trailing`?) before any data exists. Each slot is named once.
- **Honest types.** Each accessor is `(item: T) => …` and runs only on real items. Nothing is
  faked.
- **Conditional slots.** A slot whose accessor can return `undefined` is drawn in skeleton. The
  rows that turn out to lack it shift. This is the one bent constraint, and every family shares
  it. A rubric rule makes it exact: within one list, every row has a leading or none does.
  `ListRow` already draws every leading kind in one avatar-sized slot, so presence is the whole
  shape.
- **Leaf-local.** The molecule owns pending, failed, empty and loaded. Loading and error sit at
  the leaf.
- **RN.** It is plain data, so `native-ui`'s `List` takes the same props.

What it costs and changes:

- `List` gains the `query` + `row` form. Children stay for static lists.
- `LoadingRow` and the hardcoded `BARS` go. The skeleton row is drawn by `ListRow`'s own markup
  with bars in the declared slots (react-loading-skeleton's "built-in" state, below), so the
  loaded and waiting forms share one source.
- The other data molecules (card grids, stat strips, a detail header) follow the same pattern:
  slots as accessors over one item or many. `Table` already does this.
- `QueryBoundary` loses its guessed default (`List loading` / `Group`). It stays for compound
  bodies, with `loading` required. The guide's step 5 says "a data molecule takes its query".
- Cost: consumer row code becomes an object of accessors instead of `.map(<ListRow/>)`, about
  the same length.

**Runner-up: a typed placeholder value (family 2, WidgetKit-style).** It fits if the JSX row
code must stay as written. The consumer writes one valid `T` per entity (`placeholder: Note`).
The molecule renders the real row code over it in a redacted mode and never shows it to counts or
empty checks. It bends "no fake data": the value is real-typed and confined to rendering, but
consumer row code does run over it, and its branches pick the representative's slots.

## The five families

| # | Family | Shape from | Faked | Conditional slots | Per-component cost | Generalises |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Twin skeleton** (a hand-drawn fallback) | a second, hand-written layout | nothing | the author picks one, and it drifts | one twin per component | linearly; drift grows |
| 2 | **Mask the real view over stand-in data** | the real view rendered on a placeholder value | data (real-typed) | follow the placeholder's branch | one mask mode per component + one placeholder per type | well; the stand-in is the risk |
| 3 | **Holes in place of values** (component takes maybe-undefined) | the real component's markup | nothing | `undefined` is ambiguous: "absent" or "not yet"? | a hole per slot | well, if absent and pending are told apart |
| 4 | **Shape declared as data** (columns, slot accessors, skeleton props) | a declaration made before data | nothing | the declared superset | a declaration per use | well where the API is data-first |
| 5 | **Measured or extracted** (runtime DOM, build capture) | a prior render | nothing, or a capture fixture | whatever rendered last | none, until it breaks | first load, conditionals, RN all weak |

Stack's current `List` is family 1. A shape prop is family 4 stated twice. `placeholderData` and
QueryBoundary stand-ins are family 2 unconfined. "Remember the last shape" and build extraction
are family 5. The recommendation is family 4 with the declaration *as* the projection, so it
is stated once, and family 3's built-in skeleton inside the row.

## Evidence

### Family 2: mask the real view (Apple, Flutter, Compose, React wrappers)

- **WidgetKit** `placeholder(in:)` returns a real `Entry`: "a timeline entry that represents a
  placeholder version of the widget … a generic representation of your widget"
  (https://developer.apple.com/documentation/widgetkit/timelineprovider/placeholder(in:)).
  WidgetKit redacts the view, "so it's fine to use sample data"
  (https://useyourloaf.com/blog/widgetkit-for-ios-getting-started/). The type is honest and the
  data is fake. It doesn't leak because only the view sees it.
- **SwiftUI** `.redacted(reason:)` masks whatever the subtree lays out, and redaction is
  "additive" (https://developer.apple.com/documentation/swiftui/view/redacted(reason:)).
  `.unredacted()` opts out a constant. Layout needs values, so apps write
  `article?.title ?? "placeholder-copy-title"` (https://www.avanderlee.com/swiftui/redacted-view-modifier/).
- **Flutter skeletonizer** "will reduce your already existing layouts into mere skeletons", but
  "the layout would need data to shape". It ships `BoneMock.name`/`.date` for fakes, and its
  canonical example fills a list with `List.filled(7, const User(...))`
  (https://pub.dev/packages/skeletonizer, https://pub.dev/documentation/skeletonizer/latest/).
  `Skeleton.ignore`/`keep` leave a widget as is, and `Skeleton.leaf` paints a container as one
  bone. Its `Skeletonizer.zone` + `Bone.*` is a family-1 escape hatch that needs no fake data.
- **Compose**: `Modifier.placeholder(visible = true)` goes on the real `Text`, which still needs
  a string. Accompanist deprecated it in July 2023, and it lives on as a fork
  (https://github.com/eygraber/compose-placeholder,
  https://medium.com/androiddevelopers/an-update-on-jetpack-compose-accompanist-libraries-august-2023-ac4cbbf059f1).
  Material 3 publishes no skeleton component. A shape-matching claim attributed to M3 traced
  only to third-party pages, so it is not cited.
- **MUI** infers size from children (`<Skeleton variant="circular"><Avatar/></Skeleton>`), but
  its docs show it under `loading ? … : <Avatar src={data.avatar}/>`, so the child is a twin
  (https://mui.com/material-ui/react-skeleton/). **Mantine** `visible` and **Chakra** `loading`
  overlay real children that are "already on the page", so the content must exist
  (https://mantine.dev/core/skeleton/, https://chakra-ui.com/docs/components/skeleton).
  **Moti** (RN) does the same: `<Skeleton>{data ? <Data/> : null}</Skeleton>` with explicit
  `width`/`height` otherwise (https://moti.fyi/skeleton).

### Family 3: holes in place of values

- **react-loading-skeleton**: "Don't make dedicated skeleton screens. Instead, make components
  with built-in skeleton states", e.g. `<h1>{props.title || <Skeleton/>}</h1>`. It "keeps styles
  in sync" (https://github.com/dvtng/react-loading-skeleton). The component's types accept
  `undefined`, which collides with an optional slot meaning *absent*. That collision is
  exactly the `leading` case.

### Family 4: declared shape

- **Ant Design** `Skeleton avatar title={false} paragraph={{rows}} loading` declares the shape
  in props (https://ant.design/components/skeleton). Its List load-more demo appends fake
  `{ loading: true }` items to the data array, so family 2 leaks into the list
  (https://github.com/ant-design/ant-design/blob/master/components/list/demo/loadmore.tsx).
- **Polaris** skeleton components take the counts: "match the number of lines to the content
  being loaded" (https://polaris-react.shopify.com/components/feedback-indicators/skeleton-body-text).
- Stack's own `Table` declares `columns` before `rows` exist, so its skeleton needs nothing
  extra (`plugins/react-ui/src/ui/components/table/index.tsx`).

### Family 1: twins (Suspense, Relay, statics, RN placeholder)

- React: `fallback` "should be a lightweight placeholder … like a loading spinner or skeleton",
  e.g. `<Suspense fallback={<AlbumsGlimmer/>}>`. Don't wrap every component; place boundaries
  where the reveal sequence wants them (https://react.dev/reference/react/Suspense). Relay names
  them `LoadingGlimmer`/`…Placeholder`, with no tie to the component's shape
  (https://relay.dev/docs/guided-tour/rendering/loading-states/). The `Component.Skeleton`
  static co-locates the twin but does not derive it
  (https://www.smashingmagazine.com/2020/04/skeleton-screens-react/).
- **react-native-skeleton-placeholder**: explicit `SkeletonPlaceholder.Item width height`. Its
  `enabled` switch chooses between "placeholders or its children", so there are two trees
  (https://github.com/chramos/react-native-skeleton-placeholder).

### Family 5: measured

- **auto-skeleton-react** inspects the rendered DOM at runtime
  (https://github.com/ShanukJ/auto-skeleton). **boneyard** renders components in a headless
  browser and writes `getBoundingClientRect` JSON at build
  (https://boneyard.vercel.app/overview). Both need a prior render, the first load has no
  shape, and neither reaches RN.

### Must the skeleton match exactly?

- **Atlassian**: "Match the size and shape of the expected content so the page does not jump
  when loading completes" (https://atlassian.design/components/skeleton/usage).
- **Polaris**: skeleton pages should mimic the loaded layout, and "mismatched layouts" confuse
  merchants (https://polaris-react.shopify.com/components/feedback-indicators/skeleton-page).
- **NN/g**: "The structure of the gray boxes mimics the structure of the final page"
  (https://www.nngroup.com/articles/skeleton-screens/).
- **Primer** is looser: "a vague representation of the content"
  (https://primer.style/product/ui-patterns/loading/). **Carbon** says only that skeletons are
  "simplified versions of components" and lists which components get one
  (https://carbondesignsystem.com/patterns/loading-pattern/).
- **CLS** doesn't catch this defect. A shift is a *visible element* changing start position,
  and "if a new element is added to the DOM … it doesn't count" (https://web.dev/articles/cls).
  Skeleton nodes swapped for row nodes score 0, so the avatar-width jump is a perceptual defect
  the metric misses. No guide sets a pixel tolerance. Atlassian's "does not jump" and stack's
  rubric ("at the real column widths inside the real row heights") make a horizontal shift a
  defect.
