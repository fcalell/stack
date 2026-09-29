import { Showcase } from "@fcalell/plugin-react-ui/showcase";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: Showcase,
});
