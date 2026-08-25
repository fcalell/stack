# Toggle

Binary switch. Built on Kobalte's Switch primitive for keyboard support and ARIA attributes (the control announces as a switch). The track renders the shared `TOGGLE` matrix: `bg-edge` off, the `accent` fill on, the same cells the native plugin renders; the knob is the shared `TOGGLE_KNOB` constant and the disabled fade is `CONTROL_MUTED`.

```tsx
import { Toggle } from "@fcalell/plugin-solid-ui/components/toggle";
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `checked` | `boolean` | Checked state, required. The component is always controlled |
| `onChange` | `(checked: boolean) => void` | Called when the switch is pressed or toggled by keyboard, required |
| `disabled` | `boolean` | Disable interaction and fade the control |

`checked` and `onChange` are required on purpose: the track's cell is computed from the prop, so an uncontrolled switch would flip its accessible state while the look froze. Kobalte's uncontrolled surface (`defaultChecked` and friends) stays out of the props type.

## Basic usage

```tsx
const [enabled, setEnabled] = createSignal(false);

<Toggle checked={enabled()} onChange={setEnabled} />
<Toggle checked={enabled()} onChange={setEnabled} disabled />
```

## Toggle or Checkbox

`Toggle` flips a setting that takes effect immediately; `Checkbox` marks an item inside a form or a list that is submitted or acted on later. Both spell `checked` / `onChange` / `disabled`.
