import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../lib/act.ts";

export const Route = createFileRoute("/welcome")({
	component: Welcome,
});

// A first run outside the shell: a titled `Gate` whose body is its acts.
function Welcome() {
	return (
		<Gate
			title="Deploy your first app"
			description={[
				"Connect a repository and Acme builds and deploys every push to main.",
			]}
		>
			<Button label="Connect a repository" onAct={act} />
			<Button act="secondary" label="Start from a template" onAct={act} />
		</Gate>
	);
}
