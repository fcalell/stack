# Toast

Notification toasts via solid-sonner. Provides the `Toaster` container and `toast()` imperative API.

```tsx
import { Toaster, toast } from "@fcalell/plugin-solid-ui/components/toast";
```

## Toaster

Mount once at the app root. Renders all active toasts.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `"dark" \| "light"` | `"dark"` | Color scheme |
| `position` | `string` | `"top-right"` | Toast position |

solid-sonner's `class`, `className`, `style`, `toastOptions`, and `icons` props are omitted from the type: the toast design is the component's own. The remaining behavioral props pass through.

```tsx
<Toaster />
```

## toast()

Imperative API to show toasts:

```tsx
toast("File saved");
toast.success("Project created");
toast.error("Something went wrong");
toast.warning("Rate limit approaching");
toast.info("New version available");
```

## Styling

Toasts use unstyled mode with design system tokens. Status variants get a 3px colored left border: `success` rides `ok`, `error` rides `danger`, `warning` rides `warn`, and `info` rides `ink-1`.
