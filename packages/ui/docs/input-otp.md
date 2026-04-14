# InputOTP

One-time password input with individual character slots. Built on `@corvu/otp-field` for automatic focus management, paste handling, and slot-based input. Auto-generates the slot layout from `maxLength`.

```tsx
import { InputOTP, REGEXP_ONLY_DIGITS } from "@fcalell/ui/components/input-otp";
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxLength` | `number` | -- | Number of OTP characters |
| `pattern` | `string \| null` | `REGEXP_ONLY_DIGITS` | Regex pattern for allowed characters. `null` allows all. |
| `value` | `string` | -- | Controlled value |
| `onValueChange` | `(value: string) => void` | -- | Value change handler |
| `onComplete` | `(value: string) => void` | -- | Called when all slots are filled |
| `disabled` | `boolean` | `false` | Disable the input |
| `class` | `string` | -- | Additional Tailwind classes |
| `id` | `string` | -- | ID for the hidden input element |
| `aria-invalid` | `boolean` | -- | Invalid state for form integration |

## Basic usage

Slots are auto-generated and split into two groups with a separator:

```tsx
<InputOTP maxLength={6} />
```

This renders: `[_][_][_] - [_][_][_]`

## Controlled

```tsx
<InputOTP
  maxLength={6}
  value={otp()}
  onValueChange={setOtp}
  onComplete={(value) => verify(value)}
/>
```

## Error state

```tsx
<InputOTP maxLength={6} aria-invalid={hasError()} />
```

## Allow all characters

```tsx
<InputOTP maxLength={4} pattern={null} />
```

## With form integration

Works with `Form.InputOTP` from `@fcalell/ui/components/form` for TanStack Form integration.

## Constants

`REGEXP_ONLY_DIGITS` -- regex pattern (`"^\\d*$"`) that restricts input to digits only. This is the default pattern.
