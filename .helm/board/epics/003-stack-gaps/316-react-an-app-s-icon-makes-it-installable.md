---
id: 003-316
status: backlog
sessions: {}
---
# react: an app's icon makes it installable

## Goal
Stead's phone is the web app installed from the browser (github.com/fcalell/stead, `design/evidence.md` "Without `icons` in the manifest no Android browser installs the page": Add to home screen made a shortcut that opened in a browser tab). `react({ icon })` (003-310) gives the page its favicon and the app its mark, but stack emits no web manifest and no raster icons, so no stack app installs on a phone. Every consumer that wants an installed app would hand-keep PNGs and a manifest in `public/` that drift from the one SVG.

## Approach
`react()` takes `title`, `description`, `icon` (`string | { light, dark }`) and `themeColor` (`plugins/react/src/types.ts:22-26`); the `<head>` gets the icon links and `theme-color` (`plugins/react/src/index.ts`). Nothing emits `manifest.webmanifest`, an `apple-touch-icon`, or PNGs. Seen at stack `fea0eafc`.

## Acceptance criteria
- [ ] An app with an `icon` can be installed from Chrome on Android as a standalone app: the build emits a web manifest (name from `app.name`, `display: standalone`, `start_url`, `theme_color` and `background_color`) linked from the page.
- [ ] The manifest's icons are 192 and 512 PNGs rendered from the app's icon, plus a 512 `maskable` icon whose content sits in the centre 80% circle on a filled field.
- [ ] The page links a 180 `apple-touch-icon` rendered the same way, on a filled field (iOS crops a transparent one to a screenshot).
- [ ] With no `icon`, nothing is emitted, as today.

## Open questions
- [ ] The field: the maskable and Apple icons need an opaque background; whether it is a new option (`react({ iconField })`), `themeColor`, or the theme's accent, the stack session decides.
- [ ] A separate small or maskable source: whether `icon` may take a dedicated maskable SVG (marks that fill their square), or the plugin always pads the one icon into the safe zone.
- [ ] Rasterising at build: the tool (a dependency stack already carries, or one added) is the stack session's to choose.
- [ ] Web push's monochrome badge (alpha only, 96 px): in this story or a later one, once a stack app sends push.
