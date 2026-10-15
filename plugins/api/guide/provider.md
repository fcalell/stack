# The query provider

`QueryProvider` from `@fcalell/plugin-api/tanstack-query` holds the app's query client. With
react-ui on the web or native-ui on the phone, TanStack Query is installed and the app is already
wrapped in it; never wrap it again. Without one, add `@tanstack/react-query` and
`@orpc/tanstack-query` and wrap the root route in `<QueryProvider>`.

## settle

`QueryProvider` takes `settle`, which a UI plugin passes: a read's first answer (its first data,
its first failure with no data, a reset to waiting) is flushed through it, so the waiting form is
still on screen when the move to the answer starts. A refetch is not a first answer and flushes at
once. Never pass `settle` in an app on react-ui or native-ui, which already do.

## listen: the phone's network and focus

`QueryProvider` takes `listen`, `{ online?, focus? }`, each given the manager's setter and
returning its cleanup, for a platform with no window events. native-ui passes the phone's
(`expo-network` and `AppState`), so a read pauses offline and refetches when the app returns;
the web needs nothing. Never pass `listen` in an app on native-ui.

**Check:** `pnpm check` passes.
