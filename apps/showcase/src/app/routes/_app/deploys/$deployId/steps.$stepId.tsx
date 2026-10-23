import { preload } from "@fcalell/plugin-api/tanstack-query";
import { createFileRoute } from "@tanstack/react-router";
import { DeployStep, deployRead } from "../../../../components/deploys.tsx";

export const Route = createFileRoute("/_app/deploys/$deployId/steps/$stepId")({
	loader: ({ context, params }) =>
		preload(context.queryClient, deployRead(params.deployId)),
	component: OpenStep,
});

function OpenStep() {
	const { deployId, stepId } = Route.useParams();
	return <DeployStep deployId={deployId} stepId={stepId} />;
}
