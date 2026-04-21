# Inset

Left-bordered content block for indented annotations or nested information. Use for callouts, nested details, or error context.

```tsx
import { Inset } from "@fcalell/plugin-solid-ui/components/inset";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive"` | `"default"` | Border color — default uses `border-border`, destructive uses `border-destructive` |
| `class` | `string` | -- | Additional Tailwind classes |

## Basic usage

```tsx
<Inset>
  <Text.Small>Additional context about this item.</Text.Small>
</Inset>
```

## Destructive variant

```tsx
<Inset variant="destructive">
  <Text.Small>This action cannot be undone.</Text.Small>
</Inset>
```
