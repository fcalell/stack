# ContextMenu

Right-click context menu. Same API shape as DropdownMenu but triggered by right-click. Built on Kobalte's ContextMenu primitive.

```tsx
import { ContextMenu } from "@fcalell/ui/components/context-menu";
```

## Sub-components

| Sub-component | Description |
|---------------|-------------|
| `ContextMenu` (Root) | Menu state manager |
| `ContextMenu.Trigger` | Area that responds to right-click |
| `ContextMenu.Content` | Portal-rendered menu panel |
| `ContextMenu.Item` | Standard menu item |
| `ContextMenu.Shortcut` | Right-aligned keyboard shortcut (`<kbd>`) |
| `ContextMenu.Separator` | Visual divider |
| `ContextMenu.Group` | Logical item group |
| `ContextMenu.GroupLabel` | Label for a group |
| `ContextMenu.Sub` | Submenu container |
| `ContextMenu.SubTrigger` | Item that opens a submenu |
| `ContextMenu.SubContent` | Submenu panel |
| `ContextMenu.CheckboxItem` | Toggleable item with check indicator |
| `ContextMenu.RadioGroup` | Radio group container |
| `ContextMenu.RadioItem` | Radio option with dot indicator |

## Basic usage

```tsx
<ContextMenu>
  <ContextMenu.Trigger>
    <div class="border border-dashed p-8">Right-click here</div>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item>Cut</ContextMenu.Item>
    <ContextMenu.Item>Copy</ContextMenu.Item>
    <ContextMenu.Item>Paste</ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu>
```
