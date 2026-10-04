---
id: 005-14
status: backlog
sessions: {}
---
# native-ui: an InputOtp and a MessageInput hold focus by mount and by touch handling

## Goal
`InputOtp` focuses itself from a mount effect guarded by global focus state,
`if (!TextInput.State.currentlyFocusedInput()) input.current?.focus()`
(`components/input-otp/index.tsx:40-42`). It runs after paint, so in a sheet the keyboard rises
a frame behind the content, and the guard's answer depends on commit order against other inputs
mounting in the same commit. `MessageInput`'s send and stop refocus the text after the act
(`message-input/index.tsx:91-98`, and `detach` at `:110`) to keep the keyboard up, covering for
the tap that blurred it; the keyboard flickers when the field was blurred.

## Approach
Focus at mount is declarative: `InputOtp` takes `autoFocus` through the `FieldFocus` context as
`Input` does, and the caller that knows whether another field holds focus decides. The
MessageInput's acts do not take the keyboard: the hosting scroll keeps taps
(`keyboardShouldPersistTaps="handled"`) and the `focus()` calls go, once the device confirms the
keyboard stays. The web MessageInput keeps its refocus: there it is keyboard focus management, not
a keyboard cover.

Decided (the recommended answer, applied 2026-10-04): phone only; the web MessageInput keeps its refocus, which is keyboard focus management.

## Acceptance criteria
- [ ] (live) on the harness, a sheet holding an `InputOtp` (added to `apps/phone`, which holds none): the keyboard rises with the sheet's first frame.
- [ ] (live) on the harness, in 03's conversation: Send and Stop leave the keyboard up with no flicker, recorded frame by frame.
