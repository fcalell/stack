import { createQueryClient } from "@fcalell/plugin-api/tanstack-query";

// The TanStack Query client wired into the app by `<QueryProvider>` (see the
// generated `.stack/entry.tsx`). The starter uses mobile-friendly defaults
// (single retry, short stale window); pass a `QueryClientConfig` here to tune.
export const queryClient = createQueryClient();
