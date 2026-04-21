# Select

Data-driven dropdown select. Built on Kobalte's Select primitive for keyboard navigation, ARIA combobox semantics, and portal-rendered content.

```tsx
import { Select } from "@fcalell/plugin-solid-ui/components/select";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `SelectOptions` | -- | Array of options or option groups |
| `value` | `string` | -- | Controlled selected value |
| `onValueChange` | `(value: string) => void` | -- | Selection change handler |
| `placeholder` | `string` | `"Select an option"` | Placeholder when no value selected |
| `disabled` | `boolean` | `false` | Disable the select |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Trigger height/padding |
| `class` | `string` | -- | Additional classes on the trigger |
| `contentClass` | `string` | -- | Additional classes on the dropdown panel |
| `aria-invalid` | `boolean` | -- | Invalid state for form integration |
| `disallowEmptySelection` | `boolean` | `true` | Prevent deselecting |
| `children` | `(option: SelectOption) => JSX.Element` | -- | Custom item content render |

## Option types

```ts
type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectOptionGroup = { label: string; options: SelectOption[] };
type SelectOptions = SelectOption[] | SelectOptionGroup[];
```

Grouped options are auto-detected by checking for an `options` array on the first element.

## Basic usage

```tsx
<Select
  options={[
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry" },
  ]}
  value={value()}
  onValueChange={setValue}
  placeholder="Pick a fruit"
/>
```

## Custom item rendering

Pass a children render function to customize how each item appears in the dropdown. The function receives the raw `SelectOption` object and returns the content to display inside each item. The item wrapper, check indicator, and keyboard handling are managed by Select.

```tsx
<Select
  options={fruits()}
  value={value()}
  onValueChange={setValue}
>
  {(option) => (
    <>
      <FruitIcon name={option.value} />
      {option.label}
    </>
  )}
</Select>
```

## Grouped options

Pass option groups and sections are rendered automatically with labels:

```tsx
<Select
  options={[
    {
      label: "Fruits",
      options: [
        { value: "apple", label: "Apple" },
        { value: "banana", label: "Banana" },
      ],
    },
    {
      label: "Vegetables",
      options: [
        { value: "carrot", label: "Carrot" },
        { value: "spinach", label: "Spinach" },
      ],
    },
  ]}
  value={value()}
  onValueChange={setValue}
/>
```

## Sizes

```tsx
<Select options={options} size="sm" />
<Select options={options} size="default" />
<Select options={options} size="lg" />
```

## With form integration

Works with `Form.Select` from `@fcalell/plugin-solid-ui/components/form` for TanStack Form integration. The `aria-invalid` prop enables destructive styling on validation errors.

## Exports

The `selectTriggerVariants` CVA export is available for applying trigger styles to custom elements:

```tsx
import { selectTriggerVariants } from "@fcalell/plugin-solid-ui/components/select";
```
