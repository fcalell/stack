---
id: 003-58
status: backlog
sessions: {}
---
# ui-core: a code block saves its text as a file

## Goal
Recovery codes are kept outside the clipboard by a Download beside Copy. Set up this device's codes and Devices' new codes. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`Code`'s copy act copies to the clipboard alone. A `Link` to a generated file is a host-level workaround. `Button` is an act with no file to hand. Four of the five recovery-code references offer Download.

Reference: Cloudflare's codes with Download, Print and Copy ([screen](https://mobbin.com/screens/99bf2b9c-12d0-4863-bd98-cfa27b5bcf11)); Mixpanel ([screen](https://mobbin.com/screens/f3d41a5f-dc10-435f-a818-8163f9c6f78a)); Zapier ([screen](https://mobbin.com/screens/7f5d9d17-9c86-42b7-b228-d6d26e50710c)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
