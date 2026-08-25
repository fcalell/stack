# Inset

Left-bordered content block for indented annotations or nested information. Use it for callouts, nested details, or error context.

```tsx
import { Inset } from "@fcalell/plugin-solid-ui/components/inset";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | `"neutral" \| "danger"` | `"neutral"` | Border colour: `edge` or `danger` |

## Basic usage

```tsx
<Inset>
  <Text variant="caption" tone="ink-3">Additional context about this item.</Text>
</Inset>
```

## Danger tone

```tsx
<Inset tone="danger">
  <Text variant="caption" tone="ink-3">This action cannot be undone.</Text>
</Inset>
```
