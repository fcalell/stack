---
id: 003-97
status: review
sessions: {}
---
# ui-core: dark danger fill, soft banner tints, light warn dot and dark message bubble tones

## Goal
Four tone defects in Stead's screens:
- Dark `act-danger` (alias `danger`, dark L 0.71 C 0.178, label `on-danger` L 0.16) is a bright salmon with black text, the loudest thing on the page ("Stop the job", `card-job-1440-dark`).
- Dark `warn-soft` / `danger-soft` (L 0.28, C 0.05 to 0.06) read as heavy brown/red slabs across the shell banner (`banner-urgent-*-dark`, `card-job-1440-dark`).
- Light `warn` (L 0.48 C 0.099 hue 70) status dots read brown, not amber: Urgent and stopped dots (`stalled-1440-light`, `now-1440-light`).
- Dark `group` (L 0.25) behind the user's message bubble (`MESSAGE_BUBBLE` = `bg-group`) barely separates from the canvas (`thread-1440-dark`).

## Approach
Tokens are ui-core's (tokens.ts `COLORS`); the app cannot set a colour. `warn` is one token for text, glyph and dot, held at 4.5:1 on group and soft, which forces the dark brown dot; a dot has no text contrast to hold.

## Acceptance criteria
- [x] A dark filled danger act is a deep red with light text, no louder than the primary act.
- [x] Dark soft banner tints read as tints, not slabs, with ink contrast held.
- [x] A status dot for attention reads amber in light mode.
- [x] A user message bubble separates from the canvas in dark mode.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.

## Built
Tokens in `tokens.ts`, gated by `ui-core verify` (text 4.5, boundary and mark 3):
- `act-danger` is its own colour: light unchanged (the danger ink), dark a deep red (L 0.50, C 0.17) under a white `on-act-danger` (6.55:1), as the primary act is (accent L 0.52 under white). Hover and press go toward black in both modes; the pending fill recedes toward the label in light and the canvas in dark, as the accent's does. `danger` keeps its salmon as ink.
- Dark `warn-soft` is L 0.25 C 0.035 and `danger-soft` L 0.25 C 0.04 (were 0.28 with C 0.05 and 0.06); `warn`, `danger` and `ink-body` hold 4.5 on them.
- The attention dot reads `chip-amber`, the existing amber mark, not a new dot token: a warn that holds 4.5:1 as text is brown, and the mark is already amber. `chip-amber` light drops from L 0.65 to 0.62 so every chip mark holds 3:1 on `group` as well as `surface` (verify now measures both).
- `MESSAGE_BUBBLE` is `bg-fill-neutral` (the existing resting neutral ground, the body ink at 8 %) in place of `bg-group`, which sat 0.04 of L off the dark surface.
No new dot, bubble or tint token. `on-danger` stays and has no drawing cell left; deleting it is a follow-up.
Evidence: `ui-core verify` (34/34, 225 contrast pairs), both plugin verifies and `pnpm check` pass; `atom/Button`, `shared/Banner`, `atom/Status`, `content/Message` pass in the browser run.
Owner render, dark: `atom/Button` Rest, Disabled and Loading (danger act); `shared/Banner` Rest and Disabled (warn and danger tints); `content/Diff`, `content/ProseDiff` and `content/Comparison` Rest (removed lines on `danger-soft`); `content/Message` Rest and `content/Thread` Rest (bubble); the Foundations page's colour rows. Light: `atom/Status` Rest (attention dot), plus the same `shared/ListRow` status cells.
