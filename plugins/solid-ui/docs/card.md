# Card

The enclosure around a discrete record, a divided row list, or a tile. It takes the shared `CARD` matrix: `surface` fill, `rounded-xl`, and a `shadow-1` lift instead of a border.

```tsx
import { Card } from "@fcalell/plugin-solid-ui/components/card";
```

## Sub-components

### Card (Root)

Renders `<div>`. Carries the whole inset, so every section below it is pure rhythm. Its web overlay is `flex flex-col gap-stack`, which separates the sections at 12px.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `"card" \| "none"` | `"card"` | The body inset, 16px or none |
| `ring` | `"none" \| "warn"` | `"none"` | A 2px `warn-mark` ring for a card that needs attention |

### Card.Header

Flex column at `gap-pair` (4px). Place Title and Description here.

### Card.Title

Renders `<h3>` by default at the `h3` type role.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `ValidComponent` | `"h3"` | Override the rendered element |

### Card.Description

Renders `<p>` at the `caption` role in `ink-3`.

### Card.Content

The body area. It carries no classes of its own; the root's inset and rhythm place it.

### Card.Footer

Flex row at the bottom. Use it for action buttons.

## Basic usage

```tsx
<Card>
  <Card.Header>
    <Card.Title>Project settings</Card.Title>
    <Card.Description>Manage your project configuration.</Card.Description>
  </Card.Header>
  <Card.Content>
    <Text>Content goes here.</Text>
  </Card.Content>
  <Card.Footer>
    <Button>Save</Button>
  </Card.Footer>
</Card>
```

## Minimal card

```tsx
<Card>
  <Card.Content>
    <Text>Simple card with just content.</Text>
  </Card.Content>
</Card>
```

## Edge-to-edge content

Set `padding="none"` when the content runs to the card's edge, such as a full-bleed image or a divided row list that draws its own insets.

```tsx
<Card padding="none">
  <img src={cover} alt="" />
</Card>
```
