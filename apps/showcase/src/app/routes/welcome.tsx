import { Button } from "@fcalell/plugin-react-ui/components/button";
import { EmptyState } from "@fcalell/plugin-react-ui/components/empty-state";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../lib/act.ts";

export const Route = createFileRoute("/welcome")({
	component: Welcome,
});

// A first run outside the shell: a `Gate` with no title holding one
// `EmptyState`, whose title is the page's `h1`.
function Welcome() {
	return (
		<Gate>
			<EmptyState
				icon="Rocket"
				title="Deploy your first app"
				sentence="Connect a repository and Acme builds and deploys every push to main."
				act={{ label: "Connect a repository", onAct: act }}
			>
				<Button act="secondary" label="Start from a template" onAct={act} />
			</EmptyState>
		</Gate>
	);
}
