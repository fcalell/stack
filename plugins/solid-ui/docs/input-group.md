# InputGroup

Composite input that wraps an input or textarea with addons (icons, buttons, text) on any edge. Shared border, focus highlight, and error state for the whole group.

```tsx
import { InputGroup } from "@fcalell/plugin-solid-ui/components/input-group";
```

## Sub-components

### InputGroup (Root)

Renders `<fieldset>`. Provides the shared border, background, and focus/error state for all children. It carries the same `rounded-control` radius and 48px floor as a standalone Input, since it is the field surface its borderless Input sits inside.

| Prop | Type | Description |
|------|------|-------------|
| `legend` | `string` | Accessible label (renders as `aria-label`) |
| `class` | `string` | Additional Tailwind classes |

### InputGroup.Input

Borderless Input that fills remaining space. Passes through all Input props.

| Prop | Type | Default | Description |
|------|------|---------|-------------|

### InputGroup.Textarea

Borderless Textarea that fills remaining space. Group height auto-adjusts.

### InputGroup.Addon

Container for icons, text, or buttons positioned on any edge.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `align` | `"inline-start" \| "inline-end" \| "block-start" \| "block-end"` | `"inline-start"` | Position relative to the input |

### InputGroup.Button

Compact button styled for inline use. Tertiary emphasis, no border radius.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"xs" \| "sm" \| "icon-xs" \| "icon-sm"` | `"xs"` | Button dimensions. Each compact size clears the button matrix's own minimum height, so an addon stays inline instead of growing the group |
| `emphasis` | `"primary" \| "secondary" \| "tertiary"` | `"tertiary"` | Button emphasis |
| `tone` | `"neutral" \| "danger"` | `"neutral"` | Button tone |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | HTML button type |

### InputGroup.Text

Inline text or icon label. `ink-3` ink, extra-small.

## Basic usage

```tsx
<InputGroup legend="Search">
  <InputGroup.Addon><Search /></InputGroup.Addon>
  <InputGroup.Input placeholder="Search..." />
</InputGroup>
```

## With button

```tsx
<InputGroup legend="URL">
  <InputGroup.Input placeholder="https://..." />
  <InputGroup.Addon align="inline-end">
    <InputGroup.Button><Copy /></InputGroup.Button>
  </InputGroup.Addon>
</InputGroup>
```

## Block-aligned addon

```tsx
<InputGroup>
  <InputGroup.Addon align="block-start">
    <InputGroup.Text>Subject</InputGroup.Text>
  </InputGroup.Addon>
  <InputGroup.Textarea placeholder="Message body..." />
</InputGroup>
```
