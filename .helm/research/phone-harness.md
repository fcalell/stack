# Phone render harness

2026-10-03, re-run 2026-10-04. The spike behind epic 002 (`.helm/board/epics/002-phone/`). The
shell is `devShells.phone` in `flake.nix`, the commands are `plugins/expo/guide/phone-render.md`,
and the critic's procedure is the phone section of `packages/ui-core/guide/design-critique.md`.
What remains here is the evidence those pages do not carry. Delete it when story 002-07 closes.

Measured on NixOS x86_64 with `/dev/kvm`: the spike on 8 cores and 15 GB at nixpkgs `753cc8a3`
in a throwaway clone; the re-run on 16 cores and 31 GB at nixpkgs `c59305ba` with this repo's
`apps/phone`.

## Versions

The SDK pins follow react-native 0.85.3's `gradle/libs.versions.toml` (compileSdk 36, buildTools
36.0.0, NDK 27.1.12297006) plus AGP's default build-tools 35.0.0, which expo modules build with.
At `c59305ba` every pin exists; Maestro is 2.10.0 (2.6.1 at the spike) and JDK 17 is 17.0.20.1.
The phone toolchain is 9.6 GiB.

## Timings and costs

| Step | Spike (15 GB) | Re-run (31 GB) |
| --- | --- | --- |
| Realise the phone shell, cold | 6 m 55 s | 1 m 55 s |
| `stack expo prebuild --platform android` | 5.6 s | a few seconds |
| `./gradlew assembleDebug`, cold caches | 20 m 21 s, emulator alongside | 12 m 2 s, alone; `~/.gradle` 4.2 GB, `android/` 1.1 GB |
| Cold boot, `-no-snapshot`, swiftshader | 64 to 68 s; qemu RSS 2.7 to 3.5 GB | under 60 s |
| APK size / install | 83 MB / 10 s | 83 MB / seconds |
| Metro first bundle | 78 s (4384 modules) | 15.6 s (4391 modules) |
| One `maestro test` / `maestro hierarchy`, `--no-reinstall-driver` | 22 to 29 s | 17 to 33 s |

Not measured: a warm incremental Gradle build.

## Risks and findings

- **Memory.** On 15 GB, the emulator beside a cold Gradle build drove load to 94 and used 13.8
  GB; the emulator's hang watchdog killed qemu. The guide runs them in sequence.
- **nix-ld.** Not needed. The re-run built with `NIX_LD=/nonexistent` (a foreign binary then
  fails, as `workerd` did): `hermes-compiler`'s `hermesc` is statically linked, a debug build
  does not run it, and the shell overrides AGP's Maven `aapt2`. `react-native-devtools` is the
  one foreign binary still met: Metro reports it cannot start (`libdbus-1.so.3`), which is
  harmless.
- **avdmanager and XDG.** With `XDG_CONFIG_HOME` set, avdmanager writes AVDs under
  `$XDG_CONFIG_HOME/.android` and the emulator does not find them; the shell exports
  `ANDROID_USER_HOME`. The `android-36` image ships no `devices.xml`, so `-d pixel_7` prints an
  error and exits 2, yet writes a 1080 × 2400, 420 dpi device.
- **Maestro 2.10.** `takeScreenshot` refuses a path outside the run's output folder; screenshots
  land in `<--test-output-dir>/<run>/<flow>/takeScreenshot/`. A flow-level `env:` default
  overrides `-e`.
- **Reduced motion.** Observed: with the animator scale at 0, Reanimated warns "Reduced motion
  setting is enabled" and LogBox shows its toast over the tab bar. The flow taps the button right
  of the toast's text to dismiss it.
- **What the hierarchy can't give.** Font size, weight, radius, border width and shadow; a
  pressed state cannot be screenshotted mid-press. `adb shell uiautomator dump` writes nothing
  while Maestro's driver holds the accessibility connection.
- **Light status bar.** In light mode the status bar's clock and icons are white on the white
  ground (the hierarchy has them at `[47,45][177,91]`; every pixel there is `#FFFFFF`). Dark mode
  reads. The prebuild no longer warns about `userInterfaceStyle`.
- **No tablet, no iOS.** Widths 768 and up are out of scope on the phone.

## Expo Go vs a development build

Expo Go is ruled out: expo's SDK 56 docs say keyboard-controller "requires a development build";
Expo 56.0.9's `bundledNativeModules.json` lists gesture-handler ~2.31.1, reanimated 4.3.1,
worklets 0.8.3 and keyboard-controller 1.21.6, where stack requires gesture-handler 3.0.0,
reanimated 4.4.1 and worklets 0.9.1, all native; embedded fonts and config plugins exist only in
a native build. The harness uses a plain debug build (no `expo-dev-client`, no EAS).

## Stack defects the spike hit

Each is fixed on master and was seen fixed in the re-run, except the fourth.

1. The generated entry imports `.stack/global.css`; the roster draws with its tokens.
2. React is pinned to 19.2.3 to match RN 0.85.3's renderer; no "Incompatible React versions"
   log.
3. `apps/phone` is the phone consumer.
4. `stack init <dir>` inside the workspace found no plugins unless the target already listed
   them. Not re-checked.
5. `stack expo dev` sets `EXPO_NO_TYPESCRIPT_SETUP`; `tsconfig.json` is unchanged after it
   starts.
