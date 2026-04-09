# Tabs

Tabbed navigation with animated indicator. Built on Kobalte's Tabs primitive for keyboard arrow-key navigation and ARIA tab semantics.

```tsx
import { Tabs } from "@fcalell/ui/components/tabs";
```

## Sub-components

### Tabs (Root)

Kobalte's Tabs.Root. Pass `defaultValue` or `value`/`onChange`.

### Tabs.List

Horizontal tab bar with muted background.

### Tabs.Trigger

Individual tab button. Highlights with `bg-background` when selected.

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Tab identifier |
| `class` | `string` | Additional Tailwind classes |

### Tabs.Content

Tab panel. Only the active panel is rendered.

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Matches a trigger value |

### Tabs.Indicator

Animated underline/sidebar indicator that slides between tabs. Primary color.

## Basic usage

```tsx
<Tabs defaultValue="general">
  <Tabs.List>
    <Tabs.Trigger value="general">General</Tabs.Trigger>
    <Tabs.Trigger value="advanced">Advanced</Tabs.Trigger>
    <Tabs.Indicator />
  </Tabs.List>
  <Tabs.Content value="general">General settings here.</Tabs.Content>
  <Tabs.Content value="advanced">Advanced settings here.</Tabs.Content>
</Tabs>
```
