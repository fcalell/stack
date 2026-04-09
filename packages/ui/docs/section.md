# Section

Page section with header, title, and content areas. Auto-generates an `aria-labelledby` link between the title and section element.

```tsx
import { Section } from "@fcalell/ui/components/section";
```

## Sub-components

### Section (Root)

Renders `<section>` with `aria-labelledby` pointing to the title.

### Section.Header

Flex row with bottom border. Use for title + toolbar layout.

### Section.Title

Renders `<h2>` by default. Bold, uppercase, wide tracking. Auto-linked via ID.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `ValidComponent` | `"h2"` | Override the heading element |
| `class` | `string` | -- | Additional Tailwind classes |

### Section.Content

Padded content area (`px-6 py-6`).

### Section.Table

Full-width wrapper with no padding — use for tables or data grids.

## Basic usage

```tsx
<Section>
  <Section.Header>
    <Section.Title>Team members</Section.Title>
    <Button size="sm">Invite</Button>
  </Section.Header>
  <Section.Content>
    <p>Content here.</p>
  </Section.Content>
</Section>
```
