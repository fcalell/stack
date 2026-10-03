# Rules for the phone UI

Every `.tsx` of the phone app follows these rules. The design system is the roster
`@fcalell/plugin-native-ui` ships plus the app's own `ui/` directory (any `ui/` path segment);
everything else is app code, which composes components and never restyles them. The roster is
`node_modules/@fcalell/ui-core/src/roster.ts`, the same prop names on the web and the phone; each
component's cells, states and tokens are in `node_modules/@fcalell/ui-core/DESIGN.md`.

## Pick the component first

Before writing markup, find the roster component that owns the shape: the frame (`Shell`,
`Place`, `Screen`, `Split`), the rhythm (`Section`, `Group`, `List`), the row (`ListRow`,
`DefinitionRow`, `FormField`), the control, the text role (`Text`). A `View` that rebuilds one of
these is drift, even with the right tokens.

```tsx
// Drift: a host redrawing a row.
<View className="h-11 flex-row items-center border-b border-edge px-4">
  <RNText className="text-body">{project.name}</RNText>
</View>

// The row the roster owns.
<ListRow title={project.name} meta={[project.owner]} href={`/projects/${project.id}`} />
```

## Classes are geometry, on hosts only

A component takes no `class`, `className`, `classList` or `style`, and none of the per-prop class
channels uniwind adds to React Native's hosts (`colorClassName`, `placeholderTextColorClassName`
and the rest): its props type declares each `?: never`, so passing one fails the type-check. Its
look is its props.

A class belongs only on a `View`, `Pressable`, `ScrollView` or `Animated.View`, and only for
geometry: flex plumbing, alignment, zero offsets, fill sizes, gap rungs. A fill, radius, border,
shadow, weight, tone, transition or state is a look, and a numeric dimension is never geometry.
Copy never sits in React Native's own `Text`.

```tsx
<View className="flex-row min-w-0 items-center gap-pair">
  <Status state="active" label={words.active} />
  <Text role="meta">{sentence}</Text>
</View>
```

## Tokens only

Every colour, size, radius and spacing is a contract token; never an arbitrary value
(`h-[34px]`), a literal colour or a raw pixel size. Copy renders through `Text` (`body` or `meta`,
with `strong`) or the molecule that owns its role (`title` is `Place`'s and `Screen`'s, `heading` is
`Section`'s); colour comes through a component's props.

## Data, never nodes

A composed region is data the owning molecule renders: an act is an `Act`
(`{ label, onAct, destructive? }`), an icon-only act an `IconAct`, a row's marks a `StatusMark`
and a `ChipMark`, a menu's acts `MenuItem`s, a place a `PlaceSpec`, all from
`@fcalell/ui-core/descriptors`. An icon is an `IconName`, a Lucide glyph by its PascalCase name
(`Check`, `ChevronDown`). `children` is open only on the molecules the roster gives it to.

A `Form` has no implicit submission: its `ActionBar`'s filled act runs its `onAct`, and the form
is busy while that promise pends. A `FormField` takes a `FieldBinding` as `field`; the phone ships
no form hook, so the binding comes from the app's own form state. A `confirm()` takes a
`Confirmation` the same way.

## Words are the config's, sentences are props

Every word a component draws on its own (Back, Retry, Cancel) comes from `words`
(`nativeUi({ words })`, read with `useWords()` from `@fcalell/plugin-native-ui/lib/words`). Every
sentence the app shows is a prop it passes (`placeholder`, `notice`, every `sentence`, every
`label`).

## The app's `ui/`

A shape that needs the app's nouns in its props (`ProjectRow`, taking a `project`) lives in the
app's `ui/` and composes roster components only, never a host with a look. It reads no data; its
parent passes it.

## What the roster lacks is a gap

A shape no component owns, or a look a component's props cannot express, is a gap in stack:
leave that part out, compose the rest, and file it by the gap recipe
(`node_modules/@fcalell/cli/guide/gap.md`). Never a call-site class, a wrapper that re-adds a
look, a local copy of a stack component, or a host carrying tokens.

## Done

`pnpm check` passes, and the screen is checked on a device or simulator in light and dark.
