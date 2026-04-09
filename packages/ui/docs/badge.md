# Badge

Inline status indicator or label. Use to tag items with a category, status, or count.

```tsx
import { Badge } from "@fcalell/ui/components/badge";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "secondary" \| "outline" \| "destructive" \| "success" \| "warning"` | `"default"` | Visual style |
| `round` | `boolean` | `false` | Use `rounded-full` instead of `rounded-md` |
| `as` | `ValidComponent` | `"div"` | Override the rendered element |
| `class` | `string` | -- | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | -- | -- | All HTML attributes for the rendered element |

## Variants

### default

Solid primary background. Use for primary categories or active states.

```tsx
<Badge>New</Badge>
```

### secondary

Neutral muted background. Use for secondary labels or metadata tags.

```tsx
<Badge variant="secondary">Draft</Badge>
```

### outline

Border only, transparent background. Use for subtle categorization that doesn't compete with content.

```tsx
<Badge variant="outline">v2.1.0</Badge>
```

### destructive

Tinted destructive background with border. Use for error states or critical labels.

```tsx
<Badge variant="destructive">Failed</Badge>
```

### success

Tinted success background with border. Use for positive states or completion indicators.

```tsx
<Badge variant="success">Active</Badge>
```

### warning

Tinted warning background with border. Use for attention-needed states.

```tsx
<Badge variant="warning">Expiring</Badge>
```

## Round

Pill shape for counters or compact labels:

```tsx
<Badge round>3</Badge>
<Badge variant="success" round>Online</Badge>
```

## Composition

The `badgeVariants` export is available for applying badge styles to custom elements:

```tsx
import { badgeVariants } from "@fcalell/ui/components/badge";

<span class={badgeVariants({ variant: "success" })}>Active</span>
```
