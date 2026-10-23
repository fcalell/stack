import { Foundations } from "@fcalell/plugin-react-ui/showcase/foundations";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/foundations")({
	component: Foundations,
});
