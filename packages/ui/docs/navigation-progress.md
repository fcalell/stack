# NavigationProgress

Thin progress bar for page transitions. Trickles from 15% to 90% while loading, snaps to 100% and fades out when done.

```tsx
import { NavigationProgress } from "@fcalell/ui/components/navigation-progress";
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `loading` | `boolean` | Whether a navigation is in progress |

## Basic usage

```tsx
<NavigationProgress loading={isNavigating()} />
```

Place at the top of your layout. The bar is 2px tall, full width, primary color.
