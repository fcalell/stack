# Form

TanStack Form field adapters for UI components. Bridges `@tanstack/solid-form`'s `AnyFieldApi` with the design system's input components, handling labels, descriptions, error display, and `aria-invalid` state.

```tsx
import { Form } from "@fcalell/ui/components/form";
```

Requires peer dependency: `@tanstack/solid-form ^1.28`.

## Sub-components

### Form.Field

Base wrapper providing label, description, and error display. Used internally by all other adapters, but also available directly for custom field layouts.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `field` | `() => AnyFieldApi` | -- | Field API accessor (must be a getter for reactivity) |
| `label` | `string` | -- | Field label text |
| `description` | `string` | -- | Optional help text below the label |
| `class` | `string` | -- | Additional classes on the outer `<fieldset>` |
| `htmlFor` | `string` | -- | Associates label with input by ID |
| `children` | `JSX.Element` | -- | Field content (typically an input component) |

### Form.Input

Text input with field integration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `field` | `() => AnyFieldApi` | -- | Field API accessor |
| `label` | `string` | -- | Field label |
| `description` | `string` | -- | Help text |
| `placeholder` | `string` | -- | Input placeholder |
| `type` | `string` | -- | Input type (`text`, `email`, `password`, etc.) |
| `disabled` | `boolean` | -- | Disable the input |
| `autofocus` | `boolean` | -- | Auto-focus on mount |
| `class` | `string` | -- | Additional classes on the wrapper |
| `onBlur` | `() => void` | -- | Called after `field.handleBlur()` |
| `onInput` | `(value: string) => void` | -- | Called after `field.handleChange()` |

### Form.Textarea

Textarea with field integration. Same props as `Form.Input` except no `type` or `autofocus`.

### Form.Select

Dropdown select with field integration. Wraps the data-driven `Select` component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `field` | `() => AnyFieldApi` | -- | Field API accessor |
| `label` | `string` | -- | Field label |
| `description` | `string` | -- | Help text |
| `options` | `SelectOptions` | -- | Options array (flat or grouped) |
| `placeholder` | `string` | -- | Select placeholder |
| `disabled` | `boolean` | -- | Disable the select |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Trigger size |
| `class` | `string` | -- | Additional classes on the wrapper |
| `children` | `(option: SelectOption) => JSX.Element` | -- | Custom item content render |

### Form.Checkbox

Checkbox with field integration. The checkbox renders its own inline label.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `field` | `() => AnyFieldApi` | -- | Field API accessor (boolean value) |
| `label` | `string` | -- | Checkbox label (inline) |
| `description` | `string` | -- | Help text |
| `disabled` | `boolean` | -- | Disable the checkbox |
| `class` | `string` | -- | Additional classes on the wrapper |

### Form.InputOTP

One-time password input. Renders digit slots split into two groups with a separator.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `field` | `() => AnyFieldApi` | -- | Field API accessor |
| `label` | `string` | -- | Field label |
| `description` | `string` | -- | Help text |
| `maxLength` | `number` | -- | Number of OTP digits |
| `onComplete` | `() => void` | -- | Called when all digits are filled |
| `class` | `string` | -- | Additional classes on the wrapper |

### Form.EnumInput

Tag/multi-value text input. Values are added by pressing Enter or typing commas.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `field` | `() => AnyFieldApi` | -- | Field API accessor (string[] value) |
| `label` | `string` | -- | Field label |
| `description` | `string` | -- | Help text |
| `placeholder` | `string` | -- | Input placeholder |
| `disabled` | `boolean` | -- | Disable the input |
| `class` | `string` | -- | Additional classes on the wrapper |

## Basic usage

```tsx
import { createForm } from "@tanstack/solid-form";
import { z } from "@fcalell/api/schema";
import { Form } from "@fcalell/ui/components/form";

const form = createForm(() => ({
  defaultValues: { name: "", description: "" },
  validators: { onBlur: z.object({ name: z.string().min(1) }) },
  onSubmit: async ({ value }) => { /* ... */ },
}));

<form.Field name="name">
  {(field) => <Form.Input field={() => field()} label="Name" placeholder="Enter name" />}
</form.Field>

<form.Field name="description">
  {(field) => <Form.Textarea field={() => field()} label="Description" />}
</form.Field>
```

## With select

```tsx
<form.Field name="category">
  {(field) => (
    <Form.Select
      field={() => field()}
      label="Category"
      options={[
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
      ]}
    />
  )}
</form.Field>
```

## Custom event handlers

`Form.Input` and `Form.Textarea` support `onBlur` and `onInput` callbacks that fire after the field's own handlers. Useful for side effects like auto-slug generation:

```tsx
<Form.Input
  field={() => field()}
  label="Name"
  onInput={(value) => slugField().handleChange(slugify(value))}
/>
```
