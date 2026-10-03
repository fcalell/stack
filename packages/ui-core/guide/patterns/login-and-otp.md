# Login and OTP

The range a sign-in or a one-time code step is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

A dialect is the references' number where the system keeps its own; the [judging](../judging.md) page says which hold.

## Range

column 300–430; title 16–24/500–600; helper 12–13, address at strong (the references' 600 is a dialect); inputs and buttons 34–40, radius 6 (card 8–12); OTP boxes 42–56 × 40–48, gap 6–10, radius 6, the system's focus ring (the references' 1 px is a dialect); social buttons surface-step or outline; Resend 12 muted text or grey pill.

## References

Queries: flows `login with email address followed by a one-time verification code entry screen` · screens `verification code entry screen with six separate digit boxes and a resend code link` · `dark mode sign in page with a single email field, continue button and social login buttons for Google and GitHub`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| v0 | [flow](https://mobbin.com/flows/37f50259-2477-423c-9d11-e358519f7a03) | Logo, title, one-line explanation with the address in 600, six boxes, Back link: nothing else | logo ≈ 76; title 24/600; body 13; boxes ≈ 42 × 42 gap 6 radius 6, focused box black 1 px ring; column ≈ 300; 3 type sizes |
| Cursor | [screen](https://mobbin.com/screens/12b44d35-1f79-4b3c-acb5-0c1edb9b230a) | Dark sign-in: three stacked social buttons, Email label + input, Continue with "Last used" chip | column ≈ 420; title 18/500 + 15 muted subtitle; social buttons ≈ 40 tall surface step radius 6; label 11; input ≈ 40; Continue ≈ 40; chip 10/500 |
| Lovable | [flow](https://mobbin.com/flows/d092c4b4-3e75-4475-9a48-dc83a386a59c) | Split page (form left, gradient right); social first, OR rule, email, black Continue with "Last used" badge | form column ≈ 335; title 22/600; social ≈ 36 radius 6 surface step; label 11/500; input ≈ 34; Continue ≈ 36; links 11 underlined |
| Laravel Cloud | [screen](https://mobbin.com/screens/806fc6c3-91f8-40d7-b9d2-8f69ec183bd8) | Left-aligned OTP inside a centred column, wide boxes, Resend with countdown, Back to sign-in | column ≈ 420; title 16/500; body 12; boxes ≈ 56 × 40 gap 8 radius 6 hairline; Resend (27) 12 muted |
| Tana | [screen](https://mobbin.com/screens/0c49a412-dcb4-491f-911b-74e7904144ef) | OTP inside a hairline card, title outside it, filled digits in 500 | card ≈ 420 wide radius 8; title 16/600; body 12; boxes ≈ 42 × 42 gap 8 radius 6; Resend (10) 12 muted |
| Coinbase | [screen](https://mobbin.com/screens/e302fcde-aa11-4cd1-aece-39704947227c) | OTP card with label, larger boxes, Resend as a full-width grey pill, Go back link | card ≈ 430 radius 12 hairline; title 20/600; body 13; label 12/600; boxes ≈ 48 × 48 gap 10 radius 6; Resend ≈ 40 pill; link 13/600 blue |
| Rox | [screen](https://mobbin.com/screens/e0cf8f8b-bd23-42b9-b515-55bdbce978d7) | Dark card: logo tile, Welcome, email, Continue, OR, social; email-first ordering | card ≈ 380 radius 8 hairline; title 16/500; body 12; input ≈ 40 radius 6; Continue ≈ 40 pill surface step; social ≈ 40 outline |

DESIGN.md: `cursor`: type body-sm 14/400, caption 13/400, caption-uppercase 11/600, title-sm 16/600, title-md 18/600, button 14/500; radius 4/6/8/12/16, pill; border hairline `#e6e5e0`, soft `#efeee8`, strong `#cfcdc4`; spacing 4/8/12/16/20/24/32/48. `vercel` (v0): body-sm 14/400, caption 12/400, button-md 14/500; radius sm 6 md 8 lg 12, pill 100; hairline `#ebebeb`, strong `#a1a1a1`; form-input 40 tall radius 6 padding 0 12; ex-auth-form-card radius lg. `coinbase`: body-sm 14/400, caption 13/400, caption-strong 12/600, title-md 18/600, button 16/600; radius 4/8/12/16/24, pill 100; hairline `#dee1e6`, soft `#eef0f3`. `lovable`: as above (input/button radius 6, border `#eceae4`, interactive border `rgba(28,28,28,0.4)`).

The references span: column 300–430 wide; title 16–24/500–600; helper 12–13 with the address in 600; inputs and buttons 34–40 tall, radius 6 (card 8–12); OTP boxes 42–56 wide × 40–48 tall, gap 6–10, radius 6, focus ring 1 px ink or accent; social buttons are surface-step or outline, never accented; Resend is text 12 muted (with countdown) or a grey pill.
