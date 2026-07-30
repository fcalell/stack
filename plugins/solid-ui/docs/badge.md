# Badge

Inline status indicator or label. Use it to tag an item with a category, status, or count.

```tsx
import { Badge } from "@fcalell/plugin-solid-ui/components/badge";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | `"neutral" \| "brand" \| "interactive" \| "ok" \| "warn" \| "danger" \| "oncover"` | `"neutral"` | Fill and label colour |
| `as` | `ValidComponent` | `"div"` | Override the rendered element |
| `class` | `string` | -- | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | -- | -- | All HTML attributes for the rendered element |

`tone` is the axis of the shared `BADGE` matrix in `@fcalell/ui-core`. That table carries the fill only, so the component composes `BADGE` and `BADGE_LABEL` on the same node, plus the `micro` type role at semibold.

The matrix base is `rounded-full`, so every badge is a pill. There is no round prop.

## Tones

### neutral

`surface-2` fill with `ink-1` ink. Use it for secondary labels and metadata tags.

```tsx
<Badge>Draft</Badge>
```

### brand

`brand-soft` fill. Passive structural chrome: a category, a section marker. It never carries status.

```tsx
<Badge tone="brand">Beta</Badge>
```

### interactive

`interactive-soft` fill. Use it for a value that is current, live, or the reader's own.

```tsx
<Badge tone="interactive">You</Badge>
```

### ok

`ok-soft` fill. Settled, done, covered.

```tsx
<Badge tone="ok">Active</Badge>
```

### warn

`warn-soft` fill. Pending, caution, stale.

```tsx
<Badge tone="warn">Expiring</Badge>
```

### danger

`danger-soft` fill. Failure or a safety-critical state.

```tsx
<Badge tone="danger">Failed</Badge>
```

### oncover

`oncover-surface` fill with `oncover-ink`. Use it for a pill floated over a photo or cover band, where the ground must not flip at night.

```tsx
<Badge tone="oncover">4:32</Badge>
```

## Counters

A count is a badge like any other. The pill shape comes from the matrix base.

```tsx
<Badge>3</Badge>
<Badge tone="ok">12</Badge>
```

## Composition

No class function is exported. A badge look on another element goes through `as`:

```tsx
<Badge as="span" tone="ok">Active</Badge>
```
