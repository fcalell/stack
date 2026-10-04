---
id: 002-02
status: done
sessions: {}
---
# expo: one React, the renderer's version

## Goal
`plugin-expo` scaffolds `react: "19.2.7"` (`plugins/expo/src/index.ts`), while RN 0.85.3's
renderer is 19.2.3: the app logs "Incompatible React versions" and crashes in
`KeyboardControllerView`. The `react ^19.2.7` devDependencies of native-ui, auth and api put a
second React into a workspace phone app's bundle.

## Approach
Derive the scaffolded version from what react-native's renderer requires (Expo's
`bundledNativeModules.json` names it), never a hardcoded string, and align the plugins'
devDependencies. Evidence: `.helm/research/phone-harness.md`.

## Acceptance criteria
- [ ] (test) the scaffolded `react` equals the renderer's version.
- [ ] (live) a phone app starts with no "Incompatible React versions" log.
