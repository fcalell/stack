import { isStreamQuery } from "@fcalell/plugin-api/read";
import type { QueryClient } from "@fcalell/plugin-api/tanstack-query";

// The reads in flight that a run waits for. A stream (a channel read, the
// connection) stays fetching for as long as it is subscribed and does not
// count; a paused one is not fetching either.
export const fetchingReads = (client: QueryClient | undefined): number =>
	client
		?.getQueryCache()
		.findAll({ fetchStatus: "fetching" })
		.filter((query) => !isStreamQuery(query)).length ?? 0;
