---
id: 003-310
status: review
sessions: {}
---
# react-ui: an app's mark heads the Shell's sidebar and the Gate, and is its icon

## Goal
Stead has no logo, and stack has nowhere to put one. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "need a logo". Stead's `design/07-interface.md` now has the mark (a logo beside the word "Stead") head the desktop sidebar and the `Gate`, and the logo be the page's icon; Stead draws the logo.

## Approach
`Shell` takes places, banner, switcher and children (`plugins/react-ui/src/ui/components/shell/index.tsx:67-73`), no brand; the `Gate`'s mark is text; the react plugin's config (`react({ title })`) takes no icon, so no favicon is emitted. Seen at stack `226f48c`.

## Acceptance criteria
- [x] The Shell's desktop sidebar heads with the app's mark when one is given, and is unchanged when not.
- [x] The Gate draws the mark in place of its text mark when one is given.
- [x] The react plugin's config takes an icon (an SVG) and the page links it as its favicon, with a dark-mode form when given.

## Open questions
- [x] Its shape (one `mark` passed to the Shell and the Gate, or a config the plugin carries to both): the stack session decides.

## Owner ruling
A config carried to both, no `mark` prop. `react()` already takes `icon: string` (the favicon href); the logo is that asset. `icon` widens to `string | { light: string; dark: string }`: a string is one `<link rel="icon">` as today (no icon keeps `data:,`), the object emits two links with `media="(prefers-color-scheme: light)"` / `"(prefers-color-scheme: dark)"`, `type="image/svg+xml"` inferred from `.svg`. `HtmlInjection`'s `link` kind gains optional `media` and `type`. `react` derives a slot `icon` (`{ light, dark? } | null`); `react-ui` reads it and contributes `MarkProvider` (order 1) carrying `{ src, dark?, name: app.name }`. The Shell's desktop sidebar heads with a lockup above the switcher (logo at the avatar size, the app name in the body role at 500, truncating, a non-interactive row at the place rows' inset); no icon, nothing drawn; touch unchanged. The Gate's lockup replaces its `mark` prop (`GateMark` and the per-Gate `mark` removed), leads the Gate when `title` is given at `GATE_MARK` size, keeps the name if the image fails, and is absent with no icon. The dark form draws `src` in light and `dark` in dark through the theme's own dark selector (not `<img>` media). The showcase (sign-in, connect, the Gate and Shell frames) provides the mark, and `web-app.md` and `consumer-project.md` say it. The phone's app icon stays `expo()`'s concern.

## Ruled
- The ruling built as written. `GateMark` is removed from `@fcalell/ui-core/descriptors` and `mark` from the roster's Gate, so native-ui's Gate loses its `mark` prop too (the roster is one table for both platforms, and the phone's icon is `expo()`'s); native draws no mark. If the owner wants the phone's Gate to keep a logo, that is a new story.
- The lockup is one row both places draw (`Lockup` in `plugins/react-ui/src/ui/lib/mark.tsx`, with `MarkProvider` and `useMark`): the logo, `alt=""` since the name stands beside it, then the name at `TEXT.body` and `TEXT_STRONG.body`. The Gate's name was the meta role while the image failed; one lockup is the body role in both.
- The cells: `SHELL_MARK` (the sidebar's float round the row), `SHELL_MARK_ROW` (a place row's gap, height and inset), and `GATE_MARK_ROW` (the logo and name an `inside` gap apart). The logo's size is `GATE_MARK` (`size-avatar`) in both. The two dark-selector classes (`[.dark_&]:hidden`, `hidden [.dark_&]:block`) are web overlays in `lib/mark.tsx` on the overlay allowlist, since a contract cell holds no platform variant (ui-core verify c21).
- The dark selector is `.dark &` (the theme's mode scope), so the mode toggle moves the logo; a `.light` frame inside a dark page draws the dark form, since both logos key on any `.dark` ancestor.
- The name is `app.name` (a short phrase, truncates), not the page title.

## Built
Core and react: `HtmlInjection`'s `link` takes `media` and `type` (`packages/cli/src/ast/specs.ts`, printed in `html-printer.ts`). `react({ icon })` takes a string or `{ light, dark }` (`plugins/react/src/types.ts`); the new `react.slots.icon` (`derived<AppIcon | null>`) feeds the `<head>` icon links in `plugins/react/src/index.ts` (one link, or two under `prefers-color-scheme` with `type="image/svg+xml"` for an `.svg`; `data:,` with none). `plugins/react/test/graph.test.ts` holds the pair, the string and the null.

react-ui: `reactUi()` contributes `MarkProvider` to `react.slots.providers` at order 1 when the slot is not null, with `{ src, dark?, name: app.name }` (`plugins/react-ui/src/index.ts`; `test/graph.test.ts` holds it present, absent and with the pair). The Shell's desktop sidebar heads with the lockup above the switcher slot, and the Gate leads with it when `title` is given (`components/shell/index.tsx`, `components/gate/index.tsx`); the Gate's `mark` prop and `GateMark` are gone (`lib/mark.tsx` is exported as `./lib/mark`). ui-core holds the cells (`variants.ts`) and the roster (`roster.ts`: Gate drops `mark`, Shell and Gate draw the new cells); DESIGN.md is regenerated. native-ui's Gate drops `mark` and its closure fixture follows.

Docs: `web-app.md` (the `icon` row), `consumer-project.md` (the config), both `rules.md` Gate sections, `ui-core.md` (the Gate and the app's mark), `slot-catalog.md` (`react.slots.icon`, the `HtmlInjection` link).

Showcase: the app's config sets `icon: "/mark.svg"` and sign-in and connect pass no `mark` (the unused `favicon.svg` is deleted); the Gate and Shell frames (`plugins/react-ui/src/ui/showcase/frames/gate.tsx`, `shell.tsx`) mount `MarkProvider` with a light and a dark logo, and the Gate frame's failed-logo case moves to the `TEXT_STRONG.role.body` cell. `apps/showcase/behaviour/mark.stories.tsx` holds: the sidebar's lockup (logo square, name beside, not a link, the logo's start edge on the places' glyphs, above the first place), a sidebar with no mark, touch drawing none, the Gate leading with the mark above the title, the name staying when the logo fails, no mark with no provider, and the dark form following `.dark`. The stories are written and type-checked, not run: the batch browser run awaits.

Native unrendered: the Gate loses its `mark` prop, no new native surface.
