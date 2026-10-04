---
id: 003-05
status: backlog
sessions: {}
---
# native-ui: a sheet's body reads the app's query and auth context

## Goal
gorhom's `BottomSheetModalProvider` (provider order 30) draws a sheet's content at its own portal
host, so a sheet body sees only the providers outside it. `QueryProvider` (40) and
`AuthProvider` (50) sit inside it, so `useQuery` or `useAuthClient` in a sheet gets no context.
Found reviewing 003-03; fixed in the same change.

## Approach
Order both providers outside the sheets' provider; they hold no UI.

## Acceptance criteria
- [ ] (test) the generated entry nests the query and auth providers outside `BottomSheetModalProvider`.
