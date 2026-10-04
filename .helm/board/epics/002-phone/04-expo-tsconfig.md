---
id: 002-04
status: done
sessions: {}
---
# expo: expo start leaves the generated tsconfig alone

## Goal
`expo start` under `stack expo dev` rewrites the generated `tsconfig.json` to extend
`expo/tsconfig.base` and changes its `include`.

## Approach
`stack expo dev` sets `EXPO_NO_TYPESCRIPT_SETUP=1`; verify the variable against Expo's current
docs. Evidence: `.helm/research/phone-harness.md`.

## Acceptance criteria
- [ ] (live) `tsconfig.json` is unchanged after `stack expo dev` starts.
