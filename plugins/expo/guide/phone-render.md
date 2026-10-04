# Render the phone app on an emulator

The phone app renders on an Android emulator for the design critique, driven by Maestro. It
needs x86_64 Linux with `/dev/kvm`, and runs a debug build of the app that loads its JavaScript
from `stack expo dev`. Expo Go cannot run the native roster, so the build is the app's own.

Every command runs in stack's phone shell (the Android SDK, the emulator, JDK 17, Maestro). The
build needs no nix-ld on NixOS: `hermesc` is static, and the shell points Gradle at the SDK's
`aapt2`.

```sh
nix develop github:fcalell/stack#phone
```

## Once per machine: the device

A 1080 × 2400 px panel, the one the critique's densities are computed for. avdmanager reports
`Could not load devices from … devices.xml` and exits non-zero, yet writes the device.

```sh
avdmanager create avd -n stack-phone -d pixel_7 \
  -k "system-images;android-36;google_apis;x86_64"
```

## Once per native change: the build

A new native module, config plugin or font takes a new build; a JavaScript change does not.

```sh
stack expo prebuild --platform android
(cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64)
```

A cold build takes 12 to 20 minutes and fills `~/.gradle` with 4 GB. Run it before the emulator
boots, never beside it: the two together exhaust 16 GB of memory.

## Every session: boot, install, start

```sh
emulator -avd stack-phone -no-window -no-audio -no-boot-anim -no-snapshot \
  -gpu swiftshader_indirect &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell svc power stayon true
adb shell settings put global hide_error_dialogs 1
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  adb shell settings put global $k 0
done
adb reverse tcp:8787 tcp:8787
stack dev & stack expo dev &

PKG=$(node -p 'require("./.stack/app.config.cjs").android.package')
SCHEME=$(node -p 'require("./.stack/app.config.cjs").scheme')
```

The animation scales at 0 are the system's reduced motion, which the app reads when it starts.
Reanimated answers with a development warning and its toast; the flow below dismisses the
toast. Metro's "installing React Native DevTools" error is the host's, never the app's.

The emulator's `localhost` is its own: `adb reverse` carries its port 8787 to the worker
`stack dev` serves, so the API client's localhost fallback reaches it with no
`EXPO_PUBLIC_API_URL`. Without it every query fails. The worker's port is fixed, so one
`stack dev` runs on the machine at a time.

## Open a route and capture it

A Maestro flow opens a route by deep link, waits for a known text, and screenshots. Pass every
variable with `-e`: a default in the flow's own `env:` overrides it.

```yaml
# home.yaml
appId: ${PKG}
---
- stopApp
- openLink: ${SCHEME}://
- extendedWaitUntil:
    visible: Platform
    timeout: 180000
- extendedWaitUntil:
    visible: Open debugger to view warnings.
    timeout: 10000
    optional: true
- runFlow:
    when:
      visible: Open debugger to view warnings.
    commands:
      - tapOn:
          point: "92%,92%"
- waitForAnimationToEnd
- takeScreenshot: home-${MODE}-${WIDTH}
```

```sh
adb shell cmd uimode night no        # yes for dark
adb shell wm density 443             # 390 dp on the 1080 px panel; 540 is 320 dp
maestro test --no-reinstall-driver --test-output-dir=shots \
  -e PKG=$PKG -e SCHEME=$SCHEME -e MODE=light -e WIDTH=390 home.yaml
maestro hierarchy --no-reinstall-driver > home-light-390.json
adb logcat -d 'ReactNativeJS:W' '*:S'
```

`wm density` sets the width in dp: density = 1080 × 160 / width. A screenshot lands in
`shots/<run>/<flow>/takeScreenshot/`. `maestro hierarchy` prints each element's bounds in px,
its text, its accessibility label and its state. Each Maestro call costs about 20 s, so one flow
walks a whole set of states. The first frames after a launch arrive seconds late, so a
screenshot always follows a wait on a known text. The warning toast's close act carries no
label, and `tapOn: rightOf:` its sentence misses it, so the flow taps its point.

## Hold a query's states

A query's pending, failed and empty states come from the worker the app calls.

| State | How |
| --- | --- |
| Empty | A fresh local database, before anything is created |
| Pending | `kill -STOP` the `workerd` process listening on 8787: the request is accepted and never answered. `kill -CONT` releases it |
| Failed | Stop `stack dev`: the request is refused, and the query fails after the client's single retry. Start it again and tap Retry to load |

## Shut down

```sh
adb shell wm density reset
adb emu kill
```
