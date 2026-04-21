# Checkbox

Toggle control with optional label. Built on Kobalte's Checkbox primitive for full keyboard support, ARIA attributes, and indeterminate state.

```tsx
import { Checkbox } from "@fcalell/plugin-solid-ui/components/checkbox";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Checkbox dimensions and icon size |
| `label` | `JSX.Element` | -- | Optional label rendered next to the checkbox |
| `checked` | `boolean` | -- | Controlled checked state |
| `defaultChecked` | `boolean` | -- | Initial checked state (uncontrolled) |
| `indeterminate` | `boolean` | -- | Show minus icon instead of check |
| `disabled` | `boolean` | -- | Disable interaction |
| `onChange` | `(checked: boolean) => void` | -- | Called when checked state changes |
| `class` | `string` | -- | Additional Tailwind classes on the root (merged via `cn()`) |
| `...rest` | -- | -- | All Kobalte CheckboxRootProps |

## Sizes

| Size | Dimensions | Icon |
|------|-----------|------|
| `sm` | 14px (`size-3.5`) | 14px |
| `default` | 16px (`size-4`) | 16px |
| `lg` | 20px (`size-5`) | 20px |

## Basic usage

```tsx
<Checkbox label="Accept terms" />
<Checkbox checked={true} label="Pre-checked" />
```

## Indeterminate

Shows a minus icon instead of a check — use for "select all" when only some items are selected:

```tsx
<Checkbox indeterminate label="Select all" />
```

## Without label

When used without a label (e.g. in a table row), ensure you provide an `aria-label`:

```tsx
<Checkbox aria-label="Select row" />
```

## Composition

The `checkboxVariants` export is available for custom checkbox styling:

```tsx
import { checkboxVariants } from "@fcalell/plugin-solid-ui/components/checkbox";
```
