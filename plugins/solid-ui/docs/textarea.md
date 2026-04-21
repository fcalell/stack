# Textarea

Multi-line text input. Shares styling with Input — monospace font, muted background, 2px border. Auto-sizes via `field-sizing: content` between min/max height, no manual resize handle.

```tsx
import { Textarea } from "@fcalell/plugin-solid-ui/components/textarea";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Padding and text size |
| `rows` | `number` | `3` | Initial visible rows |
| `class` | `string` | -- | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | -- | -- | All HTML textarea attributes |

## Sizes

| Size | Text | Padding |
|------|------|---------|
| `sm` | 14px | `px-3 py-1` |
| `default` | 14px | `px-4 py-2` |
| `lg` | 16px | `px-4 py-3` |

## Basic usage

```tsx
<Textarea placeholder="Write a description..." />
<Textarea size="sm" rows={2} placeholder="Short note" />
```

## Auto-sizing

The textarea grows with content from `min-h-16` (64px) to `max-h-264` (256px), then scrolls. No resize handle — sizing is automatic via `field-sizing: content`.

## Error state

```tsx
<Textarea aria-invalid="true" value="Invalid content" />
```

## Composition

The `textareaClasses` export is available for applying textarea styles to custom elements:

```tsx
import { textareaClasses } from "@fcalell/plugin-solid-ui/components/textarea";
```
