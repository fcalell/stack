# Textarea

Multi-line text field. It takes the same shared `FIELD` matrix as Input at `layout="input"`, then overlays its own vertical interior and height range. Auto-sizes through `field-sizing: content`, with no manual resize handle.

```tsx
import { Textarea } from "@fcalell/plugin-solid-ui/components/textarea";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `number` | `3` | Initial visible rows |
| `class` | `string` | -- | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | -- | -- | All HTML textarea attributes |

There is no size axis, for the same reason Input has none: `FIELD` carries one control height and it is the tap floor.

## Basic usage

```tsx
<Textarea placeholder="Write a description..." />
<Textarea rows={2} placeholder="Short note" />
```

## Auto-sizing

The textarea grows with its content from `min-h-16` (64px) to `max-h-64` (256px), then scrolls.

## Error state

```tsx
<Textarea aria-invalid="true" value="Invalid content" />
```

## Composition

No class function is exported. A custom multi-line surface is a primitive the consumer authors under `ui/`.
