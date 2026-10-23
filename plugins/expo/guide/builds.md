# Running and shipping the phone app

The phone app runs from Metro and ships through EAS. Each step is a `stack expo` command, which
reads its port, profiles and channel from `expo()`.

| Command | What it runs |
| --- | --- |
| `stack expo dev [--clear]` | `expo start` on `expo({ port })`; `--clear` empties Metro's cache first |
| `stack expo prebuild [--clean] [--platform ios\|android]` | `expo prebuild`, writing the native `ios/` and `android/` projects; `--clean` deletes them first |
| `stack expo build [--profile <name>] [--platform ios\|android\|all]` | `eas build`; the profile defaults to the first of `easProfiles`, and one outside it fails before EAS runs |
| `stack expo update [--channel <name>] [--message <text>]` | `eas update` on the channel, `updateChannel` unless given |

`stack expo dev` runs Metro alone: the API the app calls runs under `stack dev`, so run both while
working on a phone screen. Embedded fonts and config plugins live in the native build, so run
the app in a development build (`stack expo build --profile development`) against
`stack expo dev`; Expo Go has neither. The emulator the design critique judges on runs a local
debug build instead ([render page](./phone-render.md)).

## `eas.json`

`stack init` writes `eas.json` with three build profiles: `development` (a development client,
internal distribution), `preview` (internal distribution) and `production` (auto-incremented
build numbers), plus a `production` submit profile. The app version source is EAS's own
(`appVersionSource: "remote"`), so EAS counts the build numbers the
[version gate](./version-gate.md) reads.

The file is yours to edit. A profile you add or rename joins `expo({ easProfiles })` too, or
`stack expo build` refuses it.

## Native projects

`ios/` and `android/` are generated from the app config and gitignored. Change native behaviour
through `expo()` options and `configPlugins`, then regenerate with `stack expo prebuild --clean`
or let EAS build them; an edit inside them is lost on the next prebuild.

