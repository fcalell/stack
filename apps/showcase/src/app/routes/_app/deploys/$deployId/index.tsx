import { createFileRoute } from "@tanstack/react-router";

// The deploy with no step open: nothing after its details.
export const Route = createFileRoute("/_app/deploys/$deployId/")({
	component: () => null,
});
