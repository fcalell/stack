# Phone render harness

2026-10-03. The spike behind epic 002 (`.helm/board/epics/002-phone/`). Drains into the expo
guide and the design critique when story 002-07 ships; delete it then.

Spike on NixOS x86_64 (8 cores, 15 GB RAM, /dev/kvm), nixpkgs at stack's `flake.lock`
(`753cc8a3`), in a throwaway clone with a scaffolded `apps/phone`; its screenshots and flows were
not kept.

## Verdict

The harness works end to end: Android 16 (API 36) emulator from `androidenv`, headless; a debug
build of a stack phone consumer (Expo SDK 56, RN 0.85.3, reanimated 4.4.1, gesture-handler 3.0.0,
keyboard-controller 1.21.9, bottom-sheet 5.2.14, uniwind) loading JS from `stack expo dev`;
Maestro 2.6.1 from nixpkgs opening routes by deep link, tapping, scrolling, taking screenshots and
dumping the hierarchy with px bounds; light and dark through `cmd uimode`; touch widths 390 and
320 dp through `wm density`.

Expo Go cannot be used. A development build (prebuild + Gradle) is the only way to run the real
native roster. Getting it to render took five fixes in stack itself. The harness can't render a
stack phone app until they ship (see "Stack defects the spike hit").

## 1. What goes in stack's `flake.nix`

Add a second dev shell, `devShells.phone`, so the default shell stays light. The phone toolchain
is 9.6 GiB. Linux x86_64 only: the system image is x86_64 and KVM-backed.

```nix
# inputs/outputs as today; inside eachDefaultSystem:
pkgsAndroid = import nixpkgs {
  inherit system;
  config = { allowUnfree = true; android_sdk.accept_license = true; };
};
# Versions follow react-native's gradle/libs.versions.toml (compileSdk 36, buildTools 36.0.0,
# ndkVersion 27.1.12297006) plus AGP 8.12's default build-tools 35.0.0 (expo modules set none).
# Bump together with react-native.
android = pkgsAndroid.androidenv.composeAndroidPackages {
  platformVersions = [ "36" ];
  buildToolsVersions = [ "35.0.0" "36.0.0" ];
  includeNDK = true;
  ndkVersions = [ "27.1.12297006" ];
  cmakeVersions = [ "3.22.1" ];
  includeEmulator = true;
  includeSystemImages = true;
  systemImageTypes = [ "google_apis" ];
  abiVersions = [ "x86_64" ];
  includeSources = false;
};
sdk = "${android.androidsdk}/libexec/android-sdk";

devShells.phone = pkgs.mkShell {
  inputsFrom = [ self.devShells.${system}.default ];
  packages = [ android.androidsdk pkgsAndroid.jdk17 pkgs.maestro ];
  ANDROID_HOME = sdk;
  ANDROID_SDK_ROOT = sdk;
  JAVA_HOME = pkgsAndroid.jdk17.home;
  # The SDK is read-only: Gradle cannot install a missing component, so a missing one fails
  # the build by name. AGP's Maven aapt2 is a foreign binary: run the SDK's patched one.
  GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${sdk}/build-tools/36.0.0/aapt2";
  MAESTRO_CLI_NO_ANALYTICS = "1";
  MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = "true";
};
```

A consumer project reaches the same shell with `nix develop github:fcalell/stack#phone` (or
`inputs.stack.devShells.${system}.phone` in its own flake), so stack ships no second copy.

## 2. What a consumer needs, and where it comes from

No new CLI surface. Every step can be written as a plain command, and every app-specific value
comes from the config stack already generates (`.stack/app.config.cjs`: `android.package`,
`scheme`), so nothing is hardcoded. These commands become a new expo guide page,
`plugins/expo/guide/phone-render.md` ("Render the phone app on an emulator"), which the critique
and the screen recipe point to.

```sh
nix develop github:fcalell/stack#phone        # or the repo's own .#phone

# Once per machine: the device the critic measures on (1080 x 2400 px panel).
avdmanager create avd -n stack-phone -d pixel_7 \
  -k "system-images;android-36;google_apis;x86_64"

# Once per native change (a new config plugin, a native dependency, a font): the build.
stack expo prebuild --platform android
(cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64)

# Every session.
emulator -avd stack-phone -no-window -no-audio -no-boot-anim -no-snapshot \
  -gpu swiftshader_indirect &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 1; done
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell svc power stayon true
adb shell settings put global hide_error_dialogs 1
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  adb shell settings put global $k 0
done
stack dev & stack expo dev &                   # the API and Metro; the build loads JS from 10.0.2.2:8081

PKG=$(node -p 'require("./.stack/app.config.cjs").android.package')
SCHEME=$(node -p 'require("./.stack/app.config.cjs").scheme')
```

A single subcommand would only be worth adding if this sequence turns out to be fragile in use.
The likely candidate is `stack expo emulator`, which would boot, install and settle the device.
The spike gives no reason for it yet.

## 3. The design-critique page's phone section

Insert after "What the critic needs", replacing "in a browser the critic can script" with "in a
browser, or for a phone screen on the emulator, the critic can script".

```markdown
## A phone screen

A phone screen is judged on the Android emulator, set up and started by the expo guide's
[render page](node_modules/@fcalell/plugin-expo/guide/phone-render.md), with `stack dev` and
`stack expo dev` running. The critic opens a route with
`adb shell am start -a android.intent.action.VIEW -d "$SCHEME://<route>" "$PKG"` or Maestro's
`openLink`, and drives it with Maestro flows (`maestro test --no-reinstall-driver <flow>.yaml`:
`tapOn`, `scrollUntilVisible`, `extendedWaitUntil`, `waitForAnimationToEnd`, `takeScreenshot`).
The procedure's steps read as follows on the phone.

1. **Prepare.** The animation scales at 0 (the system's reduced motion), set before the app
   starts; `adb shell am force-stop "$PKG"`, then open the route; `adb logcat -c`.
2. **Measure.** `maestro hierarchy --no-reinstall-driver` gives each element's bounds in px, its
   text, its accessibility label, and whether it is clickable, checked or selected. A size in dp
   is px × 160 / the density from `adb shell wm density`. A text box's height is its line
   height. Colours are sampled from the screenshot's pixels. Font size, weight and radius are
   not in the hierarchy: read them from the component's cell in `DESIGN.md`, and measure a
   radius or a hairline on the screenshot.
3. **Interact.** Tap every control and scroll every list in a flow, with a screenshot after each
   state the unit declares. A touch screen has no hover; a pressed state is not captured.
4. **Widths.** 390 dp (`adb shell wm density 443` on the 1080 px panel) and 320 dp
   (`wm density 540`): density = 1080 × 160 / width. An element whose bounds pass the screen's
   edge, or clipped text, is a finding. So is a target under 44 dp for a primary act, or under
   24 dp otherwise.
5. **Modes.** `adb shell cmd uimode night yes`, then `no`, and repeat 2 to 4.
6. **Floors.** As on the web, from the pixels and the bounds, except that keyboard reach becomes
   an accessible name (`accessibilityText` or text) on every clickable element.
9. **Console.** `adb logcat -d 'ReactNativeJS:W' '*:S'` and Metro's output show zero warnings
   and errors.

A phone screen that cannot be opened on the emulator is reported as unrendered with the reason.
```

The rubric's widths line ("1280 and 390, plus 768 and 1440 for a screen") gains "a phone screen
at 390 and 320 dp".

## 4. Step 6 of `add-a-phone-screen.md`, rewritten

```markdown
## 6. Judge and sign off

Build and start the app on the emulator by the [render page](./phone-render.md), with `stack dev`
and `stack expo dev` running, and run the screen recipe's steps 6 to 8: a fresh session judges
the render on the emulator by the design critique's phone section, at 390 and 320 dp, light and
dark, and edits nothing. It gets the route as a deep link, the patterns, the states from step 5
and how to reach each, the references and the files. A screen whose change adds a native module
or a font takes a new build first.

**Check:** the critique's verdict is ship, and fcalell signs off.
```

## 5. Timings and costs (measured on this machine)

| Step | Cost |
| --- | --- |
| Fetch emulator + system image + platform-tools + Maestro (cold) | 4 m 37 s; SDK closure 6.9 GiB, Maestro 0.96 GiB |
| Add NDK, CMake, build-tools 35/36, JDK 17 | +2 m 18 s; SDK closure 9.6 GiB |
| AVD create | seconds; 2.0 GB on disk |
| Cold boot, `-no-snapshot`, swiftshader | 64 to 68 s; qemu RSS 2.7 to 3.5 GB |
| `stack expo prebuild --platform android` | 5.6 s |
| `./gradlew assembleDebug` (x86_64, cold caches) | 20 m 21 s, emulator running alongside; `~/.gradle` 4.0 GB, `android/` 1.3 GB |
| APK size / install | 83 MB / 10 s |
| Metro first bundle (4384 modules) | 78 s cold, 46 s after `--clear` |
| App start to first frame (`am start -W`) | 2 to 7 s, plus a few seconds before swiftshader draws |
| `maestro hierarchy` / one `maestro test` | 22 to 29 s each with `--no-reinstall-driver` (about 50 s with the default driver reinstall); a 12-step flow 29 s |

Not measured: a warm incremental Gradle build.

## 6. Open risks

- **Memory.** The emulator alongside a cold Gradle build drove load to 94 and used 13.8 of
  15.7 GB. The emulator's hang watchdog killed qemu ("detected a hanging thread … No
  response for 18313 ms"). Build first, then boot, or cap Gradle (`org.gradle.workers.max`).
- **Maestro's speed.** Each CLI call starts a JVM and reconnects the driver (about 25 s). The
  critic batches a whole state walk into one flow. A flow cannot dump the hierarchy, so each
  hierarchy is its own call. `adb shell uiautomator dump` was no faster route: it wrote nothing
  while Maestro's driver held the accessibility connection.
- **Settling.** The first frames after a launch arrive seconds late under swiftshader. One
  screenshot taken by `adb screencap` right after `am start` came out blank. Every screenshot
  goes after `extendedWaitUntil` on a known text plus `waitForAnimationToEnd`.
- **Maestro env.** A flow-level `env:` default overrode `-e MODE=dark`, so the dark run
  overwrote the light files. Pass variables with `-e` only.
- **What the hierarchy can't give.** Font size, weight, radius, border width and shadow are not
  in it. The critic reads them from the cells and measures pixels. A pressed state cannot be
  screenshotted mid-press.
- **System dialogs.** A "System UI isn't responding" ANR covered the app after a cold boot under
  load. `settings put global hide_error_dialogs 1` is in the setup.
- **Reduced motion.** Reanimated reads the system setting only when the app starts. The scales
  are set before launch. That Android's animator scale at 0 reaches `useReducedMotion` is from
  the docs, not observed.
- **nix-ld.** This machine has nix-ld. Two foreign binaries depend on it: AGP's Maven `aapt2`
  (overridden in the shell above) and react-native's prebuilt `hermesc`. The build was not
  tried on a machine without nix-ld. The shell may need `programs.nix-ld` or a patched hermesc.
- **No tablet, no iOS.** Widths 768 and up are out of scope on the phone.

## 7. Stack defects the spike hit (must land before the harness is useful)

Each was worked around in a disposable clone only (`~/.cache/stack-harness-spike/stack`), never
in this repo.

1. **The generated entry never imports `.stack/global.css`.** Uniwind needs the CSS entry
   imported by the app (uniwind docs: "import './global.css'" in the root). Without it every
   class is dropped: uniwind warned "couldn't find your variable --color-ink-body" and the text
   rendered unstyled. Fix: `plugin-native-ui` contributes `{ source: "./global.css", sideEffect:
   true }` to `expo.slots.entryImports`. The spike imported it in `src/app/_layout.tsx`.
2. **React version mismatch.** `plugin-expo` scaffolds `react: "19.2.7"`
   (`plugins/expo/src/index.ts:301`), but RN 0.85.3's renderer is 19.2.3 (Expo 56's
   `bundledNativeModules.json` says 19.2.3). At runtime: "Incompatible React versions … react
   19.2.7, react-native-renderer 19.2.3", then "Cannot read property 'default' of undefined" in
   `KeyboardControllerView`. In the workspace, `plugin-native-ui`, `plugin-auth` and `plugin-api`
   also carry `react ^19.2.7` devDependencies, which puts a second React into a workspace phone
   app's bundle. The spike pinned all four to 19.2.3.
3. **No phone consumer exists.** `apps/showcase` is web only (vite, react, react-ui). The spike
   scaffolded `apps/phone` in a clone with `stack init --plugins=native-ui`. A phone showcase or
   fixture app is needed for stack's own harness runs.
4. **`stack init <dir>` inside the workspace finds no plugins** ("Unknown plugin(s): native-ui.
   Available:" with an empty list) unless the target already has a `package.json` listing them.
5. **`expo start` rewrites the generated `tsconfig.json`** ("extends is now
   expo/tsconfig.base", then "include property has been updated"). `EXPO_NO_TYPESCRIPT_SETUP=1`
   in `stack expo dev` would stop it.

Observed, not blocking:

- Prebuild warns "userInterfaceStyle: Install expo-system-ui in your project to enable this
  feature". Dark mode still followed `cmd uimode`, but the light render has light status-bar
  icons on a light ground.
- `eas.json`'s `development` profile sets `developmentClient: true` without `expo-dev-client` in
  the dependencies. The harness uses a plain debug build, which needs neither.
- `react-native-devtools` fails to start on NixOS (`libglib-2.0.so.0`). It's harmless.

## 8. Expo Go vs a development build

Expo Go is ruled out:

- Expo's SDK 56 docs say keyboard-controller "requires a development build, as it is not
  included in Expo Go".
- Expo Go ships the SDK's tested native set. Expo 56.0.9's `bundledNativeModules.json` lists
  gesture-handler ~2.31.1, reanimated 4.3.1, worklets 0.8.3 and keyboard-controller 1.21.6. Stack
  requires gesture-handler 3.0.0, reanimated 4.4.1 and worklets 0.9.1, all native.
- Embedded fonts and config plugins exist only in a native build (`builds.md`).

The development build costs the NDK, CMake, JDK 17, two build-tools versions and a 20-minute
cold Gradle build. The spike used `stack expo prebuild` plus Gradle `assembleDebug` (no
`expo-dev-client`, no EAS). It rendered the roster: Shell tab bar (react-native-svg icons),
Place, Section, Group, Switch, Button, the floating act, and a List of ListRows that scrolled, in
the gesture-handler, keyboard-controller, safe-area and bottom-sheet providers, with uniwind
styles.
