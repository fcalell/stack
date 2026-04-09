# InputOTP

One-time password input with individual character slots. Built on `@corvu/otp-field` for automatic focus management, paste handling, and slot-based input.

```tsx
import { InputOTP, REGEXP_ONLY_DIGITS } from "@fcalell/ui/components/input-otp";
```

## Sub-components

### InputOTP (Root)

Container that manages OTP state. Wraps `@corvu/otp-field`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxLength` | `number` | -- | Number of OTP characters |
| `pattern` | `string` | -- | Regex pattern for allowed characters |
| `value` | `string` | -- | Controlled value |
| `onValueChange` | `(value: string) => void` | -- | Value change handler |
| `onComplete` | `(value: string) => void` | -- | Called when all slots are filled |
| `class` | `string` | -- | Additional Tailwind classes |

### InputOTP.Input

Hidden input element. Must be included for form submission and keyboard capture.

### InputOTP.Group

Visual grouping container. Use to split slots into groups (e.g. 3-3 for a 6-digit code).

### InputOTP.Slot

Individual character display slot. Shows the entered character or a blinking caret when active.

| Prop | Type | Description |
|------|------|-------------|
| `index` | `number` | Zero-based slot position |
| `class` | `string` | Additional Tailwind classes |

### InputOTP.Separator

Visual separator between groups. Renders a dash by default.

## Basic usage

```tsx
<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
  <InputOTP.Input />
  <InputOTP.Group>
    <InputOTP.Slot index={0} />
    <InputOTP.Slot index={1} />
    <InputOTP.Slot index={2} />
  </InputOTP.Group>
  <InputOTP.Separator />
  <InputOTP.Group>
    <InputOTP.Slot index={3} />
    <InputOTP.Slot index={4} />
    <InputOTP.Slot index={5} />
  </InputOTP.Group>
</InputOTP>
```

## Error state

Set `aria-invalid` on the root to highlight all slots in destructive color:

```tsx
<InputOTP maxLength={6} aria-invalid={hasError()}>
  ...
</InputOTP>
```

## Constants

`REGEXP_ONLY_DIGITS` — regex pattern (`"^\\d*$"`) that restricts input to digits only.
