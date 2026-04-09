# Item

List item with media, content, and actions layout. Use inside `Item.Group` for consistent spacing. Presentational `<li>` — wrap content in `<a>` or `<button>` for interactive items.

```tsx
import { Item } from "@fcalell/ui/components/item";
```

## Sub-components

### Item.Group

Renders `<ul>`. Flex column with gap that adapts to child item sizes.

### Item (Root)

Renders `<li>` with hover highlight and focus ring.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "outline" \| "muted"` | `"default"` | Border and background style |
| `size` | `"default" \| "sm" \| "xs"` | `"default"` | Padding and gap |

### Item.Separator

Horizontal separator with vertical margin.

### Item.Media

Container for icons or images. Aligns to top when description is present.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "icon" \| "image"` | `"default"` | Sizing behavior |

### Item.Content

Flex column for title and description. Fills remaining space.

### Item.Title

Single-line item name. Auto-generates an ID for ARIA labelling.

### Item.Description

Muted multi-line description (max 2 lines). Links auto-styled.

### Item.Actions

Right-aligned action buttons.

### Item.Header / Item.Footer

Full-width flex rows above/below the main content.

## Basic usage

```tsx
<Item.Group>
  <Item>
    <Item.Media variant="icon"><FileText /></Item.Media>
    <Item.Content>
      <Item.Title>Document.pdf</Item.Title>
      <Item.Description>Uploaded 2 hours ago</Item.Description>
    </Item.Content>
    <Item.Actions>
      <Button variant="ghost" size="icon"><Trash2 /></Button>
    </Item.Actions>
  </Item>
</Item.Group>
```
