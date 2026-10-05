---
id: 003-31
status: done
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
New content molecule `Image { src: string; alt: string; fit?: "thumb" | "content"; aspect?: number; loading?: boolean }`. `thumb` is a square cover-cropped tile at a new size `thumb`, radius `control`; `content` takes the container's width at the image's aspect up to a new height cap, radius `card`; both with the hairline `edge`. `aspect` (width over height) fixes a content box in every state. It draws its own waiting form (a skeleton at its loaded box) and failed form (`ImageOff` in the meta ink with the alt in meta). A press opens the full image contain-fit over the scrim with a Close act, through the sheet base's focus trap and Escape; it reads as a button named by `alt`. Pinch-zoom on the phone is out of scope.

Review (decided by fcalell after critique 5): `aspect` is required for the `content` fit and typed off `thumb`, a union on `fit` (`{ fit: "thumb"; aspect?: never } | { fit?: "content"; aspect: number }`), so a `content` picture without one is a type error and every state stands at the loaded box. The 3:2 default (`IMAGE_ASPECT`) and its height change on load are removed. A failed `thumb` draws the glyph alone (an 80 px tile holds no sentence), its alt naming the tile to assistive tech and in a tooltip; a failed `content` keeps the alt in meta.
