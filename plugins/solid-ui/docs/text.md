# Text

Typography primitives used by all other components for rendered text. No built-in margins — parent components handle spacing via `gap` or padding.

```tsx
import { Text } from "@fcalell/plugin-solid-ui/components/text";
```

## Common props

All sub-components accept:

| Prop | Type | Description |
|------|------|-------------|
| `as` | `ValidComponent` | Override the rendered HTML element |
| `class` | `string` | Additional Tailwind classes (merged via `cn()`) |
| `...rest` | — | All HTML attributes for the rendered element |

## Sub-components

### Text.H1

Page title. Use once per page for the primary heading.

Renders `<h1>` — `text-4xl`, bold, 1.1 line-height, tight tracking.

```tsx
<Text.H1>Dashboard</Text.H1>
<Text.H1 as="span">Styled as H1, renders as span</Text.H1>
```

### Text.H2

Section heading. Use to divide major content areas.

Renders `<h2>` — `text-3xl`, semibold, 1.15 line-height, tight tracking.

```tsx
<Text.H2>Recent activity</Text.H2>
```

### Text.H3

Subsection heading. Use within sections for grouping related content.

Renders `<h3>` — `text-2xl`, semibold, 1.2 line-height, tight tracking.

```tsx
<Text.H3>Team members</Text.H3>
```

### Text.H4

Minor heading. Use for card titles, list group headers, or inline labels that need heading weight.

Renders `<h4>` — `text-xl`, semibold, 1.25 line-height, tight tracking.

```tsx
<Text.H4>Settings</Text.H4>
```

### Text.P

Standard body text. Use for paragraphs and general content.

Renders `<p>` — `text-base` (16px), 1.625 line-height (optimized for reading comfort).

```tsx
<Text.P>Your project was created successfully.</Text.P>
<Text.P class="max-w-prose">Constrained width for long-form reading.</Text.P>
```

### Text.Lead

Introductory paragraph. Use below a page title or at the top of a section to provide context. Rendered in muted foreground to establish visual hierarchy below the heading.

Renders `<p>` — `text-xl`, 1.625 line-height, `text-muted-foreground`.

```tsx
<Text.H1>Dashboard</Text.H1>
<Text.Lead>Overview of your project's performance this week.</Text.Lead>
```

### Text.Large

Emphasized body text. Use for callouts, key metrics labels, or content that needs more weight than a paragraph but isn't a heading.

Renders `<p>` — `text-lg`, semibold, 1.375 line-height.

```tsx
<Text.Large>3 tasks remaining</Text.Large>
```

### Text.Small

Fine print and auxiliary text. Use for timestamps, footnotes, or secondary metadata.

Renders `<small>` — `text-sm` (14px), 1.5 line-height.

```tsx
<Text.Small>Created 3 days ago</Text.Small>
```

### Text.Muted

De-emphasized helper text. Use for descriptions below form fields, empty state hints, or secondary information. Rendered in muted foreground.

Renders `<p>` — `text-sm`, 1.5 line-height, `text-muted-foreground`.

```tsx
<Text.Muted>Maximum 5 MB per file.</Text.Muted>
```

### Text.Code

Inline code snippet. Use within prose for variable names, commands, or short code references. Sized relative to its parent (`0.9em`) so it scales within any text context.

Renders `<code>` — `text-[0.9em]`, mono font, `bg-muted`, `rounded-sm`, horizontal/vertical padding.

```tsx
<Text.P>Run <Text.Code>pnpm install</Text.Code> to get started.</Text.P>
```
