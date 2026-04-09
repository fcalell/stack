# SectionToolbar

Horizontal toolbar with left/right layout. Use below a section header for filters, search, and action buttons.

```tsx
import { SectionToolbar } from "@fcalell/ui/components/section-toolbar";
```

## Sub-components

### SectionToolbar (Root)

Renders `<div role="toolbar">` with horizontal orientation. Bottom border, responsive padding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `aria-label` | `string` | `"Section actions"` | Accessible label |
| `class` | `string` | -- | Additional Tailwind classes |

### SectionToolbar.Left

Left-aligned flex container. Fills available space (`flex-1 min-w-0`).

### SectionToolbar.Right

Right-aligned flex container for action buttons.

## Basic usage

```tsx
<SectionToolbar>
  <SectionToolbar.Left>
    <Input size="sm" placeholder="Search..." />
  </SectionToolbar.Left>
  <SectionToolbar.Right>
    <Button size="sm">Add</Button>
  </SectionToolbar.Right>
</SectionToolbar>
```
