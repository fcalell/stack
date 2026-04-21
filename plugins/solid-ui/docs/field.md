# Field

Form field container that groups a label, input, description, and error message. Uses `data-slot` attributes for internal CSS targeting (nested fields, checked states).

```tsx
import { Field } from "@fcalell/plugin-solid-ui/components/field";
```

## Sub-components

### Field (Root)

Renders `<fieldset>`. Sets `data-slot="field"` and provides `group/field` for descendant selectors. Set `data-invalid="true"` to switch text color to destructive.

| Prop | Type | Description |
|------|------|-------------|
| `data-invalid` | `"true"` | Switches text to destructive color |
| `data-disabled` | `"true"` | Dims the label |
| `class` | `string` | Additional Tailwind classes |

### Field.Label

Uppercase label (wraps the Label component). Supports checked-state highlighting and nested field layouts via `data-slot` selectors.

| Prop | Type | Description |
|------|------|-------------|
| `for` | `string` | Associates with a form field by ID |
| `class` | `string` | Additional Tailwind classes |

### Field.Content

Flex column wrapper for the input and related elements. Use when the field has both an input and description/error below it.

### Field.Description

Helper text below the input. Muted foreground, extra-small. Links inside get underline styling automatically.

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | For `aria-describedby` on the input |
| `class` | `string` | Additional Tailwind classes |

### Field.Value

Read-only value display. Shows an em dash when empty with "No value" screen reader text.

### Field.Error

Validation error output with a CircleAlert icon. Renders `<output>` for live region semantics.

## Basic usage

```tsx
<Field>
  <Field.Label for="name">Name</Field.Label>
  <Field.Content>
    <Input id="name" placeholder="Enter name" />
    <Field.Description>Your display name.</Field.Description>
  </Field.Content>
</Field>
```

## With error

```tsx
<Field data-invalid="true">
  <Field.Label for="email">Email</Field.Label>
  <Field.Content>
    <Input id="email" aria-invalid="true" value="not-an-email" />
    <Field.Error>Please enter a valid email address.</Field.Error>
  </Field.Content>
</Field>
```

## Read-only display

```tsx
<Field>
  <Field.Label>Plan</Field.Label>
  <Field.Value>Pro</Field.Value>
</Field>
```
