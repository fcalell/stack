# Checkbox

Checklist control with optional label. Built on Kobalte's Checkbox primitive for full keyboard support, ARIA attributes, and indeterminate state. The box renders the shared `CHECKBOX` matrix: `rounded-md` with a `border-ink-1` ring unchecked, the `accent` fill with the `accent-ink` tick checked, the same cells the native plugin renders. Kobalte owns the checked state, so the checked cells ride `data-checked:` selectors; the disabled fade is the shared `CONTROL_MUTED` constant.

```tsx
import { Checkbox } from "@fcalell/plugin-solid-ui/components/checkbox";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Checkbox dimensions and icon size |
| `label` | `string` | -- | Optional label rendered next to the checkbox |
| `checked` | `boolean` | -- | Controlled checked state |
| `defaultChecked` | `boolean` | -- | Initial checked state (uncontrolled) |
| `indeterminate` | `boolean` | -- | Show minus icon instead of check |
| `disabled` | `boolean` | -- | Disable interaction |
| `onChange` | `(checked: boolean) => void` | -- | Called when checked state changes |
| `...rest` | -- | -- | All Kobalte CheckboxRootProps |

## Sizes

| Size | Dimensions | Icon |
|------|-----------|------|
| `sm` | 14px (`size-3.5`) | 14px |
| `md` | 16px (`size-4`) | 16px |
| `lg` | 20px (`size-5`) | 20px |

## Basic usage

```tsx
<Checkbox label="Accept terms" />
<Checkbox checked={true} label="Pre-checked" />
```

## Indeterminate

Shows a minus icon instead of a check. Use it for "select all" when only some items are selected:

```tsx
<Checkbox indeterminate label="Select all" />
```

## Without label

When used without a label (e.g. in a table row), ensure you provide an `aria-label`:

```tsx
<Checkbox aria-label="Select row" />
```

A look the matrix does not cover has two homes: the `CHECKBOX` matrix grows in ui-core, or the consumer authors its own primitive under `ui/`.
