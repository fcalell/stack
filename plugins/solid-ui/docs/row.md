# Row

Items in a group, laid inline and gapped at the `row` rung (8px). The gap comes from the shared `RHYTHM` matrix in `@fcalell/ui-core`; the inline layout and centering are the web overlay.

```tsx
import { Row } from "@fcalell/plugin-solid-ui/components/row";
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `JSX.Element` | The grouped items |
| `wrap` | `boolean` | Let the items break onto further lines at the same gap: a chip row, a tag cluster |

## Usage

```tsx
<Row>
  <Badge tone="ok">Paid</Badge>
  <Badge>Draft</Badge>
</Row>
```

```tsx
<Row wrap>
  <For each={tags()}>{(tag) => <Badge>{tag}</Badge>}</For>
</Row>
```

A left/right split is `justify-between` geometry, not a Row: reach for a raw element at the call site instead.
