---
id: 003-185
status: review
sessions: {}
---
# react-ui: the dark Input focus ring holds its computed contrast

## Goal
The critic sampled the dark Input's focus ring at 1.78:1 (1.61 on an error field) against a computed 7.89:1 (`r2-components/report.md`, "Accent ink", unresolved, pre-existing). Capture the dark focused Input at 2x and sample the ring's centre pixels.

## Approach
Keyboard-focus (Tab, Shift+Tab) the dark frame's Input in `atom-input--rest` and `atom-input--error`, screenshot at 2x and read the ring's pixels. The ring is the field box's outline (`solid 2px oklch(0.725 0.13 264)`, offset 2); the input element's own outline is none.

## Acceptance criteria
- [x] The ring's centre pixels at 2x are rgb(124,164,248), five samples across its 2 px, in both stories; against the dark card (`oklch(0.16 0.005 264)`, about rgb(12,13,15)) that is 7.9:1, against the field fill (22,24,26) 7.22:1.

## Ruled
Probe artifact, no code. The 1.78 sample (rgb(5,57,163) over (22,24,26)) is the light frame's ring colour, not the dark one. The ring token holds in the error field too.
