# Inset

Left-bordered content block for indented annotations or nested information. Use for callouts, nested details, or error context.

```tsx
import { Inset } from "@fcalell/ui/components/inset";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "error"` | `"default"` | Border color — default uses `border-border`, error uses `border-destructive` |
| `class` | `string` | -- | Additional Tailwind classes |

## Basic usage

```tsx
<Inset>
  <Text.Small>Additional context about this item.</Text.Small>
</Inset>
```

## Error variant

```tsx
<Inset variant="error">
  <Text.Small>This action cannot be undone.</Text.Small>
</Inset>
```
