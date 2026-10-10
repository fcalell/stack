---
id: 003-295
status: review
sessions: {}
---
# react-ui: a waiting form shows only for a read that lasts

## Goal
Stead's pages flash their skeletons: a read the local server answers in a few milliseconds still swaps the record for its waiting form and back, and a page with nested reads (System, Repos, `packages/server/src/app/routes/system/-components/repos.tsx`) flashes in waves. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "loading states flashing".

## Approach
`QueryBoundary` draws its waiting form the moment any query is pending (`plugins/react-ui/src/ui/components/query-boundary/index.tsx:59`), with no delay before it shows and no time it stays once shown. Stead reads its nested queries together on its side; the flash on a fast read is the boundary's. 003-127, 131, 132 and 179 shape the skeleton, not when it shows. Seen at stack `226f48c`.

## Acceptance criteria
- [x] A read that settles under a short delay (about 150 to 300 ms) draws no waiting form.
- [x] A waiting form once shown stays a minimum time, so it never blinks.
- [x] A Field's or Group's own `loading` follows the same rule.

## Open questions
- [x] Its shape (the delay and the minimum, a token or fixed): the stack session decides.

## Ruled
Fixed numbers, not a token or an option: `WAIT_DELAY` 200 ms and `WAIT_MIN` 500 ms in `@fcalell/ui-core/wait`, with the one decision (`waitStep`) both platforms run. A waiting form is not unmounted during the delay: it stands undrawn (`invisible` on the web, `opacity-0` on native) in its place, so the page keeps the height the loaded form replaces and no half-state shows. Held at the three places a `loading` enters a screen: `QueryBoundary`, and a `Section`'s or a `Group`'s own `loading` (what they inherit arrives already delayed). A leaf part's own `loading` (a `List`, a `Meter`, a `Prose`) is drawn as given; an app drives it from the boundary or Section around it. "A Field's" in the third box is read as the part that owns the flag, which for a form is the Section or Group around its fields (a Form reads the context they hand down).

## Built
`ui-core/src/wait.ts` (`WAIT_DELAY`, `WAIT_MIN`, `waitStep`, `test/wait.test.ts`, export `./wait`). Web: `useWait` and `VEIL` in `plugins/react-ui/src/ui/lib/loading.ts`; `QueryBoundary` returns its `loading` inside a `contents invisible` wrapper while veiled and keeps it drawn while held; `Group` and `Section` read their own `loading` through it (a `Section` veils its description line, count and body, the title and act stay). Native: the same hook in `plugins/native-ui/src/ui/lib/loading.ts`, in `QueryBoundary`, `Group` and `Section`. Rules text in both guides and `ui-core.md`. Stories `apps/showcase/behaviour/waiting-late.stories.tsx` (`Fast`, `Slow`, `Held`, `Own50`) are written and type-check; not run (browser batch). The existing waiting stories measure skeleton boxes at once: the veil keeps their boxes, but a role query on a veiled form misses until the delay passes, so they may need a `waitFor` in the batch run. Native unrendered: the veil and the hook are unchecked on a device.

Browser run: `waiting-late.stories.tsx` 4 of 4 pass, `waiting.stories.tsx` 33 of 33, `option-list.stories.tsx` 16 of 16. The run found `useWait` letting the loaded body draw for one render when a read settled inside the minimum (the held state was set in an effect); the hook now keeps the form drawn from the same render (`waiting || drawn`), on both platforms. The waiting stories that read a veiled form (`Bodies`) now wait for the 200 ms delay before asserting it is visible.
