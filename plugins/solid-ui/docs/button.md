# Button

Interactive trigger for actions. Built on Kobalte's Button primitive for full keyboard and accessibility support.

```tsx
import { Button } from "@fcalell/plugin-solid-ui/components/button";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | Visual style |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | Height, padding, and icon sizing |
| `disabled` | `boolean` | `false` | Disables interaction (reduces opacity, removes pointer events) |
| `as` | `ValidComponent` | `"button"` | Override the rendered element |
| `class` | `string` | — | Additional Tailwind classes (merged via `cn()`) |
| `children` | `JSX.Element` | — | Button content |
| `...rest` | — | — | All HTML button attributes and Kobalte ButtonRootProps |

## Variants

### default

Primary action. Solid primary background with primary-foreground text.

```tsx
<Button>Save changes</Button>
```

### destructive

Dangerous or irreversible action. Solid destructive background.

```tsx
<Button variant="destructive">Delete project</Button>
```

### outline

Secondary action with border. Transparent background, fills on hover.

```tsx
<Button variant="outline">Cancel</Button>
```

### secondary

Lower-emphasis alternative to default. Muted background.

```tsx
<Button variant="secondary">Export</Button>
```

### ghost

Minimal chrome. Transparent until hovered — use in toolbars, sidebars, or as inline actions.

```tsx
<Button variant="ghost">Edit</Button>
```

### link

Styled as an inline text link. No background or border, underline on hover.

```tsx
<Button variant="link">Learn more</Button>
```

## Sizes

| Size | Height | Text | Icon | Notes |
|------|--------|------|------|-------|
| `default` | 40px (`h-10`) | 14px | 16px | Standard actions |
| `sm` | 36px (`h-9`) | 12px | 16px | Compact UI. 44px invisible touch target for accessibility |
| `lg` | 44px (`h-11`) | 14px | 20px | Prominent CTAs, wider horizontal padding |
| `icon` | 40px (`size-10`) | — | 20px | Icon-only, square aspect ratio |

The `sm` size includes an invisible pseudo-element that expands the touch target to 44px minimum, meeting accessibility guidelines without affecting visual layout.

## With icons

SVG icons are automatically sized per the button's `size` variant and have `pointer-events-none` and `shrink-0` applied.

```tsx
import { Plus, Trash2 } from "lucide-solid";

<Button><Plus /> New project</Button>
<Button variant="destructive" size="sm"><Trash2 /> Delete</Button>
<Button variant="ghost" size="icon"><Plus /></Button>
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

// Inside SidebarTrigger
<Button variant="ghost" size="icon" class="size-7">...</Button>

// Inside DangerZone
<Button variant="destructive" size="sm">...</Button>
```

The `buttonVariants` export is available for applying button styles to custom elements:

```tsx
import { buttonVariants } from "@fcalell/plugin-solid-ui/components/button";

<a class={buttonVariants({ variant: "outline" })} href="/docs">Docs</a>
```
