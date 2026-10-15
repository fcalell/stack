import { preload } from "@fcalell/plugin-api/tanstack-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { filesRead, logRead } from "../../../../components/deploy-changes.tsx";
import { DeployRecord, deployRead } from "../../../../components/deploys.tsx";

export const Route = createFileRoute("/_app/deploys/$deployId")({
	loader: ({ params }) =>
		preload(
			deployRead(params.deployId),
			filesRead(params.deployId),
			logRead(params.deployId),
		),
	// The open file's path: the first changed file without it.
	validateSearch: (search: Record<string, unknown>) => ({
		file: typeof search.file === "string" ? search.file : undefined,
	}),
	component: OpenDeploy,
});

// The deploy opened beside the list, then the step it opened (the child
// route).
function OpenDeploy() {
	const { deployId } = Route.useParams();
	const { file } = Route.useSearch();
	return (
		<>
			<DeployRecord deployId={deployId} file={file} />
			<Outlet />
		</>
	);
}
