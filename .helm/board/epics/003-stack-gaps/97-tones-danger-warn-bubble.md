---
id: 003-97
status: backlog
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
- [ ] A dark filled danger act is a deep red with light text, no louder than the primary act.
- [ ] Dark soft banner tints read as tints, not slabs, with ink contrast held.
- [ ] A status dot for attention reads amber in light mode.
- [ ] A user message bubble separates from the canvas in dark mode.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
