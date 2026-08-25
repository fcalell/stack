# EmptyState

Centered placeholder for empty views. Shows an icon, title, optional description, and one action.

```tsx
import { EmptyState } from "@fcalell/plugin-solid-ui/components/empty-state";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | -- | Decorative icon component, rendered at 48px |
| `title` | `string` | -- | Required uppercase heading |
| `titleAs` | `ValidComponent` | `"h3"` | Override the heading element |
| `description` | `string` | -- | Optional muted description |
| `action` | `Action<never>` | -- | Rendered as a secondary `md` button; `loading` and `disabled` flow through |

## Basic usage

```tsx
import { Inbox } from "lucide-solid";

<EmptyState
  icon={Inbox}
  title="No projects"
  description="Create your first project to get started."
  action={{ label: "New project", onSelect: createProject }}
/>
```

`Action` comes from `@fcalell/ui-core/descriptors`. The component renders the action region itself; there is no element children slot.

## Minimal

```tsx
<EmptyState title="No results" description="Try adjusting your search." />
```
