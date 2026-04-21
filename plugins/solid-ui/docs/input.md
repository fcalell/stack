# Input

Text input field with size variants. Monospace font, muted background, 2px border that highlights on focus. Supports `aria-invalid` for error states.

```tsx
import { Input } from "@fcalell/plugin-solid-ui/components/input";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Height and padding |
| `type` | `string` | `"text"` | HTML input type |
| `class` | `string` | -- | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | -- | -- | All HTML input attributes |

## Sizes

| Size | Height | Text |
|------|--------|------|
| `sm` | 32px (`h-8`) | 14px |
| `default` | 40px (`h-10`) | 14px |
| `lg` | 48px (`h-12`) | 16px |

## Basic usage

```tsx
<Input placeholder="Enter your name" />
<Input type="email" placeholder="you@example.com" />
<Input size="sm" placeholder="Compact" />
```

## Error state

Set `aria-invalid` for destructive border and outline:

```tsx
<Input aria-invalid="true" value="bad value" />
```

## Disabled

```tsx
<Input disabled placeholder="Cannot edit" />
```

## Composition

The `inputClasses` export is available for applying input styles to custom elements:

```tsx
import { inputClasses } from "@fcalell/plugin-solid-ui/components/input";

<div class={inputClasses({ size: "default" })}>Custom input wrapper</div>
```
