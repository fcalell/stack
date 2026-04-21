# EmptyState

Centered placeholder for empty views. Shows an icon, title, optional description, and action buttons.

```tsx
import { EmptyState } from "@fcalell/plugin-solid-ui/components/empty-state";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `JSX.Element` | -- | Large decorative icon (auto-sized to 48px) |
| `title` | `string` | -- | Required uppercase heading |
| `titleAs` | `ValidComponent` | `"h3"` | Override the heading element |
| `description` | `string` | -- | Optional muted description |
| `children` | `JSX.Element` | -- | Action buttons |
| `class` | `string` | -- | Additional Tailwind classes |

## Basic usage

```tsx
import { Inbox } from "lucide-solid";

<EmptyState
  icon={<Inbox />}
  title="No projects"
  description="Create your first project to get started."
>
  <Button>New project</Button>
</EmptyState>
```

## Minimal

```tsx
<EmptyState title="No results" description="Try adjusting your search." />
```
