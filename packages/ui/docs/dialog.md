# Dialog

Modal dialog overlay. Built on Kobalte's Dialog primitive for focus trapping, backdrop click-to-close, and Escape key handling.

```tsx
import { Dialog } from "@fcalell/ui/components/dialog";
```

## Sub-components

### Dialog (Root)

Manages open/close state. Uncontrolled by default; pass `open`/`onOpenChange` for controlled.

### Dialog.Trigger

Element that opens the dialog. Renders as the child element.

### Dialog.Content

Portal-rendered modal with overlay, close button, and entry/exit animations.

| Prop | Type | Description |
|------|------|-------------|
| `class` | `string` | Additional Tailwind classes |
| `children` | `JSX.Element` | Dialog body |

### Dialog.Header

Flex column for title + description. Centered on mobile, left-aligned on sm+.

### Dialog.Footer

Action buttons area. Column on mobile, row on sm+.

### Dialog.Title

Renders `<h2>` via Kobalte. Semibold, tight tracking.

### Dialog.Description

Muted secondary text.

## Basic usage

```tsx
<Dialog>
  <Dialog.Trigger as={Button}>Open dialog</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm action</Dialog.Title>
      <Dialog.Description>This cannot be undone.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```
