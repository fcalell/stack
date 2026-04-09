# DropdownMenu

Dropdown menu triggered by a button. Built on Kobalte's DropdownMenu primitive for keyboard navigation, submenus, checkbox/radio items, and ARIA menu semantics.

```tsx
import { DropdownMenu } from "@fcalell/ui/components/dropdown-menu";
```

## Sub-components

| Sub-component | Description |
|---------------|-------------|
| `DropdownMenu` (Root) | Menu state manager |
| `DropdownMenu.Trigger` | Button that opens the menu |
| `DropdownMenu.Content` | Portal-rendered menu panel |
| `DropdownMenu.Item` | Standard menu item |
| `DropdownMenu.Shortcut` | Right-aligned keyboard shortcut text |
| `DropdownMenu.Label` | Non-interactive section label. `inset` prop for checkbox alignment |
| `DropdownMenu.Separator` | Visual divider |
| `DropdownMenu.Group` | Logical item group |
| `DropdownMenu.GroupLabel` | Label for a group |
| `DropdownMenu.Sub` | Submenu container |
| `DropdownMenu.SubTrigger` | Item that opens a submenu (shows chevron) |
| `DropdownMenu.SubContent` | Submenu panel |
| `DropdownMenu.CheckboxItem` | Toggleable item with check indicator |
| `DropdownMenu.RadioGroup` | Radio group container |
| `DropdownMenu.RadioItem` | Radio option with dot indicator |

## Basic usage

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger as={Button} variant="outline">
    Actions
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item>Edit</DropdownMenu.Item>
    <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item>Delete</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```
