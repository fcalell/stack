# Card

Bordered surface for grouping related content. Card background, rounded corners, with standard header/content/footer layout.

```tsx
import { Card } from "@fcalell/ui/components/card";
```

## Sub-components

### Card (Root)

Renders `<div>` with `bg-card`, `border`, and `rounded-lg`.

| Prop | Type | Description |
|------|------|-------------|
| `class` | `string` | Additional Tailwind classes |

### Card.Header

Flex column with `gap-1.5` and `p-6`. Place Title and Description here.

### Card.Title

Renders `<h3>` by default. Semibold, tight tracking, no line-height.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `ValidComponent` | `"h3"` | Override the rendered element |
| `class` | `string` | -- | Additional Tailwind classes |

### Card.Description

Muted secondary text below the title.

### Card.Content

Main body area with `p-6 pt-0`.

### Card.Footer

Flex row at the bottom with `p-6 pt-0`. Use for action buttons.

## Basic usage

```tsx
<Card>
  <Card.Header>
    <Card.Title>Project settings</Card.Title>
    <Card.Description>Manage your project configuration.</Card.Description>
  </Card.Header>
  <Card.Content>
    <p>Content goes here.</p>
  </Card.Content>
  <Card.Footer>
    <Button>Save</Button>
  </Card.Footer>
</Card>
```

## Minimal card

```tsx
<Card>
  <Card.Content class="p-6">
    <Text.P>Simple card with just content.</Text.P>
  </Card.Content>
</Card>
```
