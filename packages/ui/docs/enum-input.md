# EnumInput

Tag/chip input for entering multiple string values. Supports comma-separated paste, Enter to add, Backspace to remove the last value, and deduplication.

```tsx
import { EnumInput } from "@fcalell/ui/components/enum-input";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `values` | `string[]` | -- | Current list of values (controlled) |
| `onChange` | `(values: string[]) => void` | -- | Called when values change |
| `disabled` | `boolean` | `false` | Disable input and remove interactions |
| `placeholder` | `string` | `"Type and press Enter"` | Placeholder when empty |

## Basic usage

```tsx
const [tags, setTags] = createSignal<string[]>([]);

<EnumInput values={tags()} onChange={setTags} />
```

## Behavior

- **Enter** adds the current input as a new value
- **Backspace** on an empty input removes the last value
- **Comma** splits input and adds each part as a separate value
- Duplicate values (case-insensitive) are silently ignored
- Each tag has an X button for individual removal
