---
id: 003-17
status: done
sessions: {}
---
# ui-core: a file control

## Goal
Martechthings imports files (an SDR CSV, analytics and tag manager exports, an app log) from onboarding and the inventory. `Input` kinds are text, search, secret, source, number and email; nothing chooses or takes a dropped file.

## Approach
- References: Neon's import sheet, the input and its run act in the step card ([screen](https://mobbin.com/screens/82420934-9c74-4d7e-a7f8-da5a495b922b)); Customer.io's CSV import ([screen](https://mobbin.com/screens/ea216cbe-fc77-4dd1-ae77-66bb8f2bce1b)).

## Acceptance criteria
- [ ] A control chooses a file or takes a dropped one, shows the chosen name and size, and refuses a wrong type with its reason, on the web and the phone.

## Shape
New control `FileInput` (`value: PickedFile | null`, `onChange`, `accept: readonly string[]`), labelled by a `FormField`. One shared descriptor `PickedFile = { name: string; size: number; type: string; blob: () => Promise<Blob> }`: the web wraps `File`, the phone wraps an `expo-document-picker` asset. Empty, the field box shows `chooseFile` in placeholder ink with a leading `FileUp` and the whole box is the act; chosen, the name, its size in `ink-meta`, and a remove act. The web takes a dropped file, shown by the focus ring. A wrong type never reaches `onChange`: it goes to the FormField's error line (slot word `wrongType`). `expo-document-picker` is a `native-ui` peer, as `expo-clipboard` is.
