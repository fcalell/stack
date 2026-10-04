---
id: 005-17
status: backlog
sessions: {}
---
# react-ui, native-ui: a context value changes only when what it holds changes

## Goal
Several providers hand a fresh value every render, so every consumer re-renders with them:
- The Shell's switcher is a new element each render (web `components/shell/index.tsx:109-111`,
  `:171`; phone `shell/index.tsx:133-135`), so every Place re-renders on each Shell state change.
- Phone Place rebuilds `lead`, `acts`, `room` and the `footprint` element per render
  (`place/index.tsx:110-127`).
- Web `SheetBase` hands `TouchedContext` an inline `{ touched, touch }` (`sheet/base.tsx:288`)
  and builds `host` per render (`:147-149`), while `Form` memoises the same value (`form/index.tsx:30`).
- `FormField`'s `GroupName` value is an inline object (web `form-field/index.tsx:131`, phone `:116`).
- Phone `ToastList` hands each Toast a new dismiss arrow (`toast/layer.tsx:9`), so every toast
  re-renders on each queue change.
- Web `useTouch` gives each caller its own `matchMedia` and `MutationObserver`, and its snapshot
  builds a new `MediaQueryList` per read (`lib/media.ts:10-29`).

## Approach
Contexts carry descriptors, and the consumer draws the element (the switcher in Place, the act
room as a module element). One `touched` hook in `lib/touched.ts` serves Form and SheetBase.
Values are memoised on their inputs; a toast takes its id and dismisses itself. `useTouch` reads
one module-level store: one cached query, one observer, a set of listeners.

## Acceptance criteria
- [ ] (live) web, assistant at 1440: typing in the MessageInput re-renders no Place (React profiler); in members' invite sheet, an act turning busy re-renders none of its fields.
- [ ] (live) phone, on the harness: raising a second toast does not re-render the first (React DevTools).
