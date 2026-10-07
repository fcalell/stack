# Phone screens: the host and the device check (2026-10-07)

Evidence for story 007-04 (`.helm/board/epics/007-consumer-screens/04-phone-screens.md`), whose
open question is React Native Web in the web workbench or on-device Storybook. Read from the repo
at `screens`, from the installed packages, and from current docs; nothing was run on a device
(`adb` is not on this machine's path and no emulator is up; the phone shell is
`nix develop <repo>#phone`, `.helm/research/phone-harness.md`). Every claim marked "unrun" is
read, not measured.

## Versions

Stack's phone side: react-native 0.85.3, react 19.2.3, expo ~56.0.9, expo-router 56.2.21
(installed), reanimated 4.4.1, worklets 0.9.1, gesture-handler 3.0.0, keyboard-controller 1.21.9,
`@gorhom/bottom-sheet` 5.2.14, uniwind 1.12.1 (`plugins/native-ui/package.json`,
`apps/phone/package.json`). Candidates, from the npm registry today: `@storybook/react-native`
10.6.0 (peers `storybook ^10.5.4`, `react-native >=0.72`, `react-native-reanimated 4.5.1`,
`react-native-safe-area-context 5.8.0`, gesture-handler `>=2`, bottom-sheet `>=4`),
`@storybook/react-native-web-vite` 10.6.1 (peers `vite ^5..^8`, `react-native-web ^0.19.12 ||
^0.20 || ^0.21`), `react-native-web` 0.21.3, `@storybook/addon-react-native-web` 0.0.29 (a
webpack-era addon; the Vite framework replaces it), `msw` 2.15.0. The screens workbench is on
Storybook 10.6.1 and vitest 5.0.3 (`plugins/screens/package.json`).

## What the web workbench is made of

The three parts of the workbench, and which of them a phone host can reuse:

| Part | Where | Reusable on a phone |
| --- | --- | --- |
| The answer: `(Request) -> Response` from the fixture tree for a state, in oRPC's server codec | `plugins/screens/src/ui/answer.ts:89` (`answer`), `:48` (`emptyOf`), `:27` (`findFixture`) | Yes. It takes a `Request`; only `fixtureHandlers` (`:125`) imports MSW's `http`. |
| The transport: MSW's service worker, per story | `plugins/screens/src/ui/preview.tsx:312` (`startWorker`), `msw-storybook-addon/csf3` | No. A service worker is a browser API. |
| The host: Storybook stories rendering the route through TanStack's memory router | `plugins/screens/src/ui/stories.tsx:260-302` | No. Router, Storybook framework and story files are web. |
| The floors: axe and overflow at five widths, as preview annotations | `plugins/screens/src/ui/floors.ts:215` | No. `page.viewport`, `document.documentElement.scrollWidth` and axe are DOM. |

The seam for a phone is the client's `fetch`: the scaffolded phone client already takes one,
`createClient<AppRouter>({ url, fetch: createVersionGatedFetch() })`
(`plugins/expo/templates/lib-api.ts:20-23`), and the queries reach it through
`createApiQueryUtils`, which is the same query layer 007-01 forces states through (GET queries,
POST mutations). A fetch that calls `answer()` for the screen's state replaces MSW with no
transport at all. Unrun: `answer()` builds its `Response` with `toFetchResponse`
(`@orpc/standard-server-fetch`) and oRPC's codec; whether Hermes in RN 0.85.3 has every web API
those touch (`Response` bodies, `ReadableStream`, `TextEncoder`) is not established here.

## MSW in React Native

`msw` 2.15.0 still ships a `./native` export (`lib/native`, a `setupServer` over the interceptors),
but MSW's docs say it is no longer supported and point to an official `@msw/react-native` package
(`network.configure({ handlers })`, `network.enable()`, imported before any msw module to install
`URL` and `TextEncoder`), with "use this integration at your own risk" and a missing-APIs
caveat (https://mswjs.io/docs/integrations/react-native, https://mswjs.io/docs/faq).
`npm view @msw/react-native` returns 404 today, so the package name is unverified. A fetch-level
handler is therefore the lower-risk carry-over: it depends on nothing but the client's `fetch`
argument, and it keeps the forced-state rules in one function for both platforms.

## The two hosts the story names

### React Native Web in the web workbench

How it would run: `@storybook/react-native-web-vite` 10.6.1 aliases `react-native` to
`react-native-web` under Vite, so the screens Storybook could render the roster. expo-router lists
its peers `react-native-web`, `react-native-screens`, `react-native-gesture-handler`,
`react-native-reanimated` (expo-router 56.2.21 `package.json`), and the route files are a
`require.context` call in the generated entry (`plugins/expo/src/node/codegen.ts:164-205`,
`ExpoRoot context={require.context(appDir)}`), a Metro/Babel transform with no Vite equivalent:
a Vite host would need its own route list (the typed-routes generator already lists them,
`plugins/expo/src/node/routes.ts`) and its own router mount.

What each native-only module does on the web (read from the installed packages):

| Module (use in native-ui) | On RN Web | Faithful to the phone? |
| --- | --- | --- |
| `react-native-safe-area-context`: `useSafeAreaInsets` in shell, gate, screen, sheet (`components/shell/index.tsx:67,148`, `gate/index.tsx:93`, `screen/index.tsx:66`, `sheet/base.tsx:281,421`) | Insets are 0 (no `env(safe-area-inset-*)` in a desktop browser). | No: the top inset (status bar) and bottom inset (gesture bar) are the first thing a phone shows and a browser never does. |
| `react-native-keyboard-controller`: `KeyboardAwareScrollView`, `KeyboardAvoidingView` (`lib/hosts.tsx:3-25`), `KeyboardProvider` | Its non-native bindings are no-ops (`src/bindings.ts`: `NOOP` module, `View`). | No: keyboard reach, the docked foot lifting over the keyboard, and `Gate` "scrolls over the keyboard" (rules page) cannot show. |
| `@gorhom/bottom-sheet` (`sheet/base.tsx:27`, `shell/host.tsx`, `app/index.tsx`) | Has `.web` files (`ScrollableContainer.web.tsx`, `useGestureEventsHandlersDefault.web.tsx`) and a "Support React Native Web" claim. | Partly: it draws, but its keyboard handling and the android branches (`BottomSheet.tsx:852,1693`) are native paths. |
| `react-native-gesture-handler` 3 (`app/index.tsx`) | Web implementation exists (pointer events). | Partly: pointer, not touch slop and fling. |
| `react-native-reanimated` 4 + worklets (`lib/motion.ts`, `toast`, `pending-bar`, `sheet/base.tsx:44-46` `scheduleOnRN`) | Runs on the JS thread; `addon-react-native-web` needs Babel plugin and transpile hints. | Partly: values are right, frame timing is not; `ReduceMotion.System` (`lib/motion.ts:23`) reads the browser's media query, not Android's animator scale. |
| uniwind 1.12.1 (`withUniwind`, `ScopedVariables`, `useResolveClassNames` across the roster) | Documented for Web and Vite (`docs.uniwind.dev/vite.md`), no Storybook page. | Unrun: stack's emission shapes (`@utility shadow-*`, `@variant` blocks, px measures instead of `ch`, `plugins/native-ui/src/node/theme.ts:23-45`) are written for its native compiler; the web compile of that sheet is unproven. |
| Platform shadow: RN 0.85 `boxShadow` from `--shadow-*` utilities (`theme.ts:27`; `packages/ui-core/src/oklch.ts:4`) | CSS `box-shadow`. | Close for `boxShadow`; Android `elevation` is not in use (grep: no `elevation` in `src/`). |
| Fonts: the sans role is `ui-sans-serif, system-ui, sans-serif` (`packages/ui-core/src/tokens.ts:1148`); `fonts` embeds files through expo-font, none by default (`plugins/native-ui/src/types.ts`) | The browser's system face (San Francisco, Segoe, Cantarell). | No: Android draws Roboto. Text width decides wrapping, clipping and overflow at 320 and 390, so the one floor the workbench measures most is font-dependent. |
| dp and density | CSS px; the roster's sizes are numbers (target 44, `packages/ui-core/src/tokens.ts:859-866`) so geometry equals dp 1:1 at a 320/390 viewport; `useWindowDimensions` (`lib/room.tsx:15`) reads `innerWidth`. | Yes for token geometry; no for text, which on a device scales with the system `fontScale` that a browser lacks. |
| Accessibility props | RNW 0.21.3's `createDOMProps` accepts `role`, `accessibilityRole`, `accessibilityLabel`, `accessibilityHidden`, `accessibilityLiveRegion`; it does not read `accessibilityState`, `importantForAccessibility`, `accessibilityElementsHidden`, `accessible` or `accessibilityViewIsModal` (not in its prop list, nor `View`'s or `forwardedProps`; read from unpkg, 0.21.3). The roster uses `accessibilityState` 56 times, `importantForAccessibility` 13, `accessibilityElementsHidden` 13, `accessible=` 8, `accessibilityViewIsModal` 2 (`grep` over `plugins/native-ui/src`). | No: busy, disabled, checked and selected states, and hidden decorative subtrees, do not reach the DOM, so axe judges a tree that differs from TalkBack's. A pass proves little; a fail can be false. |
| `expo-secure-store` (`templates/lib-auth.ts:2`) | `ExpoSecureStore.web.js` is `export default {}`. | No: the native auth template does not run on the web. |
| `expo-file-system`, `expo-sharing` (`components/code/index.tsx:12-13`), `expo-document-picker`, `expo-image-picker`, `expo-clipboard` | Web modules exist (picker, sharing, clipboard); `expo-file-system` has only a `.web.d.ts`. | Partly: a browser file dialog is not the Android document picker. |
| `Platform.OS` branches (`components/thread/index.tsx:70` inverts the log differently on Android; `lib/live.ts:31` announces on iOS only) | Neither branch runs. | No: the thread's inversion and live announcements are exactly the Android paths. |
| `expo-router` (`lib/navigate.ts:1`) | Has a web build, with history and a URL bar. | Different: a native stack's pushed screen, back gesture and tab bar are not browser history. |

What it misses, in one line: everything the OS contributes (insets, keyboard, font, announcement,
picker, back) and the accessibility state props, which are most of what a phone render is judged
on beyond the box geometry the roster's tokens already fix.

Fixtures and forced states: the MSW path carries over unchanged, since the host is a browser:
`screenStory` and the preview's worker work as they do today. Floors: the web floors carry over
verbatim (`floors.ts:215`, axe, `overflow()` at 320 and 390), at the cost above: they measure
Chrome's rendering of RNW's DOM.

Cost to build, read from the pieces: a Vite pipeline for RN (uniwind's Vite plugin, an alias to
`react-native-web`, `.web.*` resolution, Reanimated's Babel plugin), a router mount that is not
expo-router's `ExpoRoot` or its own mount over a Vite route list, native module stubs for
secure-store and file-system, a second Storybook (the web one is TanStack-router-bound) or a
mixed one, and the `@storybook/react-native-web-vite` peer on `react-native` (`>=0.74.5`; the
screens plugin pins `react` ^19.3 and the phone pins 19.2.3, so the two Storybooks cannot share a
`react` install without a split). Run cost is a Chromium page, as the web test run is now.

### On-device Storybook

`@storybook/react-native` 10.6.0: stories run inside the app on the device, with an on-device UI
(controls, actions, notes, backgrounds only; no accessibility addon) or `onDeviceUI: false` with a
WebSocket remote (`enableWebsockets`, port 7007); Metro's `withStorybook` swaps the entry point
and generates the story imports; v10 makes entry swapping the default; lite mode drops the
default UI's dependencies. Automated testing documented: portable stories under Jest
(`composeStories`) and Maestro for screenshots; Detox and Appium are named as possible, with no
guide. No vitest integration, no headless run (the docs do not address one), and no a11y addon
(https://github.com/storybookjs/react-native, `docs/docs/intro/testing.md`). Expo Router: the
docs offer entry-point swapping or a dedicated Storybook route.

Its peers pin `react-native-reanimated 4.5.1` and `react-native-safe-area-context 5.8.0` (registry
metadata read today); stack's phone requires `^4.4.1` and `^5.6.0` and installs 4.4.1, so an
install lands a peer mismatch the phone consumer does not have today.

What it misses of a real phone: nothing of the render (it is the real app on the real OS), but it
is not a route host. A story renders a component, or a screen component mounted by hand; the
route, its params, its layout stack and the `Shell` come from expo-router's `ExpoRoot`, which
mounts the app's `require.context` (`codegen.ts:164-205`) and offers no memory history. A story
that mounts a route component outside the router loses `useLocalSearchParams` and the tab bar,
unless it re-mounts `ExpoRoot` with a context of its own, which `expo-router/testing-library`'s
`renderRouter` does under Jest (in-memory routes, `initialUrl`, RNTL queries) but not on a device.

Fixtures: MSW does not carry over (service worker); `@msw/react-native` is unverified; the
fetch-level answer does, as above. Floors: none are built in. The on-device UI is not scriptable
for measurement; the measurable surfaces are Maestro's hierarchy and screenshots, which exist
already without Storybook.

Cost: a native build with Storybook in it (Expo Go is excluded for the app, `phone-harness.md`
"Expo Go vs a development build"), the same 12-20 minute cold Gradle build the harness
documents, a second entry point, story files per route (the web side generates them; a native
generator is new code), and a generated story index beside the app's.

## The third shape: the app is the host

The expo guide already drives the real app by route on the emulator: the critique's phone path
opens a route with Maestro's `openLink` (`plugins/expo/guide/phone-capture.md`), and the
critique's page names deep links as the way to a phone route
(`packages/ui-core/guide/design-critique.md`, "What the critic needs"). The route host exists. What
is missing is only 007-01's other half, a backend-free answer per state: today the state is held by
stopping or `kill -STOP`-ing the real worker (`phone-capture.md`, "Hold a query's states"), which
cannot give an empty, not-found or data-with-fixture screen without a database reset. A fetch
that answers from `src/app/fixtures.ts` through `answer()`, with the state read from the deep
link (`?screens=loading`), closes that without Storybook, MSW, or a second router: no story layer
in the app, the fixtures the web workbench already types, one forced-state function.

## The floors on a device

Measured from Maestro 2.10.0, as the critique's phone path does:

| Floor | How, from the existing harness | Cost |
| --- | --- | --- |
| Overflow at 320 and 390 dp | `maestro hierarchy` bounds past the screen edge; width set live by `adb shell wm density $((1080*160/W))` (443 and 540), no relaunch. | One hierarchy call each, 17-33 s (`phone-harness.md`). |
| Target 44 dp (24 dp otherwise) | bounds `(y2-y1)*160/density` for each clickable element. | The same call. |
| Accessible name and role | hierarchy text and accessibility label on every clickable element: the TalkBack tree, including `accessibilityState` (checked, selected) and hidden subtrees. | The same call. |
| Contrast, fonts, radii | Screenshot pixels with ImageMagick; the rest from `DESIGN.md` (hierarchy gives no font size, weight or shadow). | A screenshot call. |

Findings from the harness research that bound this: `adb shell uiautomator dump` writes nothing
while Maestro's driver holds the accessibility connection, so Maestro's hierarchy is the one
tree; the first frames after a launch arrive seconds late (an `extendedWaitUntil` first); an
element's bounds cover the target, but the hierarchy gives no target hit slop (the roster uses
none: no `hitSlop` in `plugins/native-ui/src`), so bounds are the target. Not measurable on the
device by hierarchy: horizontal overflow of text inside a fixed-width box that is clipped
with `numberOfLines` (the bounds are the box's), so a "text cut" finding stays a screenshot read.
`@storybook/react-native`'s Jest portable stories give names and roles headlessly through RNTL
(`getByRole`, `isHiddenFromAccessibility`), with no layout: names and roles only, not overflow or
target size.

One walk's price: a route in five states, each opened once (about 20 s) and walked at 2 widths
by 2 modes by one hierarchy call (about 25 s): 5 x (20 + 4 x 25) s, about 10 minutes a route,
against seconds per route in a browser. That cost decides how the check is run: not on every
route per change, but per route a change touches (the web run's `--changed`), and on demand.

## Memory and CI

From `phone-harness.md`: x86_64 Linux with `/dev/kvm`; the phone toolchain 9.6 GiB; a cold debug
build 12 min on 16 cores and 31 GB, `~/.gradle` 4.2 GB, `android/` 1.1 GB; the emulator's qemu
resident set 2.7-3.5 GB; the build and the emulator together exhausted 15 GB (this machine has
15 GB and 8 cores), so they run in sequence. A web Storybook run is a Chromium page. So the web
workbench's test run fits a stock CI runner, and a device check needs a KVM runner, the
toolchain cache and sequenced steps; a host that needs a Gradle rebuild per native change
(on-device Storybook) adds that to every dependency bump, and the app-as-host adds none (the
harness's APK already is the app, and the fetch layer is JavaScript).

## What is decided and what is not

Decided by the evidence above: RN Web cannot be the floor authority (font, insets, keyboard, the
dropped accessibility props, `Platform` branches), and on-device Storybook buys nothing a route
host needs (no a11y, no headless runner, no router, a native build, a peer mismatch) over the app
the harness already runs. Not decided without a device: that `answer()` runs under Hermes (the first
run of the building story: set the client's `fetch` to it in `apps/phone`, open `notes` on the
emulator in each state), and by how much RNW's render departs from the device's (the run that would
quantify it: the same route in RNW under Chromium and on the emulator, hierarchy bounds against DOM
bounds at 390; not needed to decide the host, since the departures above are by construction).
