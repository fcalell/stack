# Input

Single-line text field. It takes the shared `FIELD` matrix at `layout="input"`: `rounded-control`, a 1px `edge` border, a `surface` fill, `px-3.5`, and a 48px minimum height. Monospace, `callout` type role. Supports `aria-invalid` for the error state.

```tsx
import { Input } from "@fcalell/plugin-solid-ui/components/input";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `string` | `"text"` | HTML input type |
| `class` | `string` | -- | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | -- | -- | All HTML input attributes, including the native `size` |

There is no size axis. `FIELD` has one height, and it is the 48px control floor: a shorter input sits below the tap target every platform requires.

## Basic usage

```tsx
<Input placeholder="Enter your name" />
<Input type="email" placeholder="you@example.com" />
```

## Error state

Set `aria-invalid` for a `danger` border and a matching outline. Both move together, so the error is not carried by a one-pixel hue change alone:

```tsx
<Input aria-invalid="true" value="bad value" />
```

## Focus

Focus moves the border to `ink-1` and draws an `interactive` outline two pixels off the control. The placeholder sits at `ink-3`, the muted ink that still clears 4.5:1.

## Disabled

A disabled input takes the `surface-3` fill and `ink-4` ink.

```tsx
<Input disabled placeholder="Cannot edit" />
```

## Composition

No class function is exported. A custom input surface is a primitive the consumer authors under `ui/`.
