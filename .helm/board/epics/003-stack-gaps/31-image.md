---
id: 003-31
status: backlog
sessions: {}
---
# ui-core: an image that opens full size

## Goal
Martechthings shows an observation's screenshot as a thumbnail beside its provenance that opens full size. The roster has no image component.

## Approach
- Reference: Browserbase's session record, the captured page under its metadata strip ([screen](https://mobbin.com/screens/67179442-fde1-4b51-9a93-8f9f0d553a18)).

## Acceptance criteria
- [ ] A thumbnail with its alt text opens the full image in a sheet or overlay, with a loading and a failed form.

## Shape
New content molecule `Image { src: string; alt: string; fit?: "thumb" | "content"; loading?: boolean }`. `thumb` is a square cover-cropped tile at a new size `thumb`, radius `control`; `content` takes the container's width at the image's aspect up to a new height cap, radius `card`; both with the hairline `edge`. It draws its own waiting form (a skeleton at its box) and failed form (`ImageOff` with the alt in meta). A press opens the full image contain-fit over the scrim with a Close act, through the sheet base's focus trap and Escape; it reads as a button named by `alt`. Pinch-zoom on the phone is out of scope.
