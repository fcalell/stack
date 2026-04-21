# Avatar

Circular user avatar with image and fallback support. Built on Kobalte's Image primitive for lazy loading and graceful fallback.

```tsx
import { Avatar } from "@fcalell/plugin-solid-ui/components/avatar";
```

## Sub-components

### Avatar (Root)

Container with circular clip. Built on Kobalte's Image.Root.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Avatar dimensions |
| `class` | `string` | -- | Additional Tailwind classes |

### Avatar.Image

The `<img>` element. Renders only when the image loads successfully.

| Prop | Type | Description |
|------|------|-------------|
| `src` | `string` | Image URL |
| `alt` | `string` | Required alt text |
| `class` | `string` | Additional Tailwind classes |

### Avatar.Fallback

Shown while the image loads or if it fails. Centered monospace text on muted background.

| Prop | Type | Description |
|------|------|-------------|
| `class` | `string` | Additional Tailwind classes |
| `children` | `JSX.Element` | Fallback content (typically initials) |

## Sizes

| Size | Dimensions | Text |
|------|-----------|------|
| `sm` | 32px (`size-8`) | 12px |
| `default` | 40px (`size-10`) | 14px |
| `lg` | 48px (`size-12`) | 16px |

## Basic usage

```tsx
<Avatar>
  <Avatar.Image src="/avatar.jpg" alt="John Doe" />
  <Avatar.Fallback>JD</Avatar.Fallback>
</Avatar>
```

## Sizes

```tsx
<Avatar size="sm">
  <Avatar.Fallback>S</Avatar.Fallback>
</Avatar>
<Avatar size="lg">
  <Avatar.Image src="/large.jpg" alt="User" />
  <Avatar.Fallback>LG</Avatar.Fallback>
</Avatar>
```

## Composition

The `avatarVariants` export is available for applying avatar sizing to custom elements:

```tsx
import { avatarVariants } from "@fcalell/plugin-solid-ui/components/avatar";
```
