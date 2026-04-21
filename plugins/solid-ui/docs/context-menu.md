# ContextMenu

Data-driven right-click context menu. Same item types as DropdownMenu but triggered by right-click. Built on Kobalte's ContextMenu primitive.

```tsx
import { ContextMenu } from "@fcalell/plugin-solid-ui/components/context-menu";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `MenuItems` | -- | Array of items or item groups (same types as DropdownMenu) |
| `class` | `string` | -- | Additional classes on the trigger area |
| `contentClass` | `string` | -- | Additional classes on the menu panel |
| `children` | `JSX.Element` | -- | The area that responds to right-click |

## Basic usage

```tsx
<ContextMenu
  items={[
    { label: "Cut", shortcut: "⌘X", onSelect: handleCut },
    { label: "Copy", shortcut: "⌘C", onSelect: handleCopy },
    { label: "Paste", shortcut: "⌘V", onSelect: handlePaste },
  ]}
>
  <div class="border border-dashed p-8">Right-click here</div>
</ContextMenu>
```

## Item types

Uses the same `MenuItem`, `MenuItems`, and `MenuGroup` types from `@fcalell/plugin-solid-ui/components/dropdown-menu`. See the DropdownMenu docs for the full type reference.

```tsx
import type { MenuItem } from "@fcalell/plugin-solid-ui/components/dropdown-menu";
```
