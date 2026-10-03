# The phone app's config

`expo()` in `stack.config.ts` makes the app a phone app: `stack generate` writes its Metro config,
its Expo app config, its entry and its route types into `.stack/`. Every native setting is an
`expo()` option; the root files only point Expo at the generated ones.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `port` | `8081` | The Metro dev server's port. |
| `routes` | `{ appDir: "src/app" }` | The expo-router directory. `false` turns file routing off: no entry, no route types, and the app owns its own entry. |
| `scheme` | the slug of `app.name` | The deep-link and OAuth redirect scheme. |
| `easProfiles` | `["development", "preview", "production"]` | The EAS build profiles, matching `eas.json`. |
| `updateChannel` | `"production"` | The default EAS Update channel. |
| `configPlugins` | `[]` | Expo config plugins for native modules: `{ name, options?, dependencies? }`. |
| `minNativeBuild` | both platforms `0` | The oldest native build the API serves; see [version gate](./version-gate.md). |

```ts
expo({
  scheme: "acme",
  configPlugins: [
    {
      name: "expo-camera",
      options: { cameraPermission: "Scan a code to join a project." },
      dependencies: { "expo-camera": "~56.0.0" },
    },
  ],
});
```

A native module reaches the app only through `configPlugins`: `name` is the config plugin's id
(usually its package), `options` pass through verbatim into the app config's `plugins` array, and
`dependencies` are written into `package.json` by `stack init` and `stack add`. In an app already
set up, `stack generate` writes the config plugin but not the dependency: install the package too. A new
config plugin takes a new native build.

## What the app config holds

`.stack/app.config.cjs` carries `app.name` as the name, its slug, the scheme, version `1.0.0`,
portrait orientation, `userInterfaceStyle: "automatic"`, the new architecture, phone-only iOS
(`supportsTablet: false`), and `experiments.typedRoutes` while routing is on. The iOS bundle
identifier and the Android package are `app.domain` reversed plus the slug (`example.com` and
`my-app` give `com.example.myapp`); when the domain's last label already is the slug, the slug is
not repeated (`acme.app` and `acme` give `app.acme`). `expo-router` is always the first config
plugin while routing is on.

## The root files

`stack init` (or `stack add expo`) writes these once; `stack remove expo` deletes them.

- `app.config.ts` and `metro.config.js` re-export `.stack/app.config.cjs` and
  `.stack/metro.config.cjs`. Leave them as they are: change the config through `expo()`.
- `babel.config.cjs` holds `babel-preset-expo`, which carries the transform the entry's
  `require.context` needs. It is `.cjs` because the app's `package.json` is `type: module`.
- `eas.json` is yours: see [builds](./builds.md).
- `src/lib/api.ts` is yours: see [the API client](./api-client.md).

`package.json`'s `main` is `.stack/entry.tsx`, the expo-router root that wraps the routes in the
providers the plugins contribute. `.expo/`, `ios/` and `android/` are gitignored: the native
projects are regenerated, never edited.
