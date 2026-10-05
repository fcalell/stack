import { Tv } from "@fcalell/plugin-react-ui/showcase/tv";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tv")({
	component: Tv,
});
