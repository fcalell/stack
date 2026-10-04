---
id: 002-07
status: backlog
sessions: {}
---
# expo: the phone render harness

## Goal
The design critic judges a phone screen on an Android emulator driven by Maestro, at 390 and
320 dp, light and dark, as it judges a web screen in a browser. Until then
`plugins/expo/guide/add-a-phone-screen.md` stops a phone screen after its step 5.

## Approach
Approved by fcalell (2026-10-03), as proposed in `.helm/research/phone-harness.md`:
- a `devShells.phone` in `flake.nix` (androidenv emulator, system image, NDK, build-tools 35
  and 36, JDK 17, Maestro), reached by a consumer as `nix develop github:fcalell/stack#phone`;
- no new CLI surface: plain commands in a new `plugins/expo/guide/phone-render.md`;
- a phone section in `packages/ui-core/guide/design-critique.md`, and the rubric's widths line;
- step 6 of `add-a-phone-screen.md` rewritten to judge on the emulator.
- `apps/phone` gains one API procedure and a query-backed `List` (004-02's data form), so the
  critique judges real pending, failed and empty states (decided by fcalell, 2026-10-04).
Order: build, then boot (both together exhausted 15 GB).

## Acceptance criteria
- [ ] (live) a fresh session judges a screen of the phone consumer on the emulator by the
  critique's phone section, light and dark, at both widths.
- [ ] (file) `add-a-phone-screen.md` step 6 runs the critique on the harness.

## Open questions
- [ ] Whether the build needs nix-ld off this machine (hermesc, Maven's aapt2).
