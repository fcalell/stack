# Stack

A column of stacked units, gapped at the `stack` rung (12px). The gap comes from the shared `RHYTHM` matrix in `@fcalell/ui-core`; the column layout is the web overlay.

```tsx
import { Stack } from "@fcalell/plugin-solid-ui/components/stack";
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `JSX.Element` | The stacked units |

## Usage

```tsx
<Stack>
  <Card>First</Card>
  <Card>Second</Card>
</Stack>
```

## Picking a rung

Rhythm steps down one rung per nesting level: a screen's regions gap at `section` (Section), stacked units at `stack` (Stack), items in a group at `row` (Row), and glued micro-pairs at `pair` (Pair).
