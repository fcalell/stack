# Pair

A glued micro-pair (label to control, title to meta), gapped at the `pair` rung (4px). Column by default; `row` lays it inline. The gap comes from the shared `RHYTHM` matrix in `@fcalell/ui-core`.

```tsx
import { Pair } from "@fcalell/plugin-solid-ui/components/pair";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `row` | `boolean` | `false` | Lay the pair inline, centered |
| `children` | `JSX.Element` | -- | The two glued members |

## Usage

```tsx
<Pair>
  <Text variant="micro" tone="ink-3">Balance</Text>
  <Text variant="h2" mono>1,240.00</Text>
</Pair>

<Pair row>
  <Text variant="callout">Autosave</Text>
  <Badge tone="ok">On</Badge>
</Pair>
```
