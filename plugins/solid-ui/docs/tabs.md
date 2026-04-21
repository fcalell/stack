# Tabs

Data-driven tabbed navigation with animated indicator. Built on Kobalte's Tabs primitive for keyboard arrow-key navigation and ARIA tab semantics.

```tsx
import { Tabs } from "@fcalell/plugin-solid-ui/components/tabs";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `Tab[]` | -- | Array of tab definitions |
| `value` | `string` | -- | Controlled selected value |
| `defaultValue` | `string` | -- | Initial value (uncontrolled) |
| `onValueChange` | `(value: string) => void` | -- | Selection change handler |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Tab orientation |
| `class` | `string` | -- | Additional classes on the root |
| `listClass` | `string` | -- | Additional classes on the tab list |
| `contentClass` | `string` | -- | Additional classes on all tab content panels |
| `children` | `(tab: Tab) => JSX.Element` | -- | Custom trigger content render |

## Tab type

```ts
type Tab = {
  value: string;
  label: string;
  content: JSX.Element;
  disabled?: boolean;
};
```

## Basic usage

```tsx
<Tabs
  tabs={[
    { value: "general", label: "General", content: <p>General settings here.</p> },
    { value: "advanced", label: "Advanced", content: <p>Advanced settings here.</p> },
  ]}
  defaultValue="general"
/>
```

## Controlled

```tsx
<Tabs
  tabs={tabs}
  value={value()}
  onValueChange={setValue}
/>
```

## Custom trigger rendering

Pass a children render function to customize how each tab trigger appears. The function receives the `Tab` object and returns the content to display inside each trigger.

```tsx
<Tabs
  tabs={tabs}
  defaultValue="general"
>
  {(tab) => (
    <>
      <TabIcon name={tab.value} />
      {tab.label}
    </>
  )}
</Tabs>
```

## Disabled tabs

```tsx
<Tabs
  tabs={[
    { value: "general", label: "General", content: <GeneralSettings /> },
    { value: "billing", label: "Billing", content: <BillingSettings />, disabled: true },
  ]}
  defaultValue="general"
/>
```
