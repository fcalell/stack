# Button

Interactive trigger for actions. Built on Kobalte's Button primitive for full keyboard and accessibility support.

```tsx
import { Button } from "@fcalell/plugin-solid-ui/components/button";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `emphasis` | `"primary" \| "secondary" \| "tertiary"` | `"primary"` | How much weight the action carries |
| `tone` | `"neutral" \| "danger"` | `"neutral"` | The consequence of the action |
| `loading` | `boolean` | -- | Disables the press and spins a glyph beside the label in the label's content tone |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Padding, type role, and icon sizing |
| `disabled` | `boolean` | `false` | Swaps the fill and ink for the muted pair and removes pointer events |
| `as` | `ValidComponent` | `"button"` | Override the rendered element |
| `children` | `JSX.Element` | -- | Button content |
| `...rest` | -- | -- | All HTML button attributes and Kobalte ButtonRootProps |

`emphasis` and `tone` are the two axes of the shared `BUTTON` matrix in `@fcalell/ui-core`. That table carries fills and borders only, so the component composes `BUTTON` and `BUTTON_LABEL` on the same node.

## Emphasis

### primary

The one action a screen is asking for. Solid `accent` fill with an `accent-ink` label.

```tsx
<Button>Save changes</Button>
```

### secondary

An action beside the primary one. Transparent with an `edge-2` border.

```tsx
<Button emphasis="secondary">Cancel</Button>
```

### tertiary

Minimal chrome. Transparent until hovered, when it takes a `surface-2` ground. Use it in toolbars, sidebars, or as an inline action.

```tsx
<Button emphasis="tertiary">Edit</Button>
```

## Tone

`tone="danger"` marks an irreversible action. It composes with every emphasis.

```tsx
<Button tone="danger">Delete project</Button>
<Button emphasis="secondary" tone="danger">Remove</Button>
```

## Hover and press

The ground moves, never the alpha. A transparent emphasis gains a `surface-2` ground on hover and `surface-3` on press; the filled neutral emphasis steps down the ink ladder to `ink-2` then `ink-3`. Every danger cell lands on `danger-soft`, and the filled one switches its label to `text-danger` to match, since `danger-ink` is built for the solid fill.

Fading the control instead would composite the label with its own fill and drop the `accent-ink` on `accent` contrast the contract guarantees, and it would give a bordered button less contrast on hover rather than more.

## Sizes

| Size | Min height | Type role | Icon |
|------|------------|-----------|------|
| `sm` | 44px (`min-h-11`) | `caption` (13px) | 16px |
| `md` | 44px (`min-h-11`) | `callout` (14px) | 16px |
| `lg` | 48px (`min-h-12`) | `body` (16px) | 20px |

Every size clears the 44px tap floor through `min-h`, never a pinned `h`, so the label grows the control under OS font scaling instead of clipping inside it.

## With icons

SVG icons are sized per the button's `size` and get `pointer-events-none` and `shrink-0`.

```tsx
import { Plus, Trash2 } from "lucide-solid";

<Button><Plus /> New project</Button>
<Button tone="danger" size="sm"><Trash2 /> Delete</Button>
```

## Icon-only

There is no icon size and no class prop. An icon-only look is a consumer primitive under `ui/`; a glyph beside a label is just a child:

```tsx
<Button emphasis="tertiary"><Plus /> Add</Button>
```

## Polymorphic

Render as an anchor or any other element while keeping button styling and accessibility:

```tsx
<Button as="a" href="/docs">Documentation</Button>
```

When rendered as a non-button element, Kobalte adds `role="button"` and keyboard handling (Enter/Space to activate) automatically.

## Composition

Other components compose with Button by importing it directly:

```tsx
import { Button } from "#components/button";

// Inside DangerZone
<Button tone="danger" size="sm">...</Button>
```

No class function is exported. A link that should look like a button goes through Kobalte's `as`:

```tsx
<Button as="a" emphasis="secondary" href="/docs">Docs</Button>
```
