# Label

Uppercase label for form fields and sections. Styled as muted, bold, extra-small text with wide letter-spacing. Automatically dims when its associated field is disabled.

```tsx
import { Label } from "@fcalell/plugin-solid-ui/components/label";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `for` | `string` | -- | Associates the label with a form field by ID |
| `as` | `ValidComponent` | `"label"` | Override the rendered element |
| `class` | `string` | -- | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | -- | -- | All HTML label attributes |

## Usage

```tsx
<Label for="email">Email address</Label>
<input id="email" type="email" />
```

## Disabled state

When a sibling input has `disabled` or a parent group has `data-disabled="true"`, the label reduces opacity and disables pointer events automatically via peer/group selectors.

```tsx
<div class="group" data-disabled="true">
  <Label>Disabled field</Label>
</div>
```
