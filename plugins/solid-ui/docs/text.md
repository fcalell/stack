# Text

The typography primitive every other component renders text through. One component, one role axis, no built-in margins: the parent handles spacing with a `gap` or an inset rung.

```tsx
import { Text } from "@fcalell/plugin-solid-ui/components/text";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"display" \| "h1" \| "h2" \| "h3" \| "body" \| "callout" \| "caption" \| "micro" \| "rowtitle"` | `"body"` | The type role: size, weight, leading, tracking |
| `tone` | `"ink-1" \| "ink-2" \| "ink-3" \| "ink-4" \| "brand" \| "interactive" \| "ok" \| "warn" \| "danger" \| "accent-ink" \| "oncover-fg" \| "oncover-ink"` | inherited | Ink colour |
| `strong` | `boolean` | `false` | Lifts the role one weight step |
| `mono` | `boolean` | `false` | Monospace family. Measured data only: money, counts, coordinates, times, IDs |
| `as` | `ValidComponent` | `"p"` | The rendered HTML element |
| `...rest` | -- | -- | All HTML attributes for the rendered element |

`variant` and `tone` are the axes of the shared `TEXT` matrix in `@fcalell/ui-core`, and `strong` reads `TEXT_STRONG`. Pick the role, never a raw size.

## Roles

| Role | Size | Weight | Use it for |
|------|------|--------|------------|
| `display` | 34px | bold | A single hero number or title |
| `h1` | 28px | bold | The page title, once per page |
| `h2` | 22px | semibold | A section heading |
| `h3` | 18px | semibold | A subsection heading, a card title |
| `rowtitle` | 16px | semibold | A row or list-item title |
| `body` | 16px | medium | Paragraphs and general content |
| `callout` | 14px | bold | A short emphasised line inside a surface |
| `caption` | 13px | medium | Running meta, hints, errors, timestamps |
| `micro` | 12px | medium | Labels only. Its tracking is why |

The element and the role are separate choices, so a heading that must not enter the document outline still reads as one:

```tsx
<Text as="h1" variant="h1">Dashboard</Text>
<Text as="span" variant="h1">Styled as h1, renders as span</Text>
```

## Tone

Leave `tone` unset and the text inherits its ground's ink, which the base layer sets to `ink-1`. Set it to step down the hierarchy.

```tsx
<Text as="h1" variant="h1">Dashboard</Text>
<Text variant="h3" tone="ink-2">Overview of your project's performance this week.</Text>
<Text variant="caption" tone="ink-3">Maximum 5 MB per file.</Text>
```

## Strong

`strong` lifts the role one weight step. `display`, `h1` and `callout` already carry their peak weight, so it does nothing on those three.

```tsx
<Text variant="caption" strong>3 tasks remaining</Text>
```

## Mono

`mono` is for measured data: money, counts, coordinates, times, IDs. Never labels, chrome, or prose. A unit symbol fused to a measurement stays mono; a pluralizing noun the count modifies stays sans.

```tsx
<Text as="span" variant="callout" mono>1,204 ms</Text>
```

## Inline code

An inline code snippet is `as="code"` at the `callout` role with `mono`, plus the chip overlay:

```tsx
<Text>
  Run{" "}
  <Text as="code" variant="callout" mono>
    pnpm install
  </Text>{" "}
  to get started.
</Text>
```
