import { TvBoard } from "@fcalell/plugin-react-ui/showcase/tv";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tv-board")({
	component: TvBoard,
});
