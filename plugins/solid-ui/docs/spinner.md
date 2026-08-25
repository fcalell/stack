# Spinner

The spinning glyph for a busy control. Renders a lucide `LoaderCircle` at 16px with `role="status"`, colored by a contract tone. A busy `Button` renders it automatically in the label's own content tone, so most screens never mount one by hand.

```tsx
import { Spinner } from "@fcalell/plugin-solid-ui/components/spinner";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | `ContentTone` | `"ink-1"` | The contract color the glyph spins in |

There is no size prop: the glyph is 16px, and a `Button` sizes it through its own glyph map. Spinner carries no matrix on purpose: native colors a prop rather than a class, so a tone cell would be platform-conditional, which the shared matrices forbid. `ContentTone` is the shared contract.

## Basic usage

```tsx
<Spinner />
<Spinner tone="ink-3" />
```

## Spinner or Loader

One name per concept, two concepts: `Spinner` is the spinning glyph for a busy control (a submitting button, an OAuth hand-off); `Loader` is the text-scramble loading treatment for a pane, and stays web-only. For a content placeholder, use `Skeleton`.
