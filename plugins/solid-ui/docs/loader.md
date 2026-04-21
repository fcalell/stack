# Loader

Animated text scramble effect. Characters resolve left-to-right from random hex characters to the target text, then pause and restart.

```tsx
import { Loader } from "@fcalell/plugin-solid-ui/components/loader";
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `text` | `string` | Target text to resolve to |
| `class` | `string` | Additional Tailwind classes |

## Basic usage

```tsx
<Loader text="Loading..." />
<Loader text="Connecting to server" class="text-sm" />
```

## Behavior

- Characters resolve at ~100ms per character (50ms tick, 2 ticks per resolve)
- Spaces are skipped during scramble
- After fully resolving, pauses for 1.5s then restarts
- Uses hex-style characters (`0-9a-f.:/-_#`) for the scramble effect
- Renders with `role="status"` and `aria-label` for screen readers
