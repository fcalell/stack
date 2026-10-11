---
id: 003-317
status: done
sessions: {}
---
# react: an app's drawn lockup heads the Shell's sidebar and the Gate

## Goal
Stead's mark needs a drawn wordmark: the name set as tracked capitals in proportion to the symbol, which a text name can't do. Found by the owner, 2026-10-11. `react({ icon })` (003-310) is both the favicon and the logo in the lockup, which draws the icon at the avatar's size beside `app.name` as text, so an app whose name is drawn letters with their own spacing and proportion to the symbol cannot express it.

## Owner ruling
Ruled in conversation with the owner; implemented directly without the queue.

- `react()` gains an optional `logo`, the shape of `icon`: `string | { light: string; dark: string }`, an SVG URL usually in `public/`. It is the app's full horizontal lockup (symbol and drawn name in one image). `icon` keeps every role it has (the favicon links, the square symbol); nothing about the favicon changes.
- It rides the derived `icon` slot (`AppIcon` gains `logo?: { light; dark? }`), emitted only when given; with `logo` absent everything is as before. react-ui's `MarkProvider` passes it into `AppMark` (`logo?`, `logoDark?`).
- `Lockup`: with a logo it draws that image instead of the icon and the name text, `alt` the app's name, the light and dark forms through the same `.dark` scope classes, its height the avatar's and its width auto from its own aspect, capped to the row's width. If the logo fails to load, the lockup falls back to the icon and the name. The Shell and the Gate call `Lockup` unchanged.
- The size is a cell in `variants.ts` next to `GATE_MARK`, spelled only with tokens.

## Built
react: `logo` joins `reactOptionsSchema` (a string or a `{ light, dark }` pair) and `AppIcon` gains `logo?` (`plugins/react/src/types.ts`); the `icon` slot adds it to the value when given and only then (`plugins/react/src/index.ts`). The `<head>` icon links do not read it. A `logo` with no `icon` is not carried: the slot is null without an icon, so no mark is drawn.

react-ui: the `MarkProvider` contribution adds `logo` and, with a pair, `logoDark` to the mark when the slot carries a logo (`plugins/react-ui/src/index.ts`). `AppMark` gains `logo?` and `logoDark?`, and `Lockup` draws the logo alone when there is one: one image, or one per mode under `[.dark_&]:hidden` and `hidden [.dark_&]:block` as the icon does, `alt={mark.name}`, `object-contain object-left` (a web overlay in `lib/mark.tsx` beside the existing ones), the row's own class kept so the Shell's inset and the Gate's rhythm hold. Either form failing to load (the failed address kept in state) draws the icon and the name (`plugins/react-ui/src/ui/lib/mark.tsx`).

ui-core: `GATE_LOGO` (`h-avatar w-auto max-w-full`) beside `GATE_MARK` in `variants.ts`; the roster has the Gate hold and draw it and the Shell draw it (`roster.ts`), and the Gate-holders invariant lists it (`test/roster-invariants.test.ts`). DESIGN.md is regenerated.

Tests: `plugins/react/test/graph.test.ts` (a string logo, a pair beside an icon pair, the favicon links not reading it, the slot unchanged without one) and `plugins/react-ui/test/graph.test.ts` (the provider carries `logo` and `logoDark`, and a mark with no logo carries neither). Showcase `apps/showcase/behaviour/mark.stories.tsx`: the Gate draws the logo alone with the name as its alt and no name text; the sidebar's logo is held inside the sidebar at the places' inset; the dark form follows `.dark`; a failed logo falls back to the icon and the name.

Docs: `plugins/react/guide/web-app.md` (a `logo` row), `plugins/react-ui/guide/rules.md` (the Gate), `.helm/knowledge/architecture/consumer-project.md`, `slot-catalog.md` (`react.slots.icon`), `ui-core.md` (the app's mark). The Shell's rules page does not describe the lockup.

## Review
2026-10-11: ui-core `pnpm verify` 34/34; type-check passes in every package including the showcase; Biome clean; node tests pass in ui-core (164), react (15), react-ui (139) and the rest of the workspace except `plugin-api` (5 failing), `plugin-auth` (2) and `phone` (1), which fail the same on the tree without this change (the sandbox runs Node 22, where the repo expects 24). Browser: `behaviour/mark.stories.tsx` 11 of 11 in Chromium (the 7 earlier and the 4 new), filtered run. No design critique ran: none played by a session apart from the work.
