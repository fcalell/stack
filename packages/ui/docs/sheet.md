# Sheet

Slide-in panel from any edge. Built on Kobalte's Dialog primitive. Use for navigation, settings, or detail views that overlay the page.

```tsx
import { Sheet } from "@fcalell/ui/components/sheet";
```

## Sub-components

### Sheet (Root)

Dialog root. Manages open/close state.

### Sheet.Trigger

Element that opens the sheet.

### Sheet.Close

Element that closes the sheet.

### Sheet.Content

Portal-rendered panel with overlay and close button. Slides in from the specified edge.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `"top" \| "bottom" \| "left" \| "right"` | `"right"` | Slide-in direction |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"sm"` | Max width (for left/right) |
| `class` | `string` | -- | Additional Tailwind classes |

### Sheet.Header / Sheet.Footer / Sheet.Title / Sheet.Description

Same layout components as Dialog.

## Basic usage

```tsx
<Sheet>
  <Sheet.Trigger as={Button}>Open sheet</Sheet.Trigger>
  <Sheet.Content position="right" size="md">
    <Sheet.Header>
      <Sheet.Title>Settings</Sheet.Title>
      <Sheet.Description>Manage your preferences.</Sheet.Description>
    </Sheet.Header>
    <p>Sheet body content.</p>
  </Sheet.Content>
</Sheet>
```
