---
id: 003-60
status: backlog
sessions: {}
---
# native-ui: one live region announces on both phone platforms

## Goal
A phone component that tells assistive tech about a change does it through `accessibilityLiveRegion`, which only Android honours, so iOS VoiceOver hears nothing: the toast, the banner, the thread's new message, the pending bar, a form's error line and the one-time code's state. The epic 003 review found it while fixing the save fact (003-20) and the selection bar's count (003-23), which move onto one internal helper, `lib/live.ts`: an Android live region plus an iOS `AccessibilityInfo.announceForAccessibility` on change, never on mount.

## Approach
Move every older live site onto that helper, so each announces once, on change, on both platforms. Verify the iOS announce and Android live region APIs with context7.

## Acceptance criteria
- [ ] Every native component that announces a change does it through `lib/live.ts`; no `accessibilityLiveRegion` remains outside it.
- [ ] (live) VoiceOver and TalkBack each hear one announcement per change and none on mount, on the phone harness.
