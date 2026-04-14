# DropdownMenu

Data-driven dropdown menu triggered by a button. Built on Kobalte's DropdownMenu primitive for keyboard navigation, submenus, checkbox/radio items, and ARIA menu semantics.

```tsx
import { DropdownMenu } from "@fcalell/ui/components/dropdown-menu";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trigger` | `JSX.Element` | -- | The element that opens the menu |
| `items` | `MenuItems` | -- | Array of items or item groups |
| `class` | `string` | -- | Additional classes on the root |
| `contentClass` | `string` | -- | Additional classes on the dropdown panel |

## Item types

```ts
// Default action item (type is omitted)
type MenuAction = {
  label: string;
  icon?: JSX.Element;
  onSelect?: () => void;
  disabled?: boolean;
  shortcut?: string;
};

type MenuSeparator = { type: "separator" };
type MenuLabel = { type: "label"; label: string };

type MenuCheckbox = {
  type: "checkbox";
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

type MenuRadioGroup = {
  type: "radio";
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string; disabled?: boolean }[];
};

type MenuSub = {
  type: "sub";
  label: string;
  icon?: JSX.Element;
  items: MenuItem[];
};
```

Grouped items are auto-detected by checking for an `items` array on the first element:

```ts
type MenuGroup = { label: string; items: MenuItem[] };
type MenuItems = MenuItem[] | MenuGroup[];
```

## Basic usage

```tsx
<DropdownMenu
  trigger={<Button variant="outline">Actions</Button>}
  items={[
    { label: "Edit", onSelect: handleEdit },
    { label: "Duplicate", onSelect: handleDuplicate },
    { type: "separator" },
    { label: "Delete", onSelect: handleDelete },
  ]}
/>
```

## With icons and shortcuts

```tsx
<DropdownMenu
  trigger={<Button variant="ghost" size="icon"><MoreVertical /></Button>}
  items={[
    { label: "Edit", icon: <Pencil />, shortcut: "⌘E", onSelect: handleEdit },
    { label: "Copy", icon: <Copy />, shortcut: "⌘C", onSelect: handleCopy },
    { type: "separator" },
    { label: "Delete", icon: <Trash />, onSelect: handleDelete },
  ]}
/>
```

## Checkbox items

```tsx
<DropdownMenu
  trigger={<Button>View</Button>}
  items={[
    { type: "checkbox", label: "Show toolbar", checked: toolbar(), onCheckedChange: setToolbar },
    { type: "checkbox", label: "Show sidebar", checked: sidebar(), onCheckedChange: setSidebar },
  ]}
/>
```

## Radio items

```tsx
<DropdownMenu
  trigger={<Button>Sort</Button>}
  items={[
    { type: "radio", value: sort(), onValueChange: setSort, items: [
      { value: "name", label: "Name" },
      { value: "date", label: "Date" },
      { value: "size", label: "Size" },
    ]},
  ]}
/>
```

## Submenus

```tsx
<DropdownMenu
  trigger={<Button>Options</Button>}
  items={[
    { label: "Edit", onSelect: handleEdit },
    { type: "sub", label: "Share", icon: <Share />, items: [
      { label: "Email", onSelect: shareEmail },
      { label: "Link", onSelect: shareLink },
    ]},
  ]}
/>
```

## Grouped items

```tsx
<DropdownMenu
  trigger={<Button>Menu</Button>}
  items={[
    { label: "Actions", items: [
      { label: "Edit", onSelect: handleEdit },
      { label: "Duplicate", onSelect: handleDuplicate },
    ]},
    { label: "Danger zone", items: [
      { label: "Delete", onSelect: handleDelete },
    ]},
  ]}
/>
```

## Exports

Menu item types are re-exported for consumers building dynamic menus:

```tsx
import type { MenuItem, MenuItems, MenuGroup } from "@fcalell/ui/components/dropdown-menu";
```
