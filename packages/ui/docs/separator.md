# Separator

Visual divider between content sections. Built on Kobalte's Separator primitive for correct `role="separator"` and ARIA orientation.

```tsx
import { Separator } from "@fcalell/ui/components/separator";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Direction of the divider |
| `as` | `ValidComponent` | `"hr"` | Override the rendered element |
| `class` | `string` | -- | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | -- | -- | All HTML attributes and Kobalte SeparatorRootProps |

## Horizontal (default)

Full-width 1px line. Use between stacked content sections.

```tsx
<Text.P>Above</Text.P>
<Separator />
<Text.P>Below</Text.P>
```

## Vertical

Full-height 1px line. Use between side-by-side elements. The parent must define a height (e.g. via `h-*` or flex layout).

```tsx
<div class="flex items-center gap-4 h-6">
  <span>Left</span>
  <Separator orientation="vertical" />
  <span>Right</span>
</div>
```

## Custom styling

Override color or thickness via `class`:

```tsx
<Separator class="bg-primary h-0.5" />
```
