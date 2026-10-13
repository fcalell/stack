---
id: 002-11
status: backlog
sessions: {}
---
# native-ui: the device run

## Goal
The UI cleanup rebuilt the phone's frame, sheets and settle without a render harness that draws them, so what only a phone shows is untested. The native Pane's keyboard behaviour and its nested scroll have not run on a device. The native `Sheet` is content-tall and grows to its cap with gorhom's footer on `bottomInset`; that foot may step rather than slide as the keyboard rises, and its height lands one reaction after the content's. A `Picker` sheet's search takes the keyboard on open (`autoFocus`) and has not been watched on a device. The waiting-to-loaded settle on the phone is `LayoutAnimation.configureNext` before the commit, never seen running.

## Approach
Run stack's phone consumer on the emulator (002-06, 002-07) and drive each case by hand and with Maestro, light and dark, at 320 dp:
- a Pane with a `foot` and a `Form`, the keyboard opening on a field, a nested scroll inside the Pane's body;
- a modal `Sheet` with a growing `TextArea`: content-tall, growing to its cap, the foot's rise with the keyboard;
- a `Picker` with `search`: the keyboard on open, the list under it;
- a screen whose Sections wait and then load: the settle, and reduced motion snapping it.
Each defect found is a fix in the component, or a story of its own when it is a distinct fix; `ui-core.md` ("The docked sheet", "The settle") records what a run settles.

## Acceptance criteria
- [ ] A native Pane's focused field stays above the keyboard and its nested scroll moves the right region.
- [ ] A native Sheet grows to its cap, its footer on `bottomInset` clears the keyboard and the fields scroll under it; whether the foot steps or slides as the keyboard rises is recorded, and a step is fixed or named.
- [ ] A `Picker` sheet's search opens with the keyboard up and its list is not covered.
- [ ] The settle runs on the phone, and under the system's reduced motion the loaded form appears at once.
