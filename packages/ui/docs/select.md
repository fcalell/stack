# Select

Dropdown select menu. Built on Kobalte's Select primitive for keyboard navigation, ARIA combobox semantics, and portal-rendered content.

```tsx
import { Select } from "@fcalell/ui/components/select";
```

## Sub-components

### Select (Root)

Kobalte's `Select.Root` — manages state, options, and selection. Pass `options`, `value`/`onChange` (controlled) or `defaultValue`, and `itemComponent`.

| Prop | Type | Description |
|------|------|-------------|
| `options` | `T[]` | Array of option values |
| `value` | `T` | Controlled selected value |
| `defaultValue` | `T` | Initial value (uncontrolled) |
| `onChange` | `(value: T) => void` | Selection change handler |
| `optionValue` | `keyof T \| ((item: T) => string)` | Key or accessor for option identity |
| `optionTextValue` | `keyof T \| ((item: T) => string)` | Key or accessor for display text |
| `itemComponent` | `Component` | Render function for each item |
| `placeholder` | `string` | Placeholder when no value selected |
| `disabled` | `boolean` | Disable the select |

### Select.Trigger

Styled trigger button. Shows the selected value and a chevron icon.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Height, padding, and text size |
| `class` | `string` | -- | Additional Tailwind classes |
| `children` | `JSX.Element` | -- | Trigger content (typically `Select.Value`) |

### Select.Value

Renders the selected value's text. Place inside `Select.Trigger`.

### Select.HiddenSelect

Hidden native `<select>` for form submission. Place inside the root.

### Select.Content

Portal-rendered dropdown panel with entry/exit animations.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | -- | Additional Tailwind classes |

### Select.Item

Individual option within the dropdown. Shows a check icon when selected.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | `T` | -- | The option value (from Kobalte) |
| `class` | `string` | -- | Additional Tailwind classes |
| `children` | `JSX.Element` | -- | Item display content |

### Select.Section

Groups related items with optional label.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | -- | Additional Tailwind classes |

### Select.SectionLabel

Uppercase label for a section group. Styled like the Label component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `class` | `string` | -- | Additional Tailwind classes |

## Basic usage

```tsx
<Select
  options={["Apple", "Banana", "Cherry"]}
  placeholder="Pick a fruit"
  itemComponent={(props) => (
    <Select.Item item={props.item}>{props.item.rawValue}</Select.Item>
  )}
>
  <Select.Trigger>
    <Select.Value<string>>{(state) => state.selectedOption()}</Select.Value>
  </Select.Trigger>
  <Select.Content />
</Select>
```

## With sections

```tsx
<Select
  options={options}
  optionValue="id"
  optionTextValue="label"
  itemComponent={(props) => (
    <Select.Item item={props.item}>{props.item.rawValue.label}</Select.Item>
  )}
>
  <Select.Trigger size="sm">
    <Select.Value<Option>>{(state) => state.selectedOption()?.label}</Select.Value>
  </Select.Trigger>
  <Select.Content>
    <Select.Section>
      <Select.SectionLabel>Fruits</Select.SectionLabel>
    </Select.Section>
  </Select.Content>
</Select>
```

## Composition

The `selectTriggerVariants` export is available for applying trigger styles to custom elements:

```tsx
import { selectTriggerVariants } from "@fcalell/ui/components/select";
```
