# Skeleton

Neutral placeholder block for a loading pane. Renders the shared `SKELETON` constant (`rounded-md bg-surface`), the same look the native plugin ships, with a web-only pulse animation on top.

```tsx
import { Skeleton } from "@fcalell/plugin-solid-ui/components/skeleton";
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `width` | `number \| string` | Block width; a number is pixels, a string passes through (`"50%"`) |
| `height` | `number \| string` | Block height, same shapes |

The names match native's `Skeleton`; there the type is React Native's `DimensionValue`.

## Basic usage

```tsx
<Skeleton width="100%" height={16} />
<Skeleton width={120} height={120} />
```

## As a loading fallback

Stack a few blocks in the shape of the content they stand in for:

```tsx
<QueryBoundary
  query={query}
  loadingFallback={
    <Stack>
      <Skeleton height={16} />
      <Skeleton height={16} />
      <Skeleton height={16} />
    </Stack>
  }
>
  {(data) => <List items={data()} />}
</QueryBoundary>
```

For a busy control, reach for `Spinner`; for a pane that loads with a text treatment, `Loader`.
