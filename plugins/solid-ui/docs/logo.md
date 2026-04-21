# Logo

Brand logo layout with icon and optional text. Supports responsive text reveal via container queries.

```tsx
import { Logo } from "@fcalell/plugin-solid-ui/components/logo";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `JSX.Element` | -- | Logo icon/SVG |
| `text` | `JSX.Element` | -- | Optional brand text |
| `size` | `"sm" \| "default" \| "lg" \| "xl" \| "2xl"` | `"default"` | Icon and text sizing |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Vertical alignment |
| `responsive` | `boolean` | `false` | Hide text below `@[8rem]` container width |
| `class` | `string` | -- | Additional Tailwind classes |

## Sizes

| Size | Icon | Text | Gap |
|------|------|------|-----|
| `sm` | 24px | 16px | 4px |
| `default` | 32px | 18px | 8px |
| `lg` | 40px | 24px | 8px |
| `xl` | 48px | 30px | 12px |
| `2xl` | 64px | 36px | 12px |

## Basic usage

```tsx
<Logo icon={<AppIcon />} text="My App" />
<Logo icon={<AppIcon />} text="My App" size="lg" />
```

## Responsive (sidebar)

Text hides when the container is too narrow (e.g. collapsed sidebar):

```tsx
<Logo icon={<AppIcon />} text="My App" responsive />
```

## Composition

The `logoIconClasses`, `logoContainerClasses`, and `logoTextClasses` CVA exports are available for custom logo layouts.
