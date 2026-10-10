---
id: 003-314
status: backlog
sessions: {}
---
# react-ui: a canvas's loading form lines up with the canvas it becomes

## Goal
The Canvas loading skeleton centres its column while the loaded chain starts 20 px further right; at 375 the arrival moves everything 27.5 px sideways and 111 px down.

Found by the re-critique of 003-188.

## Acceptance criteria
- [ ] At 375, 768 and 1440, light and dark, the first skeleton node's left and top edges equal the loaded chain's first node's within 1 px.
- [ ] The skeleton keeps the loaded node size (240x74, touch 240x86), the loaded gap, the 592 px frame, `aria-busy`, and no zoom stack.
- [ ] The arrival moves nothing: skeleton node boxes match the loaded boxes at every measured width.
- [ ] The Canvas loading stories at 375, 768 and 1440 hold the check.
