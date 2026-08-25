# Tooltip

Informational popup on hover/focus. Built on Kobalte's Tooltip primitive for delay handling, portal rendering, and accessibility.

```tsx
import { Tooltip } from "@fcalell/plugin-solid-ui/components/tooltip";
```

## Sub-components

### Tooltip (Root)

Manages tooltip state with a 4px gutter from the trigger.

### Tooltip.Trigger

The element that activates the tooltip on hover/focus.

### Tooltip.Content

Portal-rendered tooltip panel with border, `surface` background, and entry/exit animations.

| Prop | Type | Description |
|------|------|-------------|

## Basic usage

```tsx
<Tooltip>
  <Tooltip.Trigger as={Button} emphasis="tertiary">
    <Info />
  </Tooltip.Trigger>
  <Tooltip.Content>More information about this feature.</Tooltip.Content>
</Tooltip>
```
