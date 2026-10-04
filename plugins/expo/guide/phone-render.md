# Render the phone app on an emulator

The phone app renders on an Android emulator for the design critique, driven by Maestro. It
needs x86_64 Linux with `/dev/kvm`, and runs a debug build of the app that loads its JavaScript
from `stack expo dev`. Expo Go cannot run the native roster, so the build is the app's own.
[Capture a phone screen](./phone-capture.md) drives the running app.

## The shell

Every command runs in stack's phone shell (the Android SDK, the emulator, JDK 17, Maestro,
ImageMagick), in bash, from the app's directory, with the app's `stack` on the path. A
non-interactive shell sources the environment; zsh drops `adb` and `emulator` from it. Inside
stack's own repository the flake is the local checkout's (`<repo>#phone`), since the published
one lags it, and the workspace packages are built first.

```sh
source <(nix print-dev-env github:fcalell/stack#phone)   # in stack's repo: <repo>#phone
cd <app> && export PATH="$PWD/node_modules/.bin:$PATH"
turbo run build --filter=<app>...                        # in stack's repo, from its root
```

The build needs no nix-ld on NixOS: `hermesc` is static, and the shell points Gradle at the
SDK's `aapt2`.

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
  -gpu swiftshader_indirect > emulator.log 2>&1 &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell wm density reset
adb shell svc power stayon true
adb shell settings put global hide_error_dialogs 1
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  adb shell settings put global $k 0
done
adb reverse tcp:8787 tcp:8787
setsid stack dev > dev.log 2>&1 & DEV=$!
setsid stack expo dev > metro.log 2>&1 & METRO=$!

PKG=$(node -p 'require("./.stack/app.config.cjs").android.package')
SCHEME=$(node -p 'require("./.stack/app.config.cjs").scheme')
worker_pid() { ss -Htlnp 'sport = :8787' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u; }
```

A density left by an earlier session would skew every width, so the session resets it first.
`setsid` gives each dev server its own process group, which `kill -- -$DEV` stops whole.
`worker_pid` prints the pid of the worker process serving port 8787.

The animation scales at 0 are the system's reduced motion, which the app reads when it starts.
Reanimated answers with a development warning and its toast, which a flow dismisses. Metro's
"installing React Native DevTools" error is the host's, never the app's.

The emulator's `localhost` is its own: `adb reverse` carries its port 8787 to the worker
`stack dev` serves, so the API client's localhost fallback reaches it with no
`EXPO_PUBLIC_API_URL`. Without it every query fails. The worker's port is fixed, so one
`stack dev` runs on the machine at a time.

## Shut down

```sh
adb reverse --remove-all
kill -- -$DEV -$METRO
kill $(worker_pid) 2>/dev/null
adb shell wm density reset
adb shell cmd uimode night no
adb emu kill
```

A `workerd` that outlives `stack dev` keeps port 8787 and blocks the next session's worker.
