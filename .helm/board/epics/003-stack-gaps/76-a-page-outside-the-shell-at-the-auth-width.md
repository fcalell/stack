---
id: 003-76
status: done
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

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides. A component.

## Progress
Built as `AuthColumn`, a layout frame in ui-core's roster, react-ui and native-ui: `product`, `step`, `title`, `sentence` (a string or `Run[]`), `banner` and `children`, one column at the `auth` width. An `Input` or `InputOtp` that mounts in it takes focus unless a typing control of the column holds it, and a `Form`'s `ActionBar` in it draws `full`. The showcase draws it at `/layout?place=sign-in` and `?place=connect`.
