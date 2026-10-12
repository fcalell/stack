import { createFileRoute } from "@tanstack/react-router";

// The list alone: no Pane after it, so it takes the room.
export const Route = createFileRoute("/_app/deploys/")({
	component: () => null,
});
