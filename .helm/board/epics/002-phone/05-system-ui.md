---
id: 002-05
status: backlog
sessions: {}
---
# expo: Android follows the light and dark setting

## Goal
Prebuild warns "userInterfaceStyle: Install expo-system-ui in your project to enable this
feature", and the light render draws light status-bar icons on a light ground.

## Approach
Add `expo-system-ui` to the dependencies expo scaffolds. Evidence: `.helm/research/phone-harness.md`.

## Acceptance criteria
- [ ] (live) prebuild has no `userInterfaceStyle` warning, and the status bar reads in both modes.
