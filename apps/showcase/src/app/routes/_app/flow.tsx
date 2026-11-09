import { preload } from "@fcalell/plugin-api/tanstack-query";
import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/flow")({
	loader: ({ context }) => preload(context.queryClient, orpc.flow.graph.read()),
	component: Flow,
});

const ICONS = { start: "Play", step: "Cog", end: "Flag" } as const;

// The run stands at its build: the push and the build are its path, and the
// ship the run has not reached is off it, drawn in a node's quiet ink, which the
// screen run's axe holds at the text floor.
const RUN = { nodes: ["start", "build"], edges: ["start-build"], at: "build" };

// A small flow on a canvas that fills the Pane: its nodes and links from one
// read, the canvas placing them.
function Flow() {
	const graph = orpc.flow.graph.read();
	return (
		<Pane fill>
			<Canvas
				label="Push to production"
				nodes={graph.at((data) =>
					data.steps.map((each) => ({
						id: each.id,
						icon: ICONS[each.role],
						role: each.role,
						title: each.title,
						line: each.line,
						status: { tone: each.status },
					})),
				)}
				edges={graph.at((data) => data.links)}
				path={RUN}
			/>
		</Pane>
	);
}
