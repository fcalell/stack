import { createFileRoute } from "@tanstack/react-router";
import { DeployStep } from "../../../../components/deploys.tsx";

export const Route = createFileRoute("/_app/deploys/$deployId/steps/$stepId")({
	component: OpenStep,
});

function OpenStep() {
	const { deployId, stepId } = Route.useParams();
	return <DeployStep deployId={deployId} stepId={stepId} />;
}
