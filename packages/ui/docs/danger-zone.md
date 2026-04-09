# DangerZone

Destructive action block with warning icon, description, and action button. Wraps Inset with error variant.

```tsx
import { DangerZone } from "@fcalell/ui/components/danger-zone";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `description` | `string` | -- | Explanation of the destructive action |
| `actionLabel` | `string` | -- | Button text |
| `onAction` | `() => void` | -- | Called when the action button is clicked |
| `disabled` | `boolean` | `false` | Disable the action button |
| `headingLevel` | `2 \| 3 \| 4` | `3` | HTML heading level |
| `class` | `string` | -- | Additional Tailwind classes |

## Basic usage

```tsx
<DangerZone
  description="Permanently delete this project and all its data."
  actionLabel="Delete project"
  onAction={handleDelete}
/>
```
