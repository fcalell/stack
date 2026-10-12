import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../../lib/act.ts";

export const Route = createFileRoute("/_app/logs")({
	component: Logs,
});

// A page with nothing in it yet.
function Logs() {
	return (
		<Place>
			<Pane
				title="Logs"
				empty={{
					icon: "Logs",
					title: "No logs yet",
					sentence: "Logs stream here once a deploy serves its first request.",
					act: { label: "Deploy", onAct: act },
				}}
			/>
		</Place>
	);
}
