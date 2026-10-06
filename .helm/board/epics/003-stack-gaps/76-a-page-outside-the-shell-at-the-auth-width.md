---
id: 003-76
status: review
sessions: {}
---
# ui-core: a page outside the shell at the auth width

## Goal
Martechthings' Sign-in (`/sign-in`, story 017-03) and its two Connect steps (`/connect/organization`
and `/connect/consent`, story 017-04) stand outside the `Shell`, since the member may have no
organization open and an MCP client waits on the answer (`.helm/knowledge/product/ux/screens.md`,
Wave A; `.helm/research/ux/agent-connect.md`, Conclusions 1). Each is one centred column at the
`auth` width: the product's mark, a `StepCount` on the two Connect steps, a title, a sentence that
can carry one part at strong (the signed-in address, "We sent a code to ana@example.com"), a
`Banner` over the column when the authorization in flight is invalid or expired, then the step's
body (a `Form` with a `FormField` and its `Input` or `InputOtp`, or a `Group` of rows). On touch the
column spans the viewport inside the page padding. When a step opens (the code step after the
email is sent), its first field takes focus.

## Approach
The rules page names "an auth column" as a page a `StepCount` may head, but the roster has no
component that draws one. `Place` is a page in the shell: its head strip and full-width body are
built for the sidebar beside them. `Screen` is pushed over a place with a back act. ui-core defines
the `auth` width (400) and no frame owns it, and a host element at that width is a numeric
dimension, which the rules refuse. No roster part draws the product's mark: `Shell` takes places,
a banner and a switcher, and `Avatar` and `Image` are a person and a picture. `Input` takes focus
only as a table cell or an inline field, and `InputOtp` never does, so a step that opens leaves
focus on the act that opened it.

The reference is the login-and-otp pattern's range: column 300 to 430, title 16 to 24 at 500 to
600, helper 12 to 13 with the address at strong (v0, Laravel Cloud, Tana, Coinbase). The
agent-connect sheet measures Mintlify at about 400, Plain at 420 and Notion's card at 430 for the
same frame with a step count.

## Shape
A new layout component `Gate` on web and phone (a rename of the shipped `AuthColumn`, roster count unchanged). Props: `title` (the page's one `h1`), `description?: Sentence` (a descriptor, `readonly (string | { strong: string })[]`, drawn at `meta` with each strong run at 500; `Run` is gone), `step?: { at, of }` (the `StepCount` between the mark and the title), `mark?: GateMark` (`{ name, src? }`: the image at the avatar's size, its `name` at meta and 500 in its place while the image fails or `src` is absent), `banner?: ReactNode` and `children`.
It is a root frame as the `Shell` is: both mount one internal `FrameHost` (`components/shell/host.tsx`: the `toast()` queue, the `confirm()` decisions, the popup layer on the web; the sheets' provider, the toast layer and `confirm()` on the phone), so `toast()` and `confirm()` stand in a Gate. One column at the `auth` width (`GATE_COLUMN`, a width only) on the surface at the page inset (`GATE`); the banner, the lead (`GATE_LEAD`: mark, count, head `GATE_HEAD`) and the body stand a sections gap apart (`GATE_FLOW`). Centred down the viewport on the desktop, at the top on touch.
`FORM in` gains `auth`; the Gate sets `FormStands` to `auth`, so an `ActionBar` in it with no `fit` draws `full`. Focus: the web Gate runs `focusFirst` (`lib/focus.ts`) over its column's typing controls on mount and whenever `title` changes; the phone Gate holds a `FieldClaim` the first `Input` or `InputOtp` that mounts takes. The web `Input`/`InputOtp` lose their column-focus hook and `AuthColumnRoot` goes.
Defaults taken from the draft for looks the critique judges: ground `surface`; the mark at the avatar's size (`size-avatar`, no new size); the banner inside the column, first; the lead to the body a `sections` gap.
The showcase draws it at `/layout?place=sign-in` and `?place=connect` and in the frames page.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.
- [ ] Every consumer of `AuthColumn` migrates to `Gate` in the same change: the showcase, and Martechthings' `src/app/routes/sign-in.tsx` (`mark={{ name: "Martechthings" }}` until it has a mark asset, `description` as runs); `grep AuthColumn` over stack, Martechthings and Stead finds no code.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides. A component.

