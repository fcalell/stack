# QueryBoundary

Loading/error/empty/data state handler for query results. Renders the appropriate UI based on query state with a configurable grace period to prevent loading flash.

```tsx
import { QueryBoundary } from "@fcalell/ui/components/query-boundary";
```

No peer dependencies — uses a generic `QueryLike` interface compatible with TanStack Query.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `QueryLike<TData, TError>` | -- | Query result object |
| `loadingText` | `string` | `"loading..."` | Text for default loading spinner |
| `loadingFallback` | `JSX.Element` | Centered `<Loader>` | Custom loading UI |
| `gracePeriod` | `number` | `150` | Ms before showing loading UI |
| `errorFallback` | `(error: TError, retry: () => void) => JSX.Element` | Error EmptyState + Retry | Custom error UI |
| `emptyWhen` | `(data: TData) => boolean` | -- | Detects empty data |
| `emptyFallback` | `JSX.Element` | -- | Shown when `emptyWhen` returns true |
| `class` | `string` | -- | Classes on default loading wrapper |
| `children` | `(data: Accessor<TData>) => JSX.Element` | -- | Render function for data state |

## QueryLike type

```ts
type QueryLike<TData, TError> = {
  data: TData | undefined;
  isPending: boolean;
  isError: boolean;
  error: TError | null;
  refetch: () => void;
  isRefetching?: boolean;
};
```

Compatible with TanStack Solid Query's `CreateQueryResult` — pass query results directly.

## Basic usage

```tsx
const query = useQuery(() => ({ queryKey: ["projects"], queryFn: fetchProjects }));

<QueryBoundary query={query}>
  {(data) => <ProjectList projects={data()} />}
</QueryBoundary>
```

Note: `data` is an `Accessor<TData>` (getter function). Call `data()` to read the value. This preserves SolidJS reactivity without re-running the entire render tree.

## With empty state

```tsx
<QueryBoundary
  query={query}
  emptyWhen={(data) => data.length === 0}
  emptyFallback={
    <EmptyState title="No projects yet" description="Create your first project to get started." />
  }
>
  {(data) => <ProjectList projects={data()} />}
</QueryBoundary>
```

## Custom loading

```tsx
<QueryBoundary
  query={query}
  loadingFallback={<Skeleton count={5} />}
  gracePeriod={0}
>
  {(data) => <List items={data()} />}
</QueryBoundary>
```

## Custom error

```tsx
<QueryBoundary
  query={query}
  errorFallback={(error, retry) => (
    <Alert variant="destructive">
      <p>{error.message}</p>
      <Button onClick={retry}>Try again</Button>
    </Alert>
  )}
>
  {(data) => <Content data={data()} />}
</QueryBoundary>
```
